import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import { HomeSkeleton } from '../components/Skeleton';
import { fetchTrending, fetchTopRated } from '../services/api';
import { Media } from '../types';

const GlobalHome: React.FC = () => {
  const [trendingMovies, setTrendingMovies] = useState<Media[]>([]);
  const [trendingTV, setTrendingTV] = useState<Media[]>([]);
  const [topRated, setTopRated] = useState<Media[]>([]);
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

  if (loading) {
    return <HomeSkeleton />;
  }

  // Combine for hero to have mix
  const heroItems = [...trendingMovies.slice(0, 3), ...trendingTV.slice(0, 2)];

  return (
    <div className="bg-slate-950 min-h-screen pb-20 animate-fade-in">
      <Hero items={heroItems} />
      <div className="-mt-32 relative z-20">
        <MediaRow title="Global Trending Movies" items={trendingMovies} />
        <MediaRow title="Global Trending Series" items={trendingTV} />
        <MediaRow title="Top Rated Globally" items={topRated} />
      </div>
    </div>
  );
};

export default GlobalHome;