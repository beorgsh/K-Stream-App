import React, { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle, Play, Users, Copy, Check, Hash, History, RefreshCw, SignalHigh } from 'lucide-react';
import { ChatMessage, SavedRoom } from '../types';
import { subscribeToActiveRooms } from '../services/firebase';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  partyMode: 'none' | 'host' | 'client';
  roomId?: string;
  onStartHosting: () => void;
  onJoinParty: (id: string) => void;
  className?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  messages, 
  onSendMessage, 
  partyMode, 
  roomId,
  onStartHosting,
  onJoinParty,
  className = '' 
}) => {
  const [input, setInput] = useState('');
  const [joinId, setJoinId] = useState('');
  const [copied, setCopied] = useState(false);
  const [recentRooms, setRecentRooms] = useState<SavedRoom[]>([]);
  const [activeFirebaseRooms, setActiveFirebaseRooms] = useState<SavedRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load History & Subscribe to Firebase
  useEffect(() => {
      const loadHistory = () => {
          try {
              const stored = localStorage.getItem('kstream_recent_rooms');
              if (stored) {
                  setRecentRooms(JSON.parse(stored));
              }
          } catch (e) { console.error(e); }
      };
      loadHistory();
      
      // Listen for local storage changes (if modified by player)
      window.addEventListener('storage', loadHistory);

      // Subscribe to Realtime Firebase Rooms
      const unsubscribe = subscribeToActiveRooms((rooms) => {
          setActiveFirebaseRooms(rooms);
          setIsLoadingRooms(false);
      });

      return () => {
          window.removeEventListener('storage', loadHistory);
          unsubscribe();
      };
  }, [partyMode]); 

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && partyMode !== 'none') {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleCopy = () => {
    if (roomId) {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  if (partyMode === 'none') {
    return (
      <div className={`h-[500px] xl:h-full bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 flex flex-col overflow-hidden ${className}`}>
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-black/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Watch Party</h3>
            </div>
            <p className="text-xs text-gray-400">Join a room or start your own.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
            
            {/* Quick Actions */}
            <div className="space-y-3">
                <button 
                    onClick={onStartHosting}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                >
                    <Play className="h-4 w-4 fill-white" />
                    Start Hosting
                </button>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value)}
                        placeholder="Enter Room ID"
                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button 
                        onClick={() => onJoinParty(joinId)}
                        disabled={!joinId}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                        Join
                    </button>
                </div>
            </div>

            {/* Public Rooms List (Firebase) */}
            <div>
                <div className="flex items-center justify-between mb-2 px-1">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <SignalHigh className="h-3 w-3" /> Live Rooms
                    </h4>
                    {isLoadingRooms && <RefreshCw className="h-3 w-3 text-gray-600 animate-spin" />}
                </div>
                
                {activeFirebaseRooms.length === 0 && !isLoadingRooms ? (
                     <div className="text-center py-4 bg-white/5 rounded-lg border border-dashed border-white/10">
                        <p className="text-xs text-gray-500">No active rooms right now.</p>
                        <p className="text-[10px] text-gray-600">Be the first to host!</p>
                     </div>
                ) : (
                    <div className="space-y-2">
                        {activeFirebaseRooms.map(room => (
                            <button
                                key={room.id}
                                onClick={() => onJoinParty(room.id)}
                                className="w-full text-left p-3 rounded-lg bg-indigo-900/10 hover:bg-indigo-900/20 border border-indigo-500/10 hover:border-indigo-500/30 transition-all group"
                            >
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className="font-bold text-indigo-200 text-sm group-hover:text-white transition-colors truncate max-w-[150px]">
                                        {room.name}
                                    </span>
                                    <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                        Live
                                    </span>
                                </div>
                                <div className="text-[10px] text-gray-500 font-mono flex justify-between">
                                    <span className="truncate opacity-50">ID: {room.id}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Rooms List */}
            {recentRooms.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-1">
                        <History className="h-3 w-3" /> Recent History
                    </h4>
                    <div className="space-y-2">
                        {recentRooms.map(room => (
                            <button
                                key={room.timestamp}
                                onClick={() => onJoinParty(room.id)}
                                className="w-full text-left p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 border border-white/5 transition-colors"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-300 text-sm truncate max-w-[150px]">
                                        {room.name || room.id}
                                    </span>
                                    <span className="text-[10px] text-gray-600">
                                        {new Date(room.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[500px] xl:h-full bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden ${className}`}>
      {/* Header with Room Info */}
      <div className="p-4 border-b border-white/10 bg-black/20">
         <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2 text-white font-bold">
                 <MessageCircle className="h-4 w-4 text-indigo-400" />
                 <span>Live Chat</span>
             </div>
             <span className="text-[10px] uppercase tracking-wider font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                {partyMode === 'host' ? 'Host' : 'Connected'}
             </span>
         </div>
         
         {partyMode === 'host' && roomId && (
             <div className="flex items-center gap-2 bg-indigo-900/20 border border-indigo-500/30 rounded p-2">
                 <div className="flex-1 min-w-0">
                     <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider mb-0.5">Room ID</p>
                     <p className="text-xs text-white font-mono truncate">{roomId}</p>
                 </div>
                 <button 
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-indigo-500/20 rounded text-indigo-300 transition-colors"
                    title="Copy Room ID"
                 >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                 </button>
             </div>
         )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth" ref={scrollRef}>
        {messages.length === 0 && (
            <div className="text-center text-xs text-gray-500 mt-10 italic">
                Room ready. Waiting for messages...
            </div>
        )}
        {messages.map((msg) => (
           <div key={msg.id} className={`flex flex-col ${msg.isSystem ? 'items-center' : 'items-start'} animate-fade-in`}>
              {msg.isSystem ? (
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold px-2 py-1 bg-white/5 rounded-full my-2">
                    {msg.text}
                  </span>
              ) : (
                  <div className="max-w-[90%] w-full">
                      <div className="flex items-baseline gap-2 mb-1">
                          <span className={`text-xs font-bold truncate max-w-[100px] ${msg.sender === 'You' ? 'text-indigo-400' : 'text-purple-400'}`}>
                              {msg.sender}
                          </span>
                          <span className="text-[10px] text-gray-600">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                      </div>
                      <div className={`px-3 py-2 rounded-lg text-sm break-words shadow-sm ${
                          msg.sender === 'You' 
                          ? 'bg-indigo-600/20 text-indigo-100 border border-indigo-500/20 rounded-tl-none' 
                          : 'bg-slate-700/50 text-slate-200 border border-white/5 rounded-tr-none'
                      }`}>
                          {msg.text}
                      </div>
                  </div>
              )}
           </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 bg-black/30 border-t border-white/10 flex gap-2">
        <input 
           type="text" 
           value={input}
           onChange={(e) => setInput(e.target.value)}
           placeholder="Type a message..."
           className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600"
        />
        <button 
           type="submit"
           disabled={!input.trim()}
           className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-600/20"
        >
           <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;