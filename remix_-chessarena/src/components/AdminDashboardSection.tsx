import React, { useState, useEffect } from 'react';
import { db, collection, query, onSnapshot, doc, updateDoc, setDoc, getDocs, writeBatch } from '../firebase';
import { UserProfile, WalletTransaction, ChessMatch } from '../types';
import { 
  Users, DollarSign, Swords, AlertTriangle, ShieldCheck, ShieldAlert, Ban, Check, Trash2, ArrowUpRight, TrendingUp, Settings
} from 'lucide-react';

interface AdminDashboardSectionProps {
  onClose: () => void;
  onSpectateMatch: (matchId: string) => void;
}

interface AdminReport {
  id: string;
  reporter: string;
  reportedUser: string;
  reason: string;
  status: string;
  createdAt: string;
}

export default function AdminDashboardSection({ onClose, onSpectateMatch }: AdminDashboardSectionProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [matches, setMatches] = useState<ChessMatch[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Fee configuration settings
  const [minEntryFee, setMinEntryFee] = useState<number>(5.0);
  const [maxEntryFee, setMaxEntryFee] = useState<number>(500.0);
  const [feeType, setFeeType] = useState<'fixed' | 'percentage'>('fixed');
  const [feeValue, setFeeValue] = useState<number>(5.0);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Load Admin reports
  useEffect(() => {
    fetch('/api/admin/reports')
      .then(res => res.json())
      .then(data => setReports(data.reports || []))
      .catch(e => console.error(e));
  }, []);

  // Listen to Admin settings in Firestore
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'admin'), (snap) => {
      if (snap.exists()) {
        const sData = snap.data();
        if (sData.minEntryFee !== undefined) setMinEntryFee(Number(sData.minEntryFee));
        if (sData.maxEntryFee !== undefined) setMaxEntryFee(Number(sData.maxEntryFee));
        if (sData.feeType !== undefined) setFeeType(sData.feeType as 'fixed' | 'percentage');
        if (sData.feeValue !== undefined) setFeeValue(Number(sData.feeValue));
      }
    });
    return () => unsubSettings();
  }, []);

  // Listen to Firestore users, transactions, matches
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uList: UserProfile[] = [];
      snap.forEach(d => uList.push({ uid: d.id, ...d.data() } as UserProfile));
      setUsers(uList);
    });

    const unsubTxs = onSnapshot(collection(db, 'transactions'), (snap) => {
      const tList: WalletTransaction[] = [];
      snap.forEach(d => tList.push({ id: d.id, ...d.data() } as WalletTransaction));
      // Sort newest first
      tList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(tList);
    });

    const unsubMatches = onSnapshot(collection(db, 'matches'), (snap) => {
      const mList: ChessMatch[] = [];
      snap.forEach(d => mList.push({ id: d.id, ...d.data() } as ChessMatch));
      setMatches(mList);
    });

    setLoading(false);

    return () => {
      unsubUsers();
      unsubTxs();
      unsubMatches();
    };
  }, []);

  // Admin updates
  const handleToggleBan = async (userId: string, isBannedNow: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: !isBannedNow });
    } catch (e) {
      console.error('Ban toggle failed:', e);
    }
  };

  const handleToggleAdmin = async (userId: string, isAdminNow: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isAdmin: !isAdminNow });
    } catch (e) {
      console.error('Admin toggle failed:', e);
    }
  };

  const handleAddFundsOverride = async (userId: string, currentBal: number) => {
    const amountStr = window.prompt('Enter amount to add override (USD):', '50.00');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    try {
      await updateDoc(doc(db, 'users', userId), { walletBalance: currentBal + amount });
    } catch (e) {
      console.error('Add funds override failed:', e);
    }
  };

  const handleResolveReport = (reportId: string) => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);

    try {
      await setDoc(doc(db, 'settings', 'admin'), {
        minEntryFee: Number(minEntryFee),
        maxEntryFee: Number(maxEntryFee),
        feeType: 'percentage',
        feeValue: 20,
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSavingSettings(false);
    }
  };

  // Metrics
  const totalPlatformRevenue = transactions
    .filter(t => t.type === 'platform_fee')
    .reduce((sum, t) => sum + t.amount, 0);

  const activeGames = matches.filter(m => m.status === 'playing');

  return (
    <div className="bg-zinc-950 min-h-screen py-8 px-6 text-white font-sans">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-display font-bold text-3xl tracking-tight text-red-500 flex items-center gap-2">
              Arena Security Headquarters <ShieldAlert size={28} />
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Authorized admin system controllers. Manage players, investigate game integrity, review financial logs.
            </p>
          </div>
          <button 
            id="admin-exit-btn"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white transition cursor-pointer"
          >
            ← Exit System Control
          </button>
        </div>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider block">Total Members</span>
              <span className="text-2xl font-display font-bold text-white mt-1.5 block">{users.length}</span>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <Users className="text-zinc-400" size={24} />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider block">Platform Fees</span>
              <span className="text-2xl font-display font-bold text-green-400 mt-1.5 block">${totalPlatformRevenue.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <DollarSign className="text-green-400" size={24} />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider block">Active Matches</span>
              <span className="text-2xl font-display font-bold text-white mt-1.5 block">{activeGames.length}</span>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <Swords className="text-zinc-400" size={24} />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider block">Anti-Cheat Flags</span>
              <span className="text-2xl font-display font-bold text-red-400 mt-1.5 block">
                {reports.filter(r => r.status === 'pending').length}
              </span>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <AlertTriangle className="text-red-400" size={24} />
            </div>
          </div>
        </div>

        {/* System Settings Panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <Settings className="text-zinc-400" size={20} />
            <h3 className="font-display font-bold text-lg text-white">System Stakes & Fee Configuration</h3>
          </div>
          
          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">Min Entry Fee ($)</label>
              <input 
                type="number"
                step="0.01"
                min="0.01"
                value={minEntryFee}
                onChange={(e) => setMinEntryFee(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-zinc-500 font-mono font-bold"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">Max Entry Fee ($)</label>
              <input 
                type="number"
                step="0.01"
                min="0.01"
                value={maxEntryFee}
                onChange={(e) => setMaxEntryFee(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-zinc-500 font-mono font-bold"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">Fee Type</label>
              <div className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-500 font-semibold">
                Percentage (%) of Total Pool
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                Platform Fee (%)
              </label>
              <div className="flex gap-4">
                <div className="flex-1 px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-500 font-mono font-bold">
                  20.00% (Fixed Commission)
                </div>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-xl hover:bg-zinc-200 transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>

          {settingsSuccess && (
            <div className="p-3 bg-green-950/40 border border-green-800 rounded-xl flex items-center gap-2 text-green-400 text-xs font-bold animate-fade-in">
              <ShieldCheck size={16} />
              <span>System configurations saved successfully and applied live.</span>
            </div>
          )}
        </div>

        {/* Splits: User Management and Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* User list */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Player Database</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-400">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider pb-3">
                    <th className="pb-3">User</th>
                    <th className="pb-3">ELO</th>
                    <th className="pb-3">Balance</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-500">No users found.</td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.uid} className="hover:bg-zinc-950/40 transition">
                        <td className="py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-200">{u.username}</span>
                            <span className="text-[10px] text-zinc-500 mt-0.5">{u.email}</span>
                          </div>
                        </td>
                        <td className="py-3 font-mono font-bold text-white">{u.elo}</td>
                        <td className="py-3 font-mono font-bold text-green-400">${(u.walletBalance || 0).toFixed(2)}</td>
                        <td className="py-3 text-right space-x-2">
                          <button 
                            onClick={() => handleAddFundsOverride(u.uid, u.walletBalance || 0)}
                            className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-[10px] hover:border-zinc-600 font-bold text-zinc-300"
                          >
                            + Override
                          </button>
                          <button 
                            onClick={() => handleToggleAdmin(u.uid, !!u.isAdmin)}
                            className={`px-2 py-1 border rounded text-[10px] font-bold ${
                              u.isAdmin ? 'bg-red-950/40 border-red-800 text-red-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                            }`}
                          >
                            Admin
                          </button>
                          <button 
                            onClick={() => handleToggleBan(u.uid, !!u.isBanned)}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${
                              u.isBanned ? 'bg-red-900 text-white' : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {u.isBanned ? 'Unban' : 'Ban'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Incidents Manual reviews */}
          <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-1.5">
              Incident Reports <AlertTriangle size={18} className="text-red-400" />
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {reports.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-12">No open security reports found.</p>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-red-400">{r.reason}</span>
                        <span className="text-[10px] text-zinc-500 mt-0.5 block">Reported: {r.reportedUser}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        r.status === 'pending' ? 'bg-red-950 text-red-400' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-snug">
                      Anti-cheat telemetry flagged potential move speed discrepancy. High probability of external solver engine.
                    </p>

                    {r.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleResolveReport(r.id)}
                          className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold rounded text-[10px] flex items-center justify-center gap-1"
                        >
                          <Check size={12} /> Dismiss
                        </button>
                        <button 
                          onClick={() => {
                            // Find user in db & ban them
                            const matchUser = users.find(u => u.username === r.reportedUser);
                            if (matchUser) handleToggleBan(matchUser.uid, false);
                            handleResolveReport(r.id);
                          }}
                          className="flex-1 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 font-bold rounded text-[10px] flex items-center justify-center gap-1"
                        >
                          <Ban size={12} /> Ban User
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Splits: Financial Logs and Active Games */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Platform Financial ledger */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Full Platform Audit Ledger</h3>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs text-zinc-400">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider pb-3">
                    <th className="pb-3">Log User</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Ledger Credit</th>
                    <th className="pb-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {transactions.slice(0, 20).map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-950/40 transition">
                      <td className="py-2.5 font-semibold text-zinc-300">{t.username || t.userId}</td>
                      <td className="py-2.5 capitalize">{t.type.replace('_', ' ')}</td>
                      <td className="py-2.5 font-mono font-bold text-green-400">${t.amount.toFixed(2)}</td>
                      <td className="py-2.5 text-zinc-500">{new Date(t.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active matches spectators */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Active Battlefields</h3>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {activeGames.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-12">No active battlefields. Open matchmaking first.</p>
              ) : (
                activeGames.map((m) => (
                  <div key={m.id} className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">
                        {m.whitePlayerName || 'Unknown'} vs {m.blackPlayerName || 'Unknown'}
                      </span>
                      <span className="text-[10px] text-zinc-500 mt-1 block">
                        Prize stakes: <span className="font-bold text-green-400">${m.prizePool.toFixed(2)}</span>
                      </span>
                    </div>

                    <button 
                      onClick={() => onSpectateMatch(m.id)}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-300 flex items-center gap-1.5"
                    >
                      <Swords size={12} /> Watch Battle
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
