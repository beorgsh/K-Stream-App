import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, onDisconnect, remove } from 'firebase/database';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { FIREBASE_CONFIG } from '../constants';
import { SavedRoom } from '../types';

// Initialize Firebase
let app;
let db: any;
let auth: any;

try {
  app = initializeApp(FIREBASE_CONFIG);
  db = getDatabase(app);
  auth = getAuth(app);
} catch (e) {
  console.warn("Firebase config error.");
}

export { auth, db };

export const waitForAuth = (): Promise<any> => {
    return new Promise((resolve) => {
        if (!auth) { resolve(null); return; }
        if (auth.currentUser) { resolve(auth.currentUser); return; }
        let resolved = false;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (resolved) return;
            resolved = true;
            unsubscribe();
            resolve(user);
        });
        setTimeout(() => {
            if (!resolved) { resolved = true; resolve(auth?.currentUser || null); }
        }, 2000);
    });
};

const sanitizeData = <T>(data: T): T => {
    return JSON.parse(JSON.stringify(data, (key, value) => {
        if (value === undefined) return null;
        return value;
    }));
};

export const registerRoomInLobby = async (
  roomId: string, 
  roomName: string, 
  hostName: string,
  isPrivate: boolean,
  password: string | undefined,
  mediaInfo: {
    id: number;
    type: 'movie' | 'tv';
    title: string;
    poster_path: string | null;
    backdrop_path: string | null;
  }
) => {
  if (!db) return;

  const user = await waitForAuth();
  if (!user) {
      console.warn("Cannot register room: User not authenticated.");
      return;
  }

  const roomRef = ref(db, `rooms/${roomId}`);
  
  const roomData: SavedRoom = {
    id: roomId,
    name: roomName || `${hostName}'s Party`,
    hostName: hostName,
    timestamp: Date.now(),
    users: 1, 
    isPrivate: isPrivate,
    password: password || '', 
    media: {
        ...mediaInfo,
        poster_path: mediaInfo.poster_path || null,
        backdrop_path: mediaInfo.backdrop_path || null
    }
  };

  try {
      await set(roomRef, sanitizeData(roomData));
      onDisconnect(roomRef).remove();
  } catch (error: any) {
      console.error("Failed to register room in DB:", error.message);
  }
};

export const removeRoomFromLobby = (roomId: string) => {
  if (!db) return;
  const roomRef = ref(db, `rooms/${roomId}`);
  remove(roomRef).catch(() => {});
};

export const subscribeToActiveRooms = (callback: (rooms: SavedRoom[]) => void) => {
  if (!db) {
    callback([]);
    return () => {};
  }

  let unsubscribeFunc: (() => void) | undefined;
  let isCancelled = false;

  const init = async () => {
      // Ensure we attempt to wait for auth, as rules likely depend on it
      await waitForAuth();
      if (isCancelled) return;

      const roomsRef = ref(db, 'rooms');
      
      try {
        unsubscribeFunc = onValue(roomsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const roomList = Object.values(data) as SavedRoom[];
                roomList.sort((a, b) => b.timestamp - a.timestamp);
                callback(roomList);
            } else {
                callback([]);
            }
        }, (error) => {
            console.error("Room subscription error:", error.message);
            callback([]);
        });
      } catch (e) {
          console.error("Subscription setup failed", e);
          callback([]);
      }
  };

  init();
  return () => {
      isCancelled = true;
      if (unsubscribeFunc) unsubscribeFunc();
  };
};

export const logoutUser = async () => {
    if (auth) await signOut(auth);
};