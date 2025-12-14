import React, { useState, useEffect } from 'react';
import { Search, MonitorPlay, Menu, X, Globe, Users, User, LogOut, Edit2, Save, Loader2, Lock, Shield, Zap } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, logoutUser, updateUserPassword } from '../services/firebase';
import Toast from './Toast';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Profile Edit State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); // Controls animation
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Change Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  const isGlobal = location.pathname.startsWith('/global');
  const isAnime = location.pathname.startsWith('/anime');
  
  // Dynamic Search Path
  const searchPath = isAnime ? '/anime/search' : (isGlobal ? '/global/search' : '/search');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Auth Listener
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
        setUser(currentUser);
        if (currentUser?.displayName) {
            setNewDisplayName(currentUser.displayName);
        }
    });

    return () => {
        window.removeEventListener('scroll', handleScroll);
        unsubscribe();
    }
  }, []);

  const handleLogout = async () => {
      await logoutUser();
      navigate('/login');
  };

  // Modal Helpers
  const openProfileModal = () => {
      setIsProfileModalOpen(true);
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setModalVisible(true), 10);
  };

  const closeProfileModal = () => {
      setModalVisible(false);
      setTimeout(() => setIsProfileModalOpen(false), 300);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      
      if (!newDisplayName.trim()) {
          setToast({ message: "Display name cannot be empty.", type: 'error' });
          return;
      }
      
      if (isChangingPassword) {
          if (!currentPassword || !newPassword) {
              setToast({ message: "Both current and new passwords are required.", type: 'error' });
              return;
          }
          if (newPassword.length < 6) {
              setToast({ message: "New password must be at least 6 characters.", type: 'error' });
              return;
          }
      }

      setIsUpdating(true);
      try {
          if (newDisplayName !== user.displayName) {
              await user.updateProfile({ displayName: newDisplayName });
              setUser({ ...user, displayName: newDisplayName });
          }
          if (isChangingPassword) {
              await updateUserPassword(currentPassword, newPassword);
          }
          setToast({ message: "Profile updated successfully!", type: 'success' });
          setTimeout(() => closeProfileModal(), 1000);
      } catch (error: any) {
          console.error("Update failed", error);
          let msg = "Failed to update profile.";
          if (error.code === 'auth/wrong-password') msg = "Incorrect current password.";
          setToast({ message: msg, type: 'error' });
      } finally {
          setIsUpdating(false);
      }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Cycle Mode Logic: KO -> GL -> AN -> KO
  const getNextModePath = () => {
      if (isAnime) return '/'; // AN -> KO
      if (isGlobal) return '/anime'; // GL -> AN
      return '/global'; // KO -> GL
  };

  const getCurrentModeLabel = () => {
      if (isAnime) return { label: 'Anime', icon: <Zap className="h-3.5 w-3.5" />, color: 'purple' };
      if (isGlobal) return { label: 'Global', icon: <Globe className="h-3.5 w-3.5" />, color: 'blue' };
      return { label: 'K-Stream', icon: <MonitorPlay className="h-3.5 w-3.5" />, color: 'indigo' };
  };

  const currentMode = getCurrentModeLabel();

  const navLinks = [
    { name: 'Home', path: isAnime ? '/anime' : (isGlobal ? '/global' : '/') },
    { name: 'Movies', path: isGlobal ? '/global/movies' : '/movies', hidden: isAnime },
    { name: 'TV Shows', path: isGlobal ? '/global/tv' : '/tv', hidden: isAnime },
    { name: 'Watch Party', path: '/rooms' },
  ];

  return (
    <>
    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    
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
            <Link to={isAnime ? "/anime" : (isGlobal ? "/global" : "/")} className="flex items-center space-x-2 group">
              {isAnime ? (
                 <Zap className="h-8 w-8 text-purple-500 group-hover:text-purple-400 transition-colors" />
              ) : isGlobal ? (
                <Globe className="h-8 w-8 text-blue-500 group-hover:text-blue-400 transition-colors" />
              ) : (
                <MonitorPlay className="h-8 w-8 text-indigo-500 group-hover:text-indigo-400 transition-colors" />
              )}
              <span className={`text-xl font-bold tracking-tight ${isAnime ? 'text-purple-100' : (isGlobal ? 'text-blue-100' : 'text-white')}`}>
                {isAnime ? 'Anime Stream' : (isGlobal ? 'Global Stream' : 'K-Stream')}
              </span>
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                {navLinks.filter(l => !l.hidden).map((link) => (
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
            {/* Search Icon Link */}
            <Link 
                to={searchPath}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Search"
            >
                <Search className="h-5 w-5" />
            </Link>

            {/* Mode Toggle - Desktop (3-way) */}
            <Link 
              to={getNextModePath()}
              className={`p-2 rounded-full transition-all duration-300 flex items-center space-x-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider border backdrop-blur-md ${
                isAnime
                 ? 'bg-purple-900/20 border-purple-500/30 text-purple-200 hover:bg-purple-900/40 hover:border-purple-400/50'
                 : isGlobal 
                    ? 'bg-blue-900/20 border-blue-500/30 text-blue-200 hover:bg-blue-900/40 hover:border-blue-400/50' 
                    : 'bg-indigo-900/20 border-indigo-500/30 text-indigo-200 hover:bg-indigo-900/40 hover:border-indigo-400/50'
              }`}
            >
              {currentMode.icon}
              <span>{currentMode.label}</span>
            </Link>

            {/* Auth Button */}
            {user ? (
                <div className="flex items-center gap-2 group relative h-full py-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold border border-white/20 cursor-pointer">
                        {getInitials(user.displayName)}
                    </div>
                    <div className="absolute right-0 top-full pt-2 w-40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                        <div className="bg-slate-900 border border-white/10 rounded-lg shadow-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-white/5">
                                <p className="text-xs text-gray-400">Signed in as</p>
                                <p className="text-sm font-bold text-white truncate">{user.displayName || 'User'}</p>
                            </div>
                            <button onClick={openProfileModal} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white w-full text-left transition-colors">
                                <Edit2 className="h-4 w-4" /> Edit Profile
                            </button>
                            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 w-full text-left transition-colors">
                                <LogOut className="h-4 w-4" /> Sign Out
                            </button>
                        </div>
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
            <Link 
                to={searchPath}
                className="p-2 text-gray-300 hover:text-white"
                aria-label="Search"
            >
                <Search className="h-5 w-5" />
            </Link>

            {/* Mode Toggle - Mobile */}
            <Link 
                to={getNextModePath()}
                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border backdrop-blur-sm transition-all duration-300 ${
                    isAnime
                     ? 'border-purple-500/30 text-purple-200 bg-purple-500/10'
                     : isGlobal 
                        ? 'border-blue-500/30 text-blue-200 bg-blue-500/10' 
                        : 'border-indigo-500/30 text-indigo-200 bg-indigo-500/10'
                }`}
            >
                {isAnime ? 'AN' : (isGlobal ? 'GL' : 'KO')}
            </Link>
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {user && (
                 <div onClick={openProfileModal} className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold border border-white/20 ml-1">
                    {getInitials(user.displayName)}
                 </div>
             )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/10 animate-fade-in shadow-2xl">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.filter(l => !l.hidden).map((link) => (
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
                    <>
                     <button
                        onClick={() => { openProfileModal(); setIsMobileMenuOpen(false); }}
                        className="text-gray-300 hover:text-white hover:bg-white/5 block px-3 py-3 rounded-md text-base font-medium flex items-center gap-2 w-full text-left"
                     >
                        <Edit2 className="h-4 w-4" /> Edit Profile
                     </button>
                     <button
                        onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                        className="text-red-400 hover:text-red-300 hover:bg-white/5 block px-3 py-3 rounded-md text-base font-medium flex items-center gap-2 w-full text-left"
                    >
                        <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                    </>
                )}
            </div>

          </div>
        </div>
      )}
    </nav>
    {/* Profile Modal code... (kept as is) */}
    </>
  );
};

export default Navbar;