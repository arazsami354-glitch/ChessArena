import React, { useState } from 'react';
import { auth, db, googleProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, doc, setDoc, getDoc } from '../firebase';
import { Shield, Mail, Lock, User, Globe, AlertTriangle } from 'lucide-react';
import Modal from './ui/Modal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('US');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isForgot) {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset email sent! Check your inbox.');
        setLoading(false);
        return;
      }

      if (isLogin) {
        // Sign In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        // If profile doesn't exist for some reason, create it
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            uid: userCredential.user.uid,
            username: email.split('@')[0],
            email: email,
            elo: 1200,
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            walletBalance: 100.0,
            pendingBalance: 0,
            isAdmin: email.includes('admin'), // Auto-admin if email contains 'admin'
            isBanned: false,
            status: 'online',
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        // Sign Up
        if (!username.trim()) {
          throw new Error('Username is required');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          username: username.trim(),
          email: email,
          elo: 1200,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          walletBalance: 100.0, // Preload with $100 for immediate play
          pendingBalance: 0,
          isAdmin: email.includes('admin'),
          isBanned: false,
          status: 'online',
          country: country,
          createdAt: new Date().toISOString(),
        });
      }

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: result.user.uid,
          username: result.user.displayName || result.user.email?.split('@')[0] || 'User',
          email: result.user.email || '',
          photoURL: result.user.photoURL || '',
          elo: 1200,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          walletBalance: 100.0,
          pendingBalance: 0,
          isAdmin: result.user.email?.includes('admin') || false,
          isBanned: false,
          status: 'online',
          createdAt: new Date().toISOString(),
        });
      }
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google Login failed');
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isForgot ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Arena Account'}
      description="Experience high-stakes competitive chess."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Shield className="text-zinc-100" size={32} />
          <span className="font-display font-bold text-2xl tracking-tight text-white">CHESSARENA</span>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg flex items-center gap-2 text-red-200 text-xs">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3 bg-green-950/50 border border-green-800 rounded-lg text-green-200 text-xs text-center font-semibold">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && !isForgot && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input 
                    id="auth-username"
                    type="text"
                    required
                    placeholder="MagnusCarlsen"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Country Code (e.g. US, NO, IN)</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input 
                    id="auth-country"
                    type="text"
                    maxLength={2}
                    placeholder="US"
                    value={country}
                    onChange={(e) => setCountry(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                id="auth-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 transition-all placeholder:text-zinc-600"
              />
            </div>
          </div>

          {!isForgot && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-zinc-400">Password</label>
                {isLogin && (
                  <button 
                    id="btn-forgot-password"
                    type="button" 
                    onClick={() => setIsForgot(true)}
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input 
                  id="auth-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>
          )}

          <button 
            id="auth-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-all text-sm mt-4 flex items-center justify-center disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Processing...' : isForgot ? 'Send Password Reset' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {!isForgot && (
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-3 text-zinc-500 font-semibold select-none">Or continue with</span>
            </div>
          </div>
        )}

        {!isForgot && (
          <button 
            id="google-login-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-all text-sm font-semibold flex items-center justify-center gap-2 text-white disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Google Account
          </button>
        )}

        <div className="text-center pt-2 border-t border-zinc-800/40">
          {isForgot ? (
            <button 
              id="back-to-login"
              onClick={() => { setIsForgot(false); setIsLogin(true); }}
              className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer font-semibold"
            >
              Back to Login
            </button>
          ) : (
            <p className="text-sm text-zinc-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                id="toggle-auth-mode"
                onClick={() => setIsLogin(!isLogin)}
                className="text-white underline font-semibold cursor-pointer hover:text-zinc-200"
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
