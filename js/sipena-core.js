// ══════════════════════════════════════════════
// SIPENA CORE: Firebase Init, State & Helpers
// Adapter Firestore v3 + KUNCI DATA = EMAIL
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
// ADAPTER FIRESTORE v3 (FULL RTDB COMPATIBLE)
// ══════════════════════════════════════════════
function clean(obj) {
  const o = {};
  for (const k in obj) { if (obj[k] !== undefined) o[k] = obj[k]; }
  return o;
}

const BASE_COL = 'sipena2';

function makeSnap(key, value) {
  return {
    key: key,
    val: function () { return value === undefined ? null : value; },
    exists: function () { return value !== null && value !== undefined; },
    numChildren: function () { return (value && typeof value === 'object') ? Object.keys(value).length : 0; },
    child: function (p) {
      let v = value;
      const parts = String(p).split('/');
      for (let i = 0; i < parts.length; i++) v = (v && typeof v === 'object') ? v[parts[i]] : undefined;
      return makeSnap(String(p), v);
    },
    forEach: function (cb) {
      if (!value || typeof value !== 'object') return false;
      const keys = Object.keys(value);
      for (let i = 0; i < keys.length; i++) {
        if (cb(makeSnap(keys[i], value[keys[i]])) === true) return true;
      }
      return false;
    }
  };
}

function buildResult(snap) {
  const result = {};
  snap.forEach(function (d) {
    const data = d.data();
    if (data && data.__folder) {
      if (!result[data.__folder]) result[data.__folder] = {};
      const copy = Object.assign({}, data);
      delete copy.__folder;
      result[data.__folder][d.id] = copy;
    } else {
      result[d.id] = data;
    }
  });
  return result;
}

function normErr(err) {
  const code = (err && err.code) || '';
  if (code === 'permission-denied') return { code: 'PERMISSION_DENIED', message: err.message };
  return err;
}

function createRef(path) {
  return {
    _path: path || '',

    get key() { const p = this._path.split('/'); return p[p.length - 1] || BASE_COL; },

    child: function (s) { return createRef(this._path ? this._path + '/' + s : String(s)); },

    push: function () {
      const id = firestore.collection(BASE_COL).doc().id;
      return createRef(this._path ? this._path + '/' + id : id);
    },

    set: function (obj) {
      const parts = this._path.split('/');
      if (parts.length === 1) return firestore.collection(BASE_COL).doc(parts[0]).set(clean(obj));
      return firestore.collection(BASE_COL).doc(parts[1]).set(Object.assign({}, clean(obj), { __folder: parts[0] }));
    },

    update: function (obj) {
      const parts = this._path.split('/');
      if (parts.length === 1) return firestore.collection(BASE_COL).doc(parts[0]).set(clean(obj), { merge: true });
      return firestore.collection(BASE_COL).doc(parts[1]).set(Object.assign({}, clean(obj), { __folder: parts[0] }), { merge: true });
    },

    remove: function () {
      const parts = this._path.split('/');
      return firestore.collection(BASE_COL).doc(parts.length === 1 ? parts[0] : parts[1]).delete();
    },

    on: function (event, cb, errCb) {
      const self = this;
      this._unsub = firestore.collection(BASE_COL).onSnapshot(function (snap) {
        cb(makeSnap(self._path, (function (tree) {
          if (!self._path) return tree;
          let v = tree;
          const parts = self._path.split('/');
          for (let i = 0; i < parts.length; i++) v = (v && typeof v === 'object') ? v[parts[i]] : undefined;
          return v === undefined ? null : v;
        })(buildResult(snap))));
      }, function (err) { if (errCb) errCb(normErr(err)); else console.error(err); });
    },

    off: function () { if (this._unsub) { this._unsub(); this._unsub = null; } },

    once: function (event, cb, errCb) {
      const self = this;
      return firestore.collection(BASE_COL).get().then(function (snap) {
        let tree = buildResult(snap);
        if (self._path) {
          const parts = self._path.split('/');
          for (let i = 0; i < parts.length; i++) tree = (tree && typeof tree === 'object') ? tree[parts[i]] : undefined;
          tree = tree === undefined ? null : tree;
        }
        const s = makeSnap(self._path, tree);
        if (cb) cb(s);
        return s;
      }).catch(function (err) {
        const e = normErr(err);
        if (errCb) errCb(e); else console.error(e);
        return null;
      });
    }
  };
}

const ROOT = createRef('');

// ══════════════════════════════════════════════
// GLOBAL STATE
// ══════════════════════════════════════════════
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

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
window.toArr = function (val) { return val ? Object.keys(val).map(function (k) { return Object.assign({ __key: k }, val[k]); }) : []; };
window.nowISO = function () { return new Date().toISOString(); };
window.todayStr = function () { return new Date().toISOString().split('T')[0]; };

window.toast = function (msg, type) {
  type = type || 'ok';
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;padding:13px 20px;border-radius:10px;font-weight:700;font-size:0.88rem;background:' + (type === 'ok' ? '#10b981' : '#ef4444') + ';color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.2);';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.style.opacity = '0'; }, 2500);
  setTimeout(function () { t.remove(); }, 2900);
};

window.openModal = function (id) { document.getElementById(id).classList.add('active'); };
window.closeModal = function (id) { document.getElementById(id).classList.remove('active'); };

