import { db, auth } from './firebase';
import { ref, set, get, child } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { Media, StoredMediaData } from '../types';

const STORAGE_KEY = 'vidFastProgress';
let dbPermissionGranted = true; // Circuit breaker: If false, we stop hitting DB

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
    // Quick check if auth is ready
    const checkAuth = () => {
        if (!auth) return Promise.resolve(null);
        if (auth.currentUser) return Promise.resolve(auth.currentUser);
        return new Promise((r) => {
             const unsub = onAuthStateChanged(auth, (u) => {
                 unsub();
                 r(u);
             });
             setTimeout(() => { unsub(); r(auth.currentUser); }, 1500);
        });
    };

    checkAuth().then((user: any) => {
        // Only try DB if user exists, DB exists, AND we haven't been blocked yet
        if (user && db && dbPermissionGranted) {
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
              // Handle Permission Denied or 404 by switching to local storage permanently for this session
              if (err.message && (err.message.includes('permission_denied') || err.message.includes('404'))) {
                  console.warn("Firebase DB blocked/missing. Switching to Local Storage.");
                  dbPermissionGranted = false; // Trip the circuit breaker
                  loadFromLocal(resolve);
              } else {
                  console.error("DB Error:", err);
                  resolve([]);
              }
            });
        } else {
           // Fallback immediately
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
        resolve([]);
    }
};

export const saveProgress = async (rawData: any) => {
    const formatted = formatData(rawData);
    if (!formatted) return;

    const key = `${formatted.type === 'movie' ? 'm' : 't'}${formatted.id}`;
    const safeData = JSON.parse(JSON.stringify(formatted, (k, v) => v === undefined ? null : v));

    // 1. ALWAYS Save to LocalStorage (Reliable Backup)
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const current = stored ? JSON.parse(stored) : {};
        current[key] = safeData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
        console.error("Local save failed", e);
    }

    // 2. Try DB if allowed
    let user = auth?.currentUser;
    if (user && db && dbPermissionGranted) {
        // @ts-ignore
        set(ref(db, `users/${user.uid}/progress/${key}`), safeData)
        .catch(err => {
             if (err.message && (err.message.includes('permission_denied') || err.message.includes('404'))) {
                  dbPermissionGranted = false; // Stop future tries
             }
        });
    }
};