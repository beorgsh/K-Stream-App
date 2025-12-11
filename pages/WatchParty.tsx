import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Peer from 'peerjs';
import { Loader2, LogOut, Users, MessageSquare, List } from 'lucide-react';
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

  // --- Host Logic ---

  const setupHost = () => {
      setStatus('Creating Room...');
      const id = partyId || `wp-${Math.random().toString(36).substr(2, 9)}`;
      const peer = new Peer(id);
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
          });

          // P2P Data is now ONLY for Video/Media sync, not chat
          conn.on('data', (data) => handleSyncData(data, conn));

          conn.on('close', () => {
             connections.current = connections.current.filter(c => c !== conn);
             setUserCount(prev => prev - 1);
             addSystemMessage("A user left.");
          });
      });
      
      peer.on('error', (err) => {
          console.error(err);
          alert("Connection Error: " + err.type);
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

      const peer = new Peer();
      peerInstance.current = peer;

      peer.on('open', () => {
          const conn = peer.connect(partyId, { metadata: { name: username } });
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
      });

      peer.on('error', (err) => {
           console.error(err);
           alert("Could not connect to room. It may be closed.");
           navigate('/');
      });
  };

  // --- Sync Handling (PeerJS) ---

  const handleSyncData = (packet: any, senderConn?: any) => {
      if (!packet) return;

      // NOTE: Chat is now handled by Firebase subscription, not here.

      // 2. Sync (Client Only - Receiving from Host)
      if (partyMode === 'client' && packet.type === 'sync') {
          const { action, time } = packet.data;
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
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
              <h2 className="text-xl font-bold text-white">{status}</h2>
          </div>
      );
  }

  const isHost = partyMode === 'host';
  const isTV = details.media_type === 'tv';

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
        {/* Simplified Header */}
        <div className="h-16 border-b border-white/10 bg-slate-900/50 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold truncate max-w-xs md:max-w-md">
                        {details.title || details.name}
                    </h1>
                    {isTV && <span className="text-xs text-indigo-400">S{season}:E{episode}</span>}
                </div>
                {isHost && (
                    <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded border border-indigo-500/30">
                        HOST
                    </span>
                )}
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-black/20 px-3 py-1.5 rounded-full">
                    <Users className="h-4 w-4" />
                    <span>{userCount}</span>
                </div>
                <button 
                    onClick={() => navigate('/rooms')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors text-sm font-bold"
                >
                    <LogOut className="h-4 w-4" /> Leave Room
                </button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
            {/* Player Area */}
            <div className="flex-1 bg-black flex flex-col justify-center relative">
                <div className="w-full max-w-6xl mx-auto px-4">
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
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur text-white text-xs px-4 py-2 rounded-full pointer-events-none">
                        Syncing with Host...
                    </div>
                )}
            </div>

            {/* Sidebar (Tabs) */}
            <div className="w-80 md:w-96 border-l border-white/10 bg-slate-900/50 flex flex-col">
                {/* Tab Header */}
                <div className="flex border-b border-white/5">
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/5' : 'text-gray-400 hover:text-white'}`}
                    >
                        <MessageSquare className="h-4 w-4" /> Chat
                    </button>
                    {/* Only Host sees Episodes tab for TV Shows */}
                    {isHost && isTV && (
                        <button 
                            onClick={() => setActiveTab('episodes')}
                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'episodes' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/5' : 'text-gray-400 hover:text-white'}`}
                        >
                            <List className="h-4 w-4" /> Episodes
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden relative">
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