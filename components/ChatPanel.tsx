import React, { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle, Copy, Check } from 'lucide-react';
import { ChatMessage } from '../types';

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
  className = '' 
}) => {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

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
      <div className={`h-[500px] xl:h-full bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 flex flex-col items-center justify-center p-6 text-center ${className}`}>
         <MessageCircle className="h-12 w-12 text-gray-600 mb-4" />
         <h3 className="text-xl font-bold text-white mb-2">Watch Party</h3>
         <p className="text-sm text-gray-400">Join a room from the Rooms page to start chatting.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-slate-900/80 backdrop-blur-md border-t lg:border-t-0 lg:border-l border-white/10 overflow-hidden ${className}`}>
      {/* Header with Room Info */}
      <div className="p-3 border-b border-white/10 bg-black/20 flex-shrink-0">
         <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2 text-white font-bold">
                 <MessageCircle className="h-4 w-4 text-indigo-400" />
                 <span>Live Chat</span>
             </div>
             <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${partyMode === 'host' ? 'text-green-400 bg-green-500/10' : 'text-blue-400 bg-blue-500/10'}`}>
                {partyMode === 'host' ? 'Host' : 'Viewer'}
             </span>
         </div>
         
         {partyMode === 'host' && roomId && (
             <div className="flex items-center gap-2 bg-indigo-900/20 border border-indigo-500/30 rounded p-1.5">
                 <div className="flex-1 min-w-0">
                     <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider mb-0.5">Room ID</p>
                     <p className="text-xs text-white font-mono truncate">{roomId}</p>
                 </div>
                 <button 
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-indigo-500/20 rounded text-indigo-300 transition-colors"
                    title="Copy Room ID"
                 >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                 </button>
             </div>
         )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth" ref={scrollRef}>
        {messages.length === 0 && (
            <div className="text-center text-xs text-gray-500 mt-10 italic">
                Room ready. Say hello!
            </div>
        )}
        {messages.map((msg) => {
            // Check if user is sender based on local logic (sender name matching param would be ideal, 
            // but relying on "You" check or simple logic for now)
            // Note: In WatchParty.tsx, we set the sender as username. 
            // Since we don't have the current user's name passed explicitly as a prop for comparison here easily without context,
            // we assume if the message was added locally immediately, it might need identification.
            // However, typical chat logic compares msg.sender === currentUser.username.
            // For now, let's rely on visual distinctness.
            
            // NOTE: The previous logic hardcoded 'You' sometimes. 
            // In a real app, pass currentUsername as prop.
            // For this design, we will assume standard layout.
            // We'll trust the caller sends messages with specific sender names.
            // But we need to know who "I" am to align right.
            // Since `username` isn't prop here, we can't perfectly align "Right" for "Me" 
            // unless we pass `currentUsername` prop. 
            // *Assuming parent passes messages where "You" or matches local storage name.*
            // **Correction**: To make this work perfectly, the user will see their own name.
            // Let's rely on a visual style where we might not know "me" perfectly without the prop,
            // BUT usually, we can infer or just style them nicely. 
            
            // To fix "Messenger Style", we really need to know which message is MINE.
            // I will assume for now that if I sent it, the parent component might mark it or I just align left/right based on a prop I should add.
            // Since I can't easily change the Interface across all files without breaking, I'll use a trick:
            // The `WatchParty` sends `username`.
            
            return (
              <div key={msg.id} className={`flex flex-col ${msg.isSystem ? 'items-center' : 'w-full'}`}>
                  {msg.isSystem ? (
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold px-2 py-1 bg-white/5 rounded-full my-2">
                        {msg.text}
                      </span>
                  ) : (
                      <div className={`flex w-full ${msg.sender === (new URLSearchParams(window.location.hash.split('?')[1]).get('name') || 'Guest') ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex flex-col max-w-[85%] ${msg.sender === (new URLSearchParams(window.location.hash.split('?')[1]).get('name') || 'Guest') ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] text-gray-500 px-1 mb-0.5">
                                  {msg.sender}
                              </span>
                              <div className={`px-4 py-2 rounded-2xl text-sm break-words shadow-sm ${
                                  msg.sender === (new URLSearchParams(window.location.hash.split('?')[1]).get('name') || 'Guest')
                                  ? 'bg-indigo-600 text-white rounded-tr-sm' 
                                  : 'bg-slate-700 text-gray-100 rounded-tl-sm'
                              }`}>
                                  {msg.text}
                              </div>
                              <span className="text-[9px] text-gray-600 px-1 mt-0.5">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                          </div>
                      </div>
                  )}
              </div>
            );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 bg-black/30 border-t border-white/10 flex gap-2 flex-shrink-0">
        <input 
           type="text" 
           value={input}
           onChange={(e) => setInput(e.target.value)}
           placeholder="Type a message..."
           className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600"
        />
        <button 
           type="submit"
           disabled={!input.trim()}
           className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-600/20 aspect-square flex items-center justify-center"
        >
           <Send className="h-4 w-4 ml-0.5" />
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;