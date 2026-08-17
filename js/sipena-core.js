// ══════════════════════════════════════════════
// SIPENA CORE: Firebase Init, State & Helpers
// Versi Multi-Domain Ready dengan Adapter Firestore v2
// ══════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyAlVg1QKRP-1sDJmlA-YFEfHLKqhT5OzBY",
  authDomain: "sipelita-guru.firebaseapp.com",
  databaseURL: "https://sipelita-guru-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sipelita-guru",
  storageBucket: "sipelita-guru.firebasestorage.app",
  messagingSenderId: "595996765157",
  appId: "1:595996765157:web:88f7f03489e1d1248e9d0c"
};

firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();

// ══════════════════════════════════════════════
// ADAPTER FIRESTORE v2 (Recursive)
// Mendukung ROOT.child('x').push().set(...)
// Semua data masuk ke collection 'sipena2' + penanda __folder
// ══════════════════════════════════════════════
function clean(obj) {
  const o = {};
  for (const k in obj) { if (obj[k] !== undefined) o[k] = obj[k]; }
  return o;
}

const BASE_COL = 'sipena2';

function createRef(path) {
  return {
    _path: path || '',

    child(sub) {
      return createRef(this._path ? this._path + '/' + sub : String(sub));
    },

    push() {
      const newId = firestore.collection(BASE_COL).doc().id;
      return createRef(this._path ? this._path + '/' + newId : newId);
    },

    set(obj) {
      const parts = this._path.split('/');
      if (parts.length === 1) {
        return firestore.collection(BASE_COL).doc(parts[0]).set(clean(obj));
      }
      const [folder, id] = parts;
      return firestore.collection(BASE_COL).doc(id).set({ ...clean(obj), __folder: folder });
    },

    update(obj) {
      const parts = this._path.split('/');
      if (parts.length === 1) {
        return firestore.collection(BASE_COL).doc(parts[0]).set(clean(obj), { merge: true });
      }
      const [folder, id] = parts;
      return firestore.collection(BASE_COL).doc(id).set({ ...clean(obj), __folder: folder }, { merge: true });
    },

    remove() {
      const parts = this._path.split('/');
      const id = parts.length === 1 ? parts[0] : parts[1];
      return firestore.collection(BASE_COL).doc(id).delete();
    },

    on(event, cb, errCb) {
      this._unsub = firestore.collection(BASE_COL).onSnapshot(snap => {
        const result = {};
        snap.forEach(d => {
          const data = d.data();
          if (data && data.__folder) {
            if (!result[data.__folder]) result[data.__folder] = {};
            const copy = { ...data };
            delete copy.__folder;
            result[data.__folder][d.id] = copy;
          } else {
            result[d.id] = data;
          }
        });
        cb({ val: () => result });
      }, err => { if (errCb) errCb(err); else console.error(err); });
    },

    off() {
      if (this._unsub) { this._unsub(); this._unsub = null; }
    }
  };
}

const ROOT = createRef('');

// Global State
let currentUser = '';
let currentUserEmail = '';
let currentUserRole = 'guru';
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

window.initApp = () => {
  showAuthLoading('Mohon tunggu sebentar...');

  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      console.warn('⚠️ Tidak terautentikasi via Firebase Auth. Mengalihkan ke login...');
      hideAuthLoading();
      window.toast('⚠️ Sesi berakhir. Silakan login ulang.', 'err');
      setTimeout(() => {
        window.location.href = '../home.html';
      }, 1500);
      return;
    }

    console.log('✅ Auth siap:', user.email);
    currentUserEmail = user.email;

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

    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
      const roleIcon = { 'admin': '👑', 'kepala': '👑', 'wakil': '⭐', 'guru': '👨‍🏫' }[currentUserRole] || '👨‍🏫';
      userDisplay.innerHTML = `<div style="font-weight:700;color:#334155;font-size:0.95rem;">${roleIcon} Hi, ${currentUser}</div>`;
    }

    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
      currentDateEl.textContent = '📅 ' + new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
    }

    let sudahRetry = false;

    const pasangListener = () => {
      ROOT.on('value', snap => {
        const rawData = snap.val() || {};
        allData = [];

        if (rawData.classes) {
          Object.keys(rawData.classes).forEach(key => {
            allData.push({ __key: key, type: 'class', ...rawData.classes[key] });
          });
        }

        if (rawData.students) {
          Object.keys(rawData.students).forEach(key => {
            allData.push({ __key: key, type: 'student', ...rawData.students[key] });
          });
        }

        if (rawData.attendance_logs) {
          Object.keys(rawData.attendance_logs).forEach(key => {
            allData.push({ __key: key, type: 'attendance_log', ...rawData.attendance_logs[key] });
          });
        }

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
          setTimeout(() => window.location.href = '../home.html', 2000);
        } else {
          window.toast('Gagal terhubung ke database: ' + err.message, 'err');
        }
      });
    };

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