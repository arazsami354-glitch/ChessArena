import { initializeApp } from 'firebase/app';
import * as firestoreSDK from 'firebase/firestore';
import * as authSDK from 'firebase/auth';
import { GoogleAuthProvider } from 'firebase/auth';

// قراءة آمنة لبيئة العمل لتجنب أي أخطاء أثناء الـ Build في Vercel
const getEnvVariable = (key: string): string => {
  const env = (import.meta as any).env || {};
  return env[key] || '';
};

const firebaseConfig = {
  apiKey: getEnvVariable('VITE_FIREBASE_API_KEY') || "remixed-api-key",
  authDomain: getEnvVariable('VITE_FIREBASE_AUTH_DOMAIN') || "remixed-auth-domain",
  projectId: getEnvVariable('VITE_FIREBASE_PROJECT_ID') || "remixed-project-id",
  appId: getEnvVariable('VITE_FIREBASE_APP_ID') || "remixed-app-id",
  firestoreDatabaseId: getEnvVariable('VITE_FIREBASE_DATABASE_ID') || "remixed-firestore-database-id"
};

// التحقق من نمط المحاكاة أو الربط الحقيقي
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

// التصدير الآمن لجميع المتغيرات التي تحتاجها باقي ملفات اللعبة
export { realApp, realDb, realAuth };
export const db = realDb;
export const auth = realAuth;
export const googleProvider = new GoogleAuthProvider();
