import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Peer from 'peerjs';
import { Loader2, LogOut, Users, MessageSquare, List, RefreshCw, AlertTriangle, Play, Wifi, WifiOff, Maximize, Minimize, MessageSquareOff } from 'lucide-react';
import VideoPlayer, { VideoPlayerRef } from '../components/VideoPlayer';
import ChatPanel from '../components/ChatPanel';
import SeasonSelector from '../components/SeasonSelector';
import { fetchMediaDetails } from '../services/api';
import { registerRoomInLobby, removeRoomFromLobby, subscribeToChat, sendChatMessage, updateRoomSync, subscribeToRoomSync } from '../services/firebase';
import { ChatMessage, MediaDetails } from '../types';

const WatchParty: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Params
  const partyMode = searchParams.get('mode') as 'host' | 'client' | null;
  const partyId = searchParams.get('partyId');
  const username = searchParams.get('name') || 'Guest';
  
  // Media Params
  const tmdbId = Number(searchParams.get('tmdbId'));
  const type = searchParams.get('type') as 'movie' | 'tv';
  
  // State
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Initializing...');
  const [activeTab, setActiveTab] = useState<'chat' | 'episodes'>('chat');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [p2pConnected, setP2pConnected] = useState(false);
  
  // Fullscreen & UI State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChatOverlay, setShowChatOverlay] = useState(true);
  
  // Interaction State (Required for Autoplay Audio on Mobile/Chrome)
  const [hasInteracted, setHasInteracted] = useState(partyMode === 'host');
  
  // Media State
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  
  // Party State
  const [peerId, setPeerId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userCount, setUserCount] = useState(1);

  // Refs
  const playerRef = useRef<VideoPlayerRef>(null);
  const peerInstance = useRef<Peer | null>(null);
  const connections = useRef<any[]>([]); // For Host
  const hostConn = useRef<any>(null); // For Client
  const lastSyncTime = useRef<number>(0); // Debounce syncs INCOMING
  const firebaseSyncDebounceTimer = useRef<any>(null); // Debounce syncs OUTGOING (Host)
  const containerRef = useRef<HTMLDivElement>(null); // For Fullscreen

  // --- Initialization ---

  useEffect(() => {
    if (!partyMode || !tmdbId || !type) {
        navigate('/');
        return;
    }

    const init = async () => {
        // 1. Fetch Media Details
        setStatus('Loading media...');
        try {
            const mediaData = await fetchMediaDetails(type, tmdbId);
            setDetails(mediaData);
            
            // For Clients, we stop loading here to allow UI to render immediately
            // Connectivity (P2P/Firebase) happens in background
            if (partyMode === 'client') {
                setLoading(false);
                setPeerId(partyId || '');
            }
        } catch (e) {
            alert("Failed to load media.");
            navigate('/');
            return;
        }

        // 2. Setup Connectivity
        if (partyMode === 'host') {
            setupHost();
        } else {
            setupClient();
        }
    };

    init();

    return () => {
        if (partyMode === 'host' && peerId) {
            removeRoomFromLobby(peerId);
        }
        if (peerInstance.current) {
            peerInstance.current.destroy();
        }
    };
  }, []);

  // Listen for Fullscreen Changes
  useEffect(() => {
      const handleFsChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFsChange);
      return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // --- Firebase Subscriptions ---
  useEffect(() => {
    if (!peerId) return;
    
    // 1. Chat
    const unsubChat = subscribeToChat(peerId, (msgs) => setMessages(msgs));

    // 2. Sync (Relay Fallback) - Crucial for "Different Network" support
    const unsubSync = subscribeToRoomSync(peerId, (syncState) => {
        // Host ignores own echo, Clients process it
        if (partyMode === 'client' && syncState) {
            // Media Change Check
            if (syncState.media) {
                // If the host changed the episode, update local state
                if (syncState.media.season !== season || syncState.media.episode !== episode) {
                    setSeason(syncState.media.season);
                    setEpisode(syncState.media.episode);
                    // Reset sync timer to allow immediate new sync commands for the new episode
                    lastSyncTime.current = 0; 
                }
            }

            // Playback Sync
            if (syncState.action) {
                // Calculate latency compensation
                // timestamp comes from Host's Date.now()
                const latency = Math.max(0, (Date.now() - syncState.timestamp) / 1000);
                const adjustedTime = syncState.time + (syncState.action === 'play' ? latency : 0);
                
                // Debounce redundant updates (e.g. if P2P also delivered it)
                if (Date.now() - lastSyncTime.current < 500) return;
                lastSyncTime.current = Date.now();

                // Apply
                if (syncState.action === 'play') {
                    playerRef.current?.seek(adjustedTime);
                    setTimeout(() => playerRef.current?.play(), 250);
                } else if (syncState.action === 'pause') {
                    playerRef.current?.pause();
                    playerRef.current?.seek(syncState.time);
                } else if (syncState.action === 'seek') {
                    playerRef.current?.seek(syncState.time);
                }
            }
        }
    });

    return () => {
        unsubChat();
        unsubSync();
    };
  }, [peerId, partyMode, season, episode]);

  // --- Peer Config ---
  const getPeerConfig = () => ({
      config: {
          iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' }
          ]
      }
  });

  // --- Host Logic ---

  const setupHost = () => {
      setStatus('Creating Room...');
      const id = partyId || `wp-${Math.random().toString(36).substr(2, 9)}`;
      const peer = new Peer(id, getPeerConfig());
      peerInstance.current = peer;

      peer.on('open', (id) => {
          setPeerId(id);
          setLoading(false);
          setP2pConnected(true);
          
          const roomName = searchParams.get('roomName') || `${username}'s Room`;
          const isPrivate = searchParams.get('isPrivate') === 'true';
          const password = searchParams.get('password') || undefined;

          registerRoomInLobby(
              id, roomName, username, isPrivate, password, 
              { 
                  id: tmdbId, 
                  type: type, 
                  title: searchParams.get('title') || 'Unknown', 
                  poster_path: searchParams.get('poster') || null, 
                  backdrop_path: searchParams.get('backdrop') || null 
              }
          );
          
          addSystemMessage(`Room created. Relay active.`);
          
          // Initialize Firebase Sync State
          updateRoomSync(id, { media: { season, episode }, timestamp: Date.now() });
      });

      peer.on('connection', (conn) => {
          connections.current.push(conn);
          setUserCount(prev => prev + 1);
          conn.on('open', () => {
             // Initial P2P Sync
             conn.send({ type: 'media_change', data: { season, episode } });
             playerRef.current?.getStatus();
             addSystemMessage(`${conn.metadata?.name || 'A user'} joined via P2P.`);
          });
          conn.on('data', (data: any) => {
              if (data?.type === 'request_sync') playerRef.current?.getStatus();
          });
          conn.on('close', () => {
             connections.current = connections.current.filter(c => c !== conn);
             setUserCount(prev => prev - 1);
          });
      });
      
      peer.on('error', (err) => {
          console.warn("Host Peer Error:", err.type);
          if (err.type === 'network' || err.type === 'disconnected') {
              setP2pConnected(false);
              addSystemMessage("P2P Network Issue. Switching to Relay-only.");
          }
      });
  };

  // --- Client Logic ---

  const setupClient = () => {
      // Note: loading is already false at this point for UI responsiveness
      if (!partyId) return;

      const peer = new Peer(getPeerConfig());
      peerInstance.current = peer;

      peer.on('open', () => {
          const conn = peer.connect(partyId, { 
              metadata: { name: username },
              reliable: true 
          });
          hostConn.current = conn;

          conn.on('open', () => {
              setP2pConnected(true);
              setStatus('Connected');
              // Request immediate sync
              conn.send({ type: 'request_sync' });
          });

          conn.on('data', (data) => handleP2PSync(data));
          conn.on('close', () => setP2pConnected(false));
          
          setTimeout(() => {
              if (!conn.open) {
                   console.warn("P2P Timeout - Using Firebase Relay");
                   setStatus('Connected (Relay Mode)');
              }
          }, 5000);
      });

      peer.on('error', (err) => {
           console.warn("Client Peer Error:", err.type);
           setP2pConnected(false);
           setStatus('Connected (Relay Mode)');
      });
  };

  const handleManualResync = () => {
      // 1. Try P2P
      if (partyMode === 'client' && hostConn.current?.open) {
          hostConn.current.send({ type: 'request_sync' });
      }
      addSystemMessage("Syncing...");
  };

  const handleLeaveClick = () => setShowLeaveModal(true);
  const confirmLeave = () => navigate('/rooms');

  const handleInteraction = () => {
      setHasInteracted(true);
      if (partyMode === 'client') handleManualResync();
  };

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().catch(err => {
              console.error("Error attempting to enable fullscreen:", err);
          });
      } else {
          document.exitFullscreen();
      }
  };

  // --- Sync Handling ---

  // P2P Handler
  const handleP2PSync = (packet: any) => {
      if (!packet) return;
      lastSyncTime.current = Date.now(); // Mark P2P activity to prevent double-sync

      if (packet.type === 'sync') {
          const { action, time, isAbsolute } = packet.data;
          if (isAbsolute) {
             playerRef.current?.seek(time);
             setTimeout(() => {
                 if (action === 'play') playerRef.current?.play();
                 else playerRef.current?.pause();
             }, 500);
          } else {
             if (action === 'play') playerRef.current?.play(time);
             if (action === 'pause') playerRef.current?.pause(time);
             if (action === 'seek') playerRef.current?.seek(time);
          }
      }
      if (packet.type === 'media_change') {
          setSeason(packet.data.season);
          setEpisode(packet.data.episode);
          lastSyncTime.current = 0; // Reset debounce so next sync command works immediately
      }
  };

  const broadcastP2P = (packet: any) => {
      connections.current.forEach(conn => {
          if (conn.open) conn.send(packet);
      });
  };

  // --- Actions ---

  const sendMessage = (text: string) => {
      if (!peerId) return;
      const msg: ChatMessage = {
          id: Date.now().toString() + Math.random().toString(),
          text,
          sender: username,
          timestamp: Date.now()
      };
      sendChatMessage(peerId, msg);
  };

  const addSystemMessage = (text: string) => {
      if (!peerId) return;
      sendChatMessage(peerId, {
          id: Date.now().toString() + Math.random(),
          text,
          sender: 'System',
          timestamp: Date.now(),
          isSystem: true
      });
  };

  // Host Player Events -> Broadcast to ALL channels
  const onHostPlayerEvent = (event: { action: 'play'|'pause'|'seek'|'sync', time: number, playing?: boolean }) => {
      if (partyMode !== 'host') return;

      // 1. P2P Broadcast (Immediate & Fast)
      if (event.action === 'sync') {
          broadcastP2P({ 
              type: 'sync', 
              data: { action: event.playing ? 'play' : 'pause', time: event.time, isAbsolute: true } 
          });
      } else {
          broadcastP2P({ type: 'sync', data: event });
      }

      // 2. Firebase Broadcast (Reliable Fallback) - WITH DEBOUNCE
      // Clear existing timer
      if (firebaseSyncDebounceTimer.current) {
          clearTimeout(firebaseSyncDebounceTimer.current);
      }

      // Wait 1000ms before sending to Firebase to prevent flooding
      firebaseSyncDebounceTimer.current = setTimeout(() => {
          const actionMap = event.action === 'sync' ? (event.playing ? 'play' : 'pause') : event.action;
          
          updateRoomSync(peerId, {
              action: actionMap,
              time: event.time,
              timestamp: Date.now(),
              media: { season, episode }
          });
      }, 1000);
  };

  const changeEpisode = (s: number, e: number) => {
      setSeason(s);
      setEpisode(e);
      if (partyMode === 'host') {
          // P2P Update
          broadcastP2P({ type: 'media_change', data: { season: s, episode: e } });
          
          // Firebase Update
          updateRoomSync(peerId, { 
              media: { season: s, episode: e }, 
              action: 'play', // Auto-play new episode
              time: 0,        // Start at 0
              timestamp: Date.now() 
          });
      }
  };

  // --- Render ---

  if (loading || !details) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
              <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">{status}</h2>
              {partyMode === 'client' && (
                 <p className="text-sm text-gray-500">Connecting to secure relay...</p>
              )}
          </div>
      );
  }

  // Interaction Overlay
  if (!hasInteracted && partyMode === 'client') {
      return (
          <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="absolute top-0 left-0 w-full h-full">
                   {details.backdrop_path && (
                       <img 
                        src={`https://image.tmdb.org/t/p/w1280${details.backdrop_path}`} 
                        className="w-full h-full object-cover opacity-20"
                        alt=""
                       />
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/80" />
              </div>
              
              <div className="relative z-10 max-w-md">
                  <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-600/30 animate-pulse">
                      <Play className="h-10 w-10 text-white fill-current ml-1" />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2">Ready to Watch?</h1>
                  <h2 className="text-xl text-indigo-300 font-semibold mb-6">{details.title || details.name}</h2>
                  <p className="text-gray-400 mb-8">
                      Tap below to sync with the party.
                  </p>
                  <button 
                    onClick={handleInteraction}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-600/20 transition-transform active:scale-95"
                  >
                      Join Party
                  </button>
              </div>
          </div>
      );
  }

  const isHost = partyMode === 'host';
  const isTV = details.media_type === 'tv';

  return (
    <div ref={containerRef} className={`fixed inset-0 bg-slate-950 text-white flex flex-col overflow-hidden ${isFullscreen ? 'z-50' : ''}`}>
        {/* Header - Hidden in Fullscreen unless hovered or custom toggle? For now, hidden to look like theater mode */}
        {!isFullscreen && (
            <div className="h-14 lg:h-16 border-b border-white/10 bg-slate-900/50 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-20">
                <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
                    <div className="flex flex-col min-w-0">
                        <h1 className="text-sm lg:text-lg font-bold truncate">
                            {details.title || details.name}
                        </h1>
                        {isTV && <span className="text-[10px] lg:text-xs text-indigo-400">S{season}:E{episode}</span>}
                    </div>
                    {isHost && (
                        <span className="hidden sm:inline-block px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] rounded border border-indigo-500/30">
                            HOST
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-2 lg:gap-4">
                    {/* Connection Status Indicator */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-bold ${p2pConnected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}`} title={p2pConnected ? 'P2P Direct Connection' : 'Firebase Relay Mode'}>
                        {p2pConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                        <span className="hidden sm:inline">{p2pConnected ? 'Direct' : 'Relay'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-400 bg-black/20 px-3 py-1.5 rounded-full">
                        <Users className="h-3 w-3 lg:h-4 lg:w-4" />
                        <span>{userCount}</span>
                    </div>

                    {/* Fullscreen Toggle */}
                    <button
                        onClick={toggleFullscreen}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors text-xs lg:text-sm font-bold border border-indigo-500/20"
                        title="Theater Mode"
                    >
                        <Maximize className="h-3 w-3 lg:h-4 lg:w-4" /> <span className="hidden lg:inline">Theater Mode</span>
                    </button>

                    {!isHost && (
                        <button 
                            onClick={handleManualResync}
                            className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors"
                            title="Resync with Host"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    )}
                    <button 
                        onClick={handleLeaveClick}
                        className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors text-xs lg:text-sm font-bold"
                    >
                        <LogOut className="h-3 w-3 lg:h-4 lg:w-4" /> <span className="hidden sm:inline">Leave</span>
                    </button>
                </div>
            </div>
        )}

        {/* Leave Confirmation Modal */}
        {showLeaveModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Leave Watch Party?</h3>
                    <p className="text-gray-400 mb-6 text-sm">
                        You will be disconnected from the chat and sync session.
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowLeaveModal(false)}
                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmLeave}
                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors"
                        >
                            Leave Room
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Fullscreen Exit Button (Floating) */}
        {isFullscreen && (
            <div className="absolute top-4 right-4 z-[60] flex gap-2">
                 <button 
                    onClick={() => setShowChatOverlay(!showChatOverlay)}
                    className="p-3 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md border border-white/10 transition-colors shadow-lg"
                    title="Toggle Chat"
                 >
                    {showChatOverlay ? <MessageSquareOff className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                 </button>
                 <button 
                    onClick={toggleFullscreen}
                    className="p-3 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-md border border-white/10 transition-colors shadow-lg"
                    title="Exit Fullscreen"
                 >
                    <Minimize className="h-5 w-5" />
                 </button>
            </div>
        )}

        {/* Main Layout */}
        <div className={`flex-1 flex ${isFullscreen ? 'relative' : 'flex-col lg:flex-row'} overflow-hidden`}>
            
            {/* Player Area */}
            <div className={`w-full bg-black flex flex-col justify-center relative flex-shrink-0 z-10 ${isFullscreen ? 'absolute inset-0 h-full' : 'lg:flex-1 h-[40vh] lg:h-auto'}`}>
                <div className={`w-full h-full flex items-center bg-black ${!isFullscreen ? 'lg:max-w-6xl lg:mx-auto lg:px-4' : ''}`}>
                    <VideoPlayer 
                        ref={playerRef}
                        tmdbId={Number(details.id)}
                        type={type}
                        season={season}
                        episode={episode}
                        isHost={isHost}
                        onPlayerEvent={onHostPlayerEvent}
                        enableProgressSave={false} 
                    />
                </div>
                {!isHost && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur text-white text-[10px] lg:text-xs px-3 py-1 rounded-full pointer-events-none border border-white/10">
                        Syncing...
                    </div>
                )}
            </div>

            {/* Chat Overlay (Fullscreen Mode) */}
            {isFullscreen && showChatOverlay && (
                <div className="absolute right-4 bottom-20 w-80 md:w-96 h-[50vh] min-h-[400px] z-50 rounded-2xl overflow-hidden shadow-2xl animate-fade-in border border-white/10 bg-black/40 backdrop-blur-md">
                     <ChatPanel 
                        messages={messages}
                        partyMode={isHost ? 'host' : 'client'}
                        roomId={peerId}
                        onSendMessage={sendMessage}
                        onJoinParty={() => {}} 
                        onStartHosting={() => {}}
                        className="h-full bg-transparent"
                    />
                </div>
            )}

            {/* Sidebar (Normal Mode) */}
            {!isFullscreen && (
                <div className="w-full lg:w-96 flex-1 lg:flex-none border-t lg:border-t-0 lg:border-l border-white/10 bg-slate-900/50 flex flex-col min-h-0 z-10">
                    {/* Tab Header */}
                    <div className="flex border-b border-white/5 bg-slate-900">
                        <button 
                            onClick={() => setActiveTab('chat')}
                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/5' : 'text-gray-400 hover:text-white'}`}
                        >
                            <MessageSquare className="h-4 w-4" /> Chat
                        </button>
                        {/* Only Host sees Episodes tab for TV Shows */}
                        {isHost && isTV && (
                            <button 
                                onClick={() => setActiveTab('episodes')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'episodes' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/5' : 'text-gray-400 hover:text-white'}`}
                            >
                                <List className="h-4 w-4" /> Episodes
                            </button>
                        )}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-hidden relative bg-slate-950/30">
                        {activeTab === 'chat' ? (
                            <ChatPanel 
                                messages={messages}
                                partyMode={isHost ? 'host' : 'client'}
                                roomId={peerId}
                                onSendMessage={sendMessage}
                                onJoinParty={() => {}} 
                                onStartHosting={() => {}}
                                className="h-full border-0 rounded-none bg-transparent"
                            />
                        ) : (
                            <div className="h-full overflow-y-auto p-2">
                            {details.seasons && (
                                <SeasonSelector 
                                    tvId={Number(details.id)}
                                    seasons={details.seasons}
                                    currentSeason={season}
                                    currentEpisode={episode}
                                    onSelect={changeEpisode}
                                    showBackdrop={details.backdrop_path}
                                />
                            )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default WatchParty;