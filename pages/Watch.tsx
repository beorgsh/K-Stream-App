import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { fetchMediaDetails } from '../services/api';
import { MediaDetails } from '../types';
import VideoPlayer, { VideoPlayerRef } from '../components/VideoPlayer';
import SeasonSelector from '../components/SeasonSelector';
import MediaCard from '../components/MediaCard';
import { WatchSkeleton } from '../components/Skeleton';
import { AlertCircle, List, Info, Grid, Star, Clock, Users, Calendar } from 'lucide-react';
import { auth } from '../services/firebase';
import { IMAGE_BASE_URL } from '../constants';

const Watch: React.FC = () => {
  const { type, id } = useParams<{ type: 'movie' | 'tv'; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Auth State
  const [authChecked, setAuthChecked] = useState(false);
  
  // Tab State for Mobile/Sidebar
  const [activeTab, setActiveTab] = useState<'episodes' | 'info' | 'recommendations'>('episodes');
  
  const playerRef = useRef<VideoPlayerRef>(null);

  // 1. Auth Guard
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
        if (!user) {
            // Not logged in -> Redirect to login
            navigate('/login');
        } else {
            // Logged in -> Allow loading
            setAuthChecked(true);
        }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. Load Content (Only after Auth Check)
  useEffect(() => {
    if (!authChecked || !type || !id) return;
    
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
        
        // Handle Tab Query Param
        const tabParam = searchParams.get('tab');
        if (tabParam === 'info') {
            setActiveTab('info');
        } else if (data.media_type === 'movie') {
            // Movies default to info or recommendations since no episodes
            setActiveTab('info');
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
  }, [authChecked, type, id, searchParams]);

  // Show Skeleton while checking auth or loading data
  if (!authChecked || loading) {
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
  const recommendations = details.similar?.results || details.recommendations?.results || [];

  // Determine if content is Anime (Genre ID 16 + Language 'ja')
  const isAnime = details.genres?.some(g => g.id === 16) && details.original_language === 'ja';

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-10 px-4 sm:px-6 lg:px-8 animate-fade-in">
      
      <div className={`max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-4 gap-6`}>
        
        {/* Player Section */}
        <div className={`xl:col-span-3 space-y-4`}>
          <VideoPlayer 
            ref={playerRef}
            tmdbId={details.id} 
            type={details.media_type as 'movie' | 'tv'} 
            season={season}
            episode={episode}
            mediaTitle={details.title || details.name}
            posterPath={details.poster_path}
            backdropPath={details.backdrop_path}
            isAnime={isAnime}
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
            <div className="flex xl:hidden gap-2 mb-4 bg-slate-900/50 p-1.5 rounded-xl border border-white/5 overflow-x-auto hide-scrollbar">
                {isTV && (
                    <button 
                        onClick={() => setActiveTab('episodes')}
                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'episodes' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <List className="h-4 w-4" /> Episodes
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'info' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                >
                    <Info className="h-4 w-4" /> Info
                </button>
                 <button 
                    onClick={() => setActiveTab('recommendations')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'recommendations' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                >
                    <Grid className="h-4 w-4" /> Related
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
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'info' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-white/5'}`}
                >
                    Info
                </button>
                <button 
                    onClick={() => setActiveTab('recommendations')}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'recommendations' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-white/5'}`}
                >
                    Related
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

                {/* Info Tab */}
                {activeTab === 'info' && (
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6 h-full overflow-y-auto space-y-6">
                        {/* Poster & Stats */}
                        <div className="flex gap-4">
                           <div className="w-24 flex-shrink-0 rounded-lg overflow-hidden shadow-lg border border-white/10">
                              <img 
                                src={details.poster_path ? `${IMAGE_BASE_URL}/w300${details.poster_path}` : ''} 
                                alt="" 
                                className="w-full h-full object-cover"
                              />
                           </div>
                           <div className="flex-1 space-y-2">
                               <div className="flex items-center gap-2 text-sm text-yellow-400">
                                  <Star className="h-4 w-4 fill-current" />
                                  <span className="font-bold">{details.vote_average.toFixed(1)}</span>
                               </div>
                               <div className="flex items-center gap-2 text-xs text-gray-300">
                                  <Calendar className="h-3 w-3" />
                                  <span>{details.release_date || details.first_air_date}</span>
                               </div>
                               {details.runtime ? (
                                   <div className="flex items-center gap-2 text-xs text-gray-300">
                                      <Clock className="h-3 w-3" />
                                      <span>{details.runtime} min</span>
                                   </div>
                               ) : null}
                               <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/10 text-gray-300">
                                 {details.status}
                               </span>
                           </div>
                        </div>

                        {/* Overview */}
                        <div>
                            <h3 className="text-sm font-bold text-white mb-2">Overview</h3>
                            <p className="text-gray-300 text-sm leading-relaxed">{details.overview}</p>
                        </div>

                        {/* Genres */}
                        <div>
                            <h3 className="text-sm font-bold text-white mb-2">Genres</h3>
                            <div className="flex flex-wrap gap-2">
                                {details.genres?.map(g => (
                                    <span key={g.id} className="text-xs bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded text-indigo-300">
                                        {g.name}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Cast */}
                        <div>
                             <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <Users className="h-4 w-4" /> Top Cast
                             </h3>
                             <div className="space-y-3">
                                 {details.credits?.cast.slice(0, 6).map(actor => (
                                     <div key={actor.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg">
                                         <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800">
                                            {actor.profile_path ? (
                                                <img src={`${IMAGE_BASE_URL}/w185${actor.profile_path}`} className="w-full h-full object-cover" alt={actor.name} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">N/A</div>
                                            )}
                                         </div>
                                         <div className="min-w-0">
                                             <p className="text-xs font-bold text-white truncate">{actor.name}</p>
                                             <p className="text-[10px] text-gray-400 truncate">{actor.character}</p>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                )}

                {/* Recommendations Tab */}
                {activeTab === 'recommendations' && (
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 h-full overflow-y-auto p-4">
                        {recommendations.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                {recommendations.map(media => (
                                    <div key={media.id} className="w-full">
                                        <MediaCard media={media} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <AlertCircle className="h-8 w-8 mb-2" />
                                <p className="text-sm">No recommendations found.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Watch;