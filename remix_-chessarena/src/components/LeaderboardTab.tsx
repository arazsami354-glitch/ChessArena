import React, { useState, useEffect } from 'react';
import { db, collection, query, orderBy, limit, onSnapshot } from '../firebase';
import { UserProfile } from '../types';
import { Trophy, Award, Globe, Medal, Star } from 'lucide-react';
import LoadingSpinner from './ui/LoadingSpinner';

export default function LeaderboardTab() {
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('elo', 'desc'),
      limit(25)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uList: UserProfile[] = [];
      snapshot.forEach((doc) => {
        uList.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setLeaders(uList);
      setLoading(false);
    }, (err) => {
      console.error("Leaderboard query error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner size="md" label="Loading Rankings..." />
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
        <div className="flex items-center gap-2.5">
          <Trophy className="text-zinc-200" size={22} />
          <div>
            <h3 className="font-display font-bold text-lg text-white">Global Grandmasters</h3>
            <p className="text-xs text-zinc-500">Live ratings updated upon high-stakes match completions</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-400">
          Top 25 Players
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/40 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
              <th className="pb-3 text-center w-12">Rank</th>
              <th className="pb-3 pl-4">Player</th>
              <th className="pb-3 text-center">ELO Rating</th>
              <th className="pb-3 text-center">Matches</th>
              <th className="pb-3 text-center">Win Rate</th>
              <th className="pb-3 text-right pr-4">Earnings Est.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40 text-sm">
            {leaders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500">
                  No registered active users yet.
                </td>
              </tr>
            ) : (
              leaders.map((user, idx) => {
                const rank = idx + 1;
                const winRate = user.matchesPlayed > 0 
                  ? Math.round((user.wins / user.matchesPlayed) * 100) 
                  : 0;
                
                // Based on new 20% platform commission model:
                // An entry fee of $15 results in a $24 payout (+$9 net win) and a -$15 loss
                const earnings = user.wins * 24.0 - user.matchesPlayed * 15.0;

                return (
                  <tr 
                    key={user.uid} 
                    className={`hover:bg-zinc-950/40 transition-colors ${rank <= 3 ? 'bg-zinc-950/10' : ''}`}
                  >
                    <td className="py-3.5 text-center font-display font-bold">
                      {rank === 1 && <Medal className="text-yellow-400 mx-auto" size={18} />}
                      {rank === 2 && <Medal className="text-zinc-400 mx-auto" size={18} />}
                      {rank === 3 && <Medal className="text-amber-600 mx-auto" size={18} />}
                      {rank > 3 && <span className="text-zinc-500 text-xs">{rank}</span>}
                    </td>
                    <td className="py-3.5 pl-4 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-100 flex items-center gap-1">
                          {user.username}
                          {user.isAdmin && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest flex items-center gap-0.5">
                          <Globe size={10} /> {user.country || 'US'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 text-center font-mono font-bold text-white">
                      {user.elo}
                    </td>
                    <td className="py-3.5 text-center font-medium text-zinc-400">
                      {user.matchesPlayed}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${winRate >= 60 ? 'bg-green-950/40 text-green-400' : 'bg-zinc-950/40 text-zinc-400'}`}>
                        {winRate}%
                      </span>
                    </td>
                    <td className={`py-3.5 text-right pr-4 font-mono font-bold ${earnings >= 0 ? 'text-green-400' : 'text-zinc-500'}`}>
                      {earnings >= 0 ? `+$${earnings.toFixed(2)}` : `-$${Math.abs(earnings).toFixed(2)}`}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
