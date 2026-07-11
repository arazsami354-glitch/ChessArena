import { initializeApp } from 'firebase/app';
import * as firestoreSDK from 'firebase/firestore';
import * as authSDK from 'firebase/auth';
import { GoogleAuthProvider } from 'firebase/auth';

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
export const googleProvider: any = new GoogleAuthProvider();
