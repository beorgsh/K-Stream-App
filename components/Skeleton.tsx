import React from 'react';

export const HomeSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 pb-20 overflow-hidden">
      {/* Hero Skeleton */}
      <div className="relative h-[85vh] w-full bg-slate-900 animate-pulse">
        <div className="absolute bottom-0 w-full px-4 sm:px-6 lg:px-8 pb-32">
          <div className="max-w-3xl space-y-4">
            <div className="h-6 w-32 bg-slate-800 rounded"></div>
            <div className="h-12 w-3/4 bg-slate-800 rounded"></div>
            <div className="h-4 w-full bg-slate-800 rounded"></div>
            <div className="h-4 w-2/3 bg-slate-800 rounded"></div>
            <div className="flex space-x-4 pt-4">
              <div className="h-12 w-32 bg-slate-800 rounded-lg"></div>
              <div className="h-12 w-32 bg-slate-800 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Rows Skeleton */}
      <div className="-mt-32 relative z-20 space-y-12 px-4 sm:px-6 lg:px-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <div className="h-8 w-48 bg-slate-900 rounded animate-pulse"></div>
            <div className="flex space-x-4 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className="flex-shrink-0 w-36 md:w-48 aspect-[2/3] bg-slate-900 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const GridSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 pt-24 px-4 sm:px-6 lg:px-8 pb-20">
      <div className="h-10 w-64 bg-slate-900 rounded animate-pulse mb-8"></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-[2/3] bg-slate-900 rounded-lg animate-pulse"></div>
            <div className="h-4 w-3/4 bg-slate-900 rounded animate-pulse"></div>
            <div className="h-3 w-1/2 bg-slate-900 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DetailsSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 animate-pulse">
      {/* Banner */}
      <div className="h-[50vh] w-full bg-slate-900"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="w-64 h-96 bg-slate-800 rounded-xl flex-shrink-0 mx-auto md:mx-0"></div>
          
          {/* Info */}
          <div className="flex-1 pt-10 space-y-4">
             <div className="h-10 w-3/4 bg-slate-800 rounded"></div>
             <div className="flex gap-4">
                <div className="h-6 w-20 bg-slate-800 rounded"></div>
                <div className="h-6 w-20 bg-slate-800 rounded"></div>
             </div>
             <div className="h-32 w-full bg-slate-800 rounded"></div>
             <div className="h-12 w-48 bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WatchSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 pt-24 px-4 sm:px-6 lg:px-8 pb-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="w-full aspect-video bg-slate-900 rounded-xl animate-pulse"></div>
          <div className="h-8 w-1/2 bg-slate-900 rounded animate-pulse"></div>
        </div>
        <div className="lg:col-span-1 h-[600px] bg-slate-900 rounded-xl animate-pulse"></div>
      </div>
    </div>
  );
};