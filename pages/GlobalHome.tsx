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

  const ASIAN_LANGUAGES = ['ko', 'ja', 'zh', 'cn', 'tw', 'th', 'vi', 'tl', 'id', 'ms'];

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

  // Load Continue Watching (Global Only)
  useEffect(() => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
          const progressData = await getContinueWatching();
          // Filter: Not Anime AND Not Asian Language
          const globalContent = progressData.filter(item => {
              const isAnime = item.media_type === 'anime' || item.genre_ids?.includes(16);
              const lang = item.original_language;
              
              // isGlobal logic:
              // 1. Language MUST be defined (undefined/null implies legacy K-Stream data which is Asian)
              // 2. Language MUST NOT be in the Asian list
              const isGlobal = !!lang && !ASIAN_LANGUAGES.includes(lang);
              
              return !isAnime && isGlobal;
          });
          setContinueWatching(globalContent);
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