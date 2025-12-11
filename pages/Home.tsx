import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import { HomeSkeleton } from '../components/Skeleton';
import { fetchTrendingKDramas, fetchPopularKMovies, fetchTopRatedKDramas } from '../services/api';
import { getContinueWatching } from '../services/progress';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Media } from '../types';

const Home: React.FC = () => {
  const [trending, setTrending] = useState<Media[]>([]);
  const [movies, setMovies] = useState<Media[]>([]);
  const [topRated, setTopRated] = useState<Media[]>([]);
  const [continueWatching, setContinueWatching] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  // Load General Content
  useEffect(() => {
    const loadContent = async () => {
      // Min loading time to prevent flicker
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
      
      try {
        const [trendingData, moviesData, topRatedData] = await Promise.all([
          fetchTrendingKDramas(),
          fetchPopularKMovies(),
          fetchTopRatedKDramas(),
          minLoadTime
        ]);
        setTrending(trendingData);
        setMovies(moviesData);
        setTopRated(topRatedData);
      } catch (error) {
        console.error("Error loading home data", error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  // Load User Specific Progress (Re-runs on login/logout)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        // Fetch progress based on auth state (Handled inside getContinueWatching)
        const progressData = await getContinueWatching();
        setContinueWatching(progressData);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="bg-slate-950 min-h-screen pb-20 animate-fade-in">
      <Hero items={trending} />
      <div className="-mt-32 relative z-20">
        {continueWatching.length > 0 && (
          <MediaRow title="Continue Watching" items={continueWatching} />
        )}
        <MediaRow title="Trending K-Dramas" items={trending} />
        <MediaRow title="Popular Korean Movies" items={movies} />
        <MediaRow title="Top Rated Classics" items={topRated} />
      </div>
    </div>
  );
};

export default Home;