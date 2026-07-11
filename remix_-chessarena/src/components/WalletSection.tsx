import React, { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, doc, updateDoc, addDoc, runTransaction } from '../firebase';
import { UserProfile, WalletTransaction } from '../types';
import { 
  TrendingUp, TrendingDown, RefreshCw, ArrowUpRight, ArrowDownLeft, ShieldCheck, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';

interface WalletSectionProps {
  userProfile: UserProfile | null;
  onClose: () => void;
}

export default function WalletSection({ userProfile, onClose }: WalletSectionProps) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!userProfile?.uid) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userProfile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: WalletTransaction[] = [];
      snapshot.forEach((doc) => {
        txs.push({ id: doc.id, ...doc.data() } as WalletTransaction);
      });
      // Sort newest first
      txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(txs);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid) return;

    setError('');
    setSuccessMsg('');
    const amt = parseFloat(amount);

    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    setLoading(true);

    try {
      // 1. Call Secure server-side validation / anti-fraud endpoint
      const response = await fetch('/api/wallet/verify-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.uid,
          type: activeTab,
          amount: amt,
          currentBalance: userProfile.walletBalance
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Server rejected the transaction');
      }

      // 2. Perform the update securely in Firestore using a transaction to prevent race conditions
      const userRef = doc(db, 'users', userProfile.uid);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User profile not found.");
        }
        
        const currentBalance = userDoc.data().walletBalance || 0;
        if (activeTab === 'withdraw' && currentBalance < amt) {
          throw new Error("Insufficient balance for withdrawal.");
        }
        
        const newBalance = activeTab === 'deposit' 
          ? currentBalance + amt 
          : currentBalance - amt;
          
        transaction.update(userRef, { walletBalance: newBalance });
      });

      // 3. Save the Transaction history doc
      await addDoc(collection(db, 'transactions'), {
        userId: userProfile.uid,
        username: userProfile.username,
        type: activeTab,
        amount: amt,
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      // 4. Save a Notification doc
      await addDoc(collection(db, 'notifications'), {
        userId: userProfile.uid,
        title: activeTab === 'deposit' ? 'Deposit Completed' : 'Withdrawal Completed',
        message: activeTab === 'deposit' 
          ? `Successfully deposited $${amt.toFixed(2)} into your available balance.`
          : `Successfully withdrew $${amt.toFixed(2)} from your wallet balance.`,
        type: activeTab === 'deposit' ? 'deposit_completed' : 'withdrawal_completed',
        read: false,
        createdAt: new Date().toISOString()
      });

      setSuccessMsg(`Transaction successful! $${amt.toFixed(2)} processed.`);
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950 min-h-screen py-8 px-6 text-white font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-display font-bold text-3xl tracking-tight">Financial Hub</h1>
            <p className="text-zinc-500 text-sm mt-1">Manage deposits, withdrawals and view live high-stakes ledger</p>
          </div>
          <button 
            id="wallet-back-btn"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white transition cursor-pointer"
          >
            ← Back to Lobby
          </button>
        </div>

        {/* Dashboard Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <TrendingUp size={120} />
            </div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Available Balance</span>
            <div className="mt-2 text-3xl font-display font-bold text-white flex items-baseline gap-1.5">
              <span>${userProfile?.walletBalance?.toFixed(2) || '0.00'}</span>
              <span className="text-sm text-zinc-400 font-sans font-medium">USD</span>
            </div>
            <p className="text-zinc-500 text-xs mt-3 flex items-center gap-1">
              <ShieldCheck size={14} className="text-green-500" />
              Fully secured and backed by Instant Transfer Protocol.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <TrendingDown size={120} />
            </div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Pending / Escrow Balance</span>
            <div className="mt-2 text-3xl font-display font-bold text-zinc-400 flex items-baseline gap-1.5">
              <span>$0.00</span>
              <span className="text-sm text-zinc-500 font-sans font-medium">USD</span>
            </div>
            <p className="text-zinc-500 text-xs mt-3 flex items-center gap-1">
              <Clock size={14} className="text-zinc-500" />
              Held securely inside active match pools.
            </p>
          </div>
        </div>

        {/* Transaction Actions and Ledger split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Action Form */}
          <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit shadow-lg">
            <div className="flex border-b border-zinc-800 mb-6">
              <button 
                id="btn-tab-deposit"
                onClick={() => { setActiveTab('deposit'); setError(''); setSuccessMsg(''); }}
                className={`w-1/2 pb-3 text-sm font-semibold border-b-2 transition ${activeTab === 'deposit' ? 'border-white text-white' : 'border-transparent text-zinc-500'}`}
              >
                Deposit
              </button>
              <button 
                id="btn-tab-withdraw"
                onClick={() => { setActiveTab('withdraw'); setError(''); setSuccessMsg(''); }}
                className={`w-1/2 pb-3 text-sm font-semibold border-b-2 transition ${activeTab === 'withdraw' ? 'border-white text-white' : 'border-transparent text-zinc-500'}`}
              >
                Withdraw
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-800 rounded-lg flex items-center gap-2 text-red-200 text-xs">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-green-950/40 border border-green-800 rounded-lg flex items-center gap-2 text-green-200 text-xs">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleTransaction} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                  <input 
                    id="wallet-amount-input"
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="15.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-zinc-500 transition-all placeholder:text-zinc-700 font-mono font-bold"
                  />
                </div>
              </div>

              {activeTab === 'deposit' ? (
                <div className="p-3.5 bg-zinc-950 rounded-lg border border-zinc-800 text-[11px] text-zinc-500 leading-relaxed">
                  You are depositing mock funds. Our backend verifies with anti-fraud telemetry score to approve instant credits.
                </div>
              ) : (
                <div className="p-3.5 bg-zinc-950 rounded-lg border border-zinc-800 text-[11px] text-zinc-500 leading-relaxed">
                  Withdrawal requests are processed immediately. Verification checks ELO rating integrity.
                </div>
              )}

              <button 
                id="wallet-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl transition text-sm flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Processing Securely...' : activeTab === 'deposit' ? 'Deposit Instantly' : 'Withdraw Instantly'}
              </button>
            </form>
          </div>

          {/* Ledger Table */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
            <h3 className="font-display font-semibold text-lg text-white mb-4">Financial Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-400">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider pb-3">
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-500 font-medium">
                        No transactions recorded. Complete a deposit to start.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-950/40 transition">
                        <td className="py-3 flex items-center gap-1.5 font-semibold text-zinc-200">
                          {t.type === 'deposit' && (
                            <>
                              <ArrowDownLeft size={14} className="text-green-400" />
                              <span>Deposit</span>
                            </>
                          )}
                          {t.type === 'withdrawal' && (
                            <>
                              <ArrowUpRight size={14} className="text-zinc-400" />
                              <span>Withdrawal</span>
                            </>
                          )}
                          {t.type === 'entry_fee' && (
                            <>
                              <TrendingDown size={14} className="text-red-400" />
                              <span>Match Entry Fee</span>
                            </>
                          )}
                          {t.type === 'prize_win' && (
                            <>
                              <TrendingUp size={14} className="text-green-400" />
                              <span>Match Prize Win</span>
                            </>
                          )}
                          {t.type === 'platform_fee' && (
                            <>
                              <TrendingDown size={14} className="text-zinc-500" />
                              <span>Service Fee</span>
                            </>
                          )}
                        </td>
                        <td className={`py-3 font-mono font-bold ${
                          t.type === 'deposit' || t.type === 'prize_win' 
                            ? 'text-green-400' 
                            : 'text-zinc-300'
                        }`}>
                          {t.type === 'deposit' || t.type === 'prize_win' ? '+' : '-'}${t.amount.toFixed(2)}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full font-sans font-semibold text-[9px] ${
                            t.status === 'completed' 
                              ? 'bg-green-950 text-green-400' 
                              : t.status === 'pending'
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-red-950 text-red-400'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 text-zinc-500 font-medium">
                          {new Date(t.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
