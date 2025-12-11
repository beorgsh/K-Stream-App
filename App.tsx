import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import GlobalHome from './pages/GlobalHome';
import Watch from './pages/Watch';
import WatchParty from './pages/WatchParty';
import Details from './pages/Details';
import SearchPage from './pages/Search';
import Category from './pages/Category';
import Rooms from './pages/Rooms';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';

const Footer = () => (
  <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-gray-500 text-sm">
    <p>&copy; {new Date().getFullYear()} K-Stream. All rights reserved.</p>
    <p className="mt-2">This site does not host any files on its server. All content is provided by non-affiliated third parties.</p>
  </footer>
);

const LayoutWithNavbar = ({ children }: { children?: React.ReactNode }) => (
    <>
        <Navbar />
        <main className="flex-grow">
            {children}
        </main>
        <Footer />
    </>
);

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <Routes>
            {/* Standard Routes with Navbar */}
            <Route path="/" element={<LayoutWithNavbar><Home /></LayoutWithNavbar>} />
            <Route path="/movies" element={<LayoutWithNavbar><Category type="movie" /></LayoutWithNavbar>} />
            <Route path="/tv" element={<LayoutWithNavbar><Category type="tv" /></LayoutWithNavbar>} />
            <Route path="/search" element={<LayoutWithNavbar><SearchPage /></LayoutWithNavbar>} />
            
            <Route path="/global" element={<LayoutWithNavbar><GlobalHome /></LayoutWithNavbar>} />
            <Route path="/global/movies" element={<LayoutWithNavbar><Category type="movie" isGlobal={true} /></LayoutWithNavbar>} />
            <Route path="/global/tv" element={<LayoutWithNavbar><Category type="tv" isGlobal={true} /></LayoutWithNavbar>} />
            <Route path="/global/search" element={<LayoutWithNavbar><SearchPage /></LayoutWithNavbar>} />

            <Route path="/rooms" element={<LayoutWithNavbar><Rooms /></LayoutWithNavbar>} />
            <Route path="/login" element={<LayoutWithNavbar><Auth /></LayoutWithNavbar>} />
            <Route path="/details/:type/:id" element={<LayoutWithNavbar><Details /></LayoutWithNavbar>} />
            <Route path="/watch/:type/:id" element={<LayoutWithNavbar><Watch /></LayoutWithNavbar>} />

            {/* Watch Party Route (No Navbar/Footer) */}
            <Route path="/party" element={<WatchParty />} />
            
            <Route path="*" element={<LayoutWithNavbar><NotFound /></LayoutWithNavbar>} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;