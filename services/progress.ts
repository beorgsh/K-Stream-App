import { db, auth } from './firebase';
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
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
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
  return new Promise((resolve) => {
    const user = auth.currentUser;

    if (user) {
      // 1. Logged In: Fetch from Firebase Realtime DB
      const dbRef = ref(db);
      get(child(dbRef, `users/${user.uid}/progress`))
        .then((snapshot) => {
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
            resolve(formatted);
          } else {
            resolve([]);
          }
        })
        .catch((err) => {
          console.error("Error fetching progress from DB:", err);
          resolve([]);
        });
    } else {
      // 2. Guest: Fetch from LocalStorage
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
            name: item.title, // For TV compatibility
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
        console.error("Failed to parse local progress data", e);
        resolve([]);
      }
    }
  });
};

export const saveProgress = (rawData: any) => {
    const formatted = formatData(rawData);
    if (!formatted) return;

    const user = auth.currentUser;
    // Create unique key based on type and ID (e.g., m12345 or t67890)
    const key = `${formatted.type === 'movie' ? 'm' : 't'}${formatted.id}`;

    if (user) {
        // Save to Firebase (User Specific)
        set(ref(db, `users/${user.uid}/progress/${key}`), formatted)
        .catch(err => console.error("Failed to save to DB", err));
    } else {
        // Save to LocalStorage (Guest)
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const current = stored ? JSON.parse(stored) : {};
            current[key] = formatted;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch (e) {
            console.error("Failed to save local progress", e);
        }
    }
};