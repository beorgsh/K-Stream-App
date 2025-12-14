import React, { useState, useEffect, useRef } from 'react';
import { Play, Info } from 'lucide-react';
import { Media } from '../types';
import { IMAGE_BASE_URL, BACKDROP_SIZE } from '../constants';
import { Link } from 'react-router-dom';

interface HeroProps {
  items: Media[];
}

const Hero: React.FC<HeroProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Touch state for swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ITEMS_LIMIT = 5; // Limit carousel to top 5 items
  const carouselItems = items.slice(0, ITEMS_LIMIT);

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const nextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === carouselItems.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === 0 ? carouselItems.length - 1 : prev - 1));
  };

  // Auto scroll
  useEffect(() => {
    resetTimeout();
    timeoutRef.current = setTimeout(() => {
      nextSlide();
    }, 8000); // 8 seconds per slide

    return () => resetTimeout();
  }, [currentIndex, carouselItems.length]);

  // Reset transition state after animation
  useEffect(() => {
    const timer = setTimeout(() => setIsTransitioning(false), 700); // Match CSS duration
    return () => clearTimeout(timer);
  }, [currentIndex]);

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  if (carouselItems.length === 0) return null;

  return (
    <div 
      className="relative h-[85vh] w-full overflow-hidden bg-slate-950 group"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Carousel Items */}
      {carouselItems.map((media, index) => {
        const isActive = index === currentIndex;
        
        // Image Handling
        const imageUrl = media.backdrop_path 
            ? (media.backdrop_path.startsWith('http') ? media.backdrop_path : `${IMAGE_BASE_URL}/${BACKDROP_SIZE}${media.backdrop_path}`)
            : (media.poster_path && media.poster_path.startsWith('http') ? media.poster_path : '');

        // Route Handling
        const watchLink = media.media_type === 'anime' 
            ? `/anime/watch/${media.id}` 
            : `/watch/${media.media_type}/${media.id}`;
        
        const infoLink = media.media_type === 'anime' 
            ? `/anime/watch/${media.id}?tab=info`
            : `/watch/${media.media_type}/${media.id}?tab=info`;

        return (
          <div
            key={media.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={imageUrl}
                alt={media.title || media.name}
                className="w-full h-full object-cover"
              />
              {/* Complex Gradient Overlay for Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute bottom-0 w-full px-4 sm:px-6 lg:px-8 pb-32 md:pb-40 z-20">
              <div className="max-w-4xl space-y-6 animate-fade-in-up">
                {/* Badge */}
                <div className="flex items-center space-x-3 mb-2">
                  <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg shadow-indigo-600/30">
                    #{index + 1} Trending
                  </span>
                  <span className="text-gray-300 text-xs font-semibold uppercase tracking-widest border border-gray-600 px-2 py-1 rounded">
                    {media.media_type === 'tv' ? 'Series' : (media.media_type === 'anime' ? 'Anime' : 'Movie')}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-2xl leading-tight">
                  {media.title || media.name}
                </h1>
                
                {/* Description */}
                <p className="text-gray-200 text-base md:text-lg line-clamp-3 md:line-clamp-2 max-w-2xl drop-shadow-lg font-medium">
                  {media.overview}
                </p>

                {/* Buttons - Fixed to be width-auto based on content */}
                <div className="flex flex-row flex-nowrap items-center gap-3 pt-4">
                  <Link
                    to={watchLink}
                    className="w-auto flex-none justify-center flex items-center space-x-2 bg-white text-slate-950 px-6 py-3 rounded-lg font-bold hover:bg-gray-200 transition-transform active:scale-95 shadow-lg shadow-white/10 whitespace-nowrap text-sm sm:text-base"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Watch</span>
                  </Link>
                  <Link
                    to={infoLink}
                    className="w-auto flex-none justify-center flex items-center space-x-2 bg-slate-800/60 backdrop-blur-md text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700/60 transition-colors border border-white/20 hover:border-white/40 whitespace-nowrap text-sm sm:text-base"
                  >
                    <Info className="h-4 w-4" />
                    <span>Info</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Indicators */}
      <div className="absolute bottom-24 right-4 sm:right-8 lg:bottom-40 z-30 flex space-x-2">
        {carouselItems.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-8 bg-indigo-500' : 'w-2 bg-gray-500/50 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Hero;