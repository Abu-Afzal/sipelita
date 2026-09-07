import { AuthService } from './auth-service.js';

// Inisialisasi Firebase (global, dipakai untuk cek status)
const firebaseConfig = {
  apiKey: "AIzaSyAlVg1QKRP-1sDJmlA-YFEfHLKqhT5OzBY",
  authDomain: "sipelita-guru.firebaseapp.com",
  projectId: "sipelita-guru",
  storageBucket: "sipelita-guru.firebasestorage.app",
  messagingSenderId: "595996765157",
  appId: "1:595996765157:web:88f7f03489e1d1248e9d0c"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// ══════════════════════════════════════════════
// HELPER: TOAST NOTIFICATION
// ══════════════════════════════════════════════
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.style.cssText = `padding:14px 20px;border-radius:10px;margin-bottom:10px;font-weight:600;font-size:.9rem;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.15);display:flex;align-items:center;gap:10px;max-width:380px;animation:slideIn .3s ease;`;
  const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
  const icons = { success: '✅', error: '❌', warning: '⏳', info: 'ℹ️' };
  toast.style.background = colors[type] || colors.info;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ══════════════════════════════════════════════
// CEK STATUS APPROVAL USER
// ══════════════════════════════════════════════
async function cekStatusDanRedirect(user, userData) {
  // Simpan data dasar user
  const baseUser = {
    uid: user.uid,
    email: user.email,
    nama: userData?.nama || userData?.namaResmi || user.displayName || user.email.split('@')[0],
    namaResmi: userData?.namaResmi || userData?.nama || user.displayName || '',
    nip: userData?.nip || '',
    role: userData?.role || 'guru',
    status: userData?.status || 'active',
    sekolah_id: userData?.sekolah_id || userData?.school_id || ''
  };
  localStorage.setItem('sipelita_user', JSON.stringify(baseUser));

  // ✅ STATUS: PENDING → halaman menunggu
  if (userData?.status === 'pending') {
    showToast('⏳ Akun Anda masih menunggu persetujuan admin', 'warning');
    setTimeout(() => { window.location.href = 'pending.html'; }, 1500);
    return;
  }

  // ❌ STATUS: REJECTED → tampilkan alasan + logout
  if (userData?.status === 'rejected') {
    await auth.signOut();
    localStorage.removeItem('sipelita_user');
    const errorMsg = document.getElementById('errorMsg');
    if (errorMsg) {
      const alasan = userData.rejectReason || 'Hubungi admin untuk informasi lebih lanjut.';
      errorMsg.innerHTML = `<strong>❌ Akun Ditolak</strong><br><small>${alasan}</small>`;
      errorMsg.style.display = 'block';
    }
    showToast('❌ Akun Anda telah ditolak oleh admin', 'error');
    return;
  }

  // ✅ ROLE: ADMIN → halaman approval
  if (userData?.role === 'admin') {
    showToast('👑 Selamat datang, Admin!', 'success');
    setTimeout(() => { window.location.href = 'admin-approve.html'; }, 800);
    return;
  }

  // ✅ ROLE: KEPALA / WAKIL → SIPENA dengan mode monitoring
  if (userData?.role === 'kepala' || userData?.role === 'wakil') {
    showToast('🎓 Selamat datang, Pimpinan Madrasah!', 'success');
    setTimeout(() => { window.location.href = 'pages/sipena-modern.html'; }, 800);
    return;
  }

  // ✅ DEFAULT: Guru aktif → dashboard SIPENA
  showToast(`✅ Selamat datang, ${baseUser.nama}!`, 'success');
  setTimeout(() => { window.location.href = 'pages/sipena-modern.html'; }, 800);
}

// ══════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Cek status autentikasi aktif saat halaman dimuat
  try {
    const loggedInUser = AuthService.checkAuth();
    if (loggedInUser) {
      // ⚠️ Jika user sudah login, cek dulu statusnya di Firestore
      const email = loggedInUser.email || loggedInUser.nama;
      if (email && !email.includes('@') && loggedInUser.email) {
        db.collection('users').doc(loggedInUser.email).get()
          .then(doc => {
            if (doc.exists) {
              const data = doc.data();
              if (data.status === 'pending') {
                window.location.href = 'pending.html';
                return;
              }
              if (data.status === 'rejected') {
                auth.signOut();
                localStorage.removeItem('sipelita_user');
                return;
              }
              if (data.role === 'admin') {
                window.location.href = 'admin-approve.html';
                return;
              }
            }
            window.location.href = 'pages/sipena-modern.html';
          })
          .catch(() => {
            window.location.href = 'pages/sipena-modern.html';
          });
      } else {
        window.location.href = 'pages/sipena-modern.html';
      }
      return;
    }
  } catch(e) {
    console.log("Sistem autentikasi lokal siap.");
  }

  const loginForm = document.getElementById('landingLoginForm');
  const errorMsg = document.getElementById('errorMsg');
  const btnLogin = document.getElementById('btnLogin');
  
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberMeCheckbox = document.getElementById('rememberMe');
  const togglePassword = document.getElementById('togglePassword');

  // ── FEATURE 1: INGAT SAYA ──
  if (localStorage.getItem('sipelita_remember') === 'true') {
    emailInput.value = localStorage.getItem('sipelita_email') || '';
    passwordInput.value = localStorage.getItem('sipelita_pass') || '';
    rememberMeCheckbox.checked = true;
  }

  // ── FEATURE 2: TOGGLE PASSWORD ──
  if (togglePassword) {
    togglePassword.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePassword.classList.toggle('fa-eye');
      togglePassword.classList.toggle('fa-eye-slash');
    });
  }

  // ── LOGIKA UTAMA SUBMIT LOGIN ──
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      errorMsg.style.display = 'none';
      btnLogin.disabled = true;
      btnLogin.textContent = 'MEMPROSES...';

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      try {
        const result = await AuthService.login(email, password);
        
        if (result && result.success) {
          // ── FEATURE 3: SIMPAN KREDENSIAL ──
          if (rememberMeCheckbox.checked) {
            localStorage.setItem('sipelita_email', email);
            localStorage.setItem('sipelita_pass', password);
            localStorage.setItem('sipelita_remember', 'true');
          } else {
            localStorage.removeItem('sipelita_email');
            localStorage.removeItem('sipelita_pass');
            localStorage.removeItem('sipelita_remember');
          }

          // ✅ CEK STATUS USER DI FIRESTORE
          try {
            const userDoc = await db.collection('users').doc(email).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              await cekStatusDanRedirect(auth.currentUser, userData);
              return;
            } else {
              // User di Auth tapi tidak di collection users (legacy/external)
              // Coba cari by field email
              const q = await db.collection('users').where('email', '==', email).limit(1).get();
              if (!q.empty) {
                const userData = q.docs[0].data();
                await cekStatusDanRedirect(auth.currentUser, userData);
                return;
              }
              // Fallback: user legacy tanpa status → anggap active
              await cekStatusDanRedirect(auth.currentUser, { status: 'active', role: 'guru' });
            }
          } catch (dbErr) {
            console.warn('⚠️ Gagal cek status Firestore, lanjut default:', dbErr.message);
            await cekStatusDanRedirect(auth.currentUser, { status: 'active', role: 'guru' });
          }
        } else {
          errorMsg.textContent = result ? result.message : 'Akses ditolak. Email atau password salah.';
          errorMsg.style.display = 'block';
          btnLogin.disabled = false;
          btnLogin.textContent = 'MASUK PORTAL';
        }
      } catch (err) {
        console.error("Firebase Connection Error:", err);
        errorMsg.textContent = 'Gagal terhubung ke server database Firebase.';
        errorMsg.style.display = 'block';
        btnLogin.disabled = false;
        btnLogin.textContent = 'MASUK PORTAL';
      }
    });
  }
});
