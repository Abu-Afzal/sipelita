// ══════════════════════════════════════════════
// SIPENA CORE: Firebase Init, State & Helpers (SECURE & FOLDER STRUCTURE VERSION)
// ══════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyB24GCKSTPGlN9HG9E6uhCECVa4ibCpKEA",
  authDomain: "sipelita-digital.firebaseapp.com",
  databaseURL: "https://sipelita-digital-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sipelita-digital",
  storageBucket: "sipelita-digital.firebasestorage.app",
  messagingSenderId: "787840817745",
  appId: "1:787840817745:web:e6b5237cfbb5e51be93670"
};

firebase.initializeApp(firebaseConfig);
const rtdb = firebase.database();
const firestore = firebase.firestore();
const ROOT = rtdb.ref("sipena2");

// Global State
let currentUser = '';
let currentUserEmail = ''; // ✅ SIMPAN EMAIL UNTUK RULES OWNERSHIP
let currentUserRole = 'guru'; // ✅ SIMPAN ROLE UNTUK LOGIKA ADMIN/KEPALA
let allData = [];
let currentClass = '';
let currentRekapClass = '';
let currentNilaiClass = '';
let currentManajeKelas = '';
let currentRekapTab = 'harian';
let currentNilaiTab = 'pengetahuan';
let attendanceData = {};
let selectedMonth = new Date().getMonth() + 1;
let selectedYear = new Date().getFullYear();
let selectedSemester = 'ganjil';
let nilaiKolom = [];
let nilaiKolomKet = [];
let selectedFileData = null;

// Helpers
window.toArr = (val) => val ? Object.keys(val).map(k => ({ __key: k, ...val[k] })) : [];
window.nowISO = () => new Date().toISOString();
window.todayStr = () => new Date().toISOString().split('T')[0];

window.toast = (msg, type = 'ok') => {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;padding:13px 20px;border-radius:10px;font-weight:700;font-size:0.88rem;background:${type === 'ok' ? '#10b981' : '#ef4444'};color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.2);`;
  t.textContent = msg; 
  document.body.appendChild(t);
  setTimeout(() => t.style.opacity = '0', 2500);
  setTimeout(() => t.remove(), 2900);
};

window.openModal = (id) => document.getElementById(id).classList.add('active');
window.closeModal = (id) => document.getElementById(id).classList.remove('active');

window.setMenuActive = (target) => {
  document.querySelectorAll('.menu-card').forEach(c => c.classList.remove('active-menu'));
  const card = document.querySelector(`.menu-card[data-target="${target}"]`);
  if (card) card.classList.add('active-menu');
};

window.showContent = (id) => {
  document.querySelectorAll('.content-area').forEach(a => a.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  setMenuActive(id);
  window.renderActive();
};

window.renderActive = () => {
  const a = document.querySelector('.content-area.active');
  if (!a) return;
  switch (a.id) {
    case 'kelola-kelas': if (typeof window.renderKelolaKelas === 'function') window.renderKelolaKelas(); break;
    case 'presensi': if (typeof window.renderPresensi === 'function') window.renderPresensi(); break;
    case 'rekap': if (typeof window.renderRekap === 'function') window.renderRekap(); break;
    case 'penilaian': if (typeof window.renderPenilaian === 'function') window.renderPenilaian(); break;
    case 'bank-soal': if (typeof window.renderBankSoal === 'function') window.renderBankSoal(); break;
  }
};

// Tampilkan loading screen saat menunggu auth
function showAuthLoading(msg) {
  let loading = document.getElementById('authLoadingScreen');
  if (!loading) {
    loading = document.createElement('div');
    loading.id = 'authLoadingScreen';
    loading.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: #f8fafc; z-index: 99999;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    document.body.appendChild(loading);
  }
  loading.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 15px;">🔐</div>
      <div style="font-weight: 700; color: #1e293b; font-size: 1.1rem; margin-bottom: 8px;">
        Memverifikasi Login...
      </div>
      <div style="color: #64748b; font-size: 0.9rem;">${msg}</div>
    </div>
  `;
}

function hideAuthLoading() {
  const el = document.getElementById('authLoadingScreen');
  if (el) el.remove();
}

