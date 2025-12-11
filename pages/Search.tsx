import React, { useEffect, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { searchContent } from '../services/api';
import { Media } from '../types';
import MediaCard from '../components/MediaCard';
import { GridSkeleton } from '../components/Skeleton';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const isGlobal = location.pathname.includes('/global');

  useEffect(() => {
    const doSearch = async () => {
      if (!query) return;
      setLoading(true);
      try {
        const wait = new Promise(r => setTimeout(r, 800));
        const [data] = await Promise.all([
            searchContent(query, isGlobal),
            wait
        ]);
        setResults(data);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setLoading(false);
      }
    };
    doSearch();
  }, [query, isGlobal]);

  if (loading) {
    return <GridSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-24 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">
        {isGlobal ? 'Global' : 'K-Drama'} Search Results for <span className="text-indigo-500">"{query}"</span>
      </h2>

      {results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {results.map((item) => (
            <div key={item.id} className="flex justify-center">
                <MediaCard media={item} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p>No results found. Try searching for a different title.</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;