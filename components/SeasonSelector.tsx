import React, { useState, useEffect } from 'react';
import { fetchSeasonDetails } from '../services/api';
import { Episode, Season } from '../types';
import { ImageOff, Play } from 'lucide-react';
import { IMAGE_BASE_URL } from '../constants';

interface SeasonSelectorProps {
  tvId: number;
  seasons: Season[];
  currentSeason: number;
  currentEpisode: number;
  onSelect: (season: number, episode: number) => void;
  showBackdrop?: string | null;
}

const SeasonSelector: React.FC<SeasonSelectorProps> = ({
  tvId,
  seasons,
  currentSeason,
  currentEpisode,
  onSelect,
  showBackdrop
}) => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(currentSeason);
  const [loading, setLoading] = useState(false);

  // Pagination for large episode lists
  const [page, setPage] = useState(0);
  const EPISODES_PER_PAGE = 25;

  const validSeasons = seasons.filter(s => s.season_number > 0);

  useEffect(() => {
    const loadEpisodes = async () => {
      setLoading(true);
      try {
        const data = await fetchSeasonDetails(tvId, selectedSeason);
        setEpisodes(data.episodes);
        
        // Auto-select the correct page for the current episode
        if (selectedSeason === currentSeason) {
            const index = data.episodes.findIndex(e => e.episode_number === currentEpisode);
            if (index !== -1) {
                setPage(Math.floor(index / EPISODES_PER_PAGE));
            } else {
                setPage(0);
            }
        } else {
            setPage(0);
        }
      } catch (error) {
        console.error("Failed to load episodes", error);
      } finally {
        setLoading(false);
      }
    };
    loadEpisodes();
  }, [tvId, selectedSeason, currentSeason, currentEpisode]);

  // Calculate pages
  const totalPages = Math.ceil(episodes.length / EPISODES_PER_PAGE);
  const visibleEpisodes = episodes.slice(page * EPISODES_PER_PAGE, (page + 1) * EPISODES_PER_PAGE);

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 h-full flex flex-col overflow-hidden shadow-2xl relative">
      {/* Header - Fixed Top */}
      <div className="p-4 border-b border-white/5 flex flex-col gap-3 bg-white/5 backdrop-blur-md flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Episodes
            <span className="text-xs font-normal text-indigo-300 ml-1 px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                {episodes.length}
            </span>
            </h3>
            <div className="relative">
            <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                className="appearance-none bg-slate-950/50 hover:bg-slate-950/80 text-white border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-colors cursor-pointer"
            >
                {validSeasons.map((season) => (
                <option key={season.id} value={season.season_number}>
                    {season.name}
                </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
            </div>
        </div>

        {/* Range Tabs */}
        {totalPages > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                {[...Array(totalPages)].map((_, i) => {
                    const start = i * EPISODES_PER_PAGE + 1;
                    const end = Math.min((i + 1) * EPISODES_PER_PAGE, episodes.length);
                    const isActive = i === page;
                    return (
                        <button
                            key={i}
                            onClick={() => setPage(i)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors border ${
                                isActive 
                                ? 'bg-indigo-600 text-white border-indigo-500' 
                                : 'bg-slate-800 text-gray-400 border-white/5 hover:bg-slate-700'
                            }`}
                        >
                            {start}-{end}
                        </button>
                    );
                })}
            </div>
        )}
      </div>

      {/* List - Scrollable Independent View */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0 bg-transparent scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
             <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-gray-400 text-sm">Loading season...</p>
          </div>
        ) : (
          <div className="space-y-1">
            {visibleEpisodes.map((ep) => {
              const isActive = selectedSeason === currentSeason && ep.episode_number === currentEpisode;
              
              // Smaller thumbnail size
              let imageUrl = null;
              if (ep.still_path) {
                imageUrl = `${IMAGE_BASE_URL}/w300${ep.still_path}`;
              } else if (showBackdrop) {
                imageUrl = `${IMAGE_BASE_URL}/w300${showBackdrop}`;
              }

              return (
                <button
                  key={ep.id}
                  onClick={() => onSelect(selectedSeason, ep.episode_number)}
                  className={`w-full text-left p-3 flex items-center gap-4 rounded-lg hover:bg-white/5 transition-all duration-200 group ${
                    isActive ? 'bg-indigo-600/10 border border-indigo-500/20' : 'border border-transparent'
                  }`}
                >
                  {/* Episode Number */}
                  <span className={`text-xl font-bold w-8 text-center flex-shrink-0 ${isActive ? 'text-indigo-500' : 'text-gray-600 group-hover:text-gray-400'}`}>
                    {ep.episode_number}
                  </span>

                  {/* Thumbnail - Compact */}
                  <div className="flex-shrink-0 relative w-32 aspect-video rounded overflow-hidden bg-slate-800 shadow-sm border border-white/5">
                    {imageUrl ? (
                      <img 
                        src={imageUrl}
                        alt={ep.name}
                        loading="lazy"
                        className={`w-full h-full object-cover transition-transform duration-500 ${isActive ? 'opacity-80' : 'group-hover:scale-105 opacity-90 group-hover:opacity-100'}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 bg-slate-800/80">
                        <ImageOff className="h-5 w-5" />
                      </div>
                    )}
                    
                    {/* Play Overlay */}
                    <div className={`absolute inset-0 flex items-center justify-center ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all duration-300 bg-black/40 backdrop-blur-[1px]`}>
                         <Play className={`h-6 w-6 ${isActive ? 'text-indigo-400 fill-indigo-400' : 'text-white fill-white'}`} />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                    <div className="flex justify-between items-baseline mb-1">
                        <h4 className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-gray-200'} group-hover:text-white transition-colors`}>
                           {ep.name || `Episode ${ep.episode_number}`}
                        </h4>
                        <span className="text-[10px] text-gray-500 ml-2 whitespace-nowrap font-mono">
                            {ep.runtime ? `${ep.runtime}m` : ''}
                        </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed group-hover:text-gray-400 transition-colors">
                      {ep.overview || "No description available."}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SeasonSelector;