window.setMenuActive = function (target) {
  document.querySelectorAll('.menu-card').forEach(function (c) { c.classList.remove('active-menu'); });
  const card = document.querySelector('.menu-card[data-target="' + target + '"]');
  if (card) card.classList.add('active-menu');
};

window.showContent = function (id) {
  document.querySelectorAll('.content-area').forEach(function (a) { a.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  window.setMenuActive(id);
  window.renderActive();
};

window.renderActive = function () {
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
    loading.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#f8fafc;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;';
    document.body.appendChild(loading);
  }
  loading.innerHTML = '<div style="text-align:center;">' +
    '<div style="font-size:3rem;margin-bottom:15px;">🔐</div>' +
    '<div style="font-weight:700;color:#1e293b;font-size:1.1rem;margin-bottom:8px;">Memverifikasi Login...</div>' +
    '<div style="color:#64748b;font-size:0.9rem;">' + msg + '</div></div>';
}

function hideAuthLoading() {
  const el = document.getElementById('authLoadingScreen');
  if (el) el.remove();
}

// ══════════════════════════════════════════════
// INIT APP
// ══════════════════════════════════════════════
window.initApp = function () {
  showAuthLoading('Mohon tunggu sebentar...');

  firebase.auth().onAuthStateChanged(function (user) {
    if (!user) {
      console.warn('⚠️ Tidak terautentikasi. Mengalihkan ke login...');
      hideAuthLoading();
      window.toast('⚠️ Sesi berakhir. Silakan login ulang.', 'err');
      setTimeout(function () { window.location.href = '../home.html'; }, 1500);
      return;
    }

    console.log('✅ Auth siap:', user.email);
    currentUserEmail = user.email;

    let userData = null;
    try {
      const s = localStorage.getItem('sipelita_user');
      if (s) userData = JSON.parse(s);
    } catch (e) {}

    // ✅ KUNCI DATA = EMAIL (tahan ganti nama/typo/gelar)
    currentUser = user.email;
    window.displayName = (userData && userData.nama) ? userData.nama : user.email;
    currentUserRole = (userData && userData.role) ? userData.role : 'guru';

    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
      const icons = { 'admin': '👑', 'kepala': '👑', 'wakil': '⭐', 'guru': '👨‍🏫' };
      const roleIcon = icons[currentUserRole] || '👨‍';
      userDisplay.innerHTML = '<div style="font-weight:700;color:#334155;font-size:0.95rem;">' + roleIcon + ' Hi, ' + window.displayName + '</div>';
    }

    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
      currentDateEl.textContent = '📅 ' + new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    let sudahRetry = false;

    const pasangListener = function () {
      ROOT.on('value', function (snap) {
        const rawData = snap.val() || {};
        allData = [];

        if (rawData.classes) {
          Object.keys(rawData.classes).forEach(function (key) {
            allData.push(Object.assign({ __key: key, type: 'class' }, rawData.classes[key]));
          });
        }
        if (rawData.students) {
          Object.keys(rawData.students).forEach(function (key) {
            allData.push(Object.assign({ __key: key, type: 'student' }, rawData.students[key]));
          });
        }
        if (rawData.attendance_logs) {
          Object.keys(rawData.attendance_logs).forEach(function (key) {
            allData.push(Object.assign({ __key: key, type: 'attendance_log' }, rawData.attendance_logs[key]));
          });
        }
        Object.keys(rawData).forEach(function (key) {
          if (['classes', 'students', 'attendance_logs'].indexOf(key) === -1 && typeof rawData[key] === 'object' && rawData[key] !== null) {
            allData.push(Object.assign({ __key: key }, rawData[key]));
          }
        });

        hideAuthLoading();
        window.renderActive();

        const modalSiswa = document.getElementById('modalKelolaSwiswa');
        if (modalSiswa && modalSiswa.classList.contains('active') && currentManajeKelas) {
          if (typeof window.renderSiswaModal === 'function') window.renderSiswaModal(currentManajeKelas);
        }
      }, async function (err) {
        console.error('❌ Error listener:', err);

        if (err.code === 'PERMISSION_DENIED' && !sudahRetry) {
          sudahRetry = true;
          try {
            const u = firebase.auth().currentUser;
            if (u) await u.getIdToken(true);
            ROOT.off('value');
            setTimeout(pasangListener, 500);
            return;
          } catch (e) { console.error('Gagal refresh token:', e); }
        }

        hideAuthLoading();
        if (err.code === 'PERMISSION_DENIED') {
          window.toast('❌ Akses ditolak. Sesi tidak valid. Login ulang.', 'err');
          setTimeout(function () { window.location.href = '../home.html'; }, 2000);
        } else {
          window.toast('Gagal terhubung ke database: ' + err.message, 'err');
        }
      });
    };

    (async function () {
      try { await user.getIdToken(true); } catch (e) {}
      pasangListener();
    })();

    console.log('🔐 Auth Info:', { email: currentUserEmail, displayName: window.displayName, role: currentUserRole, uid: user.uid });

    if (typeof window.bindEvents === 'function') window.bindEvents();
    window.showContent('kelola-kelas');
  });
};

window.addEventListener('load', window.initApp);