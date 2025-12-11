import React from 'react';
import { Star, Play, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Media } from '../types';
import { IMAGE_BASE_URL, POSTER_SIZE } from '../constants';

interface MediaCardProps {
  media: Media;
}

const MediaCard: React.FC<MediaCardProps> = ({ media }) => {
  const title = media.title || media.name || 'Unknown';
  const year = (media.release_date || media.first_air_date || '').split('-')[0];
  const rating = media.vote_average ? media.vote_average.toFixed(1) : 'N/A';
  
  // Progress calculations
  const hasProgress = !!media.progress;
  const watchedSec = media.progress?.watched || 0;
  const totalSec = media.progress?.duration || 0;
  const progressPercent = hasProgress && totalSec > 0
    ? Math.min(Math.max((watchedSec / totalSec) * 100, 0), 100)
    : 0;
    
  const timeLeftMin = hasProgress && totalSec > 0 
    ? Math.max(0, Math.ceil((totalSec - watchedSec) / 60)) 
    : 0;

  // TV Info override if available from progress
  const tvEpisodeInfo = media.media_type === 'tv' && media.last_season && media.last_episode
    ? `S${media.last_season}:E${media.last_episode}`
    : null;

  return (
    <Link to={`/watch/${media.media_type}/${media.id}`} className="group relative block w-36 md:w-48 flex-shrink-0 cursor-pointer">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-800 shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-indigo-500/20 ring-1 ring-white/10">
        {media.poster_path ? (
          <img
            src={`${IMAGE_BASE_URL}/${POSTER_SIZE}${media.poster_path}`}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-opacity duration-300"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            No Image
          </div>
        )}
        
        {/* Play Icon Overlay on Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center backdrop-blur-[1px]">
             <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300 mb-2">
                <Play className="h-5 w-5 fill-white text-white ml-0.5" />
             </div>
             {hasProgress && (
                <div className="flex items-center gap-1 text-[10px] font-medium text-white bg-black/50 px-2 py-1 rounded-full backdrop-blur-md transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <Clock className="w-3 h-3" />
                    <span>{timeLeftMin}m left</span>
                </div>
             )}
        </div>

        {/* Progress Bar & Text */}
        {hasProgress && (
          <div className="absolute bottom-0 left-0 right-0">
             <div className="px-2 py-1 bg-gradient-to-t from-black/90 to-transparent">
                 <div className="flex justify-between items-end text-[10px] text-gray-300 mb-1 font-medium">
                     <span className="text-indigo-400">{Math.round(progressPercent)}%</span>
                     <span>{timeLeftMin}m</span>
                 </div>
                 <div className="h-1 bg-gray-700/50 rounded-full overflow-hidden mb-1">
                    <div 
                    className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                    style={{ width: `${progressPercent}%` }}
                    />
                 </div>
             </div>
          </div>
        )}
      </div>
      
      <div className="mt-2 space-y-1">
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
          {title}
        </h3>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{tvEpisodeInfo || year}</span>
          {media.vote_average > 0 && (
             <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                <span>{rating}</span>
             </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default MediaCard;