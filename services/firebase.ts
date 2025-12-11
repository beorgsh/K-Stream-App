import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, onDisconnect, remove } from 'firebase/database';
import { FIREBASE_CONFIG } from '../constants';
import { SavedRoom } from '../types';

// Initialize Firebase
// Note: If config is invalid (default placeholders), this might throw warnings in console but won't crash app
let db: any;
try {
  const app = initializeApp(FIREBASE_CONFIG);
  db = getDatabase(app);
} catch (e) {
  console.warn("Firebase not initialized. Check your constants.ts config.");
}

export const registerRoomInLobby = (roomId: string, roomName: string, mediaTitle: string) => {
  if (!db) return;

  const roomRef = ref(db, `rooms/${roomId}`);
  
  // Create room entry
  const roomData: SavedRoom = {
    id: roomId,
    name: roomName || `Watch Party`,
    timestamp: Date.now(),
    users: 1, // Start with host
    // We can add extra metadata if we want (media title, etc)
    // For type compatibility we store title in name or extended props
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
  });

  return unsubscribe;
};