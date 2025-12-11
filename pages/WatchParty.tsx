import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Peer from 'peerjs';
import { Loader2, LogOut, Users, MessageSquare, List, RefreshCw, AlertTriangle, Play } from 'lucide-react';
import VideoPlayer, { VideoPlayerRef } from '../components/VideoPlayer';
import ChatPanel from '../components/ChatPanel';
import SeasonSelector from '../components/SeasonSelector';
import { fetchMediaDetails } from '../services/api';
import { registerRoomInLobby, removeRoomFromLobby, subscribeToChat, sendChatMessage } from '../services/firebase';
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
  
  // Interaction State (Required for Autoplay Audio on Mobile/Chrome)
  // Host has already interacted by creating room. Guests need to tap once.
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
        } catch (e) {
            alert("Failed to load media.");
            navigate('/');
            return;
        }

        // 2. Setup PeerJS (Video Sync Only)
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

  // --- Firebase Chat Subscription ---
  useEffect(() => {
    if (!peerId) return;
    
    // Subscribe to Firebase Chat for this room
    const unsubscribe = subscribeToChat(peerId, (msgs) => {
        setMessages(msgs);
    });

    return () => unsubscribe();
  }, [peerId]);

  // --- Peer Config for better Mobile Connectivity ---
  // Adding multiple free public STUN servers to increase chance of NAT traversal on mobile data
  const getPeerConfig = () => ({
      config: {
          iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' },
              { urls: 'stun:stun.ekiga.net' },
              { urls: 'stun:stun.ideasip.com' },
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
          
          // Register in Lobby
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
                  backdrop_path: null 
              }
          );
          
          addSystemMessage(`Room created. Chat is now live.`);
      });

      peer.on('connection', (conn) => {
          connections.current.push(conn);
          setUserCount(prev => prev + 1);
          
          conn.on('open', () => {
             // Send current media state to new user (P2P for sync)
             conn.send({ type: 'media_change', data: { season, episode } });
             addSystemMessage(`${conn.metadata?.name || 'A user'} joined.`);
             
             // Auto-sync: Send a 'play' command shortly after they join to force alignment
             // if the host is currently playing.
             setTimeout(() => {
                 conn.send({ type: 'request_sync_response', data: { action: 'play', time: 0 } });
             }, 2000);
          });

          // Handle Manual Sync Request from Client
          conn.on('data', (data: any) => {
              if (data && data.type === 'request_sync') {
                  // Simply pause and play to force everyone to align to host
                  playerRef.current?.pause(); 
                  setTimeout(() => playerRef.current?.play(), 500);
              }
          });

          conn.on('close', () => {
             connections.current = connections.current.filter(c => c !== conn);
             setUserCount(prev => prev - 1);
             addSystemMessage("A user left.");
          });
      });
      
      peer.on('error', (err) => {
          console.error(err);
          // Don't alert on peer-unavailable (client refresh), just log
          if (err.type !== 'peer-unavailable') {
             // Suppress annoying alerts for host
             console.warn("Host Peer Error:", err.type);
          }
      });
  };

  // --- Client Logic ---

  const setupClient = () => {
      setStatus('Connecting to Host...');
      if (!partyId) {
          alert("No Party ID provided");
          navigate('/');
          return;
      }

      const peer = new Peer(getPeerConfig());
      peerInstance.current = peer;

      peer.on('open', () => {
          const conn = peer.connect(partyId, { 
              metadata: { name: username },
              reliable: true 
          });
          hostConn.current = conn;

          conn.on('open', () => {
              setLoading(false);
              setStatus('Connected');
              setPeerId(partyId);
          });

          conn.on('data', (data) => handleSyncData(data));
          
          conn.on('close', () => {
              alert("Host disconnected the room.");
              navigate('/');
          });
          
          // If connection takes too long
          setTimeout(() => {
              if (!conn.open) {
                   setStatus('Connection timed out. Try switching networks (WiFi vs Data).');
              }
          }, 15000); // Increased timeout for mobile
      });

      peer.on('error', (err) => {
           console.error(err);
           alert("Could not connect. The host might be on a restricted network.");
           navigate('/rooms');
      });
  };

  const handleManualResync = () => {
      if (partyMode === 'client' && hostConn.current?.open) {
          hostConn.current.send({ type: 'request_sync' });
          addSystemMessage("Requested resync from host...");
      }
  };

  const handleLeaveClick = () => {
      setShowLeaveModal(true);
  };

  const confirmLeave = () => {
      navigate('/rooms');
  };

  const handleInteraction = () => {
      setHasInteracted(true);
      // If we are already connected, request a sync immediately after interaction
      if (partyMode === 'client' && hostConn.current?.open) {
          handleManualResync();
      }
  };

  // --- Sync Handling (PeerJS) ---

  const handleSyncData = (packet: any, senderConn?: any) => {
      if (!packet) return;

      // 2. Sync (Client Only - Receiving from Host)
      if (partyMode === 'client' && (packet.type === 'sync' || packet.type === 'request_sync_response')) {
          const { action, time } = packet.data;
          
          // IMPORTANT: If user hasn't interacted, browser might block play() with sound.
          // The overlay ensures hasInteracted is true before they see this.
          
          if (action === 'play') playerRef.current?.play(time);
          if (action === 'pause') playerRef.current?.pause(time);
          if (action === 'seek') playerRef.current?.seek(time);
      }

      // 3. Media Change (Client Only)
      if (partyMode === 'client' && packet.type === 'media_change') {
          setSeason(packet.data.season);
          setEpisode(packet.data.episode);
      }
  };

  const broadcastSync = (packet: any, excludeConn?: any) => {
      connections.current.forEach(conn => {
          if (conn.open && conn !== excludeConn) {
              conn.send(packet);
          }
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
      
      // Send to Firebase
      sendChatMessage(peerId, msg);
  };

  const addSystemMessage = (text: string) => {
      if (!peerId) return;
      const msg: ChatMessage = {
          id: Date.now().toString() + Math.random(),
          text,
          sender: 'System',
          timestamp: Date.now(),
          isSystem: true
      };
      sendChatMessage(peerId, msg);
  };

  // Host Player Events
  const onHostPlayerEvent = (event: { action: 'play'|'pause'|'seek', time: number }) => {
      if (partyMode !== 'host') return;
      broadcastSync({ type: 'sync', data: event });
  };

  const changeEpisode = (s: number, e: number) => {
      setSeason(s);
      setEpisode(e);
      if (partyMode === 'host') {
          broadcastSync({ type: 'media_change', data: { season: s, episode: e } });
      }
  };

  // --- Render ---

  if (loading || !details) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
              <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">{status}</h2>
              {status.includes('timed out') && (
                  <div className="mt-4 space-y-3">
                      <p className="text-gray-400 text-sm">Mobile networks often block P2P connections.</p>
                      <p className="text-gray-400 text-sm">Try connecting both devices to the same WiFi.</p>
                      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 rounded text-white text-sm">Retry Connection</button>
                  </div>
              )}
          </div>
      );
  }

  // --- Interaction Overlay for Autoplay Audio ---
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
                      Tap below to join the party and enable audio sync.
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
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col overflow-hidden">
        {/* Header */}
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
                <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-400 bg-black/20 px-3 py-1.5 rounded-full">
                    <Users className="h-3 w-3 lg:h-4 lg:w-4" />
                    <span>{userCount}</span>
                </div>
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

        {/* Leave Confirmation Modal */}
        {showLeaveModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
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

        {/* Main Layout - Stack on Mobile, Row on Desktop */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            
            {/* Player Area */}
            <div className="w-full lg:flex-1 bg-black flex flex-col justify-center relative flex-shrink-0 lg:flex-shrink-1 h-[40vh] lg:h-auto z-10">
                <div className="w-full h-full lg:max-w-6xl lg:mx-auto lg:px-4 flex items-center bg-black">
                    <VideoPlayer 
                        ref={playerRef}
                        tmdbId={details.id}
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
                        Syncing with Host...
                    </div>
                )}
            </div>

            {/* Sidebar (Tabs) */}
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
                                   tvId={details.id}
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
        </div>
    </div>
  );
};

export default WatchParty;