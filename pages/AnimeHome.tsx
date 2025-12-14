import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import { HomeSkeleton } from '../components/Skeleton';
import { fetchAnimeHome } from '../services/anime';
import { Media } from '../types';

const AnimeHome: React.FC = () => {
  const [spotlight, setSpotlight] = useState<Media[]>([]);
  const [trending, setTrending] = useState<Media[]>([]);
  const [latest, setLatest] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
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
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, []);

  if (loading) {
    return <HomeSkeleton />;
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