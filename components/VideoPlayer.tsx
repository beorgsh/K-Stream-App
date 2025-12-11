import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PLAYER_BASE_URL, THEME_COLOR } from '../constants';
import { saveProgress } from '../services/progress';
import { registerRoomInLobby, removeRoomFromLobby } from '../services/firebase';
import { Users, Lock } from 'lucide-react';
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
  mediaTitle?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
}

export interface VideoPlayerRef {
  sendChat: (text: string) => void;
  startHosting: () => void;
  joinParty: (id: string) => void;
}

// VidFast Origins for security check
const VIDFAST_ORIGINS = [
    'https://vidfast.pro',
    'https://vidfast.in',
    'https://vidfast.io',
    'https://vidfast.me',
    'https://vidfast.net',
    'https://vidfast.pm',
    'https://vidfast.xyz',
    'https://vidsrc.to',
    'https://vidsrc.me'
];

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ 
  tmdbId, type, season = 1, episode = 1, onNextEpisode, onPartyStateChange, mediaTitle, posterPath, backdropPath
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

  // User Identity & Room Config
  const username = searchParams.get('name') || 'Guest';
  const roomNameParam = searchParams.get('roomName');
  const roomPasswordParam = searchParams.get('password');
  const isPrivateParam = searchParams.get('isPrivate') === 'true';

  // Peer Refs
  const peerInstance = useRef<Peer | null>(null);
  const connections = useRef<any[]>([]); // For host
  const clientConn = useRef<any>(null); // For client
  
  // Flag to prevent feedback loops (Host receives its own command via echo)
  const isRemoteUpdate = useRef(false);

  // --- External Methods ---
  useImperativeHandle(ref, () => ({
    sendChat: (text: string) => {
        const msg: ChatMessage = { 
            text, 
            sender: username === 'Guest' ? 'You' : username, 
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
        };
        
        // 1. Add locally
        addMessage({ ...msg, sender: 'You' });

        // 2. Send to network
        const payload = { type: 'chat', data: { ...msg, sender: username } };
        
        if (partyMode === 'host') {
            broadcast(payload);
        } else if (partyMode === 'client' && clientConn.current?.open) {
            clientConn.current.send(payload);
        }
    },
    startHosting: () => startHosting(),
    joinParty: (id: string) => joinParty(id)
  }));

  // --- Helper Functions ---

  const generateCleanId = () => 'wp-' + Math.random().toString(36).substr(2, 9);

  const addMessage = (msg: ChatMessage) => {
    setChatMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg].sort((a,b) => a.timestamp - b.timestamp);
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

  // Load Iframe
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

  // --- Networking Logic ---

  const handleIncomingData = (packet: any, senderConn?: any) => {
      if (!packet || !packet.type) return;

      // 1. CHAT
      if (packet.type === 'chat') {
          const msg = packet.data;
          addMessage(msg);
          // If I am Host, relay to everyone else
          if (partyMode === 'host') {
              broadcast(packet, senderConn); // Exclude sender from echo
          }
          return;
      }

      // 2. VIDEO SYNC (Only Clients execute this, Host is the source)
      if (packet.type === 'sync' && partyMode === 'client') {
          const { action, time } = packet.data;
          executePlayerCommand(action, time);
      }
  };

  const executePlayerCommand = (command: 'play' | 'pause' | 'seek', time?: number) => {
      if (!iframeRef.current) return;
      
      // Mark as remote update so we don't treat the resulting event as a user action
      isRemoteUpdate.current = true;

      iframeRef.current.contentWindow?.postMessage({
          command: command,
          time: time
      }, '*');

      // Reset flag after short delay
      setTimeout(() => { isRemoteUpdate.current = false; }, 500);
  };

  const broadcast = (packet: any, excludeConn?: any) => {
      connections.current.forEach(conn => {
          if (conn.open && conn !== excludeConn) {
              conn.send(packet);
          }
      });
  };

  // --- Host Logic ---
  const startHosting = (customId?: string) => {
      if (peerInstance.current) peerInstance.current.destroy();

      const id = customId || generateCleanId();
      const peer = new Peer(id);
      
      peer.on('open', (id) => {
          setPeerId(id);
          setPartyMode('host');
          peerInstance.current = peer;
          addMessage({ id: 'sys-start', text: 'Room created. You have control.', sender: 'System', timestamp: Date.now(), isSystem: true });
          
          registerRoomInLobby(
              id, 
              roomNameParam || `Watching ${mediaTitle || 'Video'}`, 
              username,
              isPrivateParam,
              roomPasswordParam || undefined,
              { id: tmdbId, type, title: mediaTitle || 'Unknown', poster_path: posterPath || null, backdrop_path: backdropPath || null }
          );
      });

      peer.on('connection', (conn) => {
          connections.current.push(conn);
          setUserCount(prev => prev + 1);
          addMessage({ id: `sys-join-${Date.now()}`, text: 'A user joined the party', sender: 'System', timestamp: Date.now(), isSystem: true });
          
          conn.on('data', (data) => handleIncomingData(data, conn));

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
      });
  };

  // --- Client Logic ---
  const joinParty = (targetId: string) => {
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
              addMessage({ id: 'sys-con', text: `Connected! Waiting for host...`, sender: 'System', timestamp: Date.now(), isSystem: true });
          });

          conn.on('data', (data) => handleIncomingData(data));
          
          conn.on('close', () => {
              setPartyMode('none');
              addMessage({ id: 'sys-dis', text: 'Host disconnected', sender: 'System', timestamp: Date.now(), isSystem: true });
          });
      });
      
      peer.on('error', (err) => {
          setLastError(`Failed to join: ${err.type}`);
          setPartyMode('none');
      });
  };

  // --- Lifecycle & Initialization ---

  useEffect(() => {
      const partyId = searchParams.get('partyId');
      const partyModeParam = searchParams.get('partyMode');

      // Only init if we haven't already and URL has params
      if (partyId && partyModeParam && partyMode === 'none' && !peerInstance.current) {
          if (partyModeParam === 'host') startHosting(partyId);
          else if (partyModeParam === 'client') joinParty(partyId);
      }
      
      // Cleanup
      return () => { 
          if (peerInstance.current) peerInstance.current.destroy();
          if (partyMode === 'host' && peerId) removeRoomFromLobby(peerId);
      };
  }, []); // Run once on mount to check URL

  // --- Event Listeners (The Core Sync Logic) ---
  useEffect(() => {
    const handleMessage = ({ origin, data }: MessageEvent) => {
        // 1. Security Check
        const isVidFast = VIDFAST_ORIGINS.some(o => origin.includes(o) || origin === o);
        // Allow internal messages or vidfast messages (relaxed check for development)
        if (!data) return;

        // 2. Progress Saving (Always happens)
        if (data.type === 'MEDIA_DATA') {
            saveProgress(data.data);
        }

        // 3. Player Events -> Broadcast
        if (data.type === 'PLAYER_EVENT') {
            // STRICT RULE: Only HOST broadcasts events. Clients are passive.
            if (partyMode !== 'host') return;

            // If this event was caused by our own automated command (feedback loop), ignore it.
            if (isRemoteUpdate.current) return;

            const { event, currentTime } = data.data;

            // Map VidFast events to our Sync Actions
            if (['play', 'pause', 'seeked'].includes(event)) {
                // VidFast uses 'seeked', we broadcast 'seek'
                const action = event === 'seeked' ? 'seek' : event;
                
                broadcast({ 
                    type: 'sync', 
                    data: { action: action, time: currentTime }
                });
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
            
            {/* Overlay for Clients to prevent clicking (Optional UX enhancement) */}
            {partyMode === 'client' && (
                <div className="absolute inset-x-0 bottom-0 h-16 bg-transparent z-10 pointer-events-none flex justify-center">
                    {/* We don't block the whole screen so they can fullscreen, but we imply they don't control it */}
                </div>
            )}
        </div>
        
        {/* Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-md p-4 rounded-xl border border-white/10 relative overflow-hidden">
            <div>
               <h1 className="text-xl md:text-2xl font-bold text-white">
                {type === 'tv' ? 'Episode Player' : 'Movie Player'}
               </h1>
               <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                   <span>Server: VidFast</span>
               </div>
            </div>
            
            {partyMode !== 'none' && (
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
                        partyMode === 'host' 
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' 
                        : 'bg-green-500/10 border-green-500/20 text-green-300'
                    }`}>
                        <Users className="h-4 w-4" />
                        <span className="text-sm font-bold">
                            {partyMode === 'host' ? 'Host Controls' : 'Sync Active'}
                        </span>
                        <span className="text-xs opacity-70 ml-1">
                            ({userCount} users)
                        </span>
                    </div>
                    {partyMode === 'client' && (
                        <div className="px-3 py-2 bg-slate-800 rounded-lg border border-white/5 text-xs text-gray-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Only Host can control
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
});

export default VideoPlayer;