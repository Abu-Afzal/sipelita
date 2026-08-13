// ═══════════════════════════════════════════════════════════
// 🔒 KEAMANAN: CEK SESSION DI AWAL FILE (WAJIB)
// ═══════════════════════════════════════════════════════════
(function() {
    const sessionData = localStorage.getItem('sipelita_user'); // Sesuaikan jika key Anda berbeda
    
    if (!sessionData) {
        // Jika tidak ada data login, langsung tendang ke halaman login
        // Gunakan replace agar user tidak bisa klik "Back" di browser untuk kembali
        window.location.replace('../home.html'); 
        return; 
    }
    
    try {
        const currentUser = JSON.parse(sessionData);
        
        // OPSIONAL TAPI SANGAT DISARANKAN: 
        // Hanya izinkan role 'admin' yang mengakses halaman kelola user
        if (currentUser.role !== 'admin') {
            alert('⛔ AKSES DITOLAK!\n\nHalaman Kelola User khusus untuk Administrator.');
            window.location.replace('../index.html'); // Kembalikan ke dashboard
            return;
        }
    } catch (error) {
        // Jika data session rusak/corrupt, hapus dan tendang ke login
        localStorage.removeItem('sipelita_user');
        window.location.replace('../home.html');
        return;
    }
})();
// ═══════════════════════════════════════════════════════════

import './fitur.js';
import './load-users.js';
import './tambah-user.js';
import './edit-user.js';
import './hapus-user.js';
import './modal.js';

console.log('✅ Users module loaded & secured');
