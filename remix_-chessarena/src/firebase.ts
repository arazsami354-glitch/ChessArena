import { initializeApp } from 'firebase/app';
import * as firestoreSDK from 'firebase/firestore';
import * as authSDK from 'firebase/auth';
import { GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Detect mock mode based on project ID
export const isMockMode = !firebaseConfig.projectId || firebaseConfig.projectId.includes('remixed-') || firebaseConfig.projectId === 'placeholder-id';

// Initialize real SDK components if not mock
let realApp: any = null;
let realDb: any = null;
let realAuth: any = null;

if (!isMockMode) {
  try {
    realApp = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });
    realDb = firebaseConfig.firestoreDatabaseId 
      ? firestoreSDK.getFirestore(realApp, firebaseConfig.firestoreDatabaseId)
      : firestoreSDK.getFirestore(realApp);
    realAuth = authSDK.getAuth(realApp);
  } catch (error) {
    console.warn("Could not initialize real Firebase, falling back to local simulation.", error);
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Global Chat simulation automatic bot replies to make it super interactive:
const chatBotQuotes = [
  "Nice match! The Sicilian Defense always brings out the best tactics.",
  "Who wants to play a $50 Blitz match? Bring your best ELO rating!",
  "Stripe transactions are fast here, loving the instant wallet deposits.",
  "Check out the Sicilian Slayers club, we are dominating the leaderboard!",
  "GothamChess here, preparing some deep gambit analysis for my next match.",
  "Magnus just played a brilliant endgame move, absolutely incredible.",
  "Is anyone up for a rapid game? Let's configure a $20 entry fee.",
  "Just secured a beautiful victory in a $15 arena. Loving the game timers!",
  "Don't resign too early, there are always tactical draw opportunities!"
];

const chatBotUsers = [
  { username: "GothamChess", uid: "levy_rozman", isAdmin: false },
  { username: "MagnusCarlsen", uid: "magnus_c", isAdmin: false },
  { username: "HikaruNakamura", uid: "hikaru_n", isAdmin: false },
  { username: "BotezLive", uid: "botez_live", isAdmin: false },
  { username: "StockfishLite_v12", uid: "stockfish_v12", isAdmin: false }
];

// Helper to filter and sort mock collections
function applyQueryConstraints(docs: any[], constraints: any[]) {
  let result = [...docs];
  for (const c of constraints) {
    if (c.type === 'where') {
      const { field, op, value } = c;
      if (op === '==') {
        result = result.filter(d => d[field] === value);
      }
    }
  }
  // Apply orderBy
  for (const c of constraints) {
    if (c.type === 'orderBy') {
      const { field, direction } = c;
      result.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === undefined || valB === undefined) return 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          return direction === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        return direction === 'desc' ? (Number(valB) - Number(valA)) : (Number(valA) - Number(valB));
      });
    }
  }
  // Apply limit
  for (const c of constraints) {
    if (c.type === 'limit') {
      result = result.slice(0, c.count);
    }
  }
  return result;
}

