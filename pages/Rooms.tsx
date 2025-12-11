import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Lock, Unlock, Play, MonitorPlay } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchContent } from '../services/api';
import { Media } from '../types';
import { IMAGE_BASE_URL } from '../constants';

interface Room {
  id: string;
  name: string;
  host: string;
  media: Media | null;
  users: number;
  isPrivate: boolean;
}

const Rooms: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Room Creation State
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [mediaQuery, setMediaQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Media[]>([]);
  const [searching, setSearching] = useState(false);

  // Mock Global Rooms
  const [rooms, setRooms] = useState<Room[]>([
    {
      id: 'demo-room-1',
      name: 'KDrama Chill Night',
      host: 'Sarah',
      media: {
        id: 1396,
        media_type: 'tv',
        title: 'Breaking Bad', 
        name: 'Breaking Bad',
        poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
        backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
        overview: '',
        vote_average: 9.2,
        original_language: 'en'
      },
      users: 12,
      isPrivate: false
    },
    {
      id: 'demo-room-2',
      name: 'Squid Game Marathon',
      host: 'Player456',
      media: {
        id: 93405,
        media_type: 'tv',
        title: 'Squid Game',
        name: 'Squid Game',
        poster_path: '/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg',
        backdrop_path: '/oaGvjB0DvdhXhOKsOOf7YIdFqDJ.jpg',
        overview: '',
        vote_average: 8.4,
        original_language: 'ko'
      },
      users: 5,
      isPrivate: true
    }
  ]);

  // Search logic for Modal
  useEffect(() => {
    const search = async () => {
      if (!mediaQuery) {
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
    if (!roomName || !selectedMedia) return;

    // Generate a random ID for P2P
    const newRoomId = 'room-' + Math.random().toString(36).substr(2, 9);
    
    // In a real app, this would save to a database.
    // For now, we simulate success and navigate.
    
    navigate(`/watch/${selectedMedia.media_type}/${selectedMedia.id}?partyId=${newRoomId}&partyMode=host&name=${encodeURIComponent(roomName)}`);
  };

  const handleJoinRoom = (room: Room) => {
    if (room.isPrivate) {
      const input = prompt("Enter room password:");
      // Mock password check
      if (input !== '123') { // Simple mock check
         alert("Join request sent to host (Mock)");
         // In real P2P, you'd try to connect and handshake
      }
    }
    
    if (room.media) {
         navigate(`/watch/${room.media.media_type}/${room.media.id}?partyId=${room.id}&partyMode=client`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-24 px-4 sm:px-6 lg:px-8 pb-20 animate-fade-in relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-12 relative z-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">Watch Parties</h1>
          <p className="text-gray-400">Join active rooms globally or host your own screening.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          Create Room
        </button>
      </div>

      {/* Room Grid */}
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
               <div className="absolute bottom-3 left-4">
                  <h3 className="font-bold text-white text-lg shadow-black drop-shadow-md">{room.name}</h3>
               </div>
               <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-xs font-mono text-white flex items-center gap-1">
                 <Users className="h-3 w-3" /> {room.users}
               </div>
            </div>

            {/* Room Details */}
            <div className="p-4">
               <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Watching</p>
                    <p className="text-indigo-400 font-medium truncate w-48">{room.media?.title || room.media?.name}</p>
                  </div>
                  {room.isPrivate ? (
                      <Lock className="h-5 w-5 text-red-400" />
                  ) : (
                      <Unlock className="h-5 w-5 text-green-400" />
                  )}
               </div>
               
               <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                     <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                        {room.host[0]}
                     </div>
                     Hosted by {room.host}
                  </div>
                  <button 
                    onClick={() => handleJoinRoom(room)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Join
                  </button>
               </div>
            </div>
          </div>
        ))}

        {/* Empty State / Prompt */}
        <div className="border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-gray-500 hover:border-white/20 transition-colors cursor-pointer" onClick={() => setIsModalOpen(true)}>
             <Plus className="h-10 w-10 mb-2 opacity-50" />
             <p>Create New Room</p>
        </div>
      </div>

      {/* Note about persistence */}
      <div className="mt-12 text-center text-xs text-gray-600 max-w-2xl mx-auto">
        <p>Note: Without a backend server, this global list is simulated. Real P2P rooms work by sharing the Room ID directly. Created rooms will persist in your local history.</p>
      </div>

      {/* Create Room Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6">
               <h2 className="text-2xl font-bold text-white mb-6">Create a Party Room</h2>
               
               {/* Step 1: Room Details */}
               <div className="space-y-4 mb-6">
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

                 {/* Step 2: Select Content */}
                 <div>
                   <label className="block text-sm text-gray-400 mb-1">Select Content</label>
                   {selectedMedia ? (
                     <div className="flex items-center gap-3 bg-indigo-900/20 border border-indigo-500/30 p-2 rounded-lg">
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
                            placeholder="Search for a movie or show..."
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 pl-10 text-white focus:outline-none focus:border-indigo-500"
                        />
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        
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
                                  <div>
                                     <p className="text-sm text-gray-200 font-medium">{item.title || item.name}</p>
                                     <p className="text-xs text-gray-500 capitalize">{item.media_type}</p>
                                  </div>
                               </button>
                             ))}
                          </div>
                        )}
                     </div>
                   )}
                 </div>

                 <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isPrivate} 
                          onChange={(e) => setIsPrivate(e.target.checked)}
                          className="rounded bg-slate-800 border-white/10 text-indigo-500" 
                        />
                        <span className="text-sm text-gray-300">Private Room</span>
                    </label>
                 </div>
                 
                 {isPrivate && (
                    <div className="animate-fade-in">
                       <label className="block text-sm text-gray-400 mb-1">Password</label>
                       <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                       />
                    </div>
                 )}
               </div>

               <div className="flex gap-3">
                 <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
                 >
                    Cancel
                 </button>
                 <button 
                    onClick={handleCreateRoom}
                    disabled={!roomName || !selectedMedia}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                 >
                    Create & Host
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;