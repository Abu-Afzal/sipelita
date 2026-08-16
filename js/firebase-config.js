// ══════════════════════════════════════════════════════════
// 🔥 KONFIGURASI FIREBASE - MULTI-DOMAIN AUTO-DETECT
// File ini menjadi sumber tunggal (Single Source of Truth) 
// untuk semua koneksi Firebase di aplikasi SIPELITA.
// Mendukung 2 domain:
//   - sipelita.manbantaeng.web.id → Firebase LAMA (sipelita-digital)
//   - sipelita.my.id              → Firebase BARU (sipelita-guru)
// ══════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ══════════════════════════════════════════════
// 🌐 AUTO-DETECT DOMAIN
// ══════════════════════════════════════════════
const currentDomain = window.location.hostname;
const isManBantaeng = currentDomain.includes('manbantaeng');

// Konfigurasi Firebase LAMA (untuk MAN Bantaeng)
const firebaseConfigLama = {
  apiKey: "AIzaSyB24GCKSTPGlN9HG9E6uhCECVa4ibCpKEA",
  authDomain: "sipelita-digital.firebaseapp.com",
  databaseURL: "https://sipelita-digital-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sipelita-digital",
  storageBucket: "sipelita-digital.firebasestorage.app",
  messagingSenderId: "787840817745",
  appId: "1:787840817745:web:e6b5237cfbb5e51be93670"
};

// Konfigurasi Firebase BARU (untuk sipelita.my.id)
const firebaseConfigBaru = {
  apiKey: "AIzaSyAlVg1QKRP-1sDJmlA-YFEfHLKqhT5OzBY",
  authDomain: "sipelita-guru.firebaseapp.com",
  databaseURL: "https://sipelita-guru-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sipelita-guru",
  storageBucket: "sipelita-guru.firebasestorage.app",
  messagingSenderId: "595996765157",
  appId: "1:595996765157:web:88f7f03489e1d1248e9d0c",
  measurementId: "G-ZGT7K2N7L5"
};

// Pilih config berdasarkan domain
const firebaseConfig = isManBantaeng ? firebaseConfigLama : firebaseConfigBaru;

// Log untuk debugging
console.log(`🔥 [firebase-config.js] Domain: ${currentDomain}`);
console.log(`🔥 [firebase-config.js] Project: ${isManBantaeng ? 'sipelita-digital (MAN Bantaeng)' : 'sipelita-guru (guru.sipelita.my.id)'}`);

// ══════════════════════════════════════════════
// 🚀 INISIALISASI FIREBASE APP
// ══════════════════════════════════════════════
const app = initializeApp(firebaseConfig);

// ══════════════════════════════════════════════
// 📦 EKSPOR SEMUA SERVICE
// Struktur tetap sama agar file lama tidak error
// ══════════════════════════════════════════════
export const auth = getAuth(app);        // Untuk Autentikasi (Login/Register)
export const db = getFirestore(app);     // Untuk Database Firestore (Rekomendasi utama)
export const rtdb = getDatabase(app);    // Untuk Realtime Database (Modul SIPENA)
export const storage = getStorage(app);  // Untuk Upload File/Gambar

// Export juga flag domain agar bisa dipakai di file lain
export const appConfig = {
  isManBantaeng: isManBantaeng,
  projectId: firebaseConfig.projectId,
  domain: currentDomain
};