// Seed the local simulated database in localStorage
function initializeMockData() {
  if (typeof window === 'undefined') return;
  
  const existingDB = localStorage.getItem('chessarena_mock_db');
  if (!existingDB) {
    const defaultDB: Record<string, Record<string, any>> = {
      settings: {
        admin: {
          minEntryFee: 5.0,
          maxEntryFee: 500.0,
          feeType: 'fixed',
          feeValue: 5.0
        }
      },
      users: {
        'magnus_c': {
          uid: 'magnus_c',
          username: 'MagnusCarlsen',
          email: 'magnus@chessarena.com',
          elo: 2882,
          matchesPlayed: 500,
          wins: 450,
          losses: 50,
          walletBalance: 12500.0,
          pendingBalance: 0,
          isAdmin: false,
          isBanned: false,
          status: 'online',
          country: 'NO',
          createdAt: new Date().toISOString()
        },
        'hikaru_n': {
          uid: 'hikaru_n',
          username: 'HikaruNakamura',
          email: 'hikaru@chessarena.com',
          elo: 2875,
          matchesPlayed: 500,
          wins: 420,
          losses: 80,
          walletBalance: 8400.0,
          pendingBalance: 0,
          isAdmin: false,
          isBanned: false,
          status: 'online',
          country: 'US',
          createdAt: new Date().toISOString()
        },
        'stockfish_v12': {
          uid: 'stockfish_v12',
          username: 'StockfishLite_v12',
          email: 'stockfish@chessarena.com',
          elo: 3200,
          matchesPlayed: 1000,
          wins: 1000,
          losses: 0,
          walletBalance: 250000.0,
          pendingBalance: 0,
          isAdmin: false,
          isBanned: false,
          status: 'online',
          country: 'DE',
          createdAt: new Date().toISOString()
        },
        'botez_live': {
          uid: 'botez_live',
          username: 'BotezLive',
          email: 'botez@chessarena.com',
          elo: 1850,
          matchesPlayed: 350,
          wins: 210,
          losses: 140,
          walletBalance: 3200.0,
          pendingBalance: 0,
          isAdmin: false,
          isBanned: false,
          status: 'online',
          country: 'CA',
          createdAt: new Date().toISOString()
        },
        'levy_rozman': {
          uid: 'levy_rozman',
          username: 'GothamChess',
          email: 'gotham@chessarena.com',
          elo: 2420,
          matchesPlayed: 500,
          wins: 320,
          losses: 180,
          walletBalance: 4500.0,
          pendingBalance: 0,
          isAdmin: false,
          isBanned: false,
          status: 'online',
          country: 'US',
          createdAt: new Date().toISOString()
        },
        'admin_user_id': {
          uid: 'admin_user_id',
          username: 'ArenaDirector',
          email: 'admin@chessarena.com',
          elo: 1500,
          matchesPlayed: 5,
          wins: 3,
          losses: 2,
          walletBalance: 10000.0,
          pendingBalance: 0,
          isAdmin: true,
          isBanned: false,
          status: 'online',
          country: 'US',
          createdAt: new Date().toISOString()
        }
      },
      global_chat: {
        'msg_1': {
          id: 'msg_1',
          userId: 'magnus_c',
          username: 'MagnusCarlsen',
          text: 'Anyone up for a $100 blitz arena? Bring your best openings!',
          isAdmin: false,
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        'msg_2': {
          id: 'msg_2',
          userId: 'levy_rozman',
          username: 'GothamChess',
          text: 'That Sicilian counter-gambit line was absolute poetry, Magnus.',
          isAdmin: false,
          createdAt: new Date(Date.now() - 1800000).toISOString()
        },
        'msg_3': {
          id: 'msg_3',
          userId: 'hikaru_n',
          username: 'HikaruNakamura',
          text: 'Literally I do not care, let\'s double down on Swiss tournaments tonight!',
          isAdmin: false,
          createdAt: new Date(Date.now() - 900000).toISOString()
        }
      },
      matches: {
        'match_exhibition': {
          id: 'match_exhibition',
          whitePlayerId: 'magnus_c',
          whitePlayerName: 'MagnusCarlsen',
          whitePlayerElo: 2882,
          blackPlayerId: 'hikaru_n',
          blackPlayerName: 'HikaruNakamura',
          blackPlayerElo: 2875,
          entryFee: 100,
          prizePool: 200,
          boardFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
          pgn: '1. e4 e5 2. Nf3 Nc6',
          moves: ['e4', 'e5', 'Nf3', 'Nc6'],
          whiteTimer: 450,
          blackTimer: 520,
          currentTurn: 'w',
          status: 'playing',
          createdAt: new Date(Date.now() - 300000).toISOString(),
          updatedAt: new Date().toISOString()
        }
      },
      transactions: {
        'tx_1': {
          id: 'tx_1',
          userId: 'magnus_c',
          username: 'MagnusCarlsen',
          type: 'deposit',
          amount: 500.0,
          status: 'completed',
          createdAt: new Date(Date.now() - 7200000).toISOString()
        },
        'tx_2': {
          id: 'tx_2',
          userId: 'hikaru_n',
          username: 'HikaruNakamura',
          type: 'deposit',
          amount: 300.0,
          status: 'completed',
          createdAt: new Date(Date.now() - 7100000).toISOString()
        }
      }
    };
    localStorage.setItem('chessarena_mock_db', JSON.stringify(defaultDB));
  }
  
  const existingUsers = localStorage.getItem('chessarena_mock_users');
  if (!existingUsers) {
    const defaultUsers = [
      { uid: 'magnus_c', email: 'magnus@chessarena.com', password: 'password' },
      { uid: 'hikaru_n', email: 'hikaru@chessarena.com', password: 'password' },
      { uid: 'stockfish_v12', email: 'stockfish@chessarena.com', password: 'password' },
      { uid: 'botez_live', email: 'botez@chessarena.com', password: 'password' },
      { uid: 'levy_rozman', email: 'gotham@chessarena.com', password: 'password' },
      { uid: 'admin_user_id', email: 'admin@chessarena.com', password: 'password' }
    ];
    localStorage.setItem('chessarena_mock_users', JSON.stringify(defaultUsers));
  }

  // Set up periodic automated chat simulation
  setInterval(() => {
    try {
      const dbStr = localStorage.getItem('chessarena_mock_db');
      if (!dbStr) return;
      const db = JSON.parse(dbStr);
      if (!db.global_chat) db.global_chat = {};
      
      const randomBot = chatBotUsers[Math.floor(Math.random() * chatBotUsers.length)];
      const randomQuote = chatBotQuotes[Math.floor(Math.random() * chatBotQuotes.length)];
      const msgId = 'bot_msg_' + Math.random().toString(36).substring(2, 11);
      
      db.global_chat[msgId] = {
        id: msgId,
        userId: randomBot.uid,
        username: randomBot.username,
        text: randomQuote,
        isAdmin: randomBot.isAdmin,
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('chessarena_mock_db', JSON.stringify(db));
      triggerListeners('global_chat');
    } catch (e) {
      console.error(e);
    }
  }, 25000); // add a bot chat every 25s
}

if (isMockMode) {
  initializeMockData();
}

// Active listeners system
type MockListener = {
  path: string;
  callback: (snapshot: any) => void;
  constraints?: any[];
};

const activeListeners = new Set<MockListener>();

function triggerListeners(collectionName: string, docId?: string) {
  const dbStr = localStorage.getItem('chessarena_mock_db') || '{}';
  const db = JSON.parse(dbStr);
  const collectionData = db[collectionName] || {};
  
  for (const listener of activeListeners) {
    if (listener.path === collectionName) {
      // Collection listener or query
      const allDocs = Object.entries(collectionData).map(([id, d]: [string, any]) => ({ id, ...d }));
      const filtered = applyQueryConstraints(allDocs, listener.constraints || []);
      const docSnaps = filtered.map(d => new MockDocumentSnapshot(d.id, d));
      listener.callback(new MockQuerySnapshot(docSnaps));
    } else if (docId && listener.path === `${collectionName}/${docId}`) {
      // Specific doc listener
      listener.callback(new MockDocumentSnapshot(docId, collectionData[docId]));
    } else if (listener.path.startsWith(`${collectionName}/`)) {
      // Generic match doc
      const pathDocId = listener.path.substring(collectionName.length + 1);
      listener.callback(new MockDocumentSnapshot(pathDocId, collectionData[pathDocId]));
    }
  }
}

export class MockDocumentSnapshot {
  id: string;
  private _data: any;
  constructor(id: string, data: any) {
    this.id = id;
    this._data = data;
  }
  exists() {
    return this._data !== undefined && this._data !== null;
  }
  data() {
    return this._data ? { ...this._data } : undefined;
  }
}

export class MockQuerySnapshot {
  docs: MockDocumentSnapshot[];
  constructor(docs: MockDocumentSnapshot[]) {
    this.docs = docs;
  }
  forEach(callback: (doc: MockDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
  get empty() {
    return this.docs.length === 0;
  }
  get size() {
    return this.docs.length;
  }
}

// Re-export real or simulated objects
export const db: any = isMockMode ? { type: 'mock_db' } : realDb;
export const auth: any = isMockMode ? {
  currentUser: null,
  signOut: async () => {
    localStorage.removeItem('chessarena_logged_in_uid');
    auth.currentUser = null;
    triggerAuthListeners();
  }
} : realAuth;

// Initialize mock auth current user on start
if (isMockMode && typeof window !== 'undefined') {
  const loggedInUid = localStorage.getItem('chessarena_logged_in_uid');
  if (loggedInUid) {
    const dbStr = localStorage.getItem('chessarena_mock_db') || '{}';
    const dbData = JSON.parse(dbStr);
    const userProfile = dbData.users?.[loggedInUid];
    if (userProfile) {
      auth.currentUser = {
        uid: loggedInUid,
        email: userProfile.email,
        displayName: userProfile.username,
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        tenantId: null,
        providerData: []
      };
    }
  }
}

const authListeners = new Set<(user: any) => void>();

function triggerAuthListeners() {
  const user = auth.currentUser;
  for (const listener of authListeners) {
    listener(user);
  }
}

export const googleProvider = new GoogleAuthProvider();

// ==========================================
// FIRESTORE EMULATION INTERFACE RE-EXPORTS
// ==========================================

export function collection(database: any, path: string) {
  if (isMockMode) {
    return { type: 'collection', path };
  }
  return firestoreSDK.collection(database, path);
}

export function doc(database: any, pathOrCollection: any, ...pathSegments: string[]) {
  if (isMockMode) {
    const colPath = typeof pathOrCollection === 'string' ? pathOrCollection : pathOrCollection.path;
    const docPath = pathSegments.join('/');
    return { type: 'doc', path: `${colPath}/${docPath}`, collectionName: colPath, docId: docPath };
  }
  return firestoreSDK.doc(database, pathOrCollection, ...pathSegments);
}

export function query(collectionRef: any, ...constraints: any[]) {
  if (isMockMode) {
    return { type: 'query', path: collectionRef.path, constraints };
  }
  return firestoreSDK.query(collectionRef, ...constraints);
}

export function where(field: string, op: string, value: any) {
  if (isMockMode) {
    return { type: 'where', field, op, value };
  }
  return firestoreSDK.where(field, op as any, value);
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  if (isMockMode) {
    return { type: 'orderBy', field, direction };
  }
  return firestoreSDK.orderBy(field, direction);
}

export function limit(count: number) {
  if (isMockMode) {
    return { type: 'limit', count };
  }
  return firestoreSDK.limit(count);
}

export async function getDoc(docRef: any) {
  if (isMockMode) {
    const dbStr = localStorage.getItem('chessarena_mock_db') || '{}';
    const db = JSON.parse(dbStr);
    const data = db[docRef.collectionName]?.[docRef.docId];
    return new MockDocumentSnapshot(docRef.docId, data);
  }
  return firestoreSDK.getDoc(docRef);
}

export async function getDocs(queryRefOrColRef: any) {
  if (isMockMode) {
    const colPath = queryRefOrColRef.path;
    const dbStr = localStorage.getItem('chessarena_mock_db') || '{}';
    const db = JSON.parse(dbStr);
    const collectionData = db[colPath] || {};
    const allDocs = Object.entries(collectionData).map(([id, d]: [string, any]) => ({ id, ...d }));
    const filtered = applyQueryConstraints(allDocs, queryRefOrColRef.constraints || []);
    const docSnaps = filtered.map(d => new MockDocumentSnapshot(d.id, d));
    return new MockQuerySnapshot(docSnaps);
  }
  return firestoreSDK.getDocs(queryRefOrColRef);
}

export async function addDoc(collectionRef: any, data: any) {
  if (isMockMode) {
    const colPath = collectionRef.path;
    const dbStr = localStorage.getItem('chessarena_mock_db') || '{}';
    const db = JSON.parse(dbStr);
    if (!db[colPath]) db[colPath] = {};
    const docId = colPath + '_' + Math.random().toString(36).substring(2, 11);
    db[colPath][docId] = { ...data };
    localStorage.setItem('chessarena_mock_db', JSON.stringify(db));
    triggerListeners(colPath, docId);
    return { id: docId, path: `${colPath}/${docId}` };
  }
  return firestoreSDK.addDoc(collectionRef, data);
}

export async function updateDoc(docRef: any, data: any) {
  if (isMockMode) {
    const colPath = docRef.collectionName;
    const docId = docRef.docId;
    const dbStr = localStorage.getItem('chessarena_mock_db') || '{}';
    const db = JSON.parse(dbStr);
    if (!db[colPath]) db[colPath] = {};
    db[colPath][docId] = { ...(db[colPath][docId] || {}), ...data };
    localStorage.setItem('chessarena_mock_db', JSON.stringify(db));
    
    // If updating current user profile, also sync mock auth.currentUser
    if (colPath === 'users' && auth.currentUser?.uid === docId) {
      auth.currentUser.displayName = db[colPath][docId].username;
    }
    
    triggerListeners(colPath, docId);
    return;
  }
  return firestoreSDK.updateDoc(docRef, data);
}

export async function setDoc(docRef: any, data: any) {
  if (isMockMode) {
    const colPath = docRef.collectionName;
    const docId = docRef.docId;
    const dbStr = localStorage.getItem('chessarena_mock_db') || '{}';
    const db = JSON.parse(dbStr);
    if (!db[colPath]) db[colPath] = {};
    db[colPath][docId] = { ...data };
    localStorage.setItem('chessarena_mock_db', JSON.stringify(db));
    triggerListeners(colPath, docId);
    return;
  }
  return firestoreSDK.setDoc(docRef, data);
}

export function onSnapshot(docRefOrQuery: any, onNext: (snapshot: any) => void, onError?: (err: any) => void) {
  if (isMockMode) {
    const listener: MockListener = {
      path: docRefOrQuery.path,
      callback: onNext,
      constraints: docRefOrQuery.constraints
    };
    activeListeners.add(listener);
    
    // Trigger initial snapshot immediately asynchronously
    setTimeout(() => {
      try {
        const dbStr = localStorage.getItem('chessarena_mock_db') || '{}';
        const db = JSON.parse(dbStr);
        if (docRefOrQuery.type === 'doc') {
          const data = db[docRefOrQuery.collectionName]?.[docRefOrQuery.docId];
          onNext(new MockDocumentSnapshot(docRefOrQuery.docId, data));
        } else {
          const collectionData = db[docRefOrQuery.path] || {};
          const allDocs = Object.entries(collectionData).map(([id, d]: [string, any]) => ({ id, ...d }));
          const filtered = applyQueryConstraints(allDocs, docRefOrQuery.constraints || []);
          const docSnaps = filtered.map(d => new MockDocumentSnapshot(d.id, d));
          onNext(new MockQuerySnapshot(docSnaps));
        }
      } catch (err) {
        if (onError) onError(err);
      }
    }, 0);

    return () => {
      activeListeners.delete(listener);
    };
  }
  return firestoreSDK.onSnapshot(docRefOrQuery, onNext, onError);
}

export async function runTransaction(database: any, updateFunction: (transaction: any) => Promise<any>) {
  if (isMockMode) {
    const transaction = {
      get: async (docRef: any) => {
        return getDoc(docRef);
      },
      update: (docRef: any, data: any) => {
        updateDoc(docRef, data);
      },
      set: (docRef: any, data: any) => {
        setDoc(docRef, data);
      }
    };
    return updateFunction(transaction);
  }
  return firestoreSDK.runTransaction(database, updateFunction);
}

export function writeBatch(database: any) {
  if (isMockMode) {
    const operations: { type: 'set' | 'update' | 'delete', docRef: any, data?: any }[] = [];
    return {
      set: (docRef: any, data: any) => {
        operations.push({ type: 'set', docRef, data });
      },
      update: (docRef: any, data: any) => {
        operations.push({ type: 'update', docRef, data });
      },
      delete: (docRef: any) => {
        operations.push({ type: 'delete', docRef });
      },
      commit: async () => {
        const dbStr = localStorage.getItem('chessarena_mock_db') || '{}';
        const db = JSON.parse(dbStr);
        for (const op of operations) {
          const col = op.docRef.collectionName;
          const docId = op.docRef.docId;
          if (!db[col]) db[col] = {};
          if (op.type === 'set') {
            db[col][docId] = { ...op.data };
          } else if (op.type === 'update') {
            db[col][docId] = { ...(db[col][docId] || {}), ...op.data };
          } else if (op.type === 'delete') {
            delete db[col][docId];
          }
        }
        localStorage.setItem('chessarena_mock_db', JSON.stringify(db));
        
        const updatedPaths = new Set(operations.map(op => `${op.docRef.collectionName}/${op.docRef.docId}`));
        const updatedCols = new Set(operations.map(op => op.docRef.collectionName));
        
        for (const col of updatedCols) {
          triggerListeners(col);
        }
        for (const path of updatedPaths) {
          const [col, docId] = path.split('/');
          triggerListeners(col, docId);
        }
      }
    };
  }
  return firestoreSDK.writeBatch(database);
}

// ==========================================
// AUTH EMULATION INTERFACE RE-EXPORTS
// ==========================================

export function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  if (isMockMode) {
    authListeners.add(callback);
    callback(auth.currentUser);
    return () => {
      authListeners.delete(callback);
    };
  }
  return authSDK.onAuthStateChanged(authInstance, callback);
}

export async function signInWithEmailAndPassword(authInstance: any, email: string, password: any) {
  if (isMockMode) {
    const usersStr = localStorage.getItem('chessarena_mock_users') || '[]';
    const users = JSON.parse(usersStr);
    const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error("Auth: No profile exists with this email address.");
    }
    if (user.password !== password) {
      throw new Error("Auth: Incorrect password.");
    }
    
    const dbStr = localStorage.getItem('chessarena_mock_db') || '{}';
    const dbData = JSON.parse(dbStr);
    const userProfile = dbData.users?.[user.uid];
    
    const mockUser = {
      uid: user.uid,
      email: user.email,
      displayName: userProfile?.username || email.split('@')[0],
      photoURL: null,
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
      providerData: []
    };
    
    auth.currentUser = mockUser;
    localStorage.setItem('chessarena_logged_in_uid', user.uid);
    triggerAuthListeners();
    return { user: mockUser };
  }
  return authSDK.signInWithEmailAndPassword(authInstance, email, password);
}

export async function createUserWithEmailAndPassword(authInstance: any, email: string, password: any) {
  if (isMockMode) {
    const usersStr = localStorage.getItem('chessarena_mock_users') || '[]';
    const users = JSON.parse(usersStr);
    if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Auth: Email is already registered with another account.");
    }
    
    const uid = 'user_' + Math.random().toString(36).substring(2, 11);
    users.push({ uid, email, password });
    localStorage.setItem('chessarena_mock_users', JSON.stringify(users));
    
    const mockUser = {
      uid,
      email,
      displayName: email.split('@')[0],
      photoURL: null,
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
      providerData: []
    };
    
    auth.currentUser = mockUser;
    localStorage.setItem('chessarena_logged_in_uid', uid);
    triggerAuthListeners();
    return { user: mockUser };
  }
  return authSDK.createUserWithEmailAndPassword(authInstance, email, password);
}

export async function signOut(authInstance: any) {
  if (isMockMode) {
    localStorage.removeItem('chessarena_logged_in_uid');
    auth.currentUser = null;
    triggerAuthListeners();
    return;
  }
  return authSDK.signOut(authInstance);
}

export async function signInWithPopup(authInstance: any, provider: any) {
  if (isMockMode) {
    const uid = 'google_user_' + Math.random().toString(36).substring(2, 11);
    const email = `google_${uid.substring(12)}@gmail.com`;
    
    const usersStr = localStorage.getItem('chessarena_mock_users') || '[]';
    const users = JSON.parse(usersStr);
    users.push({ uid, email, password: 'password' });
    localStorage.setItem('chessarena_mock_users', JSON.stringify(users));
    
    const mockUser = {
      uid,
      email,
      displayName: 'Google Player',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
      providerData: []
    };
    
    auth.currentUser = mockUser;
    localStorage.setItem('chessarena_logged_in_uid', uid);
    triggerAuthListeners();
    return { user: mockUser };
  }
  return authSDK.signInWithPopup(authInstance, provider);
}

export async function sendPasswordResetEmail(authInstance: any, email: string) {
  if (isMockMode) {
    return;
  }
  return authSDK.sendPasswordResetEmail(authInstance, email);
}
