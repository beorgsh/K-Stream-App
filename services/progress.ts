import { db, waitForAuth } from './firebase';
import { Media, StoredMediaData } from '../types';

const STORAGE_KEY = 'vidFastProgress';
const DEBOUNCE_MS = 2000; // Save max once every 2 seconds

// In-memory debounce timers
const saveTimers: Record<string, any> = {};

// Format raw player data to clean structure
const formatData = (data: any): StoredMediaData | null => {
    if (!data || !data.id) return null;
    
    return {
        id: data.id,
        type: data.type || 'movie',
        title: data.title || 'Unknown',
        poster_path: data.poster_path || null,
        backdrop_path: data.backdrop_path || null,
        // Save additional metadata for filtering
        original_language: data.original_language, 
        genre_ids: data.genre_ids,
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

export const getContinueWatching = async (filter?: 'kdrama' | 'global' | 'anime'): Promise<Media[]> => {
  const user = await waitForAuth();
  let allItems: Media[] = [];

  // 1. If Authenticated: Fetch ONLY from Firebase DB
  if (user && db) {
      try {
          const snapshot = await db.ref(`users/${user.uid}/progress`).once('value');
          if (snapshot.exists()) {
            const data = snapshot.val();
            allItems = Object.values(data)
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
                    original_language: item.original_language || 'en', // Default to en if missing
                    genre_ids: item.genre_ids || [],
                    progress: item.progress,
                    last_season: item.last_season_watched,
                    last_episode: item.last_episode_watched
                }));
          }
      } catch (err: any) {
          console.error("DB Fetch Error:", err.message);
      }
  } else {
    // 2. Guest Mode: Fetch ONLY from Local Storage
    allItems = await loadFromLocal();
  }

  // Filter Logic
  if (!filter) return allItems;

  return allItems.filter(item => {
      const isAnime = item.media_type === 'anime' || item.genre_ids?.includes(16);
      const isKorean = item.original_language === 'ko';

      if (filter === 'anime') {
          return isAnime;
      }
      
      if (filter === 'kdrama') {
          // If legacy data doesn't have language, assume it's kdrama if not anime (historical default)
          const isLegacyDefault = !item.original_language || item.original_language === 'en'; 
          // However, strict filtering is better now.
          return (isKorean && !isAnime);
      }

      if (filter === 'global') {
          return (!isKorean && !isAnime);
      }

      return true;
  });
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
                    original_language: item.original_language || 'en',
                    genre_ids: item.genre_ids || [],
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
    
    // Clear existing timer for this media
    if (saveTimers[key]) {
        clearTimeout(saveTimers[key]);
    }

    // Debounce: Wait DEBOUNCE_MS before actually saving
    saveTimers[key] = setTimeout(async () => {
        const safeData = JSON.parse(JSON.stringify(formatted, (k, v) => v === undefined ? null : v));
        const user = await waitForAuth();

        if (user && db) {
            // A. Logged In: Save to Firebase DB ONLY
            db.ref(`users/${user.uid}/progress/${key}`).set(safeData)
            .catch((err: any) => {
                console.error("Database save failed:", err.message);
            });
        } else {
            // B. Guest: Save to Local Storage ONLY
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                const current = stored ? JSON.parse(stored) : {};
                current[key] = safeData;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
            } catch (e) {
                console.error("Local save failed", e);
            }
        }
        delete saveTimers[key];
    }, DEBOUNCE_MS);
};