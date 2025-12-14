import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { useNavigate } from '../components/Navbar';
import { Lock, Mail, User, ShieldCheck, Loader2 } from 'lucide-react';
import Toast from '../components/Toast';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Simple Math Captcha state
  const [captchaNum1, setCaptchaNum1] = useState(Math.floor(Math.random() * 10));
  const [captchaNum2, setCaptchaNum2] = useState(Math.floor(Math.random() * 10));
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const navigate = useNavigate();

  const generateCaptcha = () => {
      setCaptchaNum1(Math.floor(Math.random() * 10));
      setCaptchaNum2(Math.floor(Math.random() * 10));
      setCaptchaAnswer('');
  };

  // Validation Logic
  const isFormValid = () => {
      if (isLogin) {
          return email.trim() !== '' && password.trim() !== '';
      } else {
          return email.trim() !== '' && password.trim() !== '' && username.trim() !== '' && captchaAnswer.trim() !== '';
      }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ message, type });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isLogin) {
        if (parseInt(captchaAnswer) !== captchaNum1 + captchaNum2) {
            showToast('Incorrect CAPTCHA answer. Are you a robot?', 'error');
            setLoading(false);
            generateCaptcha();
            return;
        }
    }

    try {
      if (isLogin) {
        await auth.signInWithEmailAndPassword(email, password);
      } else {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user?.updateProfile({
            displayName: username
        });
      }
      showToast(isLogin ? 'Welcome back!' : 'Account created successfully!', 'success');
      setTimeout(() => navigate('/'), 1000);
    } catch (err: any) {
      console.error(err);
      let msg = "Authentication failed";
      if (err.code === 'auth/email-already-in-use') msg = "Email already in use";
      if (err.code === 'auth/wrong-password') msg = "Incorrect password";
      if (err.code === 'auth/user-not-found') msg = "User not found";
      if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters";
      if (err.code === 'auth/invalid-email') msg = "Invalid email format";
      
      showToast(msg, 'error');
      if (!isLogin) generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 pt-20">
      {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
      )}

      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
        {/* Decorative background blobs */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white mb-2 text-center">
                {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-gray-400 text-center mb-8 text-sm">
                {isLogin ? 'Login to sync your watch history' : 'Join the community to host parties'}
            </p>

            <form onSubmit={handleAuth} className="space-y-4" noValidate>
                {!isLogin && (
                    <div className="relative group">
                        <User className="absolute left-3 top-3 h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Display Name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                )}

                <div className="relative group">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                        type="email" 
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>

                <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                        type="password" 
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>

                {!isLogin && (
                    <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-gray-300 text-sm">
                            <ShieldCheck className="h-4 w-4 text-indigo-400" />
                            <span>Security Check</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-xl font-bold text-white tracking-widest bg-black/40 px-3 py-1 rounded">
                                {captchaNum1} + {captchaNum2} = ?
                            </span>
                            <input 
                                type="number" 
                                value={captchaAnswer}
                                onChange={(e) => setCaptchaAnswer(e.target.value)}
                                placeholder="Answer"
                                required
                                className="w-24 bg-black/40 border border-white/10 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-indigo-500 text-center"
                            />
                        </div>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading || !isFormValid()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 group"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
                </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-400">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                    onClick={() => { setIsLogin(!isLogin); setToast(null); }}
                    className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                >
                    {isLogin ? 'Sign Up' : 'Login'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;