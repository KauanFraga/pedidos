// firebase.ts - CONFIGURAÇÃO CORRETA DO PROJETO PEDIDOS-MAIN
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ CONFIGURAÇÃO CORRETA - PROJETO PEDIDOS-MAIN
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-7R919Y7B6R" // Pode manter este se quiser, ele não é uma senha.
};

console.log("🔧 Firebase Config:", firebaseConfig);
console.log("📦 Projeto:", firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log("✅ Firebase inicializado com sucesso!");
console.log("✅ Auth, Firestore e Storage prontos!");

// Expõe no window para debugging
console.log("🔧 Expondo no window...");

if (typeof window !== 'undefined') {
  (window as any).firebaseApp = app;
  (window as any).auth = auth;
  (window as any).db = db;
  (window as any).storage = storage;
  
  console.log("✅ Firebase exposto globalmente!");
  console.log("✅ window.auth:", (window as any).auth);
  console.log("✅ window.db:", (window as any).db);
}

export { app, auth, db, storage };