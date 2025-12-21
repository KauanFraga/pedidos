// firebase.ts - CONFIGURAÇÃO CORRETA DO PROJETO PEDIDOS-MAIN
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ CONFIGURAÇÃO CORRETA - PROJETO PEDIDOS-MAIN
const firebaseConfig = {
  apiKey: "AIzaSyDIGp1HmcgFwQcfqmzXzbHem5K2IpX5SYw",
  authDomain: "pedidos-main.firebaseapp.com",
  projectId: "pedidos-main",
  storageBucket: "pedidos-main.firebasestorage.app",
  messagingSenderId: "504840452832",
  appId: "1:504840452832:web:8e45ad413f13c615dcee85",
  measurementId: "G-7R919Y7B6R"
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