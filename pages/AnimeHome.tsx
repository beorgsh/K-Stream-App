import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import { HomeSkeleton } from '../components/Skeleton';
import { fetchAnimeHome } from '../services/anime';
import { Media } from '../types';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const AnimeHome: React.FC = () => {
  const [spotlight, setSpotlight] = useState<Media[]>([]);
  const [trending, setTrending] = useState<Media[]>([]);
  const [latest, setLatest] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadContent = async () => {
    setLoading(true);
    setError(false);
    const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
    try {
      const [data] = await Promise.all([
          fetchAnimeHome(),
          minLoadTime
      ]);
      
      setSpotlight(data.spotlight);
      setTrending(data.trending);
      setLatest(data.latest);
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

  if (loading) {
    return <HomeSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/10 max-w-md w-full">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Connection Failed</h2>
            <p className="text-gray-400 mb-6">Could not load Anime data. The content provider might be temporarily unavailable.</p>
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

  return (
    <div className="bg-slate-950 min-h-screen pb-20 animate-fade-in">
      <Hero items={spotlight} />
      <div className="-mt-32 relative z-20">
        <MediaRow title="Trending Anime" items={trending} />
        <MediaRow title="Latest Episodes" items={latest} />
      </div>
    </div>
  );
};

export default AnimeHome;