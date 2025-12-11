import React, { useEffect, useState, useRef } from 'react';
import Hero from '../components/Hero';
import MediaRow from '../components/MediaRow';
import { HomeSkeleton } from '../components/Skeleton';
import { 
    fetchTrendingKDramas, 
    fetchPopularKMovies, 
    fetchTopRatedKDramas,
    fetchMediaByLang,
    fetchAnimeContent
} from '../services/api';
import { getContinueWatching } from '../services/progress';
import { auth } from '../services/firebase';
import { Media } from '../types';
import MediaCard from '../components/MediaCard';
import { X, History, Loader2 } from 'lucide-react';

const Home: React.FC = () => {
  const [trending, setTrending] = useState<Media[]>([]);
  const [movies, setMovies] = useState<Media[]>([]);
  const [topRated, setTopRated] = useState<Media[]>([]);
  
  // New Categories
  const [cdramas, setCdramas] = useState<Media[]>([]);
  const [tdramas, setTdramas] = useState<Media[]>([]);
  const [jdramas, setJdramas] = useState<Media[]>([]);
  const [anime, setAnime] = useState<Media[]>([]);

  const [continueWatching, setContinueWatching] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false); // Controls rendering
  const [modalVisible, setModalVisible] = useState(false); // Controls opacity transition
  
  const [visibleHistory, setVisibleHistory] = useState<Media[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 10;
  const historyObserverTarget = useRef<HTMLDivElement>(null);

  // Load General Content
  useEffect(() => {
    const loadContent = async () => {
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
      
      try {
        const [
            trendingData, 
            moviesData, 
            topRatedData, 
            cData,
            tData,
            jData,
            aData
        ] = await Promise.all([
          fetchTrendingKDramas(),
          fetchPopularKMovies(),
          fetchTopRatedKDramas(),
          fetchMediaByLang('tv', 'zh'), // Chinese (Mandarin)
          fetchMediaByLang('tv', 'th'), // Thai
          fetchMediaByLang('tv', 'ja'), // Japanese (Live Action)
          fetchAnimeContent(),          // Anime
          minLoadTime
        ]);
        
        setTrending(trendingData);
        setMovies(moviesData);
        setTopRated(topRatedData);
        setCdramas(cData);
        setTdramas(tData);
        setJdramas(jData);
        setAnime(aData);

      } catch (error) {
        console.error("Error loading home data", error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  // Load User Specific Progress
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
        const progressData = await getContinueWatching();
        setContinueWatching(progressData);
    });

    return () => unsubscribe();
  }, []);

  // Infinite Scroll Logic for History Modal
  useEffect(() => {
      if (showHistoryModal && continueWatching.length > 0) {
          setVisibleHistory(continueWatching.slice(0, historyPage * HISTORY_PAGE_SIZE));
      }
  }, [showHistoryModal, continueWatching, historyPage]);

  // Intersection Observer for loading more
  useEffect(() => {
      if (!showHistoryModal) return;

      const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
             if (visibleHistory.length < continueWatching.length) {
                 // Load more with a small delay for effect
                 setTimeout(() => {
                     setHistoryPage(prev => prev + 1);
                 }, 500);
             }
          }
      }, { threshold: 1.0 });

      if (historyObserverTarget.current) {
          observer.observe(historyObserverTarget.current);
      }

      return () => observer.disconnect();
  }, [showHistoryModal, visibleHistory.length, continueWatching.length]);

  // Modal Handlers
  const openModal = () => {
      setHistoryPage(1);
      setShowHistoryModal(true);
      // Small timeout to ensure DOM is rendered before applying opacity 1
      setTimeout(() => setModalVisible(true), 10);
  };

  const closeModal = () => {
      setModalVisible(false);
      // Wait for transition to finish before unmounting
      setTimeout(() => setShowHistoryModal(false), 300);
  };

  if (loading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="bg-slate-950 min-h-screen pb-20 animate-fade-in">
      <Hero items={trending} />
      <div className="-mt-32 relative z-20">
        {continueWatching.length > 0 && (
          <MediaRow 
            title="Continue Watching" 
            items={continueWatching.slice(0, 5)} 
            onSeeAll={continueWatching.length > 5 ? openModal : undefined}
          />
        )}
        <MediaRow title="Trending K-Dramas" items={trending} />
        <MediaRow title="Popular Korean Movies" items={movies} />
        <MediaRow title="Top Rated Classics" items={topRated} />
        
        {/* New Categories */}
        <MediaRow title="Trending C-Dramas" items={cdramas} />
        <MediaRow title="Trending J-Dramas" items={jdramas} />
        <MediaRow title="Trending Thai Dramas" items={tdramas} />
        <MediaRow title="Popular Anime" items={anime} />
      </div>

      {/* History Modal */}
      {showHistoryModal && (
          <div 
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-opacity duration-300 ease-in-out ${modalVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeModal} // Close on clicking backdrop
          >
              <div 
                className={`bg-slate-900 border border-white/10 w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden transform transition-all duration-300 ease-in-out ${modalVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
              >
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                      <div className="flex items-center gap-3">
                          <History className="h-6 w-6 text-indigo-500" />
                          <h2 className="text-xl font-bold text-white">Watch History</h2>
                          <span className="text-sm text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{continueWatching.length} Items</span>
                      </div>
                      <button 
                        onClick={closeModal}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                      >
                          <X className="h-6 w-6 text-gray-400 group-hover:text-white transition-colors" />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {visibleHistory.map((item) => (
                              <div key={item.id} className="flex justify-center w-full">
                                  <MediaCard media={item} />
                              </div>
                          ))}
                      </div>
                      
                      {/* Loading trigger element */}
                      {visibleHistory.length < continueWatching.length && (
                          <div ref={historyObserverTarget} className="flex justify-center py-8">
                               <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                          </div>
                      )}
                      
                      {visibleHistory.length >= continueWatching.length && continueWatching.length > 0 && (
                          <div className="text-center py-8 text-gray-600 text-sm">
                              You've reached the end of your history.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Home;