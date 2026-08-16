// ══════════════════════════════════════════════════════════
// 🔥 KONFIGURASI FIREBASE - SIPELITA GURU (PROJECT BARU)
// File ini menjadi sumber tunggal (Single Source of Truth) 
// untuk semua koneksi Firebase di aplikasi Anda.
// ══════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Konfigurasi Project: sipelita-guru
const firebaseConfig = {
  apiKey: "AIzaSyAlVg1QKRP-1sDJmlA-YFEfHLKqhT5OzBY",
  authDomain: "sipelita-guru.firebaseapp.com",
  projectId: "sipelita-guru",
  storageBucket: "sipelita-guru.firebasestorage.app",
  messagingSenderId: "595996765157",
  appId: "1:595996765157:web:88f7f03489e1d1248e9d0c",
  measurementId: "G-ZGT7K2N7L5"
  // Catatan: databaseURL sengaja dihilangkan karena project baru 
  // defaultnya menggunakan Firestore. Jika nanti Anda mengaktifkan 
  // Realtime Database di console, Anda bisa menambahkan baris ini:
  // databaseURL: "https://sipelita-guru-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// 1. Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);

// 2. EKSPOR SEMUA SERVICE (Struktur tetap sama agar file lama tidak error)
export const auth = getAuth(app);        // Untuk Autentikasi (Login/Register)
export const db = getFirestore(app);     // Untuk Database Firestore (Rekomendasi utama)
export const rtdb = getDatabase(app);    // Untuk Realtime Database (Opsional, jika masih dipakai modul lama)
export const storage = getStorage(app);  // Untuk Upload File/Gambar
