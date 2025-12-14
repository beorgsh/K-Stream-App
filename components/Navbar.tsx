import React, { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { Search, MonitorPlay, Users, User, LogOut, Edit2, Clapperboard, ChevronDown, LogIn, RefreshCw, Loader2 } from 'lucide-react';
import { auth, logoutUser, updateUserPassword } from '../services/firebase';
import Toast from './Toast';

// --- CUSTOM ROUTER IMPLEMENTATION ---
const RouterContext = createContext<{ path: string; queryString: string; navigate: (to: string) => void }>({ path: '/', queryString: '', navigate: () => {} });
const ParamsContext = createContext<Record<string, string>>({});

export const HashRouter = ({ children }: { children: ReactNode }) => {
    const [route, setRoute] = useState(() => {
        const hash = window.location.hash.slice(1);
        const [path, qs] = hash.split('?');
        return { path: path || '/', queryString: qs || '' };
    });

    useEffect(() => {
        const handler = () => {
            const hash = window.location.hash.slice(1);
            const [path, qs] = hash.split('?');
            setRoute({ path: path || '/', queryString: qs || '' });
        };
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, []);

    const navigate = (to: string) => {
        window.location.hash = to;
    };

    return (
        <RouterContext.Provider value={{ path: route.path, queryString: route.queryString, navigate }}>
            {children}
        </RouterContext.Provider>
    );
};

export const Routes = ({ children }: { children: ReactNode }) => {
    const { path } = useContext(RouterContext);
    const routes = React.Children.toArray(children);
    
    for (const child of routes) {
        if (!React.isValidElement(child)) continue;
        const { path: pattern, element } = child.props as { path: string, element: ReactNode };
        
        if (pattern === '*') return <ParamsContext.Provider value={{}}>{element}</ParamsContext.Provider>;
        
        const patternParts = pattern.split('/').filter(Boolean);
        const pathParts = path.split('/').filter(Boolean);
        
        if (patternParts.length === pathParts.length) {
            const params: Record<string, string> = {};
            let match = true;
            for (let i = 0; i < patternParts.length; i++) {
                if (patternParts[i].startsWith(':')) {
                    params[patternParts[i].slice(1)] = pathParts[i];
                } else if (patternParts[i] !== pathParts[i]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return <ParamsContext.Provider value={params}>{element}</ParamsContext.Provider>;
            }
        }
    }
    return null;
};

export const Route = (props: { path: string; element: ReactNode }) => null;

export const Link = ({ to, children, className, title, onClick }: any) => {
    return (
        <a 
            href={`#${to}`} 
            className={className} 
            title={title}
            onClick={(e) => {
                if (onClick) onClick(e);
            }}
        >
            {children}
        </a>
    );
};

export const useNavigate = () => {
    const { navigate } = useContext(RouterContext);
    return navigate;
};

export const useLocation = () => {
    const { path, queryString } = useContext(RouterContext);
    return { pathname: path, search: queryString ? `?${queryString}` : '' };
};

export const useParams = <T extends Record<string, string> = Record<string, string>>(): T => {
    return useContext(ParamsContext) as T;
};

export const useSearchParams = () => {
    const { queryString } = useContext(RouterContext);
    const params = new URLSearchParams(queryString);
    return [params];
};
// --- END CUSTOM ROUTER ---

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Profile/Menu Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Profile Edit Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); 
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Logout State
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Change Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Determine Active Section
  const activeSection = location.pathname.startsWith('/anime') ? 'anime' 
                      : location.pathname.startsWith('/global') ? 'global' 
                      : 'kdrama';

  const sections = [
      { id: 'kdrama', label: 'K-Drama', path: '/' },
      { id: 'global', label: 'Global', path: '/global' },
      { id: 'anime', label: 'Anime', path: '/anime' },
  ];

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

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
        window.removeEventListener('scroll', handleScroll);
        document.removeEventListener('mousedown', handleClickOutside);
        unsubscribe();
    }
  }, []);

  const handleLogout = async () => {
      if (isLoggingOut) return;
      setIsLoggingOut(true);
      try {
        await logoutUser();
        setToast({ message: "Signed out successfully. See you soon!", type: 'success' });
        setIsDropdownOpen(false);
        // Delay navigation slightly so user sees the toast/state
        setTimeout(() => {
            navigate('/login');
            setIsLoggingOut(false);
        }, 1000);
      } catch (error) {
          console.error("Logout failed", error);
          setToast({ message: "Failed to sign out.", type: 'error' });
          setIsLoggingOut(false);
      }
  };

  const openProfileModal = () => {
      setIsProfileModalOpen(true);
      setIsDropdownOpen(false);
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
          setToast({ message: "Failed to update profile.", type: 'error' });
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
    { name: 'Movies', path: '/movies' },
    { name: 'TV Shows', path: '/tv' },
    { name: 'Rooms', path: '/rooms', icon: Users },
  ];

  const getBrandTitle = () => {
      if (activeSection === 'anime') return 'Anime';
      if (activeSection === 'global') return 'Global';
      return 'K-Stream';
  };

  // Logic to find next section
  const currentSectionIndex = sections.findIndex(s => s.id === activeSection);
  const nextSectionIndex = (currentSectionIndex + 1) % sections.length;
  const nextSection = sections[nextSectionIndex];

  const handleModeSwitch = () => {
    const isSearch = location.pathname.includes('/search');
    const query = location.search;

    // If searching, stay in search mode but switch context
    if (isSearch) {
        let targetPath = '/search';
        if (nextSection.id === 'anime') targetPath = '/anime/search';
        else if (nextSection.id === 'global') targetPath = '/global/search';
        
        navigate(`${targetPath}${query}`);
    } else {
        navigate(nextSection.path);
    }
  };

  const getSearchPath = () => {
      if (activeSection === 'anime') return "/anime/search";
      if (activeSection === 'global') return "/global/search";
      return "/search";
  };
  
  const getHomeLink = () => {
      if (activeSection === 'anime') return '/anime';
      if (activeSection === 'global') return '/global';
      return '/';
  };

  return (
    <>
    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
        isScrolled 
          ? 'bg-slate-950/95 backdrop-blur-xl shadow-lg border-white/5' 
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* LEFT: Logo & Dynamic Mode Switcher */}
          <div className="flex items-center gap-6 md:gap-8">
            <Link to={getHomeLink()} className="flex items-center gap-2 group flex-shrink-0">
              <MonitorPlay className="h-7 w-7 text-indigo-500 group-hover:text-indigo-400 transition-colors" />
              <span className="text-lg md:text-xl font-bold tracking-tight text-white group-hover:text-gray-200 transition-colors">
                {getBrandTitle()}
              </span>
            </Link>

            {/* Single Dynamic Mode Button */}
            <button
                onClick={handleModeSwitch}
                className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 transition-all group"
                title={`Switch to ${nextSection.label}`}
            >
                <RefreshCw className="h-3 w-3 text-indigo-400 group-hover:rotate-180 transition-transform duration-500" />
                <span className="text-xs font-bold text-gray-300 group-hover:text-white">
                    Mode: <span className="text-indigo-400">{sections[currentSectionIndex].label}</span>
                </span>
            </button>
          </div>

          {/* RIGHT: Search, Links, Auth */}
          <div className="flex items-center gap-2 sm:gap-4">
             
             {/* Mobile Mode Switcher (Icon Only) */}
             <button
                onClick={handleModeSwitch}
                className="md:hidden p-2 rounded-full bg-white/5 text-indigo-400 mr-1"
             >
                 <RefreshCw className="h-4 w-4" />
             </button>

             <Link 
                to={getSearchPath()}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
             >
                <Search className="h-5 w-5" />
             </Link>

             {/* Desktop Navigation Links */}
             <div className="hidden md:flex items-center gap-1">
                {navLinks.map(link => (
                    <Link 
                        key={link.name}
                        to={link.path}
                        className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        {link.name}
                    </Link>
                ))}
             </div>

             {/* Divider */}
             <div className="hidden md:block w-px h-6 bg-white/10 mx-1"></div>

             {/* Auth / Profile Dropdown */}
             <div className="relative" ref={dropdownRef}>
                 <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 focus:outline-none group"
                 >
                     {user ? (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold border border-white/20 group-hover:border-indigo-400 transition-colors shadow-lg shadow-indigo-600/20">
                            {getInitials(user.displayName)}
                        </div>
                     ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all">
                             <User className="h-4 w-4 text-gray-300" />
                             <span className="text-xs font-bold text-gray-300 hidden sm:block">Sign In</span>
                             <ChevronDown className="h-3 w-3 text-gray-500" />
                        </div>
                     )}
                 </button>

                 {/* Dropdown Menu */}
                 {isDropdownOpen && (
                     <div className="absolute right-0 top-full mt-3 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in origin-top-right z-50">
                         {/* User Header */}
                         {user ? (
                            <div className="px-4 py-4 border-b border-white/5 bg-white/5">
                                <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">Signed in as</p>
                                <p className="text-sm font-bold text-white truncate">{user.displayName || 'User'}</p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                         ) : (
                            <div className="p-4 border-b border-white/5 bg-indigo-600/10">
                                <p className="text-sm text-gray-300 mb-3">Join K-Stream to track your progress and host parties.</p>
                                <Link 
                                    to="/login"
                                    onClick={() => setIsDropdownOpen(false)}
                                    className="flex items-center justify-center gap-2 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors"
                                >
                                    <LogIn className="h-4 w-4" /> Log In / Sign Up
                                </Link>
                            </div>
                         )}

                         {/* Mobile Navigation Links inside Dropdown */}
                         <div className="md:hidden py-2 border-b border-white/5">
                             <p className="px-4 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Browse</p>
                             {navLinks.map(link => (
                                 <Link 
                                    key={link.name}
                                    to={link.path} 
                                    onClick={() => setIsDropdownOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                                 >
                                     {link.icon ? <link.icon className="h-4 w-4" /> : <Clapperboard className="h-4 w-4" />}
                                     {link.name}
                                 </Link>
                             ))}
                         </div>

                         {/* Actions */}
                         <div className="py-2">
                             {user && (
                                 <button 
                                    onClick={openProfileModal}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white text-left transition-colors"
                                 >
                                     <Edit2 className="h-4 w-4" /> Edit Profile
                                 </button>
                             )}
                             
                             {user && (
                                <button 
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 text-left transition-colors disabled:opacity-50"
                                >
                                    {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                                    {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                                </button>
                             )}
                         </div>
                     </div>
                 )}
             </div>
          </div>
        </div>
      </div>
    </nav>
    
    {/* Profile Edit Modal */}
    {isProfileModalOpen && (
       <div 
         className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${modalVisible ? 'opacity-100' : 'opacity-0'}`}
         onClick={closeProfileModal}
       >
          <div 
             className={`bg-slate-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl p-6 transform transition-all duration-300 ${modalVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
             onClick={(e) => e.stopPropagation()}
          >
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                     <Edit2 className="h-5 w-5 text-indigo-400" /> Edit Profile
                 </h2>
                 <button onClick={closeProfileModal} className="text-gray-400 hover:text-white">
                     {/* Using a standard X icon for closing */}
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
                 </button>
             </div>
             
             <form onSubmit={handleUpdateProfile} className="space-y-4">
                 <div>
                     <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                     <input 
                        type="text" 
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Your Name"
                     />
                 </div>

                 <div className="pt-2 border-t border-white/5">
                     <button 
                        type="button"
                        onClick={() => setIsChangingPassword(!isChangingPassword)}
                        className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 mb-3"
                     >
                         {isChangingPassword ? 'Cancel Password Change' : 'Change Password'}
                     </button>
                     
                     {isChangingPassword && (
                         <div className="space-y-3 animate-fade-in">
                             <div>
                                 <label className="block text-sm text-gray-400 mb-1">Current Password</label>
                                 <input 
                                    type="password" 
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="Verify current password"
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm text-gray-400 mb-1">New Password</label>
                                 <input 
                                    type="password" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="Min 6 characters"
                                 />
                             </div>
                         </div>
                     )}
                 </div>

                 <button 
                    type="submit" 
                    disabled={isUpdating}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 mt-2"
                 >
                    {isUpdating ? 'Updating...' : 'Save Changes'}
                 </button>
             </form>
          </div>
       </div>
    )}
    </>
  );
};

export default Navbar;