import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAlVg1QKRP-1sDJmlA-YFEfHLKqhT5OzBY",
  authDomain: "sipelita-guru.firebaseapp.com",
  databaseURL: "https://sipelita-guru-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sipelita-guru",
  storageBucket: "sipelita-guru.firebasestorage.app",
  messagingSenderId: "595996765157",
  appId: "1:595996765157:web:88f7f03489e1d1248e9d0c",
  measurementId: "G-1D5DWJV54E"
};

// 1. Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);

// 2. EKSPOR SEMUA SERVICE (Pastikan kata 'export const' tertulis dengan benar)
export const auth = getAuth(app);        // Ini yang dicari oleh tambah-user.js!
export const db = getFirestore(app);      // Menggunakan Firestore sesuai kebutuhan modul Anda
export const rtdb = getDatabase(app);    
export const storage = getStorage(app);
