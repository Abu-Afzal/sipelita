// js/auth-service.js
import { db } from './firebase-config.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth();

// ══════════════════════════════════════════════
// 🔐 AUTO-LOGOUT SESSION TIMEOUT (24 JAM)
// ══════════════════════════════════════════════
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 jam
const ACTIVITY_KEY = 'sipelita_last_activity';

function updateActivityTimestamp() {
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
}

function checkSessionTimeout() {
    const lastActivity = localStorage.getItem(ACTIVITY_KEY);
    const sipelitaUser = localStorage.getItem('sipelita_user');
    
    // Jika tidak ada session, tidak perlu cek
    if (!sipelitaUser) return true;
    
    // Jika belum ada timestamp, set sekarang
    if (!lastActivity) {
        updateActivityTimestamp();
        return true;
    }
    
    const elapsed = Date.now() - parseInt(lastActivity);
    
    // Jika sudah lewat timeout, logout otomatis
    if (elapsed > SESSION_TIMEOUT_MS) {
        console.log('⏰ Session timeout setelah', Math.round(elapsed / 1000 / 60 / 60), 'jam');
        
        // Hapus semua session
        localStorage.removeItem('sipelita_user');
        localStorage.removeItem(ACTIVITY_KEY);
        sessionStorage.removeItem('sipelita_user');
        
        // Sign out dari Firebase Auth
        signOut(auth).catch(err => console.log('Firebase signOut error:', err));
        
        alert('⏰ Session Anda telah berakhir karena tidak ada aktivitas selama 24 jam.\n\nSilakan login kembali.');
        
        // Redirect ke halaman login
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

function setupActivityListeners() {
    let throttleTimer = null;
    const activities = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    activities.forEach(event => {
        document.addEventListener(event, () => {
            // Throttle: update maksimal setiap 30 detik
            if (!throttleTimer) {
                throttleTimer = setTimeout(() => {
                    updateActivityTimestamp();
                    throttleTimer = null;
                }, 30000);
            }
        }, { passive: true });
    });
}

// Jalankan auto-logout check
checkSessionTimeout();
setupActivityListeners();

// ══════════════════════════════════════════════
// HELPER PESAN ERROR
// ══════════════════════════════════════════════
function dapatkanPesanError(code) {
    switch(code) {
        case 'auth/user-not-found': 
        case 'auth/invalid-credential': 
            return 'Email atau password salah / tidak terdaftar.';
        case 'auth/wrong-password': 
            return 'Password salah. Silakan periksa kembali.';
        case 'auth/invalid-email': 
            return 'Format email salah.';
        case 'auth/too-many-requests': 
            return 'Terlalu banyak percobaan login gagal. Coba lagi nanti.';
        default: 
            return 'Login gagal. Periksa koneksi internet Anda.';
    }
}

// ══════════════════════════════════════════════
// AUTH SERVICE (OBJECT LITERAL)
// ══════════════════════════════════════════════
export const AuthService = {
    
    // 🔐 LOGIN
    async login(email, password) {
        try {
            const formatEmail = email.trim().toLowerCase();
            const formatPassword = password.trim();

            // 0. CLEAR SESSION LAMA
            localStorage.removeItem('sipelita_user');
            sessionStorage.removeItem('sipelita_user');

            // 1. Validasi user di Firestore
            const q = query(collection(db, "users"), where("email", "==", formatEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return { success: false, message: "Akun Anda belum terdaftar di sistem SIPELITA. Hubungi Admin." };
            }

            const docSnap = querySnapshot.docs[0];
            const userData = docSnap.data();

            // 2. Sign In atau Auto Register
            let user;
            try {
                const userCredential = await signInWithEmailAndPassword(auth, formatEmail, formatPassword);
                user = userCredential.user;
            } catch (authError) {
                console.log("Firebase Auth menganalisis status akun... Code:", authError.code);
                
                const akunBelumAktif = (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential');
                const passwordCocok = (formatPassword === userData.password);

                if (akunBelumAktif && passwordCocok) {
                    console.log("Mempersiapkan pembuatan akun Authentication baru untuk:", formatEmail);
                    const newCredential = await createUserWithEmailAndPassword(auth, formatEmail, formatPassword);
                    user = newCredential.user;
                } else if (akunBelumAktif && !passwordCocok) {
                    return { success: false, message: 'Akun Anda ditemukan, namun password awal salah.' };
                } else {
                    return { success: false, message: dapatkanPesanError(authError.code) };
                }
            }

            // 3. Simpan info user
            const userDataLengkap = {
                uid: user.uid,
                email: user.email,
                nama: userData.nama,
                role: userData.role,
                nip: userData.nip || '',
                fitur: userData.fitur || []
            };
            
            localStorage.setItem('sipelita_user', JSON.stringify(userDataLengkap));
            sessionStorage.setItem('sipelita_user', JSON.stringify(userDataLengkap));
            
            // ✅ UPDATE ACTIVITY TIMESTAMP saat login berhasil
            updateActivityTimestamp();
            
            console.log('✅ User login berhasil:', userDataLengkap);
            return { success: true, role: userData.role, nama: userData.nama };

        } catch (error) {
            console.error("Error pada sistem login utama:", error);
            return { success: false, message: dapatkanPesanError(error.code) };
        }
    },

    // 🔓 LOGOUT (✅ INI YANG HILANG!)
    async logout() {
        try {
            // Sign out dari Firebase Auth
            await signOut(auth);
            
            // Hapus semua data session
            localStorage.removeItem('sipelita_user');
            localStorage.removeItem(ACTIVITY_KEY);
            sessionStorage.removeItem('sipelita_user');
            
            console.log('✅ User berhasil logout');
            
            // Redirect ke halaman login
            window.location.href = 'index.html';
            
            return { success: true };
        } catch (error) {
            console.error('❌ Error saat logout:', error);
            return { success: false, message: 'Gagal logout: ' + error.message };
        }
    },

    // ✅ CEK STATUS LOGIN
    checkAuth() {
        const userStr = localStorage.getItem('sipelita_user');
        if (!userStr) return null;
        
        const user = JSON.parse(userStr);
        
        // Cek session timeout saat checkAuth dipanggil
        const lastActivity = localStorage.getItem(ACTIVITY_KEY);
        if (lastActivity) {
            const elapsed = Date.now() - parseInt(lastActivity);
            if (elapsed > SESSION_TIMEOUT_MS) {
                console.log('⏰ Session timeout saat checkAuth');
                localStorage.removeItem('sipelita_user');
                localStorage.removeItem(ACTIVITY_KEY);
                sessionStorage.removeItem('sipelita_user');
                return null;
            }
        }
        
        return user;
    },
    
    // ✅ GET CURRENT USER (Helper)
    getCurrentUser() {
        const userStr = localStorage.getItem('sipelita_user');
        return userStr ? JSON.parse(userStr) : null;
    }
};

// Daftarkan fungsi ke window global untuk tombol logout
window.logoutPengguna = async function() {
    await AuthService.logout();
};
