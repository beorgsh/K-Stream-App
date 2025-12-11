import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import GlobalHome from './pages/GlobalHome';
import Watch from './pages/Watch';
import Details from './pages/Details';
import SearchPage from './pages/Search';
import Category from './pages/Category';
import Rooms from './pages/Rooms';

// Simple footer component
const Footer = () => (
  <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-gray-500 text-sm">
    <p>&copy; {new Date().getFullYear()} K-Stream. All rights reserved.</p>
    <p className="mt-2">This site does not host any files on its server. All content is provided by non-affiliated third parties.</p>
  </footer>
);

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
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

            {/* Details & Player Routes */}
            <Route path="/details/:type/:id" element={<Details />} />
            <Route path="/watch/:type/:id" element={<Watch />} />
            
            {/* Redirect legacy or unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  );
};

export default App;