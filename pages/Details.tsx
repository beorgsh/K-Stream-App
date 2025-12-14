import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from '../components/Navbar';
import { fetchMediaDetails } from '../services/api';
import { MediaDetails } from '../types';
import { DetailsSkeleton } from '../components/Skeleton';
import { Clock, Star, Users, Play, Heart, Share2 } from 'lucide-react';
import { IMAGE_BASE_URL, BACKDROP_SIZE, POSTER_SIZE } from '../constants';

const Details: React.FC = () => {
  const { type, id } = useParams<{ type: 'movie' | 'tv'; id: string }>();
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!type || !id) return;

    const loadDetails = async () => {
      setLoading(true);
      try {
        const wait = new Promise(r => setTimeout(r, 800));
        const [data] = await Promise.all([
          fetchMediaDetails(type, Number(id)),
          wait
        ]);
        setDetails(data);
        window.scrollTo(0, 0);
      } catch (error) {
        console.error("Failed to load details", error);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [type, id]);

  if (loading || !details) {
    return <DetailsSkeleton />;
  }

  const title = details.title || details.name;
  const year = (details.release_date || details.first_air_date || '').split('-')[0];
  const backdropUrl = details.backdrop_path 
    ? `${IMAGE_BASE_URL}/${BACKDROP_SIZE}${details.backdrop_path}`
    : '';

  return (
    <div className="min-h-screen bg-slate-950 pb-20 animate-fade-in relative overflow-x-hidden selection:bg-indigo-500/30 text-slate-100">
      
      {/* Ambient Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/10 blur-[120px] mix-blend-screen" />
      </div>

      {/* Large Backdrop Hero with Glassy Overlay */}
      <div className="relative h-[60vh] md:h-[75vh] w-full overflow-hidden z-10">
        {backdropUrl && (
          <div className="absolute inset-0">
             <img 
               src={backdropUrl} 
               alt={title}
               className="w-full h-full object-cover scale-105"
             />
             {/* Gradient Overlays */}
             <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
             <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/30 to-transparent" />
             <div className="absolute inset-0 backdrop-blur-[1px]" />
          </div>
        )}
        
        {/* Navigation Bar Area (Action Buttons Only) */}
        <div className="absolute top-16 right-0 w-full px-4 sm:px-6 py-4 z-30 flex justify-end items-center pointer-events-none">
          <div className="flex gap-3 pointer-events-auto">
             <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all active:scale-95">
                <Heart className="h-5 w-5 text-white" />
             </button>
             <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all active:scale-95">
                <Share2 className="h-5 w-5 text-white" />
             </button>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-64 md:-mt-96 relative z-20">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          
          {/* Poster Column with Glassy Effect */}
          <div className="flex-shrink-0 mx-auto md:mx-0 w-64 lg:w-80 group perspective-1000">
            <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10 ring-1 ring-white/10 relative transform transition-transform duration-500 group-hover:scale-[1.02]">
              {details.poster_path ? (
                <img 
                  src={`${IMAGE_BASE_URL}/${POSTER_SIZE}${details.poster_path}`} 
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}
              {/* Glossy shine */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
            
            {/* Watch Now Button */}
            <Link 
              to={`/watch/${details.media_type}/${details.id}`}
              className="mt-8 w-full group relative flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-600/20 transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Play className="h-6 w-6 fill-current relative z-10" />
              <span className="relative z-10">Watch Now</span>
            </Link>
          </div>

          {/* Details Column */}
          <div className="flex-1 pt-4 md:pt-32 text-center md:text-left">
            {/* Title with Gradient Text */}
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-400 mb-6 drop-shadow-sm leading-tight tracking-tight">
              {title}
            </h1>

            {/* Glassy Metadata Row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm md:text-base mb-8">
               {year && (
                 <span className="px-3 py-1 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 text-slate-300 font-mono">
                   {year}
                 </span>
               )}
               <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 text-yellow-400">
                 <Star className="h-4 w-4 fill-current" />
                 <span className="font-bold">{details.vote_average.toFixed(1)}</span>
               </div>
               {details.runtime ? (
                 <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 text-slate-300">
                   <Clock className="h-4 w-4" />
                   <span>{details.runtime} min</span>
                 </div>
               ) : null}
               {details.number_of_seasons && (
                 <span className="px-3 py-1 rounded-lg bg-indigo-500/10 backdrop-blur-md border border-indigo-500/20 text-indigo-300 font-semibold">
                   {details.number_of_seasons} Seasons
                 </span>
               )}
               <span className="px-3 py-1 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 text-slate-300 uppercase text-xs tracking-wider">
                  {details.status}
               </span>
            </div>

            {/* Genres - Glass Pills */}
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-10">
              {details.genres.map(g => (
                <span key={g.id} className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 text-sm backdrop-blur-md border border-white/5 transition-all cursor-default hover:border-white/20">
                  {g.name}
                </span>
              ))}
            </div>

            {/* Overview with Glassy Container */}
            <div className="mb-12 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/[0.07] transition-colors">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                Overview
              </h3>
              <p className="text-slate-300 text-lg leading-relaxed font-light">
                {details.overview}
              </p>
            </div>

            {/* Cast Grid */}
            <div className="mb-10">
               <h3 className="text-xl font-bold text-white mb-6 flex items-center justify-center md:justify-start gap-2">
                 <Users className="h-5 w-5 text-indigo-400" />
                 Top Cast
               </h3>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                 {details.credits?.cast.slice(0, 5).map(actor => (
                   <div key={actor.id} className="group relative overflow-hidden rounded-xl bg-slate-800/50 backdrop-blur-md border border-white/5 hover:border-white/20 transition-all p-3 flex flex-col items-center text-center">
                     <div className="w-20 h-20 rounded-full overflow-hidden mb-3 ring-2 ring-white/10 group-hover:ring-indigo-500/50 transition-all shadow-lg">
                        {actor.profile_path ? (
                          <img 
                            src={`${IMAGE_BASE_URL}/w185${actor.profile_path}`} 
                            alt={actor.name}
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 bg-slate-800">N/A</div>
                        )}
                     </div>
                     <p className="text-sm font-semibold text-white truncate w-full group-hover:text-indigo-300 transition-colors">{actor.name}</p>
                     <p className="text-xs text-slate-400 truncate w-full">{actor.character}</p>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Details;