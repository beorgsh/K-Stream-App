import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import { HomeSkeleton } from '../components/Skeleton';
import { fetchTrending, fetchTopRated } from '../services/api';
import { getContinueWatching } from '../services/progress';
import { auth } from '../services/firebase';
import { Media } from '../types';

const GlobalHome: React.FC = () => {
  const [trendingMovies, setTrendingMovies] = useState<Media[]>([]);
  const [trendingTV, setTrendingTV] = useState<Media[]>([]);
  const [topRated, setTopRated] = useState<Media[]>([]);
  const [continueWatching, setContinueWatching] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
      
      try {
        const [moviesData, tvData, topData] = await Promise.all([
          fetchTrending('movie', true),
          fetchTrending('tv', true),
          fetchTopRated('movie', true),
          minLoadTime
        ]);
        setTrendingMovies(moviesData);
        setTrendingTV(tvData);
        setTopRated(topData);
      } catch (error) {
        console.error("Error loading global home data", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load User Specific Progress for Global
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
        const progressData = await getContinueWatching('global');
        setContinueWatching(progressData);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <HomeSkeleton />;
  }

  // Combine for hero to have mix
  const heroItems = [...trendingMovies.slice(0, 3), ...trendingTV.slice(0, 2)];

  return (
    <div className="bg-slate-950 min-h-screen pb-20 animate-fade-in">
      <Hero items={heroItems} />
      <div className="-mt-32 relative z-20">
        {continueWatching.length > 0 && (
          <MediaRow title="Continue Watching" items={continueWatching.slice(0, 10)} />
        )}
        <MediaRow title="Global Trending Movies" items={trendingMovies} />
        <MediaRow title="Global Trending Series" items={trendingTV} />
        <MediaRow title="Top Rated Globally" items={topRated} />
      </div>
    </div>
  );
};

export default GlobalHome;