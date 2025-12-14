import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import { HomeSkeleton } from '../components/Skeleton';
import { fetchAnimeTrending, fetchAnimeMovies, fetchAnimeTopRated } from '../services/api';
import { getContinueWatching } from '../services/progress';
import { auth } from '../services/firebase';
import { Media } from '../types';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from '../components/Navbar';

const AnimeHome: React.FC = () => {
  const [trending, setTrending] = useState<Media[]>([]);
  const [movies, setMovies] = useState<Media[]>([]);
  const [topRated, setTopRated] = useState<Media[]>([]);
  const [continueWatching, setContinueWatching] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const navigate = useNavigate();

  const loadContent = async () => {
    setLoading(true);
    setError(false);
    const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
    try {
      const [trendingData, moviesData, topRatedData] = await Promise.all([
          fetchAnimeTrending(),
          fetchAnimeMovies(),
          fetchAnimeTopRated(),
          minLoadTime
      ]);
      
      setTrending(trendingData);
      setMovies(moviesData);
      setTopRated(topRatedData);

    } catch (error) {
      console.error("Error loading anime home", error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  // Load User Specific Progress for Anime
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
        const progressData = await getContinueWatching('anime');
        setContinueWatching(progressData);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <HomeSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/10 max-w-md w-full">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Connection Failed</h2>
            <p className="text-gray-400 mb-6">Could not load Anime data from TMDB.</p>
            <button 
                onClick={loadContent}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold mx-auto transition-colors"
            >
                <RefreshCw className="h-4 w-4" />
                Retry
            </button>
        </div>
      </div>
    );
  }

  // Use Top Rated as spotlight/hero since we don't have curated spotlight
  const heroItems = topRated.slice(0, 5);

  return (
    <div className="bg-slate-950 min-h-screen pb-20 animate-fade-in">
      <Hero items={heroItems} />
      <div className="-mt-32 relative z-20">
        {continueWatching.length > 0 && (
          <MediaRow title="Continue Watching" items={continueWatching.slice(0, 10)} />
        )}
        <MediaRow title="Trending Anime Series" items={trending} />
        <MediaRow title="Popular Anime Movies" items={movies} />
        <MediaRow title="All Time Favorites" items={topRated} />
      </div>
    </div>
  );
};

export default AnimeHome;