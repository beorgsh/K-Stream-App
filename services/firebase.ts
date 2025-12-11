import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, onDisconnect, remove } from 'firebase/database';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
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

export const registerRoomInLobby = (
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

  const roomRef = ref(db, `rooms/${roomId}`);
  
  // Create room entry
  const roomData: SavedRoom = {
    id: roomId,
    name: roomName || `${hostName}'s Party`,
    hostName: hostName,
    timestamp: Date.now(),
    users: 1, // Start with host
    isPrivate: isPrivate,
    password: password || '', // Only stored for client-side check in this simple MVP
    media: mediaInfo
  };

  set(roomRef, roomData);

  // Auto-remove room when host disconnects (closes tab)
  onDisconnect(roomRef).remove();
};

export const removeRoomFromLobby = (roomId: string) => {
  if (!db) return;
  const roomRef = ref(db, `rooms/${roomId}`);
  remove(roomRef);
};

export const subscribeToActiveRooms = (callback: (rooms: SavedRoom[]) => void) => {
  if (!db) {
    callback([]);
    return () => {};
  }

  const roomsRef = ref(db, 'rooms');
  
  const unsubscribe = onValue(roomsRef, (snapshot) => {
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
      console.error("Error fetching rooms:", error);
      callback([]);
  });

  return unsubscribe;
};

export const logoutUser = async () => {
    if (auth) {
        await signOut(auth);
    }
};