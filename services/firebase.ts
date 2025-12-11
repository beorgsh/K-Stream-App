import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/auth';
import { FIREBASE_CONFIG } from '../constants';
import { SavedRoom, ChatMessage } from '../types';

let app;
if (!firebase.apps.length) {
  app = firebase.initializeApp(FIREBASE_CONFIG);
} else {
  app = firebase.app();
}

export const db = firebase.database();
export const auth = firebase.auth();

export const waitForAuth = (): Promise<any> => {
    return new Promise((resolve) => {
        if (auth.currentUser) { resolve(auth.currentUser); return; }
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
        setTimeout(() => {
             resolve(auth.currentUser);
        }, 2000);
    });
};

export const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("No authenticated user found.");

    // 1. Re-authenticate
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    await user.reauthenticateWithCredential(credential);

    // 2. Update Password
    await user.updatePassword(newPassword);
};

const sanitizeData = <T>(data: T): T => {
    return JSON.parse(JSON.stringify(data, (key, value) => {
        if (value === undefined) return null;
        return value;
    }));
};

// --- ROOM LOBBY LOGIC ---

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
  const user = await waitForAuth();
  if (!user) {
      console.warn("Cannot register room: User not authenticated.");
      return;
  }

  const roomRef = db.ref(`rooms/${roomId}`);
  
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
      await roomRef.set(sanitizeData(roomData));
      // If host disconnects, remove the room AND the chats
      roomRef.onDisconnect().remove();
      db.ref(`chats/${roomId}`).onDisconnect().remove();
  } catch (error: any) {
      console.error("Failed to register room in DB:", error.message);
  }
};

export const removeRoomFromLobby = (roomId: string) => {
  // Remove Room Info
  const roomRef = db.ref(`rooms/${roomId}`);
  roomRef.remove().catch(() => {});
  
  // Remove Chat History
  const chatRef = db.ref(`chats/${roomId}`);
  chatRef.remove().catch(() => {});
};

export const subscribeToActiveRooms = (callback: (rooms: SavedRoom[]) => void) => {
  const roomsRef = db.ref('rooms');
  
  const listener = roomsRef.on('value', (snapshot) => {
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

  return () => {
      roomsRef.off('value', listener);
  };
};

// --- SYNC LOGIC (RELAY FALLBACK) ---

export const updateRoomSync = async (roomId: string, syncState: any) => {
    if (!roomId) return;
    const syncRef = db.ref(`rooms/${roomId}/sync`);
    await syncRef.set({
        ...syncState,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    });
};

export const subscribeToRoomSync = (roomId: string, callback: (state: any) => void) => {
    if (!roomId) return () => {};
    const syncRef = db.ref(`rooms/${roomId}/sync`);
    
    const listener = syncRef.on('value', (snapshot) => {
        const val = snapshot.val();
        if (val) callback(val);
    });
    
    return () => syncRef.off('value', listener);
};

// --- CHAT LOGIC ---

export const subscribeToChat = (roomId: string, callback: (messages: ChatMessage[]) => void) => {
    if (!roomId) return () => {};

    const chatRef = db.ref(`chats/${roomId}`);

    const listener = chatRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const msgs = Object.values(data) as ChatMessage[];
            msgs.sort((a, b) => a.timestamp - b.timestamp);
            callback(msgs);
        } else {
            callback([]);
        }
    });

    return () => chatRef.off('value', listener);
};

export const sendChatMessage = async (roomId: string, message: ChatMessage) => {
    if (!roomId) return;
    
    const chatRef = db.ref(`chats/${roomId}`);
    await chatRef.push().set(message);
};

export const logoutUser = async () => {
    await auth.signOut();
};