import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import GlobalHome from './pages/GlobalHome';
import Watch from './pages/Watch';
import Details from './pages/Details';
import SearchPage from './pages/Search';
import Category from './pages/Category';
import Rooms from './pages/Rooms';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';
import { AlertCircle, X } from 'lucide-react';

const Footer = () => (
  <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-gray-500 text-sm">
    <p>&copy; {new Date().getFullYear()} K-Stream. All rights reserved.</p>
    <p className="mt-2">This site does not host any files on its server. All content is provided by non-affiliated third parties.</p>
  </footer>
);

const DevWarning = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show warning if on Vercel/production but using localhost-like config or if we detect the typical OAuth error
    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isProd) {
        setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="bg-indigo-900/90 border-b border-indigo-500/50 text-indigo-100 px-4 py-3 relative z-[100]">
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-indigo-300 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
            <p className="font-bold">Setup Required for Login:</p>
            <p className="opacity-90">
                If you see "Authorized domain" errors in the console: Go to <span className="font-mono bg-black/30 px-1 rounded">Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</span> and add <span className="font-bold">{window.location.hostname}</span>.
            </p>
        </div>
        <button onClick={() => setVisible(false)} className="ml-auto text-indigo-300 hover:text-white">
            <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <DevWarning />
        <Navbar />
        <main className="flex-grow">
          <Routes>
            {/* K-Stream (Korean) Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<Category type="movie" />} />
            <Route path="/tv" element={<Category type="tv" />} />
            <Route path="/search" element={<SearchPage />} />
            
            {/* Global Stream Routes */}
            <Route path="/global" element={<GlobalHome />} />
            <Route path="/global/movies" element={<Category type="movie" isGlobal={true} />} />
            <Route path="/global/tv" element={<Category type="tv" isGlobal={true} />} />
            <Route path="/global/search" element={<SearchPage />} />

            {/* Watch Party Lobby */}
            <Route path="/rooms" element={<Rooms />} />

            {/* Auth */}
            <Route path="/login" element={<Auth />} />

            {/* Details & Player Routes */}
            <Route path="/details/:type/:id" element={<Details />} />
            <Route path="/watch/:type/:id" element={<Watch />} />
            
            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  );
};

export default App;