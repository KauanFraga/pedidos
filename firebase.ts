// firebase.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// DEBUG: Verificar se as variáveis de ambiente estão sendo lidas
console.log("🔍 DEBUG - Variáveis de ambiente:");
console.log("API Key:", import.meta.env.VITE_FIREBASE_API_KEY ? "✅ Encontrada" : "❌ NÃO encontrada");
console.log("Project ID:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log("Todas as env vars:", import.meta.env);

// Configuração do Firebase usando variáveis de ambiente
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validação: Verifica se as variáveis de ambiente estão configuradas
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ ERRO: Variáveis de ambiente do Firebase não configuradas!");
  console.error("Verifique se o arquivo .env existe na raiz do projeto e está configurado corretamente.");
  console.error("Lembre-se de REINICIAR o servidor após criar/editar o .env!");
  
  // Fallback temporário apenas para desenvolvimento
  console.warn("⚠️ USANDO CONFIGURAÇÃO HARDCODED (TEMPORÁRIO - REMOVER EM PRODUÇÃO)");
  firebaseConfig.apiKey = "AIzaSyCEbzfxMM8dWos-l2bxt-l-EbXyxg_F0wY";
  firebaseConfig.authDomain = "orcamentos-3f5cd.firebaseapp.com";
  firebaseConfig.projectId = "orcamentos-3f5cd";
  firebaseConfig.storageBucket = "orcamentos-3f5cd.firebasestorage.app";
  firebaseConfig.messagingSenderId = "1019317356628";
  firebaseConfig.appId = "1:1019317356628:web:093bd12b223f870f1485c1";
  firebaseConfig.measurementId = "G-YGYSRLQKT5";
}

console.log("🔧 Firebase Config:", firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log("✅ Firebase inicializado com sucesso!");
console.log("📦 Projeto:", firebaseConfig.projectId);

export { app, analytics, auth, db, storage };