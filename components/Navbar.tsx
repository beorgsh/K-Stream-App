import React, { useState, useEffect } from 'react';
import { Search, MonitorPlay, Menu, X, Globe, Users, User, LogOut, Edit2, Save, Loader2, Lock, Shield } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, logoutUser, updateUserPassword } from '../services/firebase';
import Toast from './Toast';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Modal Helpers
  const openProfileModal = () => {
      setIsProfileModalOpen(true);
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      // Small delay to ensure DOM is rendered before fading in
      setTimeout(() => setModalVisible(true), 10);
  };

  const closeProfileModal = () => {
      setModalVisible(false);
      setTimeout(() => setIsProfileModalOpen(false), 300);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      
      // Basic validation
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
          // 1. Update Display Name
          if (newDisplayName !== user.displayName) {
              await user.updateProfile({
                  displayName: newDisplayName
              });
              setUser({ ...user, displayName: newDisplayName });
          }

          // 2. Update Password (if requested)
          if (isChangingPassword) {
              await updateUserPassword(currentPassword, newPassword);
          }

          setToast({ message: "Profile updated successfully!", type: 'success' });
          setTimeout(() => closeProfileModal(), 1000);
      } catch (error: any) {
          console.error("Update failed", error);
          let msg = "Failed to update profile.";
          if (error.code === 'auth/wrong-password') msg = "Incorrect current password.";
          if (error.code === 'auth/weak-password') msg = "Password is too weak.";
          if (error.message.includes('credential')) msg = "Incorrect current password.";
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

  const navLinks = [
    { name: 'Home', path: isGlobal ? '/global' : '/' },
    { name: 'Movies', path: isGlobal ? '/global/movies' : '/movies' },
    { name: 'TV Shows', path: isGlobal ? '/global/tv' : '/tv' },
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
                <div className="flex items-center gap-2 group relative h-full py-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold border border-white/20 cursor-pointer">
                        {getInitials(user.displayName)}
                    </div>
                    {/* Hover Dropdown - Fixed with pt-2 to bridge gap */}
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

    {/* Edit Profile Modal - Outside Nav for better stacking context */}
    {isProfileModalOpen && (
        <div 
            className={`fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${modalVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeProfileModal}
        >
            <div className="flex min-h-full items-center justify-center p-4">
                <div 
                    className={`bg-slate-900 border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl p-6 transform transition-all duration-300 ease-in-out ${modalVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 className="text-xl font-bold text-white mb-4">Edit Profile</h3>
                    <form onSubmit={handleUpdateProfile}>
                        <div className="mb-6">
                            <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                            <input 
                                type="text" 
                                value={newDisplayName}
                                onChange={(e) => setNewDisplayName(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Enter name"
                            />
                        </div>

                        {/* Change Password Toggle */}
                        <div className="mb-6 border-t border-white/10 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsChangingPassword(!isChangingPassword)}
                                className="flex items-center gap-2 text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                <Lock className="h-4 w-4" />
                                {isChangingPassword ? "Cancel Password Change" : "Change Password"}
                            </button>

                            {isChangingPassword && (
                                <div className="mt-4 space-y-4 animate-fade-in bg-white/5 p-4 rounded-lg border border-white/5">
                                    <div className="flex items-start gap-2 text-xs text-yellow-500/80 mb-2">
                                        <Shield className="h-3 w-3 mt-0.5" />
                                        <span>For security, verify your current password.</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1.5">Current Password</label>
                                        <input 
                                            type="password" 
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                            placeholder="Verify current password"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1.5">New Password</label>
                                        <input 
                                            type="password" 
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                            placeholder="Minimum 6 characters"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button 
                                type="button"
                                onClick={closeProfileModal}
                                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={isUpdating}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                            >
                                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default Navbar;