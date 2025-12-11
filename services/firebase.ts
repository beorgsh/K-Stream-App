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
  console.warn("Firebase not initialized. Check your constants.ts config.");
}

export { auth, db };

// Helper to wait for auth to be ready
const waitForAuth = (): Promise<any> => {
    return new Promise((resolve) => {
        if (!auth) {
            resolve(null); 
            return;
        }
        // If currentUser is already populated, resolve immediately
        if (auth.currentUser) {
            resolve(auth.currentUser);
            return;
        }
        
        let resolved = false;

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (resolved) return;
            resolved = true;
            unsubscribe();
            resolve(user);
        });

        // Safety timeout in case onAuthStateChanged hangs or network fails
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                // unsubscribe might not be accessible if it hasn't returned yet, 
                // but usually it's fine. We just resolve null.
                console.warn("Auth check timed out, proceeding as guest/unauthenticated.");
                resolve(auth?.currentUser || null);
            }
        }, 3000);
    });
};

// Ensure no undefined values are sent to Firebase (it rejects them)
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

  // Ensure user is authenticated before writing to DB
  const user = await waitForAuth();
  if (!user) {
      console.error("Cannot register room: User not authenticated");
      return;
  }

  const roomRef = ref(db, `rooms/${roomId}`);
  
  // Create room entry
  const roomData: SavedRoom = {
    id: roomId,
    name: roomName || `${hostName}'s Party`,
    hostName: hostName,
    timestamp: Date.now(),
    users: 1, // Start with host
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
      // Auto-remove room when host disconnects (closes tab)
      onDisconnect(roomRef).remove();
  } catch (error: any) {
      console.error("Failed to register room in DB:", error);
      if (error.code === 'PERMISSION_DENIED') {
          console.error("FIREBASE RULES ERROR: You must allow writes to '/rooms'. Go to Firebase Console -> Realtime Database -> Rules and set '.write': 'auth != null' for 'rooms'.");
      }
  }
};

export const removeRoomFromLobby = (roomId: string) => {
  if (!db) return;
  const roomRef = ref(db, `rooms/${roomId}`);
  remove(roomRef).catch(err => console.error("Error removing room:", err));
};

export const subscribeToActiveRooms = (callback: (rooms: SavedRoom[]) => void) => {
  if (!db) {
    callback([]);
    return () => {};
  }

  let unsubscribeFunc: (() => void) | undefined;
  let isCancelled = false;

  const init = async () => {
      // Vital: Wait for auth before trying to read 'rooms' if rules require auth
      const user = await waitForAuth();
      
      if (isCancelled) return;

      // Even if no user, we try to fetch rooms (maybe rules are public)
      const roomsRef = ref(db, 'rooms');
      
      // Attach listener
      try {
        unsubscribeFunc = onValue(roomsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
            const roomList = Object.values(data) as SavedRoom[];
            // Sort by newest
            roomList.sort((a, b) => b.timestamp - a.timestamp);
            callback(roomList);
            } else {
            callback([]);
            }
        }, (error) => {
            console.error("Error fetching rooms:", error.message);
            if (error.message.includes('permission_denied')) {
                 console.error("FIREBASE RULES ERROR: You must allow reads to '/rooms'. Set '.read': true in Firebase Console -> Realtime Database -> Rules.");
            }
            if (error.message.includes('404')) {
                 console.error("FIREBASE 404: Database URL not found. 1) Go to Firebase Console -> Realtime Database. 2) Create the database if missing. 3) Ensure constant.ts matches the URL displayed there.");
            }
            callback([]);
        });
      } catch (e) {
          console.error("Subscription setup error", e);
      }
  };

  init();

  // Return cleanup function
  return () => {
      isCancelled = true;
      if (unsubscribeFunc) unsubscribeFunc();
  };
};

export const logoutUser = async () => {
    if (auth) {
        await signOut(auth);
    }
};