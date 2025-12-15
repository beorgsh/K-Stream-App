import React, { useEffect, useState } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { searchContent } from '../services/api';
import { searchAnime } from '../services/anime';
import { Media } from '../types';
import MediaCard from '../components/MediaCard';
import { GridSkeleton } from '../components/Skeleton';
import { Search as SearchIcon, X } from 'lucide-react';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(query);
  const [results, setResults] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const isGlobal = location.pathname.includes('/global');
  const isAnime = location.pathname.includes('/anime');

  // Update input when URL query changes
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  // Perform search
  useEffect(() => {
    const doSearch = async () => {
      if (!query.trim()) {
          setResults([]);
          return;
      }
      setLoading(true);
      try {
        const wait = new Promise(r => setTimeout(r, 800));
        let data: Media[] = [];
        
        if (isAnime) {
             const [animeData] = await Promise.all([
                 searchAnime(query),
                 wait
             ]);
             data = animeData;
        } else {
             const [tmdbData] = await Promise.all([
                searchContent(query, isGlobal),
                wait
            ]);
            data = tmdbData;
        }
        
        setResults(data);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setLoading(false);
      }
    };
    doSearch();
  }, [query, isGlobal, isAnime]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
        const searchPath = isAnime ? '/anime/search' : (isGlobal ? '/global/search' : '/search');
        navigate(`${searchPath}?q=${encodeURIComponent(inputValue)}`);
    }
  };

  const clearSearch = () => {
      setInputValue('');
      const searchPath = isAnime ? '/anime/search' : (isGlobal ? '/global/search' : '/search');
      navigate(searchPath);
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-24 px-3 sm:px-6 lg:px-8 pb-20 animate-fade-in">
      
      {/* Search Input Area */}
      <div className="max-w-4xl mx-auto mb-10">
        <h1 className="text-3xl font-bold text-center text-white mb-8">
            {isAnime ? 'Anime' : (isGlobal ? 'Global' : 'K-Drama')} Search
        </h1>
        <form onSubmit={handleSearchSubmit} className="relative group">
            <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isAnime ? "Search Anime..." : (isGlobal ? "Search for movies & TV shows..." : "Search for Asian Dramas, Anime & Movies...")}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-14 pr-12 text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-xl transition-all"
                autoFocus
            />
            <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
            
            {inputValue && (
                <button 
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            )}
        </form>
      </div>

      {loading ? (
        <GridSkeleton />
      ) : (
        <>
            {query && (
                <h2 className="text-xl font-semibold text-gray-400 mb-6 px-1">
                    {results.length > 0 ? (
                        <>Results for <span className="text-white">"{query}"</span></>
                    ) : (
                        <>No results found for <span className="text-white">"{query}"</span></>
                    )}
                </h2>
            )}

            {results.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6">
                {results.map((item) => (
                    <div key={item.id} className="flex justify-center w-full">
                        <MediaCard media={item} />
                    </div>
                ))}
                </div>
            ) : (
                !loading && query && (
                    <div className="text-center py-20 text-gray-500">
                        <p>Try searching for a different keyword.</p>
                    </div>
                )
            )}
            
            {!query && !loading && (
                <div className="text-center py-20 text-gray-600">
                    <SearchIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p>Type something above to start searching.</p>
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default SearchPage;