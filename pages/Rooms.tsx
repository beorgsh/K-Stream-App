import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Lock, Unlock, MonitorPlay, Loader2, X, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { searchContent } from '../services/api';
import { subscribeToActiveRooms, auth } from '../services/firebase';
import { Media, SavedRoom } from '../types';
import { IMAGE_BASE_URL } from '../constants';
import { onAuthStateChanged } from 'firebase/auth';

const Rooms: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Real Data State
  const [rooms, setRooms] = useState<SavedRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  
  // Auth State
  const [user, setUser] = useState<any>(null);

  // Room Creation State
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  
  // Search State
  const [mediaQuery, setMediaQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Media[]>([]);
  const [searching, setSearching] = useState(false);

  // Subscribe to Auth
  useEffect(() => {
     const unsub = onAuthStateChanged(auth, (u) => {
         setUser(u);
     });
     return () => unsub();
  }, []);

  // Subscribe to Firebase
  useEffect(() => {
    const unsubscribe = subscribeToActiveRooms((data) => {
      setRooms(data || []);
      setLoadingRooms(false);
    });
    return () => unsubscribe();
  }, []);

  // Search logic for Modal
  useEffect(() => {
    const search = async () => {
      if (!mediaQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const results = await searchContent(mediaQuery, true); // Search global
        setSearchResults(results.slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    };

    const timeout = setTimeout(search, 500);
    return () => clearTimeout(timeout);
  }, [mediaQuery]);

  const handleCreateRoom = () => {
    if (!roomName || !selectedMedia || !user) return;

    // We generate the ID here or let PeerJS do it in the player. 
    // Best to let PeerJS do it, but we need to pass params to the player.
    const tempId = 'room-' + Math.random().toString(36).substr(2, 9);
    
    // Construct URL Params
    const params = new URLSearchParams({
      partyId: tempId, // This will be overwritten by PeerJS host logic usually, but we pass it for consistent routing
      partyMode: 'host',
      name: user.displayName || 'Host',
      roomName: roomName,
      isPrivate: isPrivate.toString()
    });

    if (isPrivate && password) {
      params.append('password', password);
    }

    navigate(`/watch/${selectedMedia.media_type}/${selectedMedia.id}?${params.toString()}`);
  };

  const handleJoinRoom = (room: SavedRoom) => {
    let joinName = user?.displayName;
    if (!joinName) {
        joinName = prompt("Enter your display name:", "Guest");
    }
    if (!joinName) return;

    if (room.isPrivate) {
      const input = prompt("Enter room password:");
      // Client side check for MVP
      if (input !== room.password) {
         alert("Incorrect password");
         return;
      }
    }
    
    const params = new URLSearchParams({
      partyId: room.id,
      partyMode: 'client',
      name: joinName
    });

    if (room.media) {
         navigate(`/watch/${room.media.type}/${room.media.id}?${params.toString()}`);
    }
  };

  const openCreationModal = () => {
      if (!user) {
          navigate('/login');
          return;
      }
      setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-24 px-4 sm:px-6 lg:px-8 pb-20 animate-fade-in relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-12 relative z-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 flex items-center gap-3">
             Watch Parties <span className="text-base px-3 py-1 bg-red-600 text-white rounded-full font-bold animate-pulse">LIVE</span>
          </h1>
          <p className="text-gray-400">Join active rooms globally or host your own screening.</p>
        </div>
        <button
          onClick={openCreationModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          Create Room
        </button>
      </div>

      {/* Loading State */}
      {loadingRooms && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        </div>
      )}

      {/* Room Grid */}
      {!loadingRooms && rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/10 rounded-2xl bg-slate-900/50">
              <MonitorPlay className="h-16 w-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-400">No Active Rooms</h3>
              <p className="text-gray-500 mb-6">Be the first to start a party!</p>
              <button
                onClick={openCreationModal}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Create One Now
              </button>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {rooms.map((room) => (
            <div key={room.id} className="bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all group">
              {/* Room Banner (Media Backdrop) */}
              <div className="h-32 w-full relative bg-slate-800">
                {room.media?.backdrop_path ? (
                  <img 
                      src={`${IMAGE_BASE_URL}/w780${room.media.backdrop_path}`} 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                      alt="Room Banner"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <MonitorPlay className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="font-bold text-white text-lg shadow-black drop-shadow-md truncate">{room.name}</h3>
                </div>
                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-xs font-mono text-white flex items-center gap-1">
                  <Users className="h-3 w-3" /> {room.users || 1}
                </div>
              </div>

              {/* Room Details */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                    <div className="overflow-hidden">
                      <p className="text-sm text-gray-400">Watching</p>
                      <p className="text-indigo-400 font-medium truncate">{room.media?.title || 'Unknown Video'}</p>
                    </div>
                    {room.isPrivate ? (
                        <Lock className="h-5 w-5 text-red-400 flex-shrink-0" />
                    ) : (
                        <Unlock className="h-5 w-5 text-green-400 flex-shrink-0" />
                    )}
                </div>
                
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold uppercase">
                          {room.hostName ? room.hostName[0] : 'H'}
                      </div>
                      <span className="truncate max-w-[100px]">Hosted by {room.hostName || 'Unknown'}</span>
                    </div>
                    <button 
                      onClick={() => handleJoinRoom(room)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/10"
                    >
                      Join Party
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      {isModalOpen && user && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
            <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
                <X className="h-6 w-6" />
            </button>
            
            <div className="p-6">
               <h2 className="text-2xl font-bold text-white mb-6">Create a Party Room</h2>
               
               <div className="space-y-4 mb-6">
                 {/* Step 1: User Identity (Auto-filled) */}
                 <div>
                   <label className="block text-sm text-gray-400 mb-1">Host Name</label>
                   <div className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-gray-300">
                       {user.displayName}
                   </div>
                 </div>

                 {/* Step 2: Room Name */}
                 <div>
                   <label className="block text-sm text-gray-400 mb-1">Room Name</label>
                   <input 
                      type="text" 
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="e.g., Kdrama Marathon"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                   />
                 </div>

                 {/* Step 3: Select Content */}
                 <div>
                   <label className="block text-sm text-gray-400 mb-1">Select Content</label>
                   {selectedMedia ? (
                     <div className="flex items-center gap-3 bg-indigo-900/20 border border-indigo-500/30 p-2 rounded-lg relative group">
                        <img src={`${IMAGE_BASE_URL}/w92${selectedMedia.poster_path}`} className="w-10 h-14 object-cover rounded" alt="" />
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-bold text-white truncate">{selectedMedia.title || selectedMedia.name}</p>
                           <button onClick={() => setSelectedMedia(null)} className="text-xs text-red-400 hover:text-red-300 mt-1">Change</button>
                        </div>
                     </div>
                   ) : (
                     <div className="relative">
                        <input 
                            type="text" 
                            value={mediaQuery}
                            onChange={(e) => setMediaQuery(e.target.value)}
                            placeholder="Search movies or shows..."
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 pl-10 text-white focus:outline-none focus:border-indigo-500"
                        />
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        {searching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-indigo-500 animate-spin" />}
                        
                        {/* Dropdown Results */}
                        {searchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                             {searchResults.map(item => (
                               <button 
                                 key={item.id}
                                 onClick={() => { setSelectedMedia(item); setSearchResults([]); setMediaQuery(''); }}
                                 className="w-full flex items-center gap-3 p-2 hover:bg-white/5 text-left transition-colors border-b border-white/5 last:border-0"
                               >
                                  <img 
                                    src={item.poster_path ? `${IMAGE_BASE_URL}/w92${item.poster_path}` : ''} 
                                    className="w-8 h-12 object-cover rounded bg-slate-700" 
                                    alt="" 
                                  />
                                  <div className="min-w-0">
                                     <p className="text-sm text-gray-200 font-medium truncate">{item.title || item.name}</p>
                                     <p className="text-xs text-gray-500 capitalize">{item.media_type} • {item.release_date ? item.release_date.split('-')[0] : 'N/A'}</p>
                                  </div>
                               </button>
                             ))}
                          </div>
                        )}
                     </div>
                   )}
                 </div>

                 {/* Step 4: Privacy */}
                 <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input 
                          type="checkbox" 
                          checked={isPrivate} 
                          onChange={(e) => setIsPrivate(e.target.checked)}
                          className="rounded bg-slate-800 border-white/10 text-indigo-500 w-4 h-4" 
                        />
                        <span className="text-sm text-gray-300">Private Room (Password Protected)</span>
                    </label>
                 </div>
                 
                 {isPrivate && (
                    <div className="animate-fade-in">
                       <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter Room Password"
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                       />
                    </div>
                 )}
               </div>

               <button 
                  onClick={handleCreateRoom}
                  disabled={!roomName || !selectedMedia || !user}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
               >
                  <MonitorPlay className="h-5 w-5" />
                  Create & Host Party
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;