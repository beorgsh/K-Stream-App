import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from './MediaCard';
import { Media } from '../types';

interface MediaRowProps {
  title: string;
  items: Media[];
}

const MediaRow: React.FC<MediaRowProps> = ({ title, items }) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const slide = (offset: number) => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-4 my-8 px-4 sm:px-6 lg:px-8 group/row relative z-20">
      <h2 className="text-xl md:text-2xl font-bold text-white pl-1 border-l-4 border-indigo-500 flex items-center">
        {title}
      </h2>
      
      <div className="relative group">
        <button
          onClick={() => slide(-800)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/60 hover:bg-indigo-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hidden md:block -ml-4 border border-white/10 backdrop-blur-sm"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        
        <div
          ref={rowRef}
          className="flex space-x-4 overflow-x-auto overflow-y-hidden pb-4 pt-2 scroll-smooth hide-scrollbar"
          style={{ 
            WebkitOverflowScrolling: 'touch' 
          }}
        >
          {items.map((item) => (
            <div key={item.id} className="w-36 md:w-48 flex-shrink-0">
                <MediaCard media={item} />
            </div>
          ))}
        </div>

        <button
          onClick={() => slide(800)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/60 hover:bg-indigo-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hidden md:block -mr-4 border border-white/10 backdrop-blur-sm"
           aria-label="Scroll right"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default MediaRow;