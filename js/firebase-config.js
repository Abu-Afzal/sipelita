import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB24GCKSTPGlN9HG9E6uhCECVa4ibCpKEA",
  authDomain: "sipelita-digital.firebaseapp.com",
  databaseURL: "https://sipelita-digital-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sipelita-digital",
  storageBucket: "sipelita-digital.firebasestorage.app",
  messagingSenderId: "787840817745",
  appId: "1:787840817745:web:e6b5237cfbb5e51be93670",
  measurementId: "G-1D5DWJV54E"
};

// 1. Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);

// 2. EKSPOR SEMUA SERVICE (Pastikan kata 'export const' tertulis dengan benar)
export const auth = getAuth(app);        // Ini yang dicari oleh tambah-user.js!
export const db = getFirestore(app);      // Menggunakan Firestore sesuai kebutuhan modul Anda
export const rtdb = getDatabase(app);    
export const storage = getStorage(app);
