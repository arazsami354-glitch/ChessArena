import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType, onAuthStateChanged, doc, onSnapshot, getDoc, updateDoc } from './firebase';
import { UserProfile } from './types';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import WalletSection from './components/WalletSection';
import ChessBoardComponent from './components/ChessBoardComponent';
import MatchmakingSection from './components/MatchmakingSection';
import AdminDashboardSection from './components/AdminDashboardSection';
import { 
  Trophy, TrendingUp, ShieldAlert, Award, Play, History, Users, Wallet, Globe, ArrowRight, LogIn, ChevronRight, Swords, HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // View routing state
  const [view, setView] = useState<'lobby' | 'wallet' | 'game' | 'profile'>('lobby');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 1. Listen for Authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Set up real-time listener for the user's profile
        const userRef = doc(db, 'users', user.uid);
        
        // Listen for updates
        const unsubProfile = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserProfile(snapshot.data() as UserProfile);
          }
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        });

        // Set status to online on connect
        try {
          await updateDoc(userRef, { status: 'online' });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        }

        return () => {
          unsubProfile();
        };
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const handleSelectMatch = (matchId: string) => {
    setActiveMatchId(matchId);
    setView('game');
  };

  const handleSpectateMatch = (matchId: string) => {
    setActiveMatchId(matchId);
    setView('game');
    setIsAdminView(false);
  };

  // Safe checks for user state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-white rounded-full animate-spin" />
        <span className="text-sm text-zinc-500 font-semibold tracking-wider uppercase mt-4">ChessArena Loading...</span>
      </div>
    );
  }

  // Account Banned Screen
  if (userProfile?.isBanned) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-center text-white">
        <ShieldAlert className="text-red-500 mb-6 shrink-0" size={64} />
        <h1 className="font-display font-bold text-3xl tracking-tight">System Account Suspended</h1>
        <p className="text-zinc-500 text-sm max-w-md mt-3 leading-relaxed">
          Your profile has been suspended by automated ELO integrity guards or manual safety controllers. If you believe this is a discrepancy, file an appeal under manual review.
        </p>
        <button 
          id="ban-logout-btn"
          onClick={() => auth.signOut()} 
          className="mt-8 px-6 py-2.5 bg-white text-black font-semibold rounded-lg text-sm transition"
        >
          Sign Out of Account
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-between text-white selection:bg-zinc-800">
      
      {/* Dynamic Navbar */}
      <Navbar 
        userProfile={userProfile}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenWallet={() => setView('wallet')}
        onOpenAdmin={() => setIsAdminView(true)}
        onOpenProfile={() => setView('profile')}
        isAdminView={isAdminView}
        setIsAdminView={setIsAdminView}
      />

      {/* Main Core Body */}
      <main className="flex-grow">
        {userProfile ? (
          <>
            {isAdminView && userProfile.isAdmin ? (
              <AdminDashboardSection 
                onClose={() => setIsAdminView(false)}
                onSpectateMatch={handleSpectateMatch}
              />
            ) : view === 'wallet' ? (
              <WalletSection 
                userProfile={userProfile}
                onClose={() => setView('lobby')}
              />
            ) : view === 'game' && activeMatchId ? (
              <ChessBoardComponent 
                userProfile={userProfile}
                matchId={activeMatchId}
                onExit={() => { setView('lobby'); setActiveMatchId(null); }}
              />
            ) : view === 'profile' ? (
              <div className="max-w-4xl mx-auto py-12 px-6 space-y-8 animate-fade-in">
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center font-bold text-2xl">
                      {userProfile.username[0].toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-2xl text-white">{userProfile.username}</h2>
                      <span className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mt-0.5 block flex items-center gap-1">
                        <Globe size={12} /> {userProfile.country || 'US'} Player
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="bg-zinc-950 px-5 py-3.5 rounded-xl border border-zinc-800 text-center min-w-[90px]">
                      <span className="text-[10px] uppercase font-bold text-zinc-500">ELO Rating</span>
                      <span className="text-xl font-display font-bold text-white mt-1 block">{userProfile.elo}</span>
                    </div>
                    <div className="bg-zinc-950 px-5 py-3.5 rounded-xl border border-zinc-800 text-center min-w-[90px]">
                      <span className="text-[10px] uppercase font-bold text-zinc-500">Win Rate</span>
                      <span className="text-xl font-display font-bold text-green-400 mt-1 block">
                        {userProfile.matchesPlayed > 0 
                          ? `${Math.round((userProfile.wins / userProfile.matchesPlayed) * 100)}%` 
                          : '0%'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">Matches Played</span>
                    <span className="text-2xl font-display font-bold text-zinc-200 mt-1.5 block">{userProfile.matchesPlayed}</span>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block text-green-400">Wins</span>
                    <span className="text-2xl font-display font-bold text-green-400 mt-1.5 block">{userProfile.wins}</span>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block text-red-400">Losses</span>
                    <span className="text-2xl font-display font-bold text-red-400 mt-1.5 block">{userProfile.losses}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button 
                    id="profile-wallet-btn"
                    onClick={() => setView('wallet')}
                    className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-semibold"
                  >
                    Wallet Ledger
                  </button>
                  <button 
                    id="profile-back-lobby-btn"
                    onClick={() => setView('lobby')}
                    className="px-5 py-2.5 bg-white text-black rounded-lg text-xs font-semibold hover:bg-zinc-200 transition"
                  >
                    Lobby Arena
                  </button>
                </div>
              </div>
            ) : (
              // Default Arena Matchmaking lobby
              <MatchmakingSection 
                userProfile={userProfile}
                onSelectMatch={handleSelectMatch}
                onOpenWallet={() => setView('wallet')}
              />
            )}
          </>
        ) : (
          /* Unauthenticated Landing Dashboard Vibe */
          <div className="max-w-6xl mx-auto py-16 px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Visual Intro Copy */}
            <div className="space-y-6">
              <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded-full">
                Introducing ChessArena
              </span>
              <h1 className="font-display font-bold text-4xl sm:text-5xl leading-tight text-white tracking-tight">
                High-stakes, real-time <span className="text-zinc-400">online chess.</span>
              </h1>
              <p className="text-zinc-400 text-base leading-relaxed">
                Connect with matching Chess ELO competitors worldwide. Choose your own custom bet amount before combat. The winning player claims the entire pool minus a 20% platform commission fee, calculated dynamically and protected by secure server-side anti-cheat logic.
              </p>

              <div className="space-y-3 pt-2 text-sm text-zinc-400">
                <div className="flex items-center gap-2.5">
                  <Award className="text-zinc-300 shrink-0" size={18} />
                  <span>Standardized ELO ratings matchmaking</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Wallet className="text-green-400 shrink-0" size={18} />
                  <span>Instant, automated financial payout ledgers</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="text-zinc-300 shrink-0" size={18} />
                  <span>Server move-validation and anti-cheat triggers</span>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  id="landing-get-started"
                  onClick={() => setShowAuthModal(true)}
                  className="px-8 py-3.5 bg-white text-black text-sm font-semibold rounded-xl hover:bg-zinc-200 transition shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <LogIn size={16} /> Enter the Arena
                </button>
              </div>
            </div>

            {/* Simulated Live Match visual Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-6">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-zinc-800 via-zinc-400 to-zinc-800" />
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Live Exhibition Battlefield</span>
                </div>
                <span className="text-[10px] font-bold bg-green-950 text-green-400 px-2 py-0.5 rounded border border-green-900">
                  Stakes: $30.00 Pool
                </span>
              </div>

              {/* Stat visual boards */}
              <div className="space-y-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300">
                      M
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-300 block">MagnusCarlsen</span>
                      <span className="text-[9px] text-zinc-500 mt-0.5 block">2882 ELO</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-500">07:22</span>
                </div>

                <div className="flex justify-center text-zinc-600">
                  <Swords size={20} />
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs">
                      H
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-300 block">HikaruNakamura</span>
                      <span className="text-[9px] text-zinc-500 mt-0.5 block">2875 ELO</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-white">09:14</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="border-t border-zinc-900 bg-zinc-950 text-center py-6 text-[11px] text-zinc-600 font-medium">
        <p>© 2026 ChessArena. All rights reserved. Competitive chess, built with precision.</p>
      </footer>

      {/* Auth modal overlay */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

    </div>
  );
}
