import { AuthService } from './auth-service.js';
import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

    const style = document.createElement('style');
    style.textContent = '@keyframes toastIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
    document.head.appendChild(style);
  }
  const toast = document.createElement('div');
  const colors = { success:'#10b981', error:'#ef4444', warning:'#f59e0b', info:'#3b82f6' };
  const icons  = { success:'✅', error:'❌', warning:'⏳', info:'ℹ️' };
  toast.style.cssText = `padding:14px 20px;border-radius:10px;margin-bottom:10px;font-weight:600;font-size:.9rem;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.15);display:flex;align-items:center;gap:10px;max-width:380px;animation:toastIn .3s ease;background:${colors[type]||colors.info};`;
  toast.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity .3s'; setTimeout(()=>toast.remove(),300); }, 4000);
}

// ══════════════════════════════════════════════
// CEK STATUS APPROVAL + ROUTING
// ══════════════════════════════════════════════
async function cekStatusDanRedirect(userData) {
  const baseUser = {
    uid:       userData?.uid || '',
    email:     userData?.email || '',
    nama:      userData?.nama || userData?.namaResmi || '',
    namaResmi: userData?.namaResmi || userData?.nama || '',
    nip:       userData?.nip || '',
    role:      userData?.role || 'guru',
    status:    userData?.status || 'active',
  };
  localStorage.setItem('sipelita_user', JSON.stringify(baseUser));

  // ⏳ PENDING
  if (userData?.status === 'pending') {
    showToast('Akun Anda masih menunggu persetujuan admin', 'warning');
    setTimeout(() => { window.location.href = 'pending.html'; }, 1500);
    return true;
  }

  // ❌ REJECTED
  if (userData?.status === 'rejected') {
    await signOut(auth);
    localStorage.removeItem('sipelita_user');
    const errorMsg = document.getElementById('errorMsg');
    if (errorMsg) {
      const alasan = userData.rejectReason || 'Hubungi admin untuk informasi lebih lanjut.';
      errorMsg.innerHTML = `<strong>❌ Akun Ditolak</strong><br><small>${alasan}</small>`;
      errorMsg.style.display = 'block';
    }
    showToast('Akun Anda telah ditolak oleh admin', 'error');
    return true;
  }

  // 👑 ADMIN
  if (userData?.role === 'admin') {
    showToast('Selamat datang, Admin!', 'success');
    setTimeout(() => { window.location.href = 'admin-users.html'; }, 800);
    return true;
  }

  // 🎓 KEPALA / WAKIL
  if (userData?.role === 'kepala' || userData?.role === 'wakil') {
    showToast('Selamat datang, Pimpinan Madrasah!', 'success');
    setTimeout(() => { window.location.href = 'pages/index.html'; }, 800);
    return true;
  }

  // ✅ GURU AKTIF (default)
  showToast(`Selamat datang, ${baseUser.nama || 'Bapak/Ibu'}!`, 'success');
  setTimeout(() => { window.location.href = 'pages/index.html'; }, 800);
  return true;
}

// ══════════════════════════════════════════════
// AMBIL DATA USER DARI FIRESTORE (MODULAR)
// ══════════════════════════════════════════════
async function getDataUser(email) {
  try {
    // Coba by doc ID = email
    const docSnap = await getDoc(doc(db, 'users', email));
    if (docSnap.exists()) return docSnap.data();

    // Fallback: cari by field email
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].data();

    return null;
  } catch (e) {
    console.warn('⚠️ getDataUser error:', e.message);
    return null;
  }
}

// ══════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Cek sesi aktif
  try {
    const loggedInUser = AuthService.checkAuth();
    if (loggedInUser) {
      const email = loggedInUser.email;
      if (email) {
        getDataUser(email).then(userData => {
          if (userData) {
            if (userData.status === 'pending')  { window.location.href = 'pending.html'; return; }
            if (userData.status === 'rejected') { signOut(auth); localStorage.removeItem('sipelita_user'); return; }
            if (userData.role === 'admin')      { window.location.href = 'admin-users.html'; return; }
          }
          window.location.href = 'pages/index.html';
        }).catch(() => {
          window.location.href = 'pages/index.html';
        });
      } else {
        window.location.href = 'pages/index.html';
      }
      return;
    }
  } catch(e) {
    console.log("Sistem autentikasi lokal siap.");
  }

  const loginForm          = document.getElementById('landingLoginForm');
  const errorMsg           = document.getElementById('errorMsg');
  const btnLogin           = document.getElementById('btnLogin');
  const emailInput         = document.getElementById('email');
  const passwordInput      = document.getElementById('password');
  const rememberMeCheckbox = document.getElementById('rememberMe');
  const togglePassword     = document.getElementById('togglePassword');

  // ── FEATURE 1: INGAT SAYA ──
  if (localStorage.getItem('sipelita_remember') === 'true') {
    emailInput.value    = localStorage.getItem('sipelita_email') || '';
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

  // ── LOGIKA UTAMA LOGIN ──
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.style.display = 'none';
      btnLogin.disabled = true;
      btnLogin.textContent = 'MEMPROSES...';

      const email    = emailInput.value.trim();
      const password = passwordInput.value;

      try {
        const result = await AuthService.login(email, password);

        if (result && result.success) {
          // ── SIMPAN KREDENSIAL ──
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
          const userData = await getDataUser(email);
          if (userData) {
            await cekStatusDanRedirect(userData);
          } else {
            // Legacy user (tanpa doc di Firestore) → anggap active
            await cekStatusDanRedirect({ email, status: 'active', role: 'guru' });
          }

        } else {
          errorMsg.textContent = result?.message || 'Email atau password salah.';
          errorMsg.style.display = 'block';
          btnLogin.disabled = false;
          btnLogin.textContent = 'MASUK PORTAL';
        }
      } catch (err) {
        console.error("Login Error:", err);
        errorMsg.textContent = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
        errorMsg.style.display = 'block';
        btnLogin.disabled = false;
        btnLogin.textContent = 'MASUK PORTAL';
      }
    });
  }
});