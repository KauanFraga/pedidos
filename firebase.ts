// firebase.ts - CONFIGURAÇÃO OTIMIZADA
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics"; // [1] Importar Analytics

// ✅ CONFIGURAÇÃO
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-7R919Y7B6R"
};

// Inicializa o App
const app = initializeApp(firebaseConfig);

// Inicializa os serviços
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// [2] Inicializa Analytics apenas se estiver rodando no navegador (evita erro em SSR/Node)
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

console.log("✅ Firebase inicializado com sucesso!");
// REMOVIDO: console.log da firebaseConfig por segurança

// Expõe no window para debugging (apenas em desenvolvimento)
if (import.meta.env.DEV && typeof window !== 'undefined') { // [3] Só expõe se for modo DEV
  console.log("🔧 Modo Debug Ativado: Firebase exposto no window");
  (window as any).firebaseApp = app;
  (window as any).auth = auth;
  (window as any).db = db;
  (window as any).storage = storage;
}

export { app, auth, db, storage, analytics };