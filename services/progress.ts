import { db, waitForAuth } from './firebase';
import { ref, set, get, child } from 'firebase/database';
import { Media, StoredMediaData } from '../types';

const STORAGE_KEY = 'vidFastProgress';

// Format raw player data to clean structure
const formatData = (data: any): StoredMediaData | null => {
    if (!data || !data.id) return null;
    
    return {
        id: data.id,
        type: data.type || 'movie',
        title: data.title || 'Unknown',
        poster_path: data.poster_path || null,
        backdrop_path: data.backdrop_path || null,
        progress: {
            watched: data.progress?.watched || 0,
            duration: data.progress?.duration || 0
        },
        last_season_watched: data.last_season_watched,
        last_episode_watched: data.last_episode_watched,
        last_updated: Date.now(),
        show_progress: data.show_progress
    };
};

export const getContinueWatching = async (): Promise<Media[]> => {
  const user = await waitForAuth();

  // 1. If Authenticated: Fetch from Firebase DB
  if (user && db) {
      try {
          const snapshot = await get(child(ref(db), `users/${user.uid}/progress`));
          if (snapshot.exists()) {
            const data = snapshot.val();
            const formatted = Object.values(data)
                // @ts-ignore
                .sort((a: any, b: any) => b.last_updated - a.last_updated)
                .map((item: any) => ({
                id: item.id,
                title: item.title,
                name: item.title,
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                overview: '',
                vote_average: 0,
                media_type: item.type,
                original_language: 'en',
                progress: item.progress,
                last_season: item.last_season_watched,
                last_episode: item.last_episode_watched
                }));
            return formatted;
          } else {
              // User has no data in DB yet
              return [];
          }
      } catch (err: any) {
          console.error("DB Fetch Error:", err.message);
          // If DB fails (offline/error), fallback to local below
      }
  }

  // 2. Fallback / Guest Mode: Fetch from Local Storage
  return loadFromLocal();
};

const loadFromLocal = (): Promise<Media[]> => {
    return new Promise((resolve) => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            resolve([]);
            return;
        }
        try {
            const data: Record<string, StoredMediaData> = JSON.parse(stored);
            const formatted = Object.values(data)
                .sort((a, b) => b.last_updated - a.last_updated)
                .map(item => ({
                    id: item.id,
                    title: item.title,
                    name: item.title,
                    poster_path: item.poster_path,
                    backdrop_path: item.backdrop_path,
                    overview: '', 
                    vote_average: 0, 
                    media_type: item.type,
                    original_language: 'en',
                    progress: item.progress,
                    last_season: item.last_season_watched,
                    last_episode: item.last_episode_watched
                }));
            resolve(formatted);
        } catch (e) {
            console.error("Local storage error", e);
            resolve([]);
        }
    });
};

export const saveProgress = async (rawData: any) => {
    const formatted = formatData(rawData);
    if (!formatted) return;

    const key = `${formatted.type === 'movie' ? 'm' : 't'}${formatted.id}`;
    
    // Sanitize to ensure no undefined values reach Firebase
    const safeData = JSON.parse(JSON.stringify(formatted, (k, v) => v === undefined ? null : v));

    // A. Always save to local storage as a backup (cache)
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const current = stored ? JSON.parse(stored) : {};
        current[key] = safeData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
        console.error("Local save failed", e);
    }

    // B. If Logged In: Save to Firebase DB
    const user = await waitForAuth();
    if (user && db) {
        set(ref(db, `users/${user.uid}/progress/${key}`), safeData)
        .then(() => {
            console.log("Progress saved to Firebase DB");
        })
        .catch(err => {
             console.error("Database save failed:", err.message);
        });
    }
};