// Init App yang menunggu Firebase Auth
window.initApp = () => {
  showAuthLoading('Mohon tunggu sebentar...');

  // Gerbang utama autentikasi
  firebase.auth().onAuthStateChanged(user => {
    // KASUS 1: User tidak login via Firebase Auth -> Redirect ke Login
    if (!user) {
      console.warn('⚠️ Tidak terautentikasi via Firebase Auth. Mengalihkan ke login...');
      hideAuthLoading();
      window.toast('⚠️ Sesi berakhir. Silakan login ulang.', 'err');
      setTimeout(() => {
        window.location.href = '../index.html';
      }, 1500);
      return;
    }

    // KASUS 2: User terautentikasi -> Lanjut
    console.log('✅ Auth siap:', user.email);
    currentUserEmail = user.email;

    // Ambil data tambahan dari localStorage (nama, role)
    let userData = null;
    try {
      const s = localStorage.getItem('sipelita_user');
      if (s) userData = JSON.parse(s);
    } catch (e) {}

    if (userData && userData.nama) {
      currentUser = userData.nama;
      currentUserRole = userData.role || 'guru';
    } else {
      currentUser = user.email;
      currentUserRole = 'guru';
    }

    // Tampilkan nama user di header
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
      const roleIcon = { 'admin': '👑', 'kepala': '👑', 'wakil': '⭐', 'guru': '👨‍🏫' }[currentUserRole] || '👨‍🏫';
      userDisplay.innerHTML = `<div style="font-weight:700;color:#334155;font-size:0.95rem;">${roleIcon} Hi, ${currentUser}</div>`;
    }

    // Set tanggal hari ini
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
      currentDateEl.textContent = '📅 ' + new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
    }

    // Listener RTDB dengan retry otomatis
    let sudahRetry = false;

    const pasangListener = () => {
      ROOT.on('value', snap => {
        const rawData = snap.val() || {};
        allData = [];

        // 1. Ambil Data Kelas dari folder 'classes'
        if (rawData.classes) {
          Object.keys(rawData.classes).forEach(key => {
            allData.push({ __key: key, type: 'class', ...rawData.classes[key] });
          });
        }

        // 2. Ambil Data Siswa dari folder 'students'
        if (rawData.students) {
          Object.keys(rawData.students).forEach(key => {
            allData.push({ __key: key, type: 'student', ...rawData.students[key] });
          });
        }

        // 3. Ambil Data Absensi dari folder 'attendance_logs'
        if (rawData.attendance_logs) {
          Object.keys(rawData.attendance_logs).forEach(key => {
            allData.push({ __key: key, type: 'attendance_log', ...rawData.attendance_logs[key] });
          });
        }

        // 4. Backward Compatibility: Tetap baca data lama jika ada yang belum masuk folder
        Object.keys(rawData).forEach(key => {
          if (!['classes', 'students', 'attendance_logs'].includes(key) && typeof rawData[key] === 'object' && rawData[key] !== null) {
            allData.push({ __key: key, ...rawData[key] });
          }
        });

        hideAuthLoading();
        window.renderActive();
        
        const modalSiswa = document.getElementById('modalKelolaSwiswa');
        if (modalSiswa && modalSiswa.classList.contains('active') && currentManajeKelas) {
          if (typeof window.renderSiswaModal === 'function') {
            window.renderSiswaModal(currentManajeKelas);
          }
        }
      }, async err => {
        console.error('❌ Error listener RTDB:', err);

        if (err.code === 'PERMISSION_DENIED' && !sudahRetry) {
          sudahRetry = true;
          console.warn('🔁 Token belum siap. Memaksa refresh token & memasang ulang listener...');
          try {
            const u = firebase.auth().currentUser;
            if (u) await u.getIdToken(true);
            ROOT.off('value');
            setTimeout(pasangListener, 500);
            return;
          } catch (e) {
            console.error('Gagal refresh token:', e);
          }
        }

        hideAuthLoading();
        if (err.code === 'PERMISSION_DENIED') {
          window.toast('❌ Akses ditolak. Sesi tidak valid. Login ulang.', 'err');
          setTimeout(() => window.location.href = '../index.html', 2000);
        } else {
          window.toast('Gagal terhubung ke database: ' + err.message, 'err');
        }
      });
    };

    // Refresh token sebelum listener dipasang
    (async () => {
      try { 
        await user.getIdToken(true); 
      } catch (e) {}
      pasangListener();
    })();

    console.log('🔐 Auth Info:', {
      email: currentUserEmail,
      displayName: currentUser,
      role: currentUserRole,
      uid: user.uid
    });

    if (typeof window.bindEvents === 'function') window.bindEvents();
    window.showContent('kelola-kelas');
  });
};

window.addEventListener('load', window.initApp);