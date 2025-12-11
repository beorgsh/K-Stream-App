import React, { useState, useEffect } from 'react';
import { Search, MonitorPlay, Menu, X, Globe, Users, User, LogOut } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, logoutUser } from '../services/firebase';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  const isGlobal = location.pathname.startsWith('/global');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Auth Listener
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
        setUser(currentUser);
    });

    return () => {
        window.removeEventListener('scroll', handleScroll);
        unsubscribe();
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const searchPath = isGlobal ? '/global/search' : '/search';
      navigate(`${searchPath}?q=${encodeURIComponent(searchQuery)}`);
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
      await logoutUser();
      navigate('/login');
  };

  const navLinks = [
    { name: 'Home', path: isGlobal ? '/global' : '/' },
    { name: 'Movies', path: isGlobal ? '/global/movies' : '/movies' },
    { name: 'TV Shows', path: isGlobal ? '/global/tv' : '/tv' },
    { name: 'Watch Party', path: '/rooms' },
  ];

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
        isScrolled 
          ? 'bg-slate-950/90 backdrop-blur-md shadow-lg border-white/5' 
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to={isGlobal ? "/global" : "/"} className="flex items-center space-x-2 group">
              {isGlobal ? (
                <Globe className="h-8 w-8 text-blue-500 group-hover:text-blue-400 transition-colors" />
              ) : (
                <MonitorPlay className="h-8 w-8 text-indigo-500 group-hover:text-indigo-400 transition-colors" />
              )}
              <span className={`text-xl font-bold tracking-tight ${isGlobal ? 'text-blue-100' : 'text-white'}`}>
                {isGlobal ? 'Global Stream' : 'K-Stream'}
              </span>
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/5 ${
                        link.path === '/rooms' ? 'text-indigo-400 hover:text-indigo-300' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {link.path === '/rooms' && <Users className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />}
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                placeholder={isGlobal ? "Search Global..." : "Search K-Dramas..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-white/5 text-white border border-white/10 rounded-full py-1.5 px-4 pl-10 focus:outline-none focus:ring-2 w-64 text-sm placeholder-gray-400 transition-all ${
                    isGlobal ? 'focus:ring-blue-500' : 'focus:ring-indigo-500'
                } group-hover:bg-white/10`}
              />
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
            </form>

            {/* Mode Toggle - Desktop */}
            <Link 
              to={isGlobal ? "/" : "/global"}
              className={`p-2 rounded-full transition-all duration-300 flex items-center space-x-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider border backdrop-blur-md ${
                isGlobal 
                  ? 'bg-blue-900/20 border-blue-500/30 text-blue-200 hover:bg-blue-900/40 hover:border-blue-400/50' 
                  : 'bg-indigo-900/20 border-indigo-500/30 text-indigo-200 hover:bg-indigo-900/40 hover:border-indigo-400/50'
              }`}
            >
              {isGlobal ? (
                <>
                  <MonitorPlay className="h-3.5 w-3.5" />
                  <span>K-Stream</span>
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5" />
                  <span>Global</span>
                </>
              )}
            </Link>

            {/* Auth Button */}
            {user ? (
                <div className="flex items-center gap-2 group relative">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold border border-white/20">
                        {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                    </div>
                    {/* Hover Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-32 bg-slate-900 border border-white/10 rounded-lg shadow-xl py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                        <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 w-full text-left">
                            <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                    </div>
                </div>
            ) : (
                <Link to="/login" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                    <User className="h-4 w-4" />
                    Login
                </Link>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
             {user && (
                 <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold border border-white/20">
                    {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                 </div>
             )}
            {/* Mode Toggle - Mobile */}
            <Link 
                to={isGlobal ? "/" : "/global"}
                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border backdrop-blur-sm transition-all duration-300 ${
                    isGlobal 
                    ? (isScrolled 
                        ? 'border-blue-500/30 text-blue-200 bg-blue-500/10' 
                        : 'border-blue-500/20 text-white bg-transparent')
                    : (isScrolled 
                        ? 'border-indigo-500/30 text-indigo-200 bg-indigo-500/10' 
                        : 'border-indigo-500/20 text-white bg-transparent')
                }`}
            >
                {isGlobal ? 'KO' : 'GL'}
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/10 animate-fade-in shadow-2xl">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-300 hover:text-white hover:bg-white/5 block px-3 py-3 rounded-md text-base font-medium flex items-center gap-2"
              >
                {link.name}
              </Link>
            ))}
            
            <div className="border-t border-white/10 my-2 pt-2">
                {!user ? (
                    <Link
                        to="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-gray-300 hover:text-white hover:bg-white/5 block px-3 py-3 rounded-md text-base font-medium flex items-center gap-2"
                    >
                        <User className="h-4 w-4" /> Login / Sign Up
                    </Link>
                ) : (
                     <button
                        onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                        className="text-red-400 hover:text-red-300 hover:bg-white/5 block px-3 py-3 rounded-md text-base font-medium flex items-center gap-2 w-full text-left"
                    >
                        <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                )}
            </div>

          </div>
          <div className="px-4 pb-4">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 text-white border border-white/10 rounded-lg py-2.5 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
            </form>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
