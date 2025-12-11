import React, { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle, Copy, Check } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  partyMode: 'none' | 'host' | 'client';
  roomId?: string;
  onStartHosting: () => void; // Kept for interface compatibility but not used in UI
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