// firebase.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDIGp1HmcgFwQcfqmzXzbHem5K2IpX5SYw",
  authDomain: "pedidos-main.firebaseapp.com",
  projectId: "pedidos-main",
  storageBucket: "pedidos-main.firebasestorage.app",
  messagingSenderId: "504840452832",
  appId: "1:504840452832:web:8e45ad413f13c615dcee85",
  measurementId: "G-7R919Y7B6R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
