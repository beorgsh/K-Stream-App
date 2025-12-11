import { db, auth } from './firebase';
import { ref, set, get, child } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
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
  return new Promise((resolve) => {
    // Quick check if auth is ready, if not wait briefly
    const checkAuth = () => {
        if (!auth) return Promise.resolve(null);
        if (auth.currentUser) return Promise.resolve(auth.currentUser);
        return new Promise((r) => {
             const unsub = onAuthStateChanged(auth, (u) => {
                 unsub();
                 r(u);
             });
             // Fallback
             setTimeout(() => { unsub(); r(auth.currentUser); }, 2000);
        });
    };

    checkAuth().then((user: any) => {
        if (user && db) {
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
              // Handle 404 (Database not created or URL wrong) gracefully
              if (err.message && (err.message.includes('404') || err.message.includes('Client is offline'))) {
                  console.warn("DB unreachable, trying local storage fallback.");
                  // Fallback to local storage if DB fails hard
                  loadFromLocal(resolve);
              } else if (err.message && err.message.includes('permission_denied')) {
                  console.warn("DB Permission Denied. Check Rules. Falling back to local.");
                  loadFromLocal(resolve);
              } else {
                  console.error("Error fetching progress from DB:", err);
                  resolve([]);
              }
            });
        } else {
           loadFromLocal(resolve);
        }
    });
  });
};

const loadFromLocal = (resolve: Function) => {
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
    console.error("Failed to parse local progress data", e);
    resolve([]);
    }
};

export const saveProgress = async (rawData: any) => {
    const formatted = formatData(rawData);
    if (!formatted) return;

    // Check auth state properly before deciding storage
    let user = auth?.currentUser;
    if (auth && !user) {
        // Wait for auth to settle if it's in initial loading state
        user = await new Promise(resolve => {
             const unsub = onAuthStateChanged(auth, (u) => {
                 unsub();
                 resolve(u);
             });
             setTimeout(() => resolve(null), 1000);
        });
    }

    const key = `${formatted.type === 'movie' ? 'm' : 't'}${formatted.id}`;

    // Sanitize undefineds
    const safeData = JSON.parse(JSON.stringify(formatted, (k, v) => v === undefined ? null : v));

    // ALWAYS save to local storage as backup/cache
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const current = stored ? JSON.parse(stored) : {};
        current[key] = safeData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
        console.error("Failed to save local progress", e);
    }

    // Attempt DB save
    if (user && db) {
        // @ts-ignore
        set(ref(db, `users/${user.uid}/progress/${key}`), safeData)
        .catch(err => {
            // Silently fail or log warning if DB is unreachable/404
             if (err.message && err.message.includes('404')) {
                  console.warn("Sync failed: Database 404");
             } else {
                  console.warn("Sync failed (DB):", err.message);
             }
        });
    }
};