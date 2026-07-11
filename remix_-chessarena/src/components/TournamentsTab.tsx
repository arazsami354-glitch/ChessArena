import React, { useState } from 'react';
import { Trophy, Calendar, Users, ShieldAlert, Zap, Award, ExternalLink } from 'lucide-react';
import Badge from './ui/Badge';

interface PreloadedTournament {
  id: string;
  title: string;
  startsIn: string;
  type: string;
  entryFee: number;
  prizePool: number;
  participantsCount: number;
  maxParticipants: number;
  joined: boolean;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export default function TournamentsTab() {
  const [tournaments, setTournaments] = useState<PreloadedTournament[]>([
    {
      id: 'tour_1',
      title: 'Summer Arena Cash Championship',
      startsIn: '2 hours 15 mins',
      type: 'Single Elimination',
      entryFee: 25.0,
      prizePool: 500.0,
      participantsCount: 14,
      maxParticipants: 32,
      joined: false,
      status: 'upcoming'
    },
    {
      id: 'tour_2',
      title: 'Grandmasters Blitz High-Rollers',
      startsIn: 'Tomorrow, 18:00 UTC',
      type: 'Swiss System',
      entryFee: 50.0,
      prizePool: 1200.0,
      participantsCount: 8,
      maxParticipants: 16,
      joined: false,
      status: 'upcoming'
    },
    {
      id: 'tour_3',
      title: 'St Stakes Weekly Knockout',
      startsIn: 'In progress',
      type: 'Single Elimination',
      entryFee: 15.0,
      prizePool: 250.0,
      participantsCount: 16,
      maxParticipants: 16,
      joined: false,
      status: 'ongoing'
    }
  ]);

  const handleToggleJoin = (id: string) => {
    setTournaments(prev => prev.map(t => {
      if (t.id === id) {
        const isJoining = !t.joined;
        return {
          ...t,
          joined: isJoining,
          participantsCount: isJoining ? t.participantsCount + 1 : t.participantsCount - 1
        };
      }
      return t;
    }));
  };

  return (
    <div className="space-y-8">
      {/* Informative Banner */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Trophy size={140} />
        </div>
        <div className="max-w-xl space-y-3">
          <Badge variant="premium">Tournament Hub</Badge>
          <h3 className="font-display font-bold text-2xl text-white tracking-tight">
            Championship Tournaments & Swiss Brackets
          </h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Register for scheduled Swiss and Single Elimination championships. Compete through progressive match rounds to secure the grand prize pool payouts.
          </p>
        </div>
      </div>

      {/* Grid of Tournaments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((t) => (
          <div 
            key={t.id} 
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700/80 transition-all shadow-md relative"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                {t.status === 'ongoing' ? (
                  <Badge variant="success">Ongoing</Badge>
                ) : (
                  <Badge variant="info">Upcoming</Badge>
                )}
                <span className="text-[10px] font-mono font-bold text-zinc-500">
                  ID: {t.id}
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="font-display font-bold text-base text-zinc-100 line-clamp-1">
                  {t.title}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Calendar size={13} />
                  <span>{t.startsIn}</span>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800/40 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Prize Pool</span>
                  <span className="text-sm font-bold text-green-400 mt-0.5 block">${t.prizePool.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Entry Fee</span>
                  <span className="text-sm font-bold text-zinc-300 mt-0.5 block">${t.entryFee.toFixed(2)}</span>
                </div>
                <div className="col-span-2 border-t border-zinc-800/40 pt-2 flex justify-between text-zinc-400">
                  <span>Type: <strong className="text-zinc-300">{t.type}</strong></span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <Users size={12} />
                    <span>{t.participantsCount} / {t.maxParticipants} Players</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-zinc-800/40 mt-5">
              {t.status === 'ongoing' ? (
                <button 
                  disabled
                  className="w-full py-2.5 bg-zinc-950 text-zinc-500 border border-zinc-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert size={14} /> Match Bracket Locked
                </button>
              ) : (
                <button 
                  onClick={() => handleToggleJoin(t.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    t.joined 
                      ? 'bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-750' 
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  <Zap size={14} />
                  <span>{t.joined ? 'Cancel Registration' : 'Register Entry'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
