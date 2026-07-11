export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  photoURL?: string;
  country?: string;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  walletBalance: number;
  pendingBalance: number;
  isAdmin?: boolean;
  isBanned?: boolean;
  status: 'online' | 'offline' | 'in-game';
  createdAt: string;
}

export interface ChessMatch {
  id: string;
  whitePlayerId: string;
  whitePlayerName?: string;
  whitePlayerElo?: number;
  blackPlayerId: string;
  blackPlayerName?: string;
  blackPlayerElo?: number;
  entryFee: number;
  prizePool: number;
  boardFen: string;
  pgn: string;
  moves: string[]; // List of PGN/UCI moves
  whiteTimer: number; // in seconds
  blackTimer: number; // in seconds
  currentTurn: 'w' | 'b';
  status: 'waiting' | 'playing' | 'finished' | 'draw' | 'resigned' | 'aborted';
  winnerId?: string;
  drawOfferFrom?: string; // UID of player who offered draw
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  username?: string;
  type: 'deposit' | 'withdrawal' | 'entry_fee' | 'prize_win' | 'platform_fee';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'match_found' | 'opponent_joined' | 'deposit_completed' | 'withdrawal_completed' | 'prize_received';
  read: boolean;
  createdAt: string;
}

export interface AdminSettings {
  minEntryFee: number;
  maxEntryFee: number;
  feeType: 'fixed' | 'percentage';
  feeValue: number;
}

// --- Future Feature Types: Tournaments, Clubs, Chat, Anti-Cheat ---

export interface Tournament {
  id: string;
  title: string;
  description?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  type: 'swiss' | 'single_elimination' | 'arena';
  entryFee: number;
  prizePool: number;
  maxParticipants: number;
  participants: string[]; // List of user UIDs
  currentRound: number;
  totalRounds: number;
  winnerId?: string;
  startsAt: string;
  createdAt: string;
}

export interface TournamentParticipant {
  userId: string;
  username: string;
  elo: number;
  points: number;
  rank?: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  logoUrl?: string;
  members: string[]; // List of user UIDs
  points: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  channelId: string; // matchId or clubId or 'global'
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface AntiCheatLog {
  id: string;
  matchId: string;
  userId: string;
  username: string;
  flagType: 'invalid_move' | 'unusual_move_time' | 'engine_similarity' | 'high_accuracy_streak';
  severity: 'low' | 'medium' | 'high';
  details: string;
  detectedAt: string;
}

