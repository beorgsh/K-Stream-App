import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAnimeDetails, fetchAnimeEpisodes, fetchAnimeSources, fetchAnimeServers } from '../services/anime';
import { MediaDetails, AnimeEpisode } from '../types';
import AnimePlayer from '../components/AnimePlayer';
import { WatchSkeleton } from '../components/Skeleton';
import { AlertCircle, ChevronLeft, Info, List, Server, Settings, RefreshCw } from 'lucide-react';

const AnimeWatch: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  
  // Stream State
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [subtitles, setSubtitles] = useState<{ url: string; lang: string }[]>([]);
  const [headers, setHeaders] = useState<any>(null);
  
  // Server State
  const [servers, setServers] = useState<{ sub: any[], dub: any[], raw: any[] }>({ sub: [], dub: [], raw: [] });
  const [selectedServer, setSelectedServer] = useState<string>('hd-1'); // Default to hd-1
  const [serverCategory, setServerCategory] = useState<'sub' | 'dub' | 'raw'>('sub');
  
  // UI State
  const [activeTab, setActiveTab] = useState<'episodes' | 'info'>('episodes');
  const [loading, setLoading] = useState(true);
  const [loadingSource, setLoadingSource] = useState(false);
  const [loadingServers, setLoadingServers] = useState(false);

  // Initial Load
  useEffect(() => {
    if (!id) return;

    const init = async () => {
        setLoading(true);
        try {
            const [detailData, epsData] = await Promise.all([
                fetchAnimeDetails(id),
                fetchAnimeEpisodes(id)
            ]);
            setDetails(detailData);
            setEpisodes(epsData);
            
            if (epsData.length > 0) {
                // Auto select first episode
                handleEpisodeSelect(epsData[0].episodeId);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    init();
  }, [id]);

  // When Episode, Server or Category changes, re-fetch source
  // We use a separate effect to ensure manual server change triggers reload
  useEffect(() => {
    if (currentEpisodeId && selectedServer) {
        loadSource(currentEpisodeId, selectedServer, serverCategory);
    }
  }, [selectedServer, serverCategory]); 
  // removed currentEpisodeId from dep array here to prevent double call when handleEpisodeSelect calls loadSource manually, 
  // BUT we need it if we navigate. handleEpisodeSelect handles the initial load for a new episode.

  const handleEpisodeSelect = async (epId: string) => {
      setCurrentEpisodeId(epId);
      setLoadingSource(true);
      setLoadingServers(true);
      setVideoSrc('');
      setServers({ sub: [], dub: [], raw: [] }); // Clear old servers
      
      try {
          // 1. Fetch available servers for this episode
          const serverData = await fetchAnimeServers(epId);
          setServers(serverData);
          setLoadingServers(false);

          // 2. Decide which server/category to use
          // Keep current category if available, else switch to sub
          let targetCategory = serverCategory;
          if (!serverData[targetCategory] || serverData[targetCategory].length === 0) {
              if (serverData.sub.length > 0) targetCategory = 'sub';
              else if (serverData.dub.length > 0) targetCategory = 'dub';
              else if (serverData.raw.length > 0) targetCategory = 'raw';
          }
          
          if (targetCategory !== serverCategory) {
              setServerCategory(targetCategory);
          }

          // 3. Pick a server
          const availableServers = serverData[targetCategory] || [];
          let targetServer = selectedServer;
          const serverExists = availableServers.find((s: any) => s.serverName === targetServer);
          
          if (!serverExists && availableServers.length > 0) {
              // Priority: hd-1 -> vidstreaming -> megacloud -> first available
              const hd1 = availableServers.find((s: any) => s.serverName === 'hd-1');
              const vidstreaming = availableServers.find((s: any) => s.serverName === 'vidstreaming');
              const megacloud = availableServers.find((s: any) => s.serverName === 'megacloud');
              
              targetServer = hd1?.serverName || vidstreaming?.serverName || megacloud?.serverName || availableServers[0].serverName;
          }

          if (targetServer) {
              setSelectedServer(targetServer);
              // Manually call loadSource to ensure it runs immediately with new params
              await loadSource(epId, targetServer, targetCategory);
          } else {
              // No servers found? Try a hail mary with 'hd-1' anyway
              console.warn("No servers found, trying default hd-1");
              setSelectedServer('hd-1');
              await loadSource(epId, 'hd-1', 'sub');
          }

      } catch (e) {
          console.error("Failed to load episode data", e);
          setLoadingSource(false);
          setLoadingServers(false);
      }
  };

  const loadSource = async (epId: string, server: string, category: string) => {
      setLoadingSource(true);
      try {
          const data = await fetchAnimeSources(epId, server, category);
          if (data && data.sources && data.sources.length > 0) {
              setVideoSrc(data.sources[0].url);
              setHeaders(data.headers);
              
              const tracks = data.tracks?.filter(t => t.kind === 'captions').map(t => ({ url: t.file, lang: t.label })) || [];
              setSubtitles(tracks);
          } else {
              setVideoSrc('');
          }
      } catch (e) {
          console.error("Source load failed", e);
          setVideoSrc('');
      } finally {
          setLoadingSource(false);
      }
  };

  const reloadServers = async () => {
      if(currentEpisodeId) handleEpisodeSelect(currentEpisodeId);
  }

  if (loading || !details) return <WatchSkeleton />;

  const currentEp = episodes.find(e => e.episodeId === currentEpisodeId);
  const title = details.title || details.name;
  
  // Available categories for this episode
  const availableCategories = (['sub', 'dub', 'raw'] as const).filter(cat => servers[cat] && servers[cat].length > 0);
  // Available servers for current category
  const currentCategoryServers = servers[serverCategory] || [];

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-10 px-4 sm:px-6 lg:px-8 animate-fade-in">
      
      {/* Back to Home */}
      <div className="max-w-[1600px] mx-auto mb-4">
        <Link 
          to="/anime"
          className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Anime Home
        </Link>
      </div>

      <div className={`max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-4 gap-6`}>
        
        {/* Player Section */}
        <div className={`xl:col-span-3 space-y-4`}>
          {loadingSource ? (
              <div className="w-full aspect-video bg-black rounded-xl flex items-center justify-center border border-slate-800">
                  <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-400 text-sm">Fetching Stream...</p>
                  </div>
              </div>
          ) : videoSrc ? (
             <AnimePlayer 
                src={videoSrc} 
                poster={details.poster_path || undefined} 
                subtitles={subtitles}
                headers={headers}
             />
          ) : (
             <div className="w-full aspect-video bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 flex-col gap-2">
                 <AlertCircle className="h-8 w-8 text-red-500" />
                 <p className="text-gray-400">Stream unavailable.</p>
                 <button onClick={() => handleEpisodeSelect(currentEpisodeId!)} className="text-xs bg-white/10 px-3 py-1 rounded hover:bg-white/20 mt-2">Retry</button>
             </div>
          )}
          
          {/* Controls Bar */}
          <div className="flex flex-col gap-4 bg-slate-900/50 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white">
                        {title}
                    </h1>
                    <p className="text-purple-400 font-medium">
                        Episode {currentEp?.number} <span className="text-gray-600 mx-2">|</span> {currentEp?.title}
                    </p>
                </div>
                
                {/* Audio/Sub Switcher */}
                <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-white/10">
                    {availableCategories.length > 0 ? availableCategories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setServerCategory(cat)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${serverCategory === cat ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {cat}
                        </button>
                    )) : (
                         <div className="text-xs text-gray-500 px-2 flex items-center gap-1">
                             {loadingServers ? 'Loading Info...' : 'No Info'}
                         </div>
                    )}
                </div>
            </div>

            {/* Server List */}
            {currentCategoryServers.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mr-2">
                        <Settings className="h-3 w-3" />
                        <span className="uppercase font-bold tracking-wider">Servers</span>
                    </div>
                    {currentCategoryServers.map((s: any) => (
                        <button
                            key={s.serverName}
                            onClick={() => setSelectedServer(s.serverName)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedServer === s.serverName ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}
                        >
                            {s.serverName}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                        {loadingServers ? 'Scanning for servers...' : 'No servers found.'}
                    </span>
                    {!loadingServers && (
                        <button onClick={reloadServers} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-white">
                            <RefreshCw className="h-3 w-3" /> Reload Servers
                        </button>
                    )}
                </div>
            )}
          </div>
        </div>

        {/* Sidebar / Tabs Section */}
        <div className="xl:col-span-1 flex flex-col h-auto xl:h-[calc(100vh-120px)] xl:sticky xl:top-24">
            
            {/* Tab Switcher */}
            <div className="flex items-center gap-1 mb-3 bg-slate-900/80 p-1 rounded-lg border border-white/5">
                <button 
                    onClick={() => setActiveTab('episodes')}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'episodes' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-white/5'}`}
                >
                    Episodes
                </button>
                <button 
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'info' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-white/5'}`}
                >
                    Info
                </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-hidden min-h-[400px] bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 shadow-xl">
                {activeTab === 'episodes' && (
                    <div className="h-full overflow-y-auto p-2 space-y-1 scroll-smooth">
                        {episodes.map((ep) => {
                            const isActive = ep.episodeId === currentEpisodeId;
                            return (
                                <button 
                                    key={ep.episodeId}
                                    onClick={() => handleEpisodeSelect(ep.episodeId)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${isActive ? 'bg-purple-600/20 border border-purple-500/50' : 'hover:bg-white/5 border border-transparent'}`}
                                >
                                    <div className={`w-8 h-8 flex items-center justify-center rounded text-sm font-bold ${isActive ? 'bg-purple-600 text-white' : 'bg-slate-800 text-gray-400'}`}>
                                        {ep.number}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-medium truncate ${isActive ? 'text-purple-200' : 'text-gray-200'}`}>
                                            {ep.title}
                                        </p>
                                        {ep.isFiller && <span className="text-[10px] text-orange-400 uppercase font-bold">Filler</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'info' && (
                    <div className="h-full overflow-y-auto p-6 space-y-4">
                        <div className="aspect-[2/3] rounded-lg overflow-hidden w-32 mx-auto shadow-lg">
                            <img src={details.poster_path || ''} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white mb-2">Synopsis</h3>
                            <p className="text-gray-300 text-xs leading-relaxed">{details.overview}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                             {details.genres?.map(g => (
                                 <span key={g.id} className="text-[10px] bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded text-purple-300">
                                     {g.name}
                                 </span>
                             ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnimeWatch;