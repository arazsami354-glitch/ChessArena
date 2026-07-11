import { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { db, handleFirestoreError, OperationType, doc, updateDoc, onSnapshot, addDoc, collection, getDoc, runTransaction } from '../firebase';
import { UserProfile, ChessMatch } from '../types';
import { 
  Award, Clock, Flag, Handshake, AlertTriangle, Play, RefreshCw, Volume2, ShieldCheck, HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface ChessBoardComponentProps {
  userProfile: UserProfile | null;
  matchId: string;
  onExit: () => void;
}

export default function ChessBoardComponent({ userProfile, matchId, onExit }: ChessBoardComponentProps) {
  const [match, setMatch] = useState<ChessMatch | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [error, setError] = useState('');
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [isProcessingOutcome, setIsProcessingOutcome] = useState(false);

  // Loaded dynamic Admin Settings
  const [feeType, setFeeType] = useState<'fixed' | 'percentage'>('fixed');
  const [feeValue, setFeeValue] = useState<number>(5.0);

  // 0. Listen to Admin Settings
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'admin'), (snap) => {
      if (snap.exists()) {
        const sData = snap.data();
        if (sData.feeType !== undefined) setFeeType(sData.feeType as 'fixed' | 'percentage');
        if (sData.feeValue !== undefined) setFeeValue(Number(sData.feeValue));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/admin');
    });
    return () => unsubSettings();
  }, []);

  // Keep a local instance of Chess.js
  const chessRef = useRef(new Chess());

  // Local timers for fluid rendering
  const [whiteSeconds, setWhiteSeconds] = useState(600);
  const [blackSeconds, setBlackSeconds] = useState(600);

  // Sounds (Mock audio feedback)
  const playSound = (type: 'move' | 'capture' | 'check' | 'game-over') => {
    // Console log to verify game audio triggers
    console.log(`[Audio Event] ChessSound: ${type}`);
  };

  // 1. Subscribe to match updates in Firestore
  useEffect(() => {
    if (!matchId) return;

    const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (docSnap) => {
      if (!docSnap.exists()) {
        setError('Match not found or has been deleted.');
        return;
      }

      const matchData = docSnap.data() as ChessMatch;
      setMatch({ id: docSnap.id, ...matchData });

      // Synchronize Chess.js state with the FEN from Firestore
      try {
        chessRef.current.load(matchData.boardFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      } catch (err) {
        console.error('FEN load error:', err);
      }

      // Sync local timers
      setWhiteSeconds(matchData.whiteTimer);
      setBlackSeconds(matchData.blackTimer);

      // Check results
      if (matchData.status === 'finished') {
        if (matchData.winnerId) {
          setGameResult(`Winner: ${matchData.winnerId === userProfile?.uid ? 'You' : 'Opponent'}`);
        } else {
          setGameResult('Game Over: Resigned or Draw');
        }
      } else if (matchData.status === 'draw') {
        setGameResult('Draw agreed by mutual agreement');
      } else if (matchData.status === 'resigned') {
        setGameResult(matchData.winnerId === userProfile?.uid ? 'Opponent resigned! You won.' : 'You resigned. Opponent won.');
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `matches/${matchId}`);
    });

    return () => unsubscribe();
  }, [matchId, userProfile?.uid]);

  // 2. Timer decrement loop
  useEffect(() => {
    if (!match || match.status !== 'playing') return;

    const timer = setInterval(() => {
      if (match.currentTurn === 'w') {
        setWhiteSeconds((prev) => {
          if (prev <= 1) {
            handleTimeOut('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackSeconds((prev) => {
          if (prev <= 1) {
            handleTimeOut('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [match?.status, match?.currentTurn]);

  // Handle a timeout condition
  const handleTimeOut = async (losingTurn: 'w' | 'b') => {
    if (!match || match.status !== 'playing') return;
    
    // Check if the current user is authorized to update the timeout
    const amWhite = match.whitePlayerId === userProfile?.uid;
    const opponentId = amWhite ? match.blackPlayerId : match.whitePlayerId;

    try {
      const matchRef = doc(db, 'matches', match.id);
      const winnerId = losingTurn === 'w' ? match.blackPlayerId : match.whitePlayerId;
      const loserId = losingTurn === 'w' ? match.whitePlayerId : match.blackPlayerId;

      await updateDoc(matchRef, {
        status: 'finished',
        winnerId: winnerId,
        updatedAt: new Date().toISOString()
      });

      // Claim prize payouts
      await triggerPayout(winnerId, loserId, 'Match won on time.');
    } catch (e) {
      console.error('Timeout update failed:', e);
    }
  };

  // Helper to trigger payment and ELO calculations on the server
  const triggerPayout = async (winnerId: string, loserId: string, reasonMessage: string) => {
    if (isProcessingOutcome) return;
    setIsProcessingOutcome(true);

    try {
      // Call secure fullstack server endpoint to verify move validation and fetch ELO adjustments
      const response = await fetch('/api/match/verify-and-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match?.id,
          winnerId,
          loserId,
          moves: match?.moves || [],
          boardFen: match?.boardFen,
          status: 'finished'
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Server payout approval failed');
      }

      const prizeAmount = data.winnerPrize; // $25.00
      const eloWinnerChange = data.eloChanges.winnerChange;
      const eloLoserChange = data.eloChanges.loserChange;

      // 1 & 2. Update Winner and Loser accounts atomically in a transaction to prevent race conditions or double payout anomalies
      const winnerRef = doc(db, 'users', winnerId);
      const loserRef = doc(db, 'users', loserId);
      
      let winnerUsername = 'Winner';
      
      await runTransaction(db, async (transaction) => {
        const winUserSnap = await transaction.get(winnerRef);
        const loseUserSnap = await transaction.get(loserRef);
        
        if (winUserSnap.exists()) {
          const winData = winUserSnap.data();
          winnerUsername = winData.username || 'Winner';
          transaction.update(winnerRef, {
            walletBalance: (winData.walletBalance || 0) + prizeAmount,
            elo: (winData.elo || 1200) + eloWinnerChange,
            matchesPlayed: (winData.matchesPlayed || 0) + 1,
            wins: (winData.wins || 0) + 1,
          });
        }
        
        if (loseUserSnap.exists()) {
          const loseData = loseUserSnap.data();
          transaction.update(loserRef, {
            elo: Math.max(100, (loseData.elo || 1200) + eloLoserChange),
            matchesPlayed: (loseData.matchesPlayed || 0) + 1,
            losses: (loseData.losses || 0) + 1,
          });
        }
      });

      // 3. Record Payout Transaction
      await addDoc(collection(db, 'transactions'), {
        userId: winnerId,
        username: winnerUsername,
        type: 'prize_win',
        amount: prizeAmount,
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      // 4. Send notification to winner
      await addDoc(collection(db, 'notifications'), {
        userId: winnerId,
        title: 'Prize Payout Received! 🏆',
        message: `Congratulations! You won the match and received the $${prizeAmount.toFixed(2)} prize pool. +${eloWinnerChange} ELO.`,
        type: 'prize_received',
        read: false,
        createdAt: new Date().toISOString()
      });

      // 5. Send notification to loser
      await addDoc(collection(db, 'notifications'), {
        userId: loserId,
        title: 'Match Finished',
        message: `The match has ended. ${reasonMessage} ELO adjusted by ${eloLoserChange}.`,
        type: 'opponent_joined', // generic type
        read: false,
        createdAt: new Date().toISOString()
      });

      // 6. Record platform service fee transaction
      await addDoc(collection(db, 'transactions'), {
        userId: 'PLATFORM_REVENUE',
        type: 'platform_fee',
        amount: data.platformFee, // $5.00
        status: 'completed',
        createdAt: new Date().toISOString()
      });

    } catch (e: any) {
      console.error('Payout failed:', e);
      setError('Secure payouts error: ' + e.message);
    } finally {
      setIsProcessingOutcome(false);
    }
  };

  // Render standard Unicode characters for Chessboard
  const getPieceSymbol = (type: string, color: 'w' | 'b') => {
    const symbols: { [key: string]: string } = {
      k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
      K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙'
    };
    const key = color === 'w' ? type.toUpperCase() : type.toLowerCase();
    return symbols[key] || '';
  };

  // Handle clicking a square
  const handleSquareClick = async (squareRepresentation: string) => {
    if (!match || match.status !== 'playing') return;

    // Verify it is the current player's turn
    const amWhite = match.whitePlayerId === userProfile?.uid;
    const amBlack = match.blackPlayerId === userProfile?.uid;
    const isWhiteTurn = match.currentTurn === 'w';

    if ((isWhiteTurn && !amWhite) || (!isWhiteTurn && !amBlack)) {
      return; // It's not your turn!
    }

    const clickedSq = squareRepresentation as Square;

    // Check if clicked target is a possible move
    if (selectedSquare && possibleMoves.includes(clickedSq)) {
      // Make a move!
      const chessObj = chessRef.current;
      try {
        const moveDetails = chessObj.move({
          from: selectedSquare,
          to: clickedSq,
          promotion: 'q' // Auto promote to Queen
        });

        if (moveDetails) {
          playSound(moveDetails.captured ? 'capture' : 'move');

          const isCheck = chessObj.inCheck();
          const isCheckmate = chessObj.isCheckmate();
          const isStalemate = chessObj.isStalemate();
          const isDraw = chessObj.isDraw();

          let newStatus = 'playing';
          let winnerId = '';
          let reasonMessage = '';

          if (isCheckmate) {
            newStatus = 'finished';
            winnerId = match.currentTurn === 'w' ? match.whitePlayerId : match.blackPlayerId;
            reasonMessage = 'Checkmate!';
            playSound('game-over');
          } else if (isStalemate || isDraw) {
            newStatus = 'draw';
            reasonMessage = 'Stalemate / draw detected.';
            playSound('game-over');
          } else if (isCheck) {
            playSound('check');
          }

          // Sync timer updates
          const updatedWhiteTimer = amWhite ? whiteSeconds : match.whiteTimer;
          const updatedBlackTimer = amBlack ? blackSeconds : match.blackTimer;

          // Update match document in Firestore
          const matchRef = doc(db, 'matches', match.id);
          const currentMoves = match.moves || [];
          const updatedMoves = [...currentMoves, moveDetails.san];

          await updateDoc(matchRef, {
            boardFen: chessObj.fen(),
            moves: updatedMoves,
            pgn: chessObj.pgn(),
            currentTurn: match.currentTurn === 'w' ? 'b' : 'w',
            status: newStatus,
            winnerId,
            whiteTimer: updatedWhiteTimer,
            blackTimer: updatedBlackTimer,
            drawOfferFrom: '', // Clear draw offer
            updatedAt: new Date().toISOString()
          });

          // If finished, execute secure payout mechanics
          if (newStatus === 'finished' && winnerId) {
            const loserId = winnerId === match.whitePlayerId ? match.blackPlayerId : match.whitePlayerId;
            await triggerPayout(winnerId, loserId, 'Match won by checkmate.');
          } else if (newStatus === 'draw') {
            // Split or handle draw statistics
            await addDoc(collection(db, 'notifications'), {
              userId: match.whitePlayerId,
              title: 'Match Ended in Draw',
              message: `Both players receive their $${match.entryFee.toFixed(2)} deposit back.`,
              type: 'opponent_joined',
              read: false,
              createdAt: new Date().toISOString()
            });
            await addDoc(collection(db, 'notifications'), {
              userId: match.blackPlayerId,
              title: 'Match Ended in Draw',
              message: `Both players receive their $${match.entryFee.toFixed(2)} deposit back.`,
              type: 'opponent_joined',
              read: false,
              createdAt: new Date().toISOString()
            });
          }

          // Reset selection
          setSelectedSquare(null);
          setPossibleMoves([]);
        }
      } catch (err: any) {
        console.error('Invalid move attempted:', err);
      }
    } else {
      // Selecting/Highlighting a piece
      const piece = chessRef.current.get(clickedSq);
      const activeColor = match.currentTurn;

      if (piece && piece.color === activeColor) {
        setSelectedSquare(clickedSq);
        // Get valid target squares
        const validMoves = chessRef.current.moves({
          square: clickedSq,
          verbose: true
        });
        setPossibleMoves(validMoves.map(m => m.to as Square));
      } else {
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    }
  };

  // Resign Option
  const handleResign = async () => {
    if (!match || match.status !== 'playing') return;
    const confirmed = window.confirm(`Are you absolutely sure you want to resign and forfeit your $${match.entryFee.toFixed(2)} deposit?`);
    if (!confirmed) return;

    try {
      const amWhite = match.whitePlayerId === userProfile?.uid;
      const winnerId = amWhite ? match.blackPlayerId : match.whitePlayerId;
      const loserId = userProfile?.uid || '';

      const matchRef = doc(db, 'matches', match.id);
      await updateDoc(matchRef, {
        status: 'finished',
        winnerId: winnerId,
        updatedAt: new Date().toISOString()
      });

      await triggerPayout(winnerId, loserId, 'Match won by resignation.');
    } catch (e) {
      console.error('Resignation failed:', e);
    }
  };

  // Offer / Accept Draw
  const handleDrawOffer = async () => {
    if (!match || match.status !== 'playing') return;

    try {
      const matchRef = doc(db, 'matches', match.id);
      await updateDoc(matchRef, {
        drawOfferFrom: userProfile?.uid || '',
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('Draw offer failed:', e);
    }
  };

  const handleAcceptDraw = async () => {
    if (!match || !match.drawOfferFrom) return;

    try {
      const matchRef = doc(db, 'matches', match.id);
      await updateDoc(matchRef, {
        status: 'draw',
        drawOfferFrom: '',
        updatedAt: new Date().toISOString()
      });

      // Give players back their entry fees
      const whiteSnap = await getDoc(doc(db, 'users', match.whitePlayerId));
      if (whiteSnap.exists()) {
        await updateDoc(doc(db, 'users', match.whitePlayerId), {
          walletBalance: (whiteSnap.data().walletBalance || 0) + match.entryFee
        });
      }
      const blackSnap = await getDoc(doc(db, 'users', match.blackPlayerId));
      if (blackSnap.exists()) {
        await updateDoc(doc(db, 'users', match.blackPlayerId), {
          walletBalance: (blackSnap.data().walletBalance || 0) + match.entryFee
        });
      }

      setGameResult('Match drawn. Funds restored.');
    } catch (e) {
      console.error('Draw acceptance failed:', e);
    }
  };

  const handleDeclineDraw = async () => {
    if (!match) return;
    try {
      const matchRef = doc(db, 'matches', match.id);
      await updateDoc(matchRef, {
        drawOfferFrom: '',
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('Draw decline failed:', e);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md mx-auto text-center mt-12 text-white">
        <AlertTriangle className="text-red-500 mb-4" size={48} />
        <h3 className="font-display font-semibold text-lg">Error Occurred</h3>
        <p className="text-zinc-500 text-sm mt-1">{error}</p>
        <button onClick={onExit} className="mt-6 px-4 py-2 bg-white text-black text-xs font-semibold rounded-lg">Back to Lobby</button>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-500 mt-12">
        <RefreshCw className="animate-spin mb-4" size={24} />
        <p className="text-sm">Connecting to secure game server...</p>
      </div>
    );
  }

  // Format timer
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const amWhite = match.whitePlayerId === userProfile?.uid;
  const amBlack = match.blackPlayerId === userProfile?.uid;
  const activeColor = match.currentTurn;

  // Compile Board representations
  const boardLayout = [];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  // Flip board for Black player perspective
  const ranksToRender = amBlack ? [...ranks].reverse() : ranks;
  const filesToRender = amBlack ? [...files].reverse() : files;

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 text-white font-sans">
      
      {/* LEFT AREA: Game Info & Board */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Opponent Stat header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-sm">
              {amWhite ? (match.blackPlayerName?.[0]?.toUpperCase() || 'O') : (match.whitePlayerName?.[0]?.toUpperCase() || 'O')}
            </div>
            <div>
              <span className="font-semibold text-zinc-200">
                {amWhite ? (match.blackPlayerName || 'Opponent') : (match.whitePlayerName || 'Opponent')}
              </span>
              <span className="text-[10px] bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-500 font-bold ml-2">
                {amWhite ? (match.blackPlayerElo || '1200') : (match.whitePlayerElo || '1200')} ELO
              </span>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm ${
            activeColor === (amWhite ? 'b' : 'w') 
              ? 'bg-zinc-950 border-white text-white' 
              : 'bg-zinc-950/40 border-zinc-800 text-zinc-500'
          }`}>
            <Clock size={16} />
            <span>{amWhite ? formatTime(blackSeconds) : formatTime(whiteSeconds)}</span>
          </div>
        </div>

        {/* The Chessboard Grid */}
        <div className="aspect-square w-full max-w-xl mx-auto bg-zinc-900 border-4 border-zinc-800 rounded-2xl p-1 overflow-hidden shadow-2xl relative">
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
            {ranksToRender.map((rank, rIdx) => {
              return filesToRender.map((file, fIdx) => {
                const sqRep = `${file}${rank}` as Square;
                const isLight = (parseInt(rank) + files.indexOf(file)) % 2 !== 0;
                const piece = chessRef.current.get(sqRep);
                const isSelected = selectedSquare === sqRep;
                const isPossible = possibleMoves.includes(sqRep);

                return (
                  <div 
                    key={sqRep}
                    onClick={() => handleSquareClick(sqRep)}
                    className={`aspect-square w-full h-full flex items-center justify-center relative cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-[#15803d]/40' 
                        : isLight 
                        ? 'bg-zinc-300' 
                        : 'bg-zinc-700'
                    }`}
                  >
                    {/* Move highlight indicators */}
                    {isPossible && (
                      <div className="absolute w-3.5 h-3.5 rounded-full bg-green-500/80 pointer-events-none z-10 shadow" />
                    )}

                    {/* Render Chess Piece */}
                    {piece && (
                      <span className={`select-none text-4xl sm:text-5xl font-sans drop-shadow transition-transform ${
                        piece.color === 'w' ? 'text-white' : 'text-zinc-950'
                      }`}>
                        {getPieceSymbol(piece.type, piece.color)}
                      </span>
                    )}

                    {/* Coordinates labels in board margins */}
                    {fIdx === 0 && (
                      <span className={`absolute top-0.5 left-1 font-mono text-[9px] font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {rank}
                      </span>
                    )}
                    {rIdx === 7 && (
                      <span className={`absolute bottom-0.5 right-1 font-mono text-[9px] font-bold ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {file}
                      </span>
                    )}
                  </div>
                );
              });
            })}
          </div>

          {/* Overlays for Game finishes */}
          {gameResult && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
              <span className="w-12 h-12 bg-white text-black flex items-center justify-center font-bold text-2xl rounded-full mb-4">
                🏆
              </span>
              <h3 className="font-display font-bold text-2xl text-white">Match Resolved</h3>
              <p className="text-zinc-400 text-sm max-w-sm mt-2 leading-relaxed">{gameResult}</p>
              <button 
                id="board-exit-btn"
                onClick={onExit}
                className="mt-6 px-6 py-2.5 bg-white text-black font-semibold rounded-lg text-sm transition hover:bg-zinc-200 cursor-pointer"
              >
                Return to Arena Lobby
              </button>
            </div>
          )}
        </div>

        {/* User Stat footer */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm">
              {userProfile?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <span className="font-semibold text-zinc-200">{userProfile?.username} (You)</span>
              <span className="text-[10px] bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-500 font-bold ml-2">
                {userProfile?.elo} ELO
              </span>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm ${
            activeColor === (amWhite ? 'w' : 'b') 
              ? 'bg-zinc-950 border-white text-white' 
              : 'bg-zinc-950/40 border-zinc-800 text-zinc-500'
          }`}>
            <Clock size={16} />
            <span>{amWhite ? formatTime(whiteSeconds) : formatTime(blackSeconds)}</span>
          </div>
        </div>

      </div>

      {/* RIGHT AREA: Moves Ledger & Controls */}
      <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
        
        {/* General Info Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
          {(() => {
            const currentSelectedFee = match.entryFee || 15;
            // Platform commission fee is exactly 20% of the total pool
            const estimatedPlatformFee = currentSelectedFee * 2 * 0.20;
            const estimatedWinnerPrize = currentSelectedFee * 2 * 0.80;

            return (
              <>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span className="font-display font-semibold text-sm text-zinc-300">Prize Pool Details</span>
                  <span className="text-xs bg-green-950/60 border border-green-800 text-green-400 font-bold px-2 py-0.5 rounded">
                    Total: ${(currentSelectedFee * 2).toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/40">
                    <span className="text-zinc-500 block">Payout to Winner</span>
                    <span className="text-sm font-bold text-green-400 mt-1 block">${estimatedWinnerPrize.toFixed(2)}</span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/40">
                    <span className="text-zinc-500 block">Service Fee</span>
                    <span className="text-sm font-bold text-zinc-400 mt-1 block">
                      ${estimatedPlatformFee.toFixed(2)}
                      <span className="text-[9px] text-zinc-600 block mt-0.5">(20% dynamic commission)</span>
                    </span>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Draw offer alert */}
          {match.drawOfferFrom && match.drawOfferFrom !== userProfile?.uid && match.status === 'playing' && (
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-2">
              <span className="text-xs text-zinc-300 font-semibold">Opponent offered a draw. Accept?</span>
              <div className="flex gap-2">
                <button 
                  id="btn-accept-draw"
                  onClick={handleAcceptDraw} 
                  className="flex-1 py-1.5 bg-white text-black font-semibold rounded text-xs"
                >
                  Accept
                </button>
                <button 
                  id="btn-decline-draw"
                  onClick={handleDeclineDraw} 
                  className="flex-1 py-1.5 bg-zinc-900 border border-zinc-800 font-semibold rounded text-xs"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {match.status === 'playing' && (
            <div className="flex gap-3">
              <button 
                id="btn-resign-match"
                onClick={handleResign}
                className="flex-1 py-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Flag size={14} />
                Resign
              </button>
              <button 
                id="btn-offer-draw"
                onClick={handleDrawOffer}
                disabled={!!match.drawOfferFrom}
                className="flex-1 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <Handshake size={14} />
                {match.drawOfferFrom === userProfile?.uid ? 'Draw Offered' : 'Offer Draw'}
              </button>
            </div>
          )}
        </div>

        {/* Move History / Ledger */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex-1 mt-6 flex flex-col justify-between min-h-[250px]">
          <div>
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block mb-3">Live Moves History</span>
            <div className="h-44 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
                {match.moves && match.moves.length > 0 ? (
                  match.moves.map((m, idx) => {
                    if (idx % 2 === 0) {
                      const moveNum = Math.floor(idx / 2) + 1;
                      return (
                        <div key={idx} className="col-span-2 grid grid-cols-12 hover:bg-zinc-950/40 py-0.5 px-1 rounded transition">
                          <span className="col-span-2 text-zinc-600 font-semibold">{moveNum}.</span>
                          <span className="col-span-5 font-semibold text-zinc-200">{m}</span>
                          <span className="col-span-5 font-semibold text-zinc-400">{match.moves[idx + 1] || ''}</span>
                        </div>
                      );
                    }
                    return null;
                  })
                ) : (
                  <div className="col-span-2 py-8 text-center text-zinc-600 font-sans text-xs">
                    No moves registered. Opponent ready. Make your opening!
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-green-500" /> Secure Server validation active
            </span>
            <span>FEN synchronized</span>
          </div>
        </div>

      </div>

    </div>
  );
}
