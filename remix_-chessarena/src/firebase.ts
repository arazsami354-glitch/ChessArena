import { initializeApp } from 'firebase/app';
import * as firestoreSDK from 'firebase/firestore';
import * as authSDK from 'firebase/auth';

const firebaseConfig: any = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "remixed-api-key",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "remixed-auth-domain",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "remixed-project-id",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "remixed-app-id",
  firestoreDatabaseId: (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || "remixed-firestore-database-id"
};

export const isMockMode: boolean = firebaseConfig.projectId === "remixed-project-id";

let realApp: any = null;
let realDb: any = null;
let realAuth: any = null;

if (!isMockMode) {
  try {
    realApp = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId
    });
    
    realDb = (firestoreSDK as any).getFirestore(realApp, firebaseConfig.firestoreDatabaseId);
    realAuth = (authSDK as any).getAuth(realApp);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export { realApp, realDb, realAuth };
export const db: any = realDb;
export const auth: any = realAuth;
export const googleProvider: any = new authSDK.GoogleAuthProvider();

export const collection = firestoreSDK.collection;
export const query = firestoreSDK.query;
export const where = firestoreSDK.where;
export const onSnapshot = firestoreSDK.onSnapshot;
export const doc = firestoreSDK.doc;
export const updateDoc = firestoreSDK.updateDoc;
export const addDoc = firestoreSDK.addDoc;
export const setDoc = firestoreSDK.setDoc;
export const getDoc = firestoreSDK.getDoc;
export const getDocs = firestoreSDK.getDocs;
export const deleteDoc = firestoreSDK.deleteDoc;
export const orderBy = firestoreSDK.orderBy;
export const limit = firestoreSDK.limit;
export const runTransaction = firestoreSDK.runTransaction;

export const signInWithPopup = authSDK.signInWithPopup;
export const signOut = authSDK.signOut;
export const onAuthStateChanged = authSDK.onAuthStateChanged;
export const GoogleAuthProvider = authSDK.GoogleAuthProvider;
