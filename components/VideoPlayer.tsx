import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PLAYER_BASE_URL, THEME_COLOR } from '../constants';
import { saveProgress } from '../services/progress';
import { registerRoomInLobby, removeRoomFromLobby } from '../services/firebase';
import { Users, Play, X, MessageSquare, Copy } from 'lucide-react';
import Peer from 'peerjs';
import { ChatMessage, SavedRoom } from '../types';

interface VideoPlayerProps {
  tmdbId: number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  onNextEpisode?: () => void;
  onPartyStateChange?: (state: { 
    mode: 'none' | 'host' | 'client', 
    messages: ChatMessage[],
    userCount: number,
    roomId?: string,
    error?: string 
  }) => void;
  mediaTitle?: string; // Passed to register room name
}

export interface VideoPlayerRef {
  sendChat: (text: string) => void;
  startHosting: () => void;
  joinParty: (id: string) => void;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ 
  tmdbId, type, season = 1, episode = 1, onNextEpisode, onPartyStateChange, mediaTitle 
}, ref) => {
  const [src, setSrc] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [searchParams] = useSearchParams();
  
  // Watch Party State
  const [partyMode, setPartyMode] = useState<'none' | 'host' | 'client'>('none');
  const [peerId, setPeerId] = useState('');
  const [userCount, setUserCount] = useState(1);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lastError, setLastError] = useState<string | undefined>(undefined);

  // User Identity
  const username = searchParams.get('name') || 'Guest';

  // Peer Refs
  const peerInstance = useRef<Peer | null>(null);
  const connections = useRef<any[]>([]); // For host
  const clientConn = useRef<any>(null); // For client
  const isRemoteUpdate = useRef(false);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    sendChat: (text: string) => {
        const msg: ChatMessage = { 
            text, 
            sender: username === 'Guest' ? 'You' : username, 
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
        };
        
        const localMsg = { ...msg, sender: 'You' };
        addMessage(localMsg);

        // Broadcast with real name
        broadcast('chat', { ...msg, sender: username });
        
        if (partyMode === 'client' && clientConn.current?.open) {
            clientConn.current.send({ command: 'chat', payload: { ...msg, sender: username } });
        }
    },
    startHosting: () => startHosting(),
    joinParty: (id: string) => joinParty(id)
  }));

  // Clean ID for peerjs
  const generateCleanId = () => 'wp-' + Math.random().toString(36).substr(2, 9);

  // Helper to update messages and notify parent
  const addMessage = (msg: ChatMessage) => {
    setChatMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev; // Dedup
        const newState = [...prev, msg].sort((a,b) => a.timestamp - b.timestamp);
        return newState;
    });
  };

  // Sync state to parent
  useEffect(() => {
    onPartyStateChange?.({
        mode: partyMode,
        messages: chatMessages,
        userCount,
        roomId: peerId,
        error: lastError
    });
  }, [partyMode, chatMessages, userCount, peerId, lastError]);

  useEffect(() => {
    let url = '';
    const params = new URLSearchParams({
      autoPlay: 'false',
      theme: THEME_COLOR,
      poster: 'true',
      title: 'true',
      hideServerControls: 'false',
    });

    if (type === 'movie') {
      url = `${PLAYER_BASE_URL}/movie/${tmdbId}?${params.toString()}`;
    } else {
      params.append('autoNext', 'true');
      params.append('nextButton', 'true');
      url = `${PLAYER_BASE_URL}/tv/${tmdbId}/${season}/${episode}?${params.toString()}`;
    }
    
    setSrc(url);
  }, [tmdbId, type, season, episode]);

  // Handle Incoming Party Messages
  const handlePartyData = (data: any, conn?: any) => {
      if (!iframeRef.current || !data) return;

      if (data.command === 'chat') {
          const msg = data.payload;
          addMessage(msg);
          
          // Relay logic for Host: Receive from client -> Broadcast to others
          if (partyMode === 'host') {
             broadcast('chat', msg); 
          }
          return;
      }
      
      if (data.command) {
          isRemoteUpdate.current = true;
          iframeRef.current.contentWindow?.postMessage({
              command: data.command,
              time: data.time
          }, '*');
          setTimeout(() => { isRemoteUpdate.current = false; }, 1000);
      }
  };

  const saveToHistory = (id: string, name: string) => {
      try {
          const stored = localStorage.getItem('kstream_recent_rooms');
          const rooms: SavedRoom[] = stored ? JSON.parse(stored) : [];
          // Remove duplicates
          const filtered = rooms.filter(r => r.id !== id);
          filtered.unshift({ id, name, timestamp: Date.now() });
          // Limit to 10
          const limited = filtered.slice(0, 10);
          localStorage.setItem('kstream_recent_rooms', JSON.stringify(limited));
      } catch (e) {
          console.error("Failed to save room history", e);
      }
  };

  // Host Party Logic
  const startHosting = (customId?: string) => {
      setLastError(undefined);
      if (peerInstance.current) peerInstance.current.destroy();

      const id = customId || generateCleanId();
      const peer = new Peer(id);
      
      peer.on('open', (id) => {
          setPeerId(id);
          setPartyMode('host');
          peerInstance.current = peer;
          addMessage({ id: 'sys-start', text: 'Room created. Waiting for others...', sender: 'System', timestamp: Date.now(), isSystem: true });
          
          const roomName = `Watching ${mediaTitle || 'Video'}`;
          saveToHistory(id, roomName);
          
          // Register in Firebase Lobby
          registerRoomInLobby(id, roomName, mediaTitle || '');
      });

      peer.on('connection', (conn) => {
          connections.current.push(conn);
          setUserCount(prev => prev + 1);
          addMessage({ id: `sys-join-${Date.now()}`, text: 'A user joined the party', sender: 'System', timestamp: Date.now(), isSystem: true });
          
          conn.on('data', (data) => handlePartyData(data, conn));

          conn.on('close', () => {
              connections.current = connections.current.filter(c => c !== conn);
              setUserCount(prev => prev - 1);
              addMessage({ id: `sys-leave-${Date.now()}`, text: 'A user left the party', sender: 'System', timestamp: Date.now(), isSystem: true });
          });
      });

      peer.on('error', (err) => {
          console.error(err);
          setLastError(`Host Error: ${err.type}`);
          setPartyMode('none');
          if(peerId) removeRoomFromLobby(peerId);
      });
  };

  // Join Party Logic
  const joinParty = (targetId: string) => {
      setLastError(undefined);
      if (!targetId) return;
      if (peerInstance.current) peerInstance.current.destroy();
      
      const peer = new Peer();
      peerInstance.current = peer;

      peer.on('open', () => {
          const conn = peer.connect(targetId);
          clientConn.current = conn;

          conn.on('open', () => {
              setPartyMode('client');
              setPeerId(targetId);
              addMessage({ id: 'sys-con', text: `Connected to room: ${targetId}`, sender: 'System', timestamp: Date.now(), isSystem: true });
              saveToHistory(targetId, `Joined Room ${targetId.slice(0,6)}...`);
          });

          conn.on('data', (data) => handlePartyData(data));
          
          conn.on('close', () => {
              setPartyMode('none');
              addMessage({ id: 'sys-dis', text: 'Host disconnected', sender: 'System', timestamp: Date.now(), isSystem: true });
          });
      });
      
      peer.on('error', (err) => {
          console.error("Connection Error", err);
          setLastError(`Failed to join: ${err.type}`);
          setPartyMode('none');
      });
  };

  // Cleanup on unmount
  useEffect(() => {
      return () => { 
          if (peerInstance.current) {
              peerInstance.current.destroy();
          }
          // If we were hosting, remove from firebase
          if (partyMode === 'host' && peerId) {
              removeRoomFromLobby(peerId);
          }
      };
  }, [partyMode, peerId]);

  // Auto-init based on URL
  useEffect(() => {
      const partyId = searchParams.get('partyId');
      const partyModeParam = searchParams.get('partyMode');

      if (partyId && partyModeParam && partyMode === 'none') {
          if (peerInstance.current) return;
          if (partyModeParam === 'host') startHosting(partyId);
          else if (partyModeParam === 'client') joinParty(partyId);
      }
  }, [searchParams]);

  const broadcast = (command: string, payload: any) => {
      if (partyMode !== 'host') return;
      
      connections.current.forEach(conn => {
          if (conn.open) {
              if (command === 'chat') {
                  conn.send({ command, payload });
              } else {
                  conn.send({ command, time: payload });
              }
          }
      });
  };

  // Event Listener for Player
  useEffect(() => {
    const vidfastOrigins = [
        'https://vidfast.pro', 'https://vidfast.in', 'https://vidfast.io',
        'https://vidfast.me', 'https://vidfast.net', 'https://vidfast.pm', 'https://vidfast.xyz'
    ];

    const handleMessage = ({ origin, data }: MessageEvent) => {
        if (!vidfastOrigins.includes(origin) || !data) return;

        if (data.type === 'MEDIA_DATA') {
            saveProgress(data.data);
        }

        if (partyMode === 'host' && data.type === 'PLAYER_EVENT') {
            if (isRemoteUpdate.current) return;
            const { event, currentTime } = data.data;
            if (['play', 'pause', 'seeked'].includes(event)) {
                broadcast(event, currentTime);
            }
        }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [partyMode]);

  return (
    <div className="space-y-4">
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 group">
            <iframe
                ref={iframeRef}
                src={src}
                title="Video Player"
                className="absolute top-0 left-0 w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                frameBorder="0"
            />
        </div>
        
        {/* Minimal Control Bar - Info Only */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-md p-4 rounded-xl border border-white/10 relative overflow-hidden">
            <div>
               <h1 className="text-xl md:text-2xl font-bold text-white">
                {type === 'tv' ? 'Episode Player' : 'Movie Player'}
               </h1>
               <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                   <span>Server: VidFast</span>
                   <span className="hidden sm:inline">•</span>
                   <span>Auto-Next Enabled</span>
               </div>
            </div>
            
            {partyMode !== 'none' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                    <Users className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm font-bold text-indigo-300">
                        {partyMode === 'host' ? 'Hosting Party' : 'In Party'}
                    </span>
                    <span className="text-xs text-indigo-400/70 ml-1">
                        ({userCount} users)
                    </span>
                </div>
            )}
        </div>
    </div>
  );
});

export default VideoPlayer;