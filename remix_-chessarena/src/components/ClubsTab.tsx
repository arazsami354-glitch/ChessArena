import React, { useState } from 'react';
import { Users, Shield, Plus, Award, Globe, ArrowRight } from 'lucide-react';
import Badge from './ui/Badge';

interface PreloadedClub {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  clubPoints: number;
  joined: boolean;
  motto: string;
}

export default function ClubsTab() {
  const [clubs, setClubs] = useState<PreloadedClub[]>([
    {
      id: 'club_1',
      name: 'The Sicilian Slayers',
      description: 'The premier competitive collective specializing in Sicilian counter-attacks and high-stakes match play.',
      motto: 'Strike with tactical precision.',
      membersCount: 142,
      clubPoints: 2840,
      joined: false
    },
    {
      id: 'club_2',
      name: 'Grandmasters Circle',
      description: 'An elite lounge reserved exclusively for players above 1600 ELO looking to trade advanced theory.',
      motto: 'Analysis, depth, and mastery.',
      membersCount: 89,
      clubPoints: 3410,
      joined: false
    },
    {
      id: 'club_3',
      name: 'Stripe Gambit Syndicate',
      description: 'Aggressive opening lines and gambit lovers. We organize custom weekly ledger battle tournaments.',
      motto: 'High risk, highest rewards.',
      membersCount: 210,
      clubPoints: 1950,
      joined: false
    }
  ]);

  const [newClubName, setNewClubName] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [newClubMotto, setNewClubMotto] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleToggleJoin = (id: string) => {
    setClubs(prev => prev.map(c => {
      if (c.id === id) {
        const isJoining = !c.joined;
        return {
          ...c,
          joined: isJoining,
          membersCount: isJoining ? c.membersCount + 1 : c.membersCount - 1
        };
      }
      return c;
    }));
  };

  const handleCreateClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim() || !newClubDesc.trim()) return;

    const newClub: PreloadedClub = {
      id: `club_${clubs.length + 1}`,
      name: newClubName.trim(),
      description: newClubDesc.trim(),
      motto: newClubMotto.trim() || 'A standard chess guild.',
      membersCount: 1,
      clubPoints: 1200,
      joined: true
    };

    setClubs(prev => [newClub, ...prev]);
    setNewClubName('');
    setNewClubDesc('');
    setNewClubMotto('');
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <Badge variant="success">Chess Clubs</Badge>
          <h3 className="font-display font-bold text-2xl text-white tracking-tight">
            Chess Clubs & Player Guilds
          </h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Form clubs with fellow tacticians. Engage in internal tournaments, earn group ELO points on the leaderboard, and dominate rival guilds in live arena wars.
          </p>
        </div>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-5 py-2.5 bg-white text-black rounded-xl text-xs font-bold hover:bg-zinc-200 transition shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} /> Create a Club
        </button>
      </div>

      {/* Create Club Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateClub} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 max-w-xl">
          <h4 className="font-display font-bold text-white text-base">Register Custom Club</h4>
          
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-semibold">Club Name</label>
            <input 
              type="text"
              required
              placeholder="e.g. Queen Gambit Masters"
              value={newClubName}
              onChange={(e) => setNewClubName(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-semibold">Club Motto</label>
            <input 
              type="text"
              placeholder="e.g. Play for the end game."
              value={newClubMotto}
              onChange={(e) => setNewClubMotto(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-semibold">Description</label>
            <textarea 
              required
              placeholder="Describe your club mission, requirements or team strategies..."
              value={newClubDesc}
              onChange={(e) => setNewClubDesc(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-5 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-zinc-200"
            >
              Confirm Creation
            </button>
          </div>
        </form>
      )}

      {/* Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map((c) => (
          <div 
            key={c.id}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700/80 transition-all shadow-md"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                  <Users className="text-zinc-400" size={18} />
                </div>
                <Badge variant="neutral">{c.membersCount} Members</Badge>
              </div>

              <div className="space-y-1">
                <h4 className="font-display font-bold text-base text-zinc-100">{c.name}</h4>
                <p className="text-xs text-zinc-500 font-medium italic">"{c.motto}"</p>
                <p className="text-xs text-zinc-400 leading-relaxed mt-2 pt-1">
                  {c.description}
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-zinc-800/40 mt-5 flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Rank Score: <strong className="text-green-400">{c.clubPoints} pts</strong>
              </span>
              <button 
                onClick={() => handleToggleJoin(c.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                  c.joined 
                    ? 'bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-750' 
                    : 'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {c.joined ? 'Leave Club' : 'Join Club'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
