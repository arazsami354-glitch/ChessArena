import { initializeApp } from 'firebase/app';
import * as firestoreSDK from 'firebase/firestore';
import * as authSDK from 'firebase/auth';
import { GoogleAuthProvider } from 'firebase/auth';

// قراءة مباشرة وآمنة لمتغيرات البيئة تناسب محرك بناء Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "remixed-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "remixed-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "remixed-project-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "remixed-app-id",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "remixed-firestore-database-id"
};

// تشغيل الـ Matchmaking الحقيقي فقط إذا تغير الـ Project ID عن القيمة الافتراضية
export const isMockMode = firebaseConfig.projectId === "remixed-project-id";

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
    
    realDb = firestoreSDK.getFirestore(realApp, firebaseConfig.firestoreDatabaseId);
    realAuth = authSDK.getAuth(realApp);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export { realApp, realDb, realAuth };
export const db = realDb;
export const auth = realAuth;
export const googleProvider = new GoogleAuthProvider();
