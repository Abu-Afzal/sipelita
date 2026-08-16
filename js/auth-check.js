// ✅ PROTEKSI HALAMAN: Cek apakah user sudah login
import { AuthService } from './js/auth-service.js';

const currentUser = AuthService.checkAuth();

// Jika tidak ada user di localStorage, redirect ke login
if (!currentUser) {
    window.location.href = 'login.html';
}

// Jika sudah login, lanjutkan load halaman...
console.log(`✅ Welcome, ${currentUser.nama} (${currentUser.role})`);
