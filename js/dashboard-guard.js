// ══════════════════════════════════════════════════════════
// ️ DASHBOARD GUARD - Proteksi Halaman Dashboard
// ══════════════════════════════════════════════════════════

import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Cek status login secara real-time
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ✅ User sedang login - biarkan di dashboard
        console.log("✅ Akses diizinkan untuk:", user.email);
        
        // (Opsional) Tampilkan info user di dashboard
        // document.getElementById('userEmailDisplay').textContent = user.email;
    } else {
        // ❌ User TIDAK login - redirect ke halaman login
        console.log("❌ Akses ditolak. Mengalihkan ke login...");
        window.location.replace('index.html'); // Pakai replace agar tidak bisa back
    }
});
