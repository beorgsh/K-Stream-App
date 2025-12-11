import React, { useEffect, useState } from 'react';
import { discoverMedia } from '../services/api';
import { Media } from '../types';
import MediaCard from '../components/MediaCard';
import { Loader2 } from 'lucide-react';
import { GridSkeleton } from '../components/Skeleton';

interface CategoryProps {
  type: 'movie' | 'tv';
  isGlobal?: boolean;
}

const Category: React.FC<CategoryProps> = ({ type, isGlobal = false }) => {
  const [items, setItems] = useState<Media[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Reset when type or mode changes
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
    loadData(1, true);
  }, [type, isGlobal]);

  const loadData = async (pageNum: number, isReset: boolean = false) => {
    try {
      if (isReset) {
        // Only show full skeleton on initial load/reset
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Small artificial delay for smoothness
      if (isReset) await new Promise(r => setTimeout(r, 800));

      const newItems = await discoverMedia(type, pageNum, isGlobal);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => isReset ? newItems : [...prev, ...newItems]);
      }
    } catch (error) {
      console.error("Failed to load category data", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadData(nextPage);
  };

  if (loading) {
    return <GridSkeleton />;
  }

  const titlePrefix = isGlobal ? "Global" : "Korean";
  const titleType = type === 'movie' ? 'Movies' : (isGlobal ? 'TV Shows' : 'K-Dramas');

  return (
    <div className="min-h-screen bg-slate-950 pt-24 px-3 sm:px-6 lg:px-8 pb-20 animate-fade-in">
      <div className="flex items-center justify-between mb-6 sm:mb-8 px-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-white capitalize">
          {titlePrefix} {titleType}
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6">
        {items.map((item) => (
          <div key={item.id} className="flex justify-center w-full">
            <MediaCard media={item} />
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {items.length > 0 && hasMore && (
        <div className="flex justify-center mt-12">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-8 py-3 bg-slate-800 hover:bg-indigo-600 text-white font-semibold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Category;