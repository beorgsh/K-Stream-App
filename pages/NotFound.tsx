import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center space-y-8 relative z-10">
        
        {/* Animated Background Blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="flex justify-center mb-6">
            <div className="relative">
                <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-700 to-slate-900 select-none">
                    404
                </h1>
                <AlertTriangle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 text-indigo-500" />
            </div>
        </div>

        <div className="space-y-4">
            <h2 className="text-3xl font-bold text-white">Page Not Found</h2>
            <p className="text-slate-400 max-w-md mx-auto">
                The drama you are looking for has either finished airing or never existed. 
            </p>
        </div>

        <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition-all hover:scale-105 shadow-lg shadow-indigo-600/20"
        >
            <Home className="h-5 w-5" />
            Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;