import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMediaDetails } from '../services/api';
import { MediaDetails, ChatMessage } from '../types';
import VideoPlayer, { VideoPlayerRef } from '../components/VideoPlayer';
import SeasonSelector from '../components/SeasonSelector';
import ChatPanel from '../components/ChatPanel';
import { WatchSkeleton } from '../components/Skeleton';
import { ChevronLeft, AlertCircle, MessageSquare, List, Info } from 'lucide-react';

const Watch: React.FC = () => {
  const { type, id } = useParams<{ type: 'movie' | 'tv'; id: string }>();
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab State for Mobile/Sidebar
  const [activeTab, setActiveTab] = useState<'episodes' | 'chat' | 'info'>('episodes');
  
  // Watch Party State lifted from Player
  const [partyState, setPartyState] = useState<{
      mode: 'none' | 'host' | 'client';
      messages: ChatMessage[];
      userCount: number;
      roomId?: string;
  }>({ mode: 'none', messages: [], userCount: 1 });

  const playerRef = useRef<VideoPlayerRef>(null);

  useEffect(() => {
    if (!type || !id) return;
    
    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const wait = new Promise(r => setTimeout(r, 800));
        const [data] = await Promise.all([
           fetchMediaDetails(type as 'movie' | 'tv', Number(id)),
           wait
        ]);
        setDetails(data);
        
        // Default tab logic
        if (data.media_type === 'movie') {
            setActiveTab('chat');
        } else {
            setActiveTab('episodes');
        }
        
        window.scrollTo(0, 0);
      } catch (error) {
        console.error("Failed to load details", error);
        setError("Failed to load content. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [type, id]);

  if (loading) {
    return <WatchSkeleton />;
  }

  if (error || !details) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-gray-400 mb-6">{error || "Content not found"}</p>
        <Link to="/" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium">Return Home</Link>
      </div>
    );
  }

  const handleEpisodeSelect = (s: number, e: number) => {
    setSeason(s);
    setEpisode(e);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isTV = details.media_type === 'tv';

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-10 px-4 sm:px-6 lg:px-8 animate-fade-in">
      
      {/* Back to Details */}
      <div className="max-w-[1600px] mx-auto mb-4">
        <Link 
          to={`/details/${type}/${id}`}
          className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Details
        </Link>
      </div>

      <div className={`max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-4 gap-6`}>
        
        {/* Player Section */}
        <div className={`xl:col-span-3 space-y-4`}>
          <VideoPlayer 
            ref={playerRef}
            tmdbId={details.id} 
            type={details.media_type as 'movie' | 'tv'} 
            season={season}
            episode={episode}
            onPartyStateChange={setPartyState}
            mediaTitle={details.title || details.name}
            posterPath={details.poster_path}
            backdropPath={details.backdrop_path}
          />
          
          {/* Simple Title Bar below player */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <div>
               <h1 className="text-xl md:text-2xl font-bold text-white">
                {details.title || details.name}
               </h1>
               {isTV && (
                 <p className="text-indigo-400 font-medium">
                   Season {season} <span className="text-gray-600 mx-2">|</span> Episode {episode}
                 </p>
               )}
            </div>
          </div>
        </div>

        {/* Sidebar / Tabs Section */}
        <div className="xl:col-span-1 flex flex-col h-auto xl:h-[calc(100vh-120px)] xl:sticky xl:top-24">
            
            {/* Mobile Tab Switcher */}
            <div className="flex xl:hidden gap-2 mb-4 bg-slate-900/50 p-1.5 rounded-xl border border-white/5">
                {isTV && (
                    <button 
                        onClick={() => setActiveTab('episodes')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'episodes' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <List className="h-4 w-4" /> Episodes
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                >
                    <MessageSquare className="h-4 w-4" /> Watch Party
                </button>
                <button 
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'info' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                >
                    <Info className="h-4 w-4" /> Info
                </button>
            </div>

            {/* Desktop Tab Switcher (Sidebar Header) */}
            <div className="hidden xl:flex items-center gap-1 mb-3 bg-slate-900/80 p-1 rounded-lg border border-white/5">
                {isTV && (
                    <button 
                        onClick={() => setActiveTab('episodes')}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'episodes' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-white/5'}`}
                    >
                        Episodes
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-white/5'}`}
                >
                    Watch Party
                </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-hidden min-h-[400px]">
                {/* Episodes Tab */}
                {isTV && activeTab === 'episodes' && details.seasons && (
                    <SeasonSelector 
                        tvId={details.id}
                        seasons={details.seasons}
                        currentSeason={season}
                        currentEpisode={episode}
                        onSelect={handleEpisodeSelect}
                        showBackdrop={details.backdrop_path}
                    />
                )}

                {/* Chat Tab / Watch Party Dedicated Panel */}
                {activeTab === 'chat' && (
                    <ChatPanel 
                        messages={partyState.messages}
                        partyMode={partyState.mode}
                        roomId={partyState.roomId}
                        onSendMessage={(text) => playerRef.current?.sendChat(text)}
                        onStartHosting={() => playerRef.current?.startHosting()}
                        onJoinParty={(id) => playerRef.current?.joinParty(id)}
                        className="h-full"
                    />
                )}

                {/* Info Tab (Mobile Only) */}
                {activeTab === 'info' && (
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6 h-full overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-2">Overview</h3>
                        <p className="text-gray-300 text-sm leading-relaxed mb-4">{details.overview}</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {details.genres?.map(g => (
                                <span key={g.id} className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-300">{g.name}</span>
                            ))}
                        </div>
                        <div className="text-xs text-gray-500">
                            Released: {details.release_date || details.first_air_date}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Watch;