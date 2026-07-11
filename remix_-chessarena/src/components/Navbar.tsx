import { useState, useEffect } from 'react';
import { auth, db, collection, query, where, onSnapshot, doc, updateDoc, writeBatch, signOut } from '../firebase';
import { UserProfile, UserNotification } from '../types';
import { 
  Bell, Wallet, LogOut, ShieldAlert, Award, Globe, Check, Trash2, Menu, X
} from 'lucide-react';

interface NavbarProps {
  userProfile: UserProfile | null;
  onOpenAuth: () => void;
  onOpenWallet: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
  isAdminView: boolean;
  setIsAdminView: (val: boolean) => void;
}

export default function Navbar({
  userProfile,
  onOpenAuth,
  onOpenWallet,
  onOpenAdmin,
  onOpenProfile,
  isAdminView,
  setIsAdminView
}: NavbarProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!userProfile?.uid) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userProfile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: UserNotification[] = [];
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() } as UserNotification);
      });
      // Sort newest first
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    if (!userProfile?.uid || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        if (!n.read) {
          const docRef = doc(db, 'notifications', n.id);
          batch.update(docRef, { read: true });
        }
      });
      await batch.commit();
    } catch (e) {
      console.error('Error marking notifications as read:', e);
    }
  };

  const clearAllNotifications = async () => {
    if (!userProfile?.uid || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        const docRef = doc(db, 'notifications', n.id);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (e) {
      console.error('Error clearing notifications:', e);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      console.error('Error marking notification as read:', e);
    }
  };

  const handleLogout = async () => {
    try {
      // Update status to offline
      if (userProfile?.uid) {
        await updateDoc(doc(db, 'users', userProfile.uid), { status: 'offline' });
      }
      await signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Name */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={onOpenProfile}>
          <div className="w-9 h-9 bg-white text-black flex items-center justify-center font-display font-bold text-xl rounded-lg">
            ♞
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg tracking-tight text-white leading-none">ChessArena</span>
            <span className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase mt-0.5">High Stakes</span>
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          {userProfile ? (
            <>
              {/* ELO Rating Badge */}
              <div 
                id="navbar-elo-badge"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 cursor-pointer hover:border-zinc-700 transition"
                onClick={onOpenProfile}
              >
                <Award size={16} className="text-zinc-400" />
                <span className="font-semibold text-white">{userProfile.elo}</span>
                <span className="text-xs text-zinc-500">ELO</span>
              </div>

              {/* Wallet Quick Look */}
              <div 
                id="navbar-wallet-btn"
                onClick={onOpenWallet}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-sm transition cursor-pointer"
              >
                <Wallet size={16} className="text-green-400" />
                <span className="font-medium text-zinc-300">Wallet:</span>
                <span className="font-bold text-green-400">${userProfile.walletBalance.toFixed(2)}</span>
              </div>

              {/* Admin Toggle */}
              {userProfile.isAdmin && (
                <button 
                  id="navbar-admin-toggle"
                  onClick={() => setIsAdminView(!isAdminView)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-semibold transition ${
                    isAdminView 
                      ? 'bg-red-950/40 border-red-800 text-red-200' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <ShieldAlert size={16} />
                  <span>{isAdminView ? 'Exit Admin' : 'Admin Area'}</span>
                </button>
              )}

              {/* Notifications bell */}
              <div className="relative">
                <button 
                  id="navbar-notifications-bell"
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition relative"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black font-sans font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                      <div className="flex gap-2 text-[10px]">
                        <button onClick={markAllAsRead} className="text-zinc-400 hover:text-white flex items-center gap-1 font-semibold">
                          <Check size={12} /> Read All
                        </button>
                        <button onClick={clearAllNotifications} className="text-zinc-500 hover:text-red-400 flex items-center gap-1 font-semibold">
                          <Trash2 size={12} /> Clear
                        </button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/50">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-500 font-medium">
                          No recent alerts or notifications.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => markAsRead(n.id)}
                            className={`p-3 text-xs transition cursor-pointer hover:bg-zinc-950 ${!n.read ? 'bg-zinc-950/40 border-l-2 border-white' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-0.5">
                              <span className="font-semibold text-zinc-200">{n.title}</span>
                              <span className="text-[9px] text-zinc-600">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-zinc-400 leading-snug">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Shortcut */}
              <div 
                id="navbar-profile-shortcut"
                onClick={onOpenProfile}
                className="flex items-center gap-2 pl-2 border-l border-zinc-800 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white">
                  {userProfile.username[0].toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white leading-none">{userProfile.username}</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-0.5">
                    <Globe size={10} /> {userProfile.country || 'US'}
                  </span>
                </div>
              </div>

              {/* Sign Out */}
              <button 
                id="navbar-logout-btn"
                onClick={handleLogout}
                className="p-2 bg-zinc-900/50 hover:bg-red-950/20 hover:text-red-400 border border-zinc-800 rounded-lg text-zinc-400 transition"
                title="Log Out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button 
              id="navbar-signin-btn"
              onClick={onOpenAuth}
              className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-3">
          {userProfile && (
            <div className="relative">
              <button 
                id="mobile-notif-btn"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 relative"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-white text-black font-sans font-bold text-[8px] rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-2.5 border-b border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Alerts</span>
                    <button onClick={markAllAsRead} className="text-[10px] text-zinc-400 font-semibold">Mark read</button>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800/50">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-500">No alerts</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} onClick={() => markAsRead(n.id)} className="p-2.5 text-xs">
                          <div className="font-semibold text-zinc-200">{n.title}</div>
                          <p className="text-zinc-400 text-[11px] leading-tight mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <button 
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-zinc-800 flex flex-col gap-3">
          {userProfile ? (
            <>
              <div className="flex items-center justify-between px-2">
                <span className="text-sm font-semibold text-white">{userProfile.username}</span>
                <span className="text-xs font-bold text-zinc-500">{userProfile.elo} ELO</span>
              </div>
              <button 
                onClick={() => { onOpenWallet(); setMobileMenuOpen(false); }}
                className="w-full py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <Wallet size={16} className="text-green-400" />
                <span>Wallet: ${userProfile.walletBalance.toFixed(2)}</span>
              </button>
              {userProfile.isAdmin && (
                <button 
                  onClick={() => { setIsAdminView(!isAdminView); setMobileMenuOpen(false); }}
                  className="w-full py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-red-200 flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <ShieldAlert size={16} />
                  <span>{isAdminView ? 'Exit Admin Mode' : 'Enter Admin Mode'}</span>
                </button>
              )}
              <button 
                onClick={() => { onOpenProfile(); setMobileMenuOpen(false); }}
                className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg text-sm"
              >
                Profile Statistics
              </button>
              <button 
                onClick={handleLogout}
                className="w-full py-2.5 bg-red-950/20 border border-red-900/40 text-red-300 rounded-lg text-sm font-semibold"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button 
              onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }}
              className="w-full py-2.5 bg-white text-black rounded-lg text-sm font-semibold"
            >
              Sign In / Sign Up
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
