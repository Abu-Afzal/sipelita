// ═══════════════════════════════════════════════════════════
// 🔒 KEAMANAN: CEK SESSION DI AWAL FILE (WAJIB)
// ═══════════════════════════════════════════════════════════
(function() {
    const sessionData = localStorage.getItem('sipelita_user');
    
    if (!sessionData) {
        window.location.replace('home.html'); 
        return; 
    }
    
    try {
        const currentUser = JSON.parse(sessionData);
        
        if (currentUser.role !== 'admin') {
            alert('⛔ AKSES DITOLAK!\n\nHalaman Kelola User khusus untuk Administrator.');
            window.location.replace('index.html');
            return;
        }
    } catch (error) {
        localStorage.removeItem('sipelita_user');
        window.location.replace('home.html');
        return;
    }
})();
// ═══════════════════════════════════════════════════════════

// Modul fitur dihapus karena tidak lagi dipakai di admin-users
import './load-users.js';
import './tambah-user.js';
import './edit-user.js';
import './hapus-user.js';
import './modal.js';

console.log('✅ Users module loaded & secured');