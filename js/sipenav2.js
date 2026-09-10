// ══════════════════════════════════════════════
// SIPENA 2.0 - MAIN JAVASCRIPT (VERSI LENGKAP)
// ══════════════════════════════════════════════

// 1. Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAlVg1QKRP-1sDJmlA-YFEfHLKqhT5OzBY",
  authDomain: "sipelita-guru.firebaseapp.com",
  projectId: "sipelita-guru",
  storageBucket: "sipelita-guru.firebasestorage.app",
  messagingSenderId: "595996765157",
  appId: "1:595996765157:web:88f7f03489e1d1248e9d0c",
  measurementId: "G-ZGT7K2N7L5"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Helper function untuk getElementById
const $ = id => document.getElementById(id);

// ══════════════════════════════════════════════
// ✏️ KONFIGURASI MADRASAH (KOP & TTD PDF)
// ══════════════════════════════════════════════
const CONFIG_MADRASAH = {
  logo: '',   // kosong = pakai logo default /assets/images/kemenag-app.png
  kop1: 'KEMENTERIAN AGAMA KABUPATEN BANTAENG',
  kop2: 'MAN BANTAENG',
  alamat: 'Jl. Poros Dampang Kel. Gantarangkeke Kab. Bantaeng',
  kota: 'Bantaeng',
  kepalaMadrasah: '................................................',
  nipKepala: 'NIP. ............................................'
};

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const STATUS_INFO = {
  H: { label: 'Hadir', color: '#10b981' },
  I: { label: 'Izin',  color: '#3b82f6' },
  S: { label: 'Sakit', color: '#f59e0b' },
  A: { label: 'Alpa',  color: '#ef4444' },
  B: { label: 'Bolos', color: '#8b5cf6' }
};

const FORMAT_NAMA = {
  guru: 'upper',
  kepala: 'upper'
};

const GELAR_BAKU = ['S.Pd','M.Pd','S.Ag','M.Ag','S.Pd.I','M.Pd.I','S.Sos','M.Sos','S.Kom','M.Kom',
  'S.E','M.M','MM','S.S','M.Hum','S.Mat','M.Mat','S.T','M.T','S.H','M.H','S.Psi','M.Psi','S.IP','M.AP',
  'Dra','Drs','Dr','Prof','H','Hj'];

function rapikanGelar(token) {
  let t = token.trim();
  if (!t) return '';
  const adaTitikAkhir = t.endsWith('.');
  const clean = t.replace(/\.+$/, '');
  const found = GELAR_BAKU.find(g => g.toLowerCase() === clean.toLowerCase());
  if (found) return found + (adaTitikAkhir ? '.' : '');
  if (clean.includes('.')) {
    return clean.split('.').map(seg =>
      seg.length <= 1 ? seg.toUpperCase() : seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase()
    ).join('.');
  }
  return clean.length <= 2 ? clean.toUpperCase() : clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function formatNamaGelar(text) {
  if (!text) return '';
  const parts = text.split(',');
  const GELAR_DEPAN = ['Drs','Dra','Dr','Prof','H','Hj','Ir','KH'];
  let tokens = parts[0].trim().split(/\s+/);
  const depan = [];
  while (tokens.length) {
    const t = tokens[0].replace(/\.+$/, '');
    const m = GELAR_DEPAN.find(g => g.toLowerCase() === t.toLowerCase());
    if (m) { depan.push(m + '.'); tokens.shift(); } else break;
  }
  const namaInti = tokens.join(' ').toUpperCase();
  const belakang = parts.slice(1).map(rapikanGelar).filter(Boolean).join(',');
  let hasil = (depan.length ? depan.join(' ') + ' ' : '') + namaInti;
  if (belakang) hasil += ', ' + belakang;
  return hasil;
}

function formatKapital(text, mode) {
  if (!text) return '';
  if (mode === 'upper') return formatNamaGelar(text);
  if (mode === 'lower') return text.toLowerCase();
  if (mode === 'title') return text.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
  return text;
}

// 2. State Global
let currentUser = null;
let currentUserData = null;
let currentKelasId = null;
let currentKelasNama = '';
let fotoSiswaBase64 = '';
let editFotoBase64 = '';
let editFotoExisting = '';
let rekapDataCache = null;
let currentPresensiData = {};
let currentSiswaList = [];

// ══════════════════════════════════════════════
// 3. HANDLE UPLOAD FOTO
// ══════════════════════════════════════════════
function handleFotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 2 * 1024 * 1024) {
    showToast('❌ Ukuran foto maksimal 2MB!', 'error');
    return;
  }
  if (!file.type.startsWith('image/')) {
    showToast('❌ File harus berupa gambar!', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    fotoSiswaBase64 = e.target.result;
    document.getElementById('fotoPreview').src = fotoSiswaBase64;
    document.getElementById('fotoPreviewContainer').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function hapusFotoPreview() {
  fotoSiswaBase64 = '';
  document.getElementById('inputFotoSiswaFile').value = '';
  document.getElementById('fotoPreviewContainer').style.display = 'none';
  document.getElementById('fotoPreview').src = '';
}

// ══════════════════════════════════════════════
// 4. SEAMLESS LOGIN & SAPAAN
// ══════════════════════════════════════════════
async function initSession() {
  const greetingEl = document.getElementById('userGreeting');
  if (greetingEl) greetingEl.textContent = 'Memverifikasi sesi...';

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      
      const storedUser = localStorage.getItem('sipelita_user');
      if (storedUser) {
        try {
          currentUserData = JSON.parse(storedUser);
          currentUserData.uid = user.uid;
          currentUserData.email = user.email;
        } catch (e) {
          currentUserData = {
            uid: user.uid,
            email: user.email,
            nama: user.displayName || user.email.split('@')[0],
            role: 'guru'
          };
        }
      } else {
        currentUserData = {
          uid: user.uid,
          email: user.email,
          nama: user.displayName || user.email.split('@')[0],
          role: 'guru'
        };
      }
      
      localStorage.setItem('sipelita_user', JSON.stringify(currentUserData));
      
      await fetchNipUser();
      await fetchKepalaMadrasah();
      await fetchIdentitasSekolah();
      await fetchSekolahAktif(); 

      updateGreeting();
      applyRoleRestrictions();
      if (isRoleKepala()) {
        loadPage('rekap-jurnal');
        const target = document.querySelector('.nav-item[data-page="rekap-jurnal"]');
        if (target) {
          target.classList.add('active');
          const parent = target.closest('.nav-parent');
          if (parent) parent.classList.add('open');
        }
      } else {
        loadPage('dashboard');
      }
    } else {
      console.warn('⚠️ Sesi Firebase tidak ditemukan. Mengarahkan ke login...');
      localStorage.removeItem('sipelita_user');
      redirectToLogin();
    }
  });
}

function updateGreeting() {
  const greetingEl = document.getElementById('userGreeting');
  if (greetingEl && currentUserData) {
    const nama = currentUserData.nama || currentUserData.name || 'Bapak/Ibu Guru';
    const jam = new Date().getHours();
    let sapaanWaktu = 'Selamat Pagi';
    if (jam >= 11 && jam < 15) sapaanWaktu = 'Selamat Siang';
    else if (jam >= 15 && jam < 18) sapaanWaktu = 'Selamat Sore';
    else if (jam >= 18) sapaanWaktu = 'Selamat Malam';
    greetingEl.textContent = `${sapaanWaktu}, ${nama} 👋`;
  }
}

// ══════════════════════════════════════════════
// FETCH NIP & DATA KEPALA MADRASAH DARI FIRESTORE
// ══════════════════════════════════════════════
async function fetchNipUser() {
  if (!currentUser) return;
  try {
    let data = null;

    let snap = await db.collection('users').doc(currentUser.uid).get();
    if (snap.exists) data = snap.data();

    if (!data) {
      snap = await db.collection('users').doc(currentUser.email).get();
      if (snap.exists) data = snap.data();
    }

    if (!data) {
      const q1 = await db.collection('users').where('uid', '==', currentUser.uid).limit(1).get();
      q1.forEach(d => { if (!data) data = d.data(); });
    }
    if (!data) {
      const q2 = await db.collection('users').where('email', '==', currentUser.email).limit(1).get();
      q2.forEach(d => { if (!data) data = d.data(); });
    }

    if (data) {
      const nip = data.nip || data.NIP || data.Nip || '';
      currentUserData.nip = nip;
      if (data.role) currentUserData.role = data.role;
      if (data.school_id || data.sekolah_id) currentUserData.school_id = data.school_id || data.sekolah_id;
      if (data.nama || data.name || data.displayName) {
        currentUserData.namaResmi = data.nama || data.name || data.displayName;
      }
      localStorage.setItem('sipelita_user', JSON.stringify(currentUserData));
      console.log('✅ Data user dimuat:', currentUserData.namaResmi, '| NIP:', nip || '(kosong)');
    }
  } catch (error) {
    console.warn('⚠️ Gagal mengambil data user:', error.message);
  }
}

async function fetchKepalaMadrasah() {
  try {
    const usersSnap = await db.collection('users').get();
    let kepalaData = null;
    
    usersSnap.forEach(doc => {
      const data = doc.data();
      const role = (data.role || '').toString().toLowerCase();
      if (role.includes('kepala')) {
        kepalaData = {
          nama: data.nama || data.name || data.displayName || CONFIG_MADRASAH.kepalaMadrasah,
          nip: data.nip || data.NIP || data.Nip || CONFIG_MADRASAH.nipKepala
        };
      }
    });
    
    if (kepalaData) {
      CONFIG_MADRASAH.kepalaMadrasah = kepalaData.nama;
      CONFIG_MADRASAH.nipKepala = kepalaData.nip.startsWith('NIP.') 
        ? kepalaData.nip 
        : (kepalaData.nip ? 'NIP. ' + kepalaData.nip : 'NIP. ............................................');
      
      console.log('✅ Data Kepala Madrasah dimuat:', kepalaData.nama);
    }
  } catch (error) {
    console.warn('⚠️ Gagal mengambil data Kepala Madrasah dari users:', error.message);
  }
}

// ══════════════════════════════════════════════
// 🏫 SIG: MUAT IDENTITAS
// ══════════════════════════════════════════════
function loadSIGToForm() {
  if (typeof $ !== 'function') return;
  if ($('sig_kop1')) $('sig_kop1').value = CONFIG_MADRASAH.kop1 || '';
  if ($('sig_kop2')) $('sig_kop2').value = CONFIG_MADRASAH.kop2 || '';
  if ($('sig_alamat')) $('sig_alamat').value = CONFIG_MADRASAH.alamat || '';
  if ($('sig_kota')) $('sig_kota').value = CONFIG_MADRASAH.kota || '';
  if ($('sig_kepala')) $('sig_kepala').value = CONFIG_MADRASAH.kepalaMadrasah || '';
  if ($('sig_nip')) $('sig_nip').value = (CONFIG_MADRASAH.nipKepala || '').replace(/^NIP\.\s*/i, '').trim();
}

function ekstrakSIG(d) {
  const hasil = { kota:'', kepala:'', nip:'', kop1:'', kop2:'', alamat:'' };
  if (!d || typeof d !== 'object') return hasil;

  if (d.kop1) hasil.kop1 = String(d.kop1).trim();
  if (d.kop2) hasil.kop2 = String(d.kop2).trim();
  if (d.alamat) hasil.alamat = String(d.alamat).trim();
  if (d.kota) hasil.kota = String(d.kota).trim();

  if (d.kepala) hasil.kepala = String(d.kepala).trim();
  else if (d.kamad) hasil.kepala = String(d.kamad).trim();
  else if (d.kepala_nama) hasil.kepala = String(d.kepala_nama).trim();
  else if (d.nama_kepala) hasil.kepala = String(d.nama_kepala).trim();

  if (d.nip) hasil.nip = String(d.nip).trim();
  else if (d.nip_kepala) hasil.nip = String(d.nip_kepala).trim();
  else if (d.kepala_nip) hasil.nip = String(d.kepala_nip).trim();

  for (const [k, v] of Object.entries(d)) {
    if (typeof v !== 'string' || !v.trim()) continue;
    const val = v.trim();
    const key = k.toLowerCase();
    const isKepalaKey = key.includes('kamad') || key.includes('kepala') || key.includes('kepsek');

    if (!hasil.kota && (key.includes('kota') || key.includes('tempat'))) hasil.kota = val;
    if (!hasil.nip && key.includes('nip')) hasil.nip = val;

    const isRoleName = val.toLowerCase() === 'kepala' || 
                       val.toLowerCase().includes('kepala madrasah') || 
                       val.toLowerCase().includes('kepala sekolah');
                       
    if (!hasil.kepala && isKepalaKey && !key.includes('nip') && !key.includes('link') && !val.includes('@') && !isRoleName) {
      hasil.kepala = val;
    }

    if (!hasil.kop1 && key === 'kop1') hasil.kop1 = val;
    if (!hasil.kop2 && (key === 'kop2' || ((key.includes('madrasah') || key.includes('sekolah')) && key.includes('nama')))) hasil.kop2 = val;
    if (!hasil.alamat && key.includes('alamat')) hasil.alamat = val;
  }
  return hasil;
}

async function fetchIdentitasSekolah() {
  if (!currentUser) return;
  const sumber = [];

  const cols = ['identitas_madrasah', 'sekolah', 'sipena2', 'pengaturan', 'settings', 'config', 'sig'];
  for (const c of cols) {
    try { const a = await db.collection(c).doc(currentUser.uid).get(); if (a.exists) sumber.push(a.data()); } catch (e) {}
    try { const b = await db.collection(c).doc(currentUser.email).get(); if (b.exists) sumber.push(b.data()); } catch (e) {}
    try { const q = await db.collection(c).where('uid', '==', currentUser.uid).limit(1).get(); q.forEach(d => sumber.push(d.data())); } catch (e) {}
    try { const q = await db.collection(c).where('email', '==', currentUser.email).limit(1).get(); q.forEach(d => sumber.push(d.data())); } catch (e) {}
  }
  try {
    const g = await db.collection('identitas_madrasah').limit(1).get();
    g.forEach(d => sumber.push(d.data()));
  } catch (e) {}

  try {
    const u1 = await db.collection('users').doc(currentUser.uid).get();
    if (u1.exists) sumber.push(u1.data());
    else {
      const u2 = await db.collection('users').doc(currentUser.email).get();
      if (u2.exists) sumber.push(u2.data());
    }
  } catch (e) {}

  if (currentUserData.school_id) {
    try {
      const s = await db.collection('sekolah').doc(currentUserData.school_id).get();
      if (s.exists) sumber.push(s.data());
    } catch (e) {}
  }

  try {
    const userSig = await db.collection('pengaturan_user').doc(currentUser.email).get();
    if (userSig.exists) {
      sumber.push(userSig.data());
    }
  } catch (e) { 
    console.warn('⚠️ Gagal cek pengaturan_user:', e.message); 
  }

  let ketemu = false, kop1Explicit = false;
  
  for (const d of sumber) {
    const x = ekstrakSIG(d);
    if (x.kota)   { CONFIG_MADRASAH.kota = x.kota; ketemu = true; }
    if (x.kepala) { CONFIG_MADRASAH.kepalaMadrasah = x.kepala; ketemu = true; }
    if (x.nip)    { CONFIG_MADRASAH.nipKepala = x.nip.startsWith('NIP.') ? x.nip : 'NIP. ' + x.nip; ketemu = true; }
    if (x.kop1)   { CONFIG_MADRASAH.kop1 = x.kop1; kop1Explicit = true; ketemu = true; }
    if (x.kop2)   { CONFIG_MADRASAH.kop2 = x.kop2; ketemu = true; }
    if (x.alamat) { CONFIG_MADRASAH.alamat = x.alamat; ketemu = true; }
  }

  if (ketemu && !kop1Explicit && CONFIG_MADRASAH.kota) {
    CONFIG_MADRASAH.kop1 = 'KEMENTERIAN AGAMA KABUPATEN ' + CONFIG_MADRASAH.kota.toUpperCase();
  }

  loadSIGToForm();
}

async function simpanSIG() {
  if (!currentUser) {
    showToast('⚠️ User tidak terautentikasi!', 'error');
    return;
  }

  const kop1 = $('sig_kop1')?.value?.trim() || CONFIG_MADRASAH.kop1;
  const kop2 = $('sig_kop2')?.value?.trim() || CONFIG_MADRASAH.kop2;
  const alamat = $('sig_alamat')?.value?.trim() || CONFIG_MADRASAH.alamat;
  const kota = $('sig_kota')?.value?.trim() || CONFIG_MADRASAH.kota;
  const kepala = $('sig_kepala')?.value?.trim() || CONFIG_MADRASAH.kepalaMadrasah;
  const nipRaw = $('sig_nip')?.value?.trim() || '';
  const nip = nipRaw ? (nipRaw.startsWith('NIP.') ? nipRaw : 'NIP. ' + nipRaw) : CONFIG_MADRASAH.nipKepala;

  try {
    const dataSIG = {
      kop1: kop1,
      kop2: kop2,
      alamat: alamat,
      kota: kota,
      kepala: kepala,
      nip: nip,
      updated_at: new Date().toISOString(),
      updated_by: currentUser.email
    };

    const docRef = db.collection('pengaturan_user').doc(currentUser.email);
    await docRef.set(dataSIG, { merge: true });

    CONFIG_MADRASAH.kop1 = kop1;
    CONFIG_MADRASAH.kop2 = kop2;
    CONFIG_MADRASAH.alamat = alamat;
    CONFIG_MADRASAH.kota = kota;
    CONFIG_MADRASAH.kepalaMadrasah = kepala;
    CONFIG_MADRASAH.nipKepala = nip;

    loadSIGToForm();
    showToast('✅ Data SIG dan KOP berhasil disimpan!');
  } catch (e) {
    console.error('❌ Gagal simpan SIG:', e);
    showToast('❌ Gagal menyimpan: ' + e.message, 'error');
  }
}

async function fetchSekolahAktif() {
  if (!currentUser || !currentUserData.school_id) return;
  
  try {
    const sdoc = await db.collection('sekolah').doc(currentUserData.school_id).get();
    if (!sdoc.exists) return;
    
    const d = sdoc.data();
    if (!CONFIG_MADRASAH.kop1 && d.kop1) CONFIG_MADRASAH.kop1 = d.kop1;
    if (!CONFIG_MADRASAH.kop2 && d.kop2) CONFIG_MADRASAH.kop2 = d.kop2;
    else if (!CONFIG_MADRASAH.kop2 && d.nama) CONFIG_MADRASAH.kop2 = d.nama.toUpperCase();
    if (!CONFIG_MADRASAH.alamat && d.alamat) CONFIG_MADRASAH.alamat = d.alamat;
    if (!CONFIG_MADRASAH.kota && d.kota) CONFIG_MADRASAH.kota = d.kota;
  } catch (e) {
    console.warn('⚠️ fetchSekolahAktif gagal:', e.message);
  }
}

// ══════════════════════════════════════════════
// 5. UI HELPERS
// ══════════════════════════════════════════════
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed; top:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.cssText = `padding: 12px 20px; border-radius: 8px; color: white; background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b'}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;`;
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'exclamation-circle';
  toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function openModal(modalId) { 
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active'); 
}
function closeModal(modalId) { 
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active'); 
}

// SIDEBAR NAVIGATION
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    const page = item.dataset.page;
    if (!page) return;
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    const parent = item.closest('.nav-parent');
    if (parent) parent.classList.add('open');
    
    loadPage(page);
  });
});

document.querySelectorAll('.nav-toggle').forEach(toggle => {
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const parent = toggle.closest('.nav-parent');
    if (parent) {
      document.querySelectorAll('.nav-parent').forEach(p => {
        if (p !== parent) p.classList.remove('open');
      });
      parent.classList.toggle('open');
    }
  });
});

// ══════════════════════════════════════════════
// 6. PAGE RENDERING
// ══════════════════════════════════════════════
const PAGE_TITLES = {
  dashboard:      'Dashboard',
  kelas:          'Kelola Kelas',
  presensi:       'Presensi',
  rekap:          'Presensi',
  penilaian:      'Penilaian',
  'rekap-nilai':  'Penilaian',
  analisis:       'Penilaian',
  'bank-soal':    'Bank Soal',
  jurnal:         'Jurnal Mengajar',
  'rekap-jurnal': 'Jurnal Mengajar'
};

function loadPage(page) {
  const content = document.getElementById('pageContent');
  if (!content) return;

  const statsGrid = document.querySelector('.stats-grid');
  if (statsGrid) {
    statsGrid.style.display = (page === 'dashboard' && !isRoleKepala()) ? 'grid' : 'none';
  }

  const titleEl = document.querySelector('.page-title');
  if (titleEl) titleEl.textContent = PAGE_TITLES[page] || 'Dashboard';

  switch(page) {
    case 'dashboard': content.innerHTML = renderDashboard(); loadStats(); loadJadwalHariIni(); break;
    case 'kelas': content.innerHTML = renderKelas(); loadKelasList(); break;
    case 'presensi': content.innerHTML = renderPresensi(); initPresensiPage(); break;
    case 'penilaian': content.innerHTML = renderPenilaian(); initPenilaianPage(); break;
    case 'rekap': content.innerHTML = renderRekap(); initRekapPage(); break;
    case 'rekap-nilai': content.innerHTML = renderRekapNilai(); initRekapNilaiPage(); break;
    case 'analisis': content.innerHTML = renderAnalisis(); initAnalisisPage(); break;
    case 'bank-soal': content.innerHTML = renderBankSoal(); initBankSoalPage(); break;
    case 'jurnal': content.innerHTML = renderJurnal(); initJurnalPage(); break;
    case 'rekap-jurnal': content.innerHTML = renderRekapJurnal(); initRekapJurnalPage(); break;
  }
}

function renderDashboard() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.25rem; border-radius: var(--radius); box-shadow: var(--shadow); margin-bottom: 1rem;">
      <h3 style="margin-bottom: 1rem; font-size: 1.05rem;">✨ Keunggulan SIPENA 2.0</h3>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.6rem;">
        <div style="display:flex; gap:0.75rem; align-items:flex-start; padding:0.6rem 0.75rem; background:#f8fafc; border-radius:8px;">
          <div style="width:34px;height:34px;border-radius:8px;background:#ecfdf5;color:#059669;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-bolt"></i></div>
          <div>
            <div style="font-weight:700; font-size:0.88rem;">Semua dalam Satu Aplikasi</div>
            <div style="font-size:0.78rem; color:var(--text-secondary);">Presensi, penilaian, rekap, analisis nilai, hingga bank soal — tanpa buka banyak aplikasi.</div>
          </div>
        </div>
        <div style="display:flex; gap:0.75rem; align-items:flex-start; padding:0.6rem 0.75rem; background:#f8fafc; border-radius:8px;">
          <div style="width:34px;height:34px;border-radius:8px;background:#fee2e2;color:#dc2626;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-file-pdf"></i></div>
          <div>
            <div style="font-weight:700; font-size:0.88rem;">Laporan Siap Cetak</div>
            <div style="font-size:0.78rem; color:var(--text-secondary);">Rekap presensi & nilai menjadi PDF resmi berkop madrasah, atau Excel sekali klik.</div>
          </div>
        </div>
        <div style="display:flex; gap:0.75rem; align-items:flex-start; padding:0.6rem 0.75rem; background:#f8fafc; border-radius:8px;">
          <div style="width:34px;height:34px;border-radius:8px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-chart-line"></i></div>
          <div>
            <div style="font-weight:700; font-size:0.88rem;">Analisis Nilai Cerdas</div>
            <div style="font-size:0.78rem; color:var(--text-secondary);">Ketuntasan, daya serap, serta daftar remedial & pengayaan tersaji otomatis.</div>
          </div>
        </div>
        <div style="display:flex; gap:0.75rem; align-items:flex-start; padding:0.6rem 0.75rem; background:#f8fafc; border-radius:8px;">
          <div style="width:34px;height:34px;border-radius:8px;background:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-bell"></i></div>
          <div>
            <div style="font-weight:700; font-size:0.88rem;">Alarm Pengingat Mengajar</div>
            <div style="font-size:0.78rem; color:var(--text-secondary);">Notifikasi & pengingat suara berbunyi sebelum jam mengajar Anda tiba.</div>
          </div>
        </div>
        <div style="display:flex; gap:0.75rem; align-items:flex-start; padding:0.6rem 0.75rem; background:#f8fafc; border-radius:8px;">
          <div style="width:34px;height:34px;border-radius:8px;background:#ede9fe;color:#7c3aed;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-lock"></i></div>
          <div>
            <div style="font-weight:700; font-size:0.88rem;">Data Aman & Privat</div>
            <div style="font-size:0.78rem; color:var(--text-secondary);">Data kelas, presensi, dan nilai hanya dapat diakses oleh guru pemiliknya.</div>
          </div>
        </div>
        <div style="display:flex; gap:0.75rem; align-items:flex-start; padding:0.6rem 0.75rem; background:#f8fafc; border-radius:8px;">
          <div style="width:34px;height:34px;border-radius:8px;background:#cffafe;color:#0891b2;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-mobile-alt"></i></div>
          <div>
            <div style="font-weight:700; font-size:0.88rem;">Nyaman di HP</div>
            <div style="font-size:0.78rem; color:var(--text-secondary);">Seluruh fitur berfungsi penuh di ponsel — absen dan input nilai di mana saja.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="background: var(--bg-card); padding: 1.25rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <h3 style="margin-bottom: 1rem; font-size: 1.05rem;">📅 Jadwal Mengajar Hari Ini</h3>
      <div id="jadwalHariIniArea" style="display:flex; flex-direction:column; gap:0.5rem;">
        <div style="text-align:center; padding:1rem; color:var(--text-secondary);">Memuat jadwal...</div>
      </div>
    </div>

    <div class="card" style="margin-top:1rem; background: var(--bg-card); padding: 1rem 1.25rem; border-radius: var(--radius); box-shadow: var(--shadow); border-left: 4px solid #f59e0b;">
      <span style="font-size:0.88rem; color:#78350f;">💡 <b>Tips:</b> Setelah menginput nilai sumatif, buka menu <b>Penilaian → Analisis Nilai</b> untuk langsung melihat siswa yang perlu remedial — tanpa hitung manual.</span>
    </div>
  `;
}

function renderKelas() {
  return `<div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
      <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700;">🏫 Kelola Kelas</h3>
      <button class="btn btn-primary" onclick="openModal('modalTambahKelas')"><i class="fas fa-plus"></i> Tambah Kelas</button>
    </div>
    <div class="table-container">
      <table>
        <thead><tr><th>Nama Kelas</th><th>Tahun Ajaran</th><th>Jumlah Siswa</th><th>Aksi</th></tr></thead>
        <tbody id="kelasTableBody"><tr><td colspan="4" style="text-align: center;">Memuat data...</td></tr></tbody>
      </table>
    </div>
  </div>`;
}

function renderPresensi() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700;">✅ Presensi Digital</h3>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <select id="presensiKelasSelect" class="form-control" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
            <option value="">-- Pilih Kelas --</option>
          </select>
          <input type="date" id="presensiTanggal" class="form-control" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
        </div>
      </div>

      <div id="presensiActionArea" style="display: none; margin-bottom: 1.5rem; padding: 1rem; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="font-weight: 600; color: #166534;">
            📅 Presensi untuk: <span id="presensiInfoKelas" style="font-weight: 800;"></span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="hadirSemua()"><i class="fas fa-check-double"></i> Hadir Semua</button>
            <button class="btn btn-primary btn-sm" onclick="simpanPresensi()" id="btnSimpanPresensi"><i class="fas fa-save"></i> Simpan Presensi</button>
          </div>
        </div>
      </div>

      <div class="table-container">
        <table id="tabelPresensi" style="width: 100%;">
          <thead>
            <tr>
              <th style="width:40px;">No</th>
              <th style="width:55px;">Foto</th>
              <th>Nama Siswa</th>
              <th style="min-width:260px;">Status Kehadiran</th>
            </tr>
          </thead>
          <tbody id="bodyPresensi">
            <tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Silakan pilih kelas dan tanggal terlebih dahulu.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPenilaian() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700;">⭐ Input Penilaian</h3>
      </div>

      <div style="background: #f0f9ff; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #0ea5e9;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">📚 Kategori Penilaian</label>
            <select id="nilaiKategoriSelect" onchange="updateJenisPenilaian()" class="form-control" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
              <option value="pengetahuan">Pengetahuan</option>
              <option value="keterampilan">Keterampilan</option>
              <option value="sikap">Sikap</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">📝 Jenis Penilaian</label>
            <select id="nilaiJenisSelect" class="form-control" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;"></select>
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">🏫 Kelas</label>
            <select id="nilaiKelasSelect" class="form-control" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
              <option value="">-- Pilih Kelas --</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;"> Keterangan</label>
            <input type="text" id="nilaiNamaInput" placeholder="Contoh: PH Bab 1" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
          </div>
        </div>
        <button class="btn btn-primary" onclick="loadPenilaianSiswa()" style="margin-top: 1rem; width: 100%;">
          <i class="fas fa-search"></i> Muat Data Siswa
        </button>
      </div>

      <div id="nilaiActionArea" style="display: none; margin-bottom: 1.5rem; padding: 1rem; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="font-weight: 600; color: #1e40af;">
            📝 <span id="nilaiInfoKategori"></span>: <span id="nilaiInfoKelas" style="font-weight: 800;"></span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="simpanPenilaian()" id="btnSimpanNilai"><i class="fas fa-save"></i> Simpan Nilai</button>
        </div>
      </div>

      <div class="table-container">
        <table id="tabelNilai" style="width: 100%;">
          <thead>
            <tr>
              <th width="50">No</th>
              <th width="60">Foto</th>
              <th>Nama Siswa</th>
              <th width="200">Nilai / Predikat</th>
              <th width="200">Deskripsi / Catatan</th>
            </tr>
          </thead>
          <tbody id="bodyNilai">
            <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Pilih kategori, jenis, dan kelas, lalu klik "Muat Data Siswa".</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderRekap() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700;">📊 Rekap Presensi</h3>
        <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center;">
          <select id="rekapJenisSelect" onchange="toggleRekapInputs()" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
            <option value="harian">Harian</option>
            <option value="bulanan" selected>Bulanan</option>
            <option value="semester">Semesteran</option>
          </select>
          <select id="rekapKelasSelect" onchange="onRekapKelasChange()" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
            <option value="">-- Pilih Kelas --</option>
          </select>
          <select id="rekapGuruSelect" style="display:none; padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
            <option value="">-- Semua Guru (Gabungan) --</option>
          </select>
          <input type="date" id="rekapTanggal" style="display: none; padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
          <input type="month" id="rekapBulan" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
          <select id="rekapSemesterSelect" style="display: none; padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
            <option value="ganjil">Ganjil</option>
            <option value="genap">Genap</option>
          </select>
          <input type="text" id="rekapTahunAjaran" style="display: none; padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 90px;" value="2026/2027">
          <button class="btn btn-primary btn-sm" onclick="loadRekapData()"><i class="fas fa-search"></i> Tampilkan</button>
        </div>
      </div>

      <div id="rekapSummaryArea" style="display: none; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 1rem; border-radius: 8px;">
          <div style="font-size: 1.5rem; font-weight: 800;" id="rekapNilai1">0</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);" id="rekapLabel1">Total Pertemuan</div>
        </div>
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 1rem; border-radius: 8px;">
          <div style="font-size: 1.5rem; font-weight: 800;" id="rekapNilai2">0%</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);" id="rekapLabel2">Rata-rata Kehadiran</div>
        </div>
        <div style="background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 1rem; border-radius: 8px;">
          <div style="font-size: 1.5rem; font-weight: 800;" id="rekapNilai3">0</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);" id="rekapLabel3">Jumlah Siswa</div>
        </div>
      </div>

      <div class="table-container" id="rekapTableArea">
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          Pilih jenis rekap, kelas, dan periode, lalu klik "Tampilkan".
        </div>
      </div>

      <div style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-secondary);">
        Keterangan: 
        <span style="color:#10b981; font-weight:700;">H</span>=Hadir, 
        <span style="color:#3b82f6; font-weight:700;">I</span>=Izin, 
        <span style="color:#f59e0b; font-weight:700;">S</span>=Sakit, 
        <span style="color:#ef4444; font-weight:700;">A</span>=Alpa, 
        <span style="color:#8b5cf6; font-weight:700;">B</span>=Bolos
      </div>

      <div id="rekapExportArea" style="display: none; margin-top: 1.5rem; gap: 0.75rem; justify-content: flex-end;">
        <button class="btn btn-success btn-sm" onclick="exportRekapCSV()"><i class="fas fa-file-csv"></i> Export CSV (Excel)</button>
        <button class="btn btn-secondary btn-sm" onclick="cetakRekap()"><i class="fas fa-print"></i> Cetak PDF (Berkop)</button>
      </div>
    </div>
  `;
}

function renderRekapNilai() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">📊 Rekap Nilai Siswa</h3>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
        <select id="rekapNilaiKelasSelect" class="form-control" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
          <option value="">-- Pilih Kelas --</option>
        </select>
        <button class="btn btn-primary" onclick="loadRekapNilaiData()"><i class="fas fa-search"></i> Tampilkan Rekap Nilai</button>
      </div>
      <div id="rekapNilaiTableArea" class="table-container">
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Pilih kelas untuk melihat rekapitulasi nilai.</div>
      </div>
    </div>
  `;
}

function renderAnalisis() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">📈 Analisis Ketuntasan & Daya Serap</h3>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
        <select id="analisisKelasSelect" class="form-control" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
          <option value="">-- Pilih Kelas --</option>
        </select>
        <input type="number" id="analisisKKM" class="form-control" placeholder="KKM (misal: 75)" value="75" style="width: 120px; padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px;">
        <button class="btn btn-primary" onclick="loadAnalisisData()"><i class="fas fa-chart-pie"></i> Analisis</button>
      </div>
      <div id="analisisResultArea">
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Pilih kelas dan tentukan KKM untuk memulai analisis.</div>
      </div>
    </div>
  `;
}

function renderBankSoal() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700;">📂 Bank Soal</h3>
        <button class="btn btn-primary" onclick="openModal('modalTambahSoal')"><i class="fas fa-plus"></i> Buat Soal Baru</button>
      </div>
      <div id="bankSoalList">
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Memuat daftar bank soal...</div>
      </div>
    </div>
  `;
}

function renderJurnal() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">📖 Jurnal Mengajar Harian</h3>
      <form id="formJurnal" onsubmit="simpanJurnal(event)" style="display: grid; gap: 1rem; max-width: 800px; margin-bottom: 2rem; background: #f8fafc; padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div>
            <label style="font-weight:600; font-size:0.88rem;">Tanggal</label>
            <input type="date" id="jurnalTanggal" class="form-control" required style="padding:0.5rem; border:1px solid var(--border); border-radius:6px; width:100%;">
          </div>
          <div>
            <label style="font-weight:600; font-size:0.88rem;">Kelas</label>
            <select id="jurnalKelasSelect" class="form-control" required style="padding:0.5rem; border:1px solid var(--border); border-radius:6px; width:100%;">
              <option value="">-- Pilih Kelas --</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600; font-size:0.88rem;">Jam Ke-</label>
            <input type="text" id="jurnalJamKe" placeholder="misal: 1 - 2" class="form-control" required style="padding:0.5rem; border:1px solid var(--border); border-radius:6px; width:100%;">
          </div>
        </div>
        <div>
          <label style="font-weight:600; font-size:0.88rem;">Materi / Pembahasan</label>
          <textarea id="jurnalMateri" rows="3" placeholder="Tuliskan materi yang diajarkan..." class="form-control" required style="padding:0.5rem; border:1px solid var(--border); border-radius:6px; width:100%;"></textarea>
        </div>
        <div>
          <label style="font-weight:600; font-size:0.88rem;">Catatan Siswa / Kejadian Penting</label>
          <textarea id="jurnalCatatan" rows="2" placeholder="Catatan kelas atau siswa (opsional)" class="form-control" style="padding:0.5rem; border:1px solid var(--border); border-radius:6px; width:100%;"></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="justify-self: start;"><i class="fas fa-save"></i> Simpan Jurnal</button>
      </form>

      <div class="table-container">
        <table style="width:100%;">
          <thead>
            <tr><th width="100">Tanggal</th><th width="100">Kelas</th><th width="80">Jam</th><th>Materi</th><th>Catatan</th><th width="80">Aksi</th></tr>
          </thead>
          <tbody id="bodyJurnalList">
            <tr><td colspan="6" style="text-align:center;">Memuat data jurnal...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderRekapJurnal() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">📜 Rekap Jurnal Mengajar</h3>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
        <input type="month" id="rekapJurnalBulan" class="form-control" style="padding:0.5rem; border:1.5px solid var(--border); border-radius:8px;">
        <button class="btn btn-primary" onclick="loadRekapJurnalData()"><i class="fas fa-search"></i> Tampilkan Rekap Jurnal</button>
      </div>
      <div class="table-container" id="rekapJurnalTableArea">
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Pilih bulan untuk melihat rekap jurnal mengajar.</div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════
// 7. DATA OPERATIONS
// ══════════════════════════════════════════════
function extractTingkat(nama) {
  if (!nama) return '';
  const match = nama.match(/\b(10|11|12|X|XI|XII|7|8|9|VII|VIII|IX)\b/i);
  return match ? match[0].toUpperCase() : '';
}

async function loadStats() {
  if (!currentUser) return;
  try {
    const kelasSnap = await db.collection('kelas').where('archived', '==', false).get();
    
    let kelasCount = 0;
    const kelasIds = [];
    
    kelasSnap.forEach(doc => {
      const data = doc.data();
      const isMyClass = 
        (data.pengajar_uids && data.pengajar_uids.includes(currentUser.uid)) ||
        (data.wali_kelas_uid && data.wali_kelas_uid === currentUser.uid) ||
        (data.guru_email && data.guru_email === currentUser.email);
      
      if (isMyClass) {
        kelasCount++;
        kelasIds.push(doc.id);
      }
    });
    
    const elKelas = document.getElementById('statKelas');
    if (elKelas) elKelas.textContent = kelasCount;

    let totalSiswa = 0;
    if (kelasIds.length > 0) {
      const semuaSiswaSnap = await db.collection('siswa').get();
      semuaSiswaSnap.forEach(doc => {
        if (kelasIds.includes(doc.data().kelas_id)) {
          totalSiswa++;
        }
      });
    }
    
    const elSiswa = document.getElementById('statSiswa');
    if (elSiswa) elSiswa.textContent = totalSiswa;

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let presensiText = '0%';
    try {
      const todaySnap = await db.collection('presensi').where('tanggal', '==', today).get();
      let totalRec = 0, totalH = 0;
      todaySnap.forEach(doc => {
        const d = doc.data();
        if (!kelasIds.includes(d.kelas_id)) return;
        const records = d.records || {};
        Object.values(records).forEach(st => {
          totalRec++;
          if (st === 'H') totalH++;
        });
      });
      presensiText = totalRec > 0 ? Math.round((totalH / totalRec) * 100) + '%' : '0%';
    } catch (e) {
      console.warn('⚠️ Stat kehadiran:', e.message);
    }
    const elPresensi = document.getElementById('statPresensi');
    if (elPresensi) elPresensi.textContent = presensiText;

    let soalCount = 0;
    try {
      const soalSnap = await db.collection('bank_soal')
        .where('created_by', '==', currentUser.uid)
        .get();
      soalCount = soalSnap.size;
    } catch (e) {
      console.warn('⚠️ Stat bank soal:', e.message);
    }
    const elSoal = document.getElementById('statSoal');
    if (elSoal) elSoal.textContent = soalCount;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadKelasList() {
  const tbody = document.getElementById('kelasTableBody');
  if (!tbody || !currentUser) return;

  try {
    const snapshot = await db.collection('kelas').where('archived', '==', false).get();

    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Belum ada kelas. Klik "+ Tambah Kelas" untuk memulai.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    const semuaSiswaSnap = await db.collection('siswa').get();
    let hasData = false;
    
    for (const docSnap of snapshot.docs) {
      const kelas = { id: docSnap.id, ...docSnap.data() };
      
      const isMyClass = 
        (kelas.pengajar_uids && kelas.pengajar_uids.includes(currentUser.uid)) ||
        (kelas.wali_kelas_uid && kelas.wali_kelas_uid === currentUser.uid) ||
        (kelas.guru_email && kelas.guru_email === currentUser.email);
      
      if (!isMyClass) continue;
      hasData = true;
      
      let siswaCount = 0;
      semuaSiswaSnap.forEach(doc => {
        if (doc.data().kelas_id === kelas.id) siswaCount++;
      });
      
      const mapelGuru = kelas.pengajar?.[currentUser.uid]?.mapel || kelas.mapel || '-';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${kelas.nama}</td>
        <td>${kelas.tahun_ajaran || '-'}</td>
        <td>
          <span class="badge badge-green">👥 ${siswaCount} Siswa</span><br>
          <small style="color: var(--text-secondary);">📚 ${mapelGuru}</small>
        </td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="editKelas('${kelas.id}', '${kelas.nama.replace(/'/g, "\\'")}', '${kelas.tahun_ajaran || ''}', '${kelas.semester || 'ganjil'}', '${kelas.mapel || ''}')">✏️ Edit</button>
          <button class="btn btn-primary btn-sm" onclick="bukaKelolaSiswa('${kelas.id}', '${kelas.nama}')" style="margin-left: 0.5rem;">👥 Kelola Siswa</button>
          <button class="btn btn-danger btn-sm" onclick="hapusKelas('${kelas.id}', '${kelas.nama}')" style="margin-left: 0.5rem;">🗑 Hapus</button>
        </td>`;
      tbody.appendChild(tr);
    }
    
    if (!hasData) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Anda belum mengajar kelas apapun. Klik "+ Tambah Kelas" untuk memulai.</td></tr>';
    }
  } catch (error) {
    console.error('Error loading kelas:', error);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Gagal memuat data: ' + error.message + '</td></tr>';
  }
}

async function tambahKelas() {
  const nama = document.getElementById('inputNamaKelas').value.trim();
  const tahun = document.getElementById('inputTahunAjaran').value.trim();
  const semester = document.getElementById('inputSemester').value;
  const mapel = document.getElementById('inputMapel').value.trim();

  if (!nama || !tahun || !mapel) {
    showToast('Nama kelas, tahun ajaran, dan mapel wajib diisi!', 'error');
    return;
  }

  try {
    await db.collection('kelas').add({
      nama: nama,
      tingkat: extractTingkat(nama),
      tahun_ajaran: tahun,
      semester: semester,
      mapel: mapel,
      archived: false,
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      pengajar_uids: [currentUser.uid],
      pengajar: {
        [currentUser.uid]: {
          nama: currentUserData.nama || currentUser.email,
          email: currentUser.email,
          mapel: mapel
        }
      }
    });

    showToast(`Kelas "${nama}" berhasil ditambahkan!`, 'success');
    closeModal('modalTambahKelas');
    loadKelasList();
    loadStats();
    document.getElementById('inputNamaKelas').value = '';
    document.getElementById('inputMapel').value = '';
  } catch (error) {
    showToast('Gagal menyimpan: ' + error.message, 'error');
  }
}

async function hapusKelas(kelasId, className) {
  if (!confirm(`Arsipkan kelas "${className}"? Data siswa dan nilai tidak akan hilang.`)) return;
  try {
    await db.collection('kelas').doc(kelasId).update({
      archived: true,
      archived_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast(`Kelas "${className}" berhasil diarsipkan!`, 'success');
    loadKelasList();
    loadStats();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'error');
  }
}

function editKelas(kelasId, nama, tahunAjaran, semester, mapel) {
  document.getElementById('editKelasId').value = kelasId;
  document.getElementById('editNamaKelas').value = nama;
  document.getElementById('editTahunAjaran').value = tahunAjaran;
  document.getElementById('editSemester').value = semester;
  document.getElementById('editMapel').value = mapel;
  openModal('modalEditKelas');
}

async function simpanEditKelas() {
  const kelasId = document.getElementById('editKelasId').value;
  const nama = document.getElementById('editNamaKelas').value.trim();
  const tahun = document.getElementById('editTahunAjaran').value.trim();
  const semester = document.getElementById('editSemester').value;
  const mapel = document.getElementById('editMapel').value.trim();

  if (!nama || !tahun || !mapel) {
    showToast('Nama kelas, tahun ajaran, dan mapel wajib diisi!', 'error');
    return;
  }

  try {
    await db.collection('kelas').doc(kelasId).update({
      nama: nama,
      tingkat: extractTingkat(nama),
      tahun_ajaran: tahun,
      semester: semester,
      mapel: mapel,
      updated_at: firebase.firestore.FieldValue.serverTimestamp(),
      [`pengajar.${currentUser.uid}.mapel`]: mapel,
      [`pengajar.${currentUser.uid}.nama`]: currentUserData.nama || currentUser.email,
      [`pengajar.${currentUser.uid}.email`]: currentUser.email
    });

    showToast(`✅ Kelas "${nama}" berhasil diperbarui!`, 'success');
    closeModal('modalEditKelas');
    loadKelasList();
    loadStats();
  } catch (error) {
    console.error('Error update kelas:', error);
    showToast('❌ Gagal memperbarui: ' + error.message, 'error');
  }
}

// ══════════════════════════════════════════════
// 8. MANAJEMEN SISWA
// ══════════════════════════════════════════════
async function bukaKelolaSiswa(kelasId, className) {
  currentKelasId = kelasId;
  currentKelasNama = className;
  const title = document.getElementById('titleKelolaSiswa');
  if (title) title.textContent = `👥 Kelola Siswa — ${className}`;
  openModal('modalKelolaSiswa');
  await loadDaftarSiswa();
}

async function loadDaftarSiswa() {
  const container = document.getElementById('daftarSiswaModal');
  if (!container) return;
  container.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div> Memuat data...</div>';

  try {
    const siswaQuery = await db.collection('siswa').where('kelas_id', '==', currentKelasId).get();
    const siswaDiKelas = [];
    const nisSudahAda = new Set();
    const namaSudahAda = new Set();

    siswaQuery.forEach(doc => {
      const s = { id: doc.id, ...doc.data() };
      siswaDiKelas.push(s);
      if (s.nis) nisSudahAda.add(s.nis.toLowerCase().trim());
      if (s.student_name) namaSudahAda.add(s.student_name.toLowerCase().trim());
    });

    const sicanQuery = await db.collection('sican_siswa').where('kelas', '==', currentKelasNama).get();
    const sicanSiswa = [];

    sicanQuery.forEach(doc => {
      const data = doc.data();
      const nisLower = (data.nis || '').toLowerCase().trim();
      const namaLower = (data.nama || '').toLowerCase().trim();
      if (!nisSudahAda.has(nisLower) && !namaSudahAda.has(namaLower)) {
        sicanSiswa.push({ id: doc.id, ...data, source: 'sican' });
      }
    });

    const elTotalK = document.getElementById('totalSiswaKelas');
    if (elTotalK) elTotalK.textContent = siswaDiKelas.length;
    const elTotalS = document.getElementById('totalSiswaSICAN');
    if (elTotalS) elTotalS.textContent = sicanSiswa.length;

    if (siswaDiKelas.length === 0 && sicanSiswa.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Belum ada siswa di kelas ini.</div>';
      return;
    }

    let html = '<table><thead><tr><th width="50">Foto</th><th>Nama</th><th width="150">Aksi</th></tr></thead><tbody>';

    if (siswaDiKelas.length > 0) {
      html += `<tr style="background: #fef3c7;"><td colspan="3" style="padding: 8px; font-weight: 600; color: #92400e;">✅ Siswa di Kelas (${siswaDiKelas.length})</td></tr>`;
      siswaDiKelas.forEach((s, i) => {
        const foto = s.student_photo 
          ? `<img src="${s.student_photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` 
          : '<div style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">👤</div>';
        
        html += `
          <tr>
            <td>${foto}</td>
            <td style="font-weight: 600;">${i + 1}. ${s.student_name}</td>
            <td style="display: flex; gap: 6px;">
              <button class="btn btn-warning btn-sm" onclick="editSiswa('${s.id}', '${s.student_name.replace(/'/g, "\\'")}', '${s.student_photo || ''}')">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="hapusSiswa('${s.id}', '${s.student_name.replace(/'/g, "\\'")}')">🗑 Hapus</button>
            </td>
          </tr>
        `;
      });
    }

    if (sicanSiswa.length > 0) {
      html += `<tr style="background: #dcfce7;"><td colspan="3" style="padding: 8px; font-weight: 600; color: #166534;">📥 Dari SICAN - Kelas ${currentKelasNama} (${sicanSiswa.length})</td></tr>`;
      sicanSiswa.forEach((s, i) => {
        const foto = s.foto 
          ? `<img src="${s.foto}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` 
          : '<div style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">👤</div>';
        
        html += `
          <tr>
            <td>${foto}</td>
            <td style="font-weight: 600;">${s.nama} <span class="badge badge-blue" style="font-size: 0.65rem;">SICAN</span></td>
            <td>
              <button class="btn btn-success btn-sm" onclick="tambahSiswaDariSICAN('${s.id}', '${s.nama.replace(/'/g, "\\'")}', '${s.nis || ''}', '${s.foto || ''}')">+ Tambah</button>
            </td>
          </tr>
        `;
      });
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: red;">Gagal memuat data: ' + error.message + '</div>';
  }
}

async function tambahkanSemuaSiswa(evt) {
  const btn = evt ? evt.target : event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Memproses...';

  try {
    const siswaQuery = await db.collection('siswa').where('kelas_id', '==', currentKelasId).get();
    const nisSudahAda = new Set();
    const namaSudahAda = new Set();

    siswaQuery.forEach(doc => {
      const s = doc.data();
      if (s.nis) nisSudahAda.add(s.nis.toLowerCase().trim());
      if (s.student_name) namaSudahAda.add(s.student_name.toLowerCase().trim());
    });

    const sicanQuery = await db.collection('sican_siswa').where('kelas', '==', currentKelasNama).get();
    const batch = db.batch();
    let count = 0;

    sicanQuery.forEach(doc => {
      const s = doc.data();
      const nisLower = (s.nis || '').toLowerCase().trim();
      const namaLower = (s.nama || '').toLowerCase().trim();
      
      if (!nisSudahAda.has(nisLower) && !namaSudahAda.has(namaLower)) {
        const newRef = db.collection('siswa').doc();
        batch.set(newRef, {
          kelas_id: currentKelasId,
          student_name: s.nama,
          nis: s.nis || '',
          student_photo: s.foto || '',
          sumber: 'sican',
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      showToast(`✅ Berhasil menambahkan ${count} siswa ke kelas ${currentKelasNama}!`, 'success');
      await loadDaftarSiswa();
      await loadStats();
      await loadKelasList();
    } else {
      showToast('⚠️ Tidak ada siswa baru untuk ditambahkan.', 'warning');
    }
  } catch (error) {
    showToast('❌ Gagal: ' + error.message, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '➕ Tambahkan Semua';
}

async function tambahSiswaDariSICAN(sicanId, nama, nis, foto) {
  try {
    await db.collection('siswa').add({
      kelas_id: currentKelasId,
      student_name: nama,
      nis: nis,
      student_photo: foto || '',
      sumber: 'sican',
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast(`Siswa "${nama}" berhasil ditambahkan!`, 'success');
    await loadDaftarSiswa();
    await loadStats();
    await loadKelasList();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'error');
  }
}

async function tambahSiswaManual() {
  const nama = document.getElementById('inputNamaSiswaManual').value.trim();
  if (!nama) { showToast('Nama siswa wajib diisi!', 'error'); return; }

  try {
    await db.collection('siswa').add({
      kelas_id: currentKelasId,
      student_name: nama,
      nis: '',
      student_photo: fotoSiswaBase64 || '',
      sumber: 'manual',
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast(`Siswa "${nama}" berhasil ditambahkan!`, 'success');
    document.getElementById('inputNamaSiswaManual').value = '';
    hapusFotoPreview();
    await loadDaftarSiswa();
    await loadStats();
    await loadKelasList();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'error');
  }
}

async function hapusSiswa(siswaId, nama) {
  if (!confirm(`Hapus siswa "${nama}" dari kelas ini?`)) return;
  try {
    await db.collection('siswa').doc(siswaId).delete();
    showToast(`Siswa "${nama}" dihapus.`, 'success');
    await loadDaftarSiswa();
    await loadStats();
    await loadKelasList();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'error');
  }
}

function editSiswa(siswaId, nama, foto) {
  document.getElementById('editSiswaId').value = siswaId;
  document.getElementById('editSiswaNama').value = nama;
  
  editFotoBase64 = '';
  editFotoExisting = foto || '';
  
  const currentContainer = document.getElementById('editFotoCurrentContainer');
  const currentImg = document.getElementById('editFotoCurrent');
  const newContainer = document.getElementById('editFotoNewContainer');
  const fileInput = document.getElementById('editFotoSiswaFile');
  
  if (foto) {
    if (currentImg) currentImg.src = foto;
    if (currentContainer) currentContainer.style.display = 'block';
  } else {
    if (currentContainer) currentContainer.style.display = 'none';
  }
  
  if (newContainer) newContainer.style.display = 'none';
  if (fileInput) fileInput.value = '';
  
  openModal('modalEditSiswa');
}

function handleEditFotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 2 * 1024 * 1024) {
    showToast('❌ Ukuran foto maksimal 2MB!', 'error');
    return;
  }
  
  if (!file.type.startsWith('image/')) {
    showToast('❌ File harus berupa gambar!', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    editFotoBase64 = e.target.result;
    document.getElementById('editFotoNew').src = editFotoBase64;
    document.getElementById('editFotoNewContainer').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function hapusEditFotoBaru() {
  editFotoBase64 = '';
  document.getElementById('editFotoNewContainer').style.display = 'none';
  document.getElementById('editFotoNew').src = '';
  document.getElementById('editFotoSiswaFile').value = '';
}

async function simpanEditSiswa() {
  const id = document.getElementById('editSiswaId').value;
  const namaBaru = document.getElementById('editSiswaNama').value.trim();
  
  if (!namaBaru) {
    showToast('Nama siswa wajib diisi!', 'error');
    return;
  }
  
  try {
    const fotoAkhir = editFotoBase64 || editFotoExisting;
    
    await db.collection('siswa').doc(id).update({
      student_name: namaBaru,
      student_photo: fotoAkhir,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showToast(`✅ Data siswa "${namaBaru}" berhasil diperbarui!`, 'success');
    closeModal('modalEditSiswa');
    await loadDaftarSiswa();
  } catch (error) {
    console.error('Error update siswa:', error);
    showToast('❌ Gagal memperbarui: ' + error.message, 'error');
  }
}

// ══════════════════════════════════════════════
// 9. LOGIKA PRESENSI DIGITAL
// ══════════════════════════════════════════════
async function initPresensiPage() {
  if (!currentUser) return;
  
  const select = document.getElementById('presensiKelasSelect');
  const tanggalInput = document.getElementById('presensiTanggal');
  
  if (!select || !tanggalInput) return;
  
  tanggalInput.valueAsDate = new Date();
  
  try {
    const kelasSnap = await db.collection('kelas').where('archived', '==', false).get();
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    
    if (kelasSnap.empty) return;
    
    const kelasList = [];
    kelasSnap.forEach(doc => {
      const data = doc.data();
      const isMyClass = 
        (data.pengajar_uids && data.pengajar_uids.includes(currentUser.uid)) ||
        (data.wali_kelas_uid && data.wali_kelas_uid === currentUser.uid) ||
        (data.guru_email && data.guru_email === currentUser.email);
      
      if (isMyClass) {
        kelasList.push({ id: doc.id, ...data });
      }
    });
    
    kelasList.sort((a, b) => a.nama.localeCompare(b.nama));
    
    kelasList.forEach(kelas => {
      const mapel = kelas.pengajar?.[currentUser.uid]?.mapel || kelas.mapel || '';
      const option = document.createElement('option');
      option.value = kelas.id;
      option.textContent = `${kelas.nama}${mapel ? ' (' + mapel + ')' : ''}`;
      option.dataset.nama = kelas.nama;
      option.dataset.mapel = mapel;
      select.appendChild(option);
    });
    
  } catch (error) {
    console.error('Error initPresensiPage:', error);
  }

  select.addEventListener('change', loadPresensiSiswa);
  tanggalInput.addEventListener('change', loadPresensiSiswa);
}

function renderTombolStatus(siswaId, status) {
  const colors = {
    'H': '#10b981', 'I': '#3b82f6', 'S': '#f59e0b',
    'A': '#ef4444', 'B': '#8b5cf6'
  };
  
  let html = '<div class="status-btn-group" style="display:flex; gap:4px;">';
  
  ['H', 'I', 'S', 'A', 'B'].forEach(kode => {
    const aktif = status === kode;
    const style = aktif 
      ? `background:${colors[kode]};border:2px solid ${colors[kode]};color:white;font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;`
      : `background:white;border:2px solid #e2e8f0;color:#64748b;font-weight:600;padding:4px 10px;border-radius:6px;cursor:pointer;`;
    
    html += `<button class="status-btn" data-siswa="${siswaId}" data-kode="${kode}" 
      style="${style}" 
      onclick="setPresensiStatus('${siswaId}', '${kode}')">${kode}</button>`;
  });
  
  html += '</div>';
  return html;
}

async function loadPresensiSiswa() {
  const kelasId = document.getElementById('presensiKelasSelect').value;
  const tanggal = document.getElementById('presensiTanggal').value;
  const actionArea = document.getElementById('presensiActionArea');
  const tbody = document.getElementById('bodyPresensi');

  if (!kelasId || !tanggal) {
    if (actionArea) actionArea.style.display = 'none';
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Silakan pilih kelas dan tanggal terlebih dahulu.</td></tr>';
    return;
  }

  tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;"><div class="spinner"></div> Memuat data...</td></tr>';
  if (actionArea) actionArea.style.display = 'block';
  
  const kelasNama = document.getElementById('presensiKelasSelect').options[document.getElementById('presensiKelasSelect').selectedIndex].dataset.nama;
  const elInfo = document.getElementById('presensiInfoKelas');
  if (elInfo) elInfo.textContent = `${kelasNama} (${tanggal})`;

  try {
    const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
    const siswaList = [];
    siswaSnap.forEach(doc => siswaList.push({ id: doc.id, ...doc.data() }));
    
    siswaList.sort((a, b) => a.student_name.localeCompare(b.student_name));
    currentSiswaList = siswaList;

    const presensiSnap = await db.collection('presensi')
      .where('kelas_id', '==', kelasId)
      .where('tanggal', '==', tanggal)
      .get();
    
    currentPresensiData = {};
    if (!presensiSnap.empty) {
      currentPresensiData = presensiSnap.docs[0].data().records || {};
    }

    if (siswaList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Tidak ada siswa di kelas ini.</td></tr>';
      return;
    }

    let html = '';
    siswaList.forEach((s, index) => {
      const status = currentPresensiData[s.id] || '';
      const foto = s.student_photo 
        ? `<img src="${s.student_photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` 
        : '<div style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">👤</div>';
      
      html += `
        <tr class="presensi-row">
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${foto}</td>
          <td style="font-weight: 600;">${s.student_name}</td>
          <td>${renderTombolStatus(s.id, status)}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;

  } catch (error) {
    console.error('Error load presensi:', error);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: red;">Gagal memuat data: ${error.message}</td></tr>`;
  }
}

function setPresensiStatus(siswaId, status) {
  if (currentPresensiData[siswaId] === status) {
    delete currentPresensiData[siswaId];
  } else {
    currentPresensiData[siswaId] = status;
  }
  
  const newStatus = currentPresensiData[siswaId] || '';
  const colors = { 'H':'#10b981', 'I':'#3b82f6', 'S':'#f59e0b', 'A':'#ef4444', 'B':'#8b5cf6' };
  
  const buttons = document.querySelectorAll(`.status-btn[data-siswa="${siswaId}"]`);
  buttons.forEach(btn => {
    const kode = btn.getAttribute('data-kode');
    const aktif = kode === newStatus;
    btn.style.background = aktif ? colors[kode] : 'white';
    btn.style.borderColor = aktif ? colors[kode] : '#e2e8f0';
    btn.style.color = aktif ? 'white' : '#64748b';
  });
}

function hadirSemua() {
  if (currentSiswaList.length === 0) {
    showToast('Tidak ada siswa untuk ditandai!', 'warning');
    return;
  }
  
  currentSiswaList.forEach(siswa => {
    currentPresensiData[siswa.id] = 'H';
  });
  
  const colors = { 'H':'#10b981', 'I':'#3b82f6', 'S':'#f59e0b', 'A':'#ef4444', 'B':'#8b5cf6' };
  document.querySelectorAll('.status-btn').forEach(btn => {
    const kode = btn.getAttribute('data-kode');
    const aktif = kode === 'H';
    btn.style.background = aktif ? colors['H'] : 'white';
    btn.style.borderColor = aktif ? colors['H'] : '#e2e8f0';
    btn.style.color = aktif ? 'white' : '#64748b';
  });
  
  showToast('✅ Semua siswa ditandai Hadir', 'success');
}

async function simpanPresensi() {
  const kelasId = document.getElementById('presensiKelasSelect').value;
  const tanggal = document.getElementById('presensiTanggal').value;
  const kelasNama = document.getElementById('presensiKelasSelect').options[document.getElementById('presensiKelasSelect').selectedIndex].dataset.nama;
  const btn = document.getElementById('btnSimpanPresensi');

  if (!kelasId || !tanggal) {
    showToast('Pilih kelas dan tanggal terlebih dahulu!', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

  try {
    const presensiData = {
      kelas_id: kelasId,
      kelas_nama: kelasNama,
      tanggal: tanggal,
      guru_uid: currentUser.uid,
      guru_nama: currentUserData.namaResmi || currentUserData.nama || currentUser.displayName || currentUser.email,
      records: currentPresensiData,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    };

    const existingSnap = await db.collection('presensi')
      .where('kelas_id', '==', kelasId)
      .where('tanggal', '==', tanggal)
      .get();

    if (!existingSnap.empty) {
      const docId = existingSnap.docs[0].id;
      await db.collection('presensi').doc(docId).update(presensiData);
      showToast('✅ Data presensi berhasil diperbarui!', 'success');
    } else {
      presensiData.created_at = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('presensi').add(presensiData);
      showToast('✅ Data presensi berhasil disimpan!', 'success');
    }
  } catch (error) {
    console.error('Error simpan presensi:', error);
    showToast('❌ Gagal menyimpan: ' + error.message, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save"></i> Simpan Presensi';
}

// ══════════════════════════════════════════════
// 10. REKAP PRESENSI & EXPORT / CETAK PDF
// ══════════════════════════════════════════════
function toggleRekapInputs() {
  const jenis = document.getElementById('rekapJenisSelect').value;
  const tgl = document.getElementById('rekapTanggal');
  const bln = document.getElementById('rekapBulan');
  const sem = document.getElementById('rekapSemesterSelect');
  const thn = document.getElementById('rekapTahunAjaran');

  if (tgl) tgl.style.display = (jenis === 'harian') ? 'inline-block' : 'none';
  if (bln) bln.style.display = (jenis === 'bulanan') ? 'inline-block' : 'none';
  if (sem) sem.style.display = (jenis === 'semester') ? 'inline-block' : 'none';
  if (thn) thn.style.display = (jenis === 'semester') ? 'inline-block' : 'none';
}

function formatTanggalIndo(tanggal) {
  if (!tanggal) return '-';
  const [y, m, d] = tanggal.split('-');
  return `${parseInt(d)} ${NAMA_BULAN[parseInt(m) - 1]} ${y}`;
}

function getSemesterRange(semester, tahunAjaran) {
  const startYear = parseInt(tahunAjaran.split('/')[0]);
  if (semester === 'ganjil') {
    return { start: `${startYear}-07-01`, end: `${startYear}-12-31` };
  }
  return { start: `${startYear + 1}-01-01`, end: `${startYear + 1}-06-30` };
}

async function initRekapPage() {
  if (!currentUser) return;
  const select = document.getElementById('rekapKelasSelect');
  const bulanInput = document.getElementById('rekapBulan');
  const tanggalInput = document.getElementById('rekapTanggal');
  if (!select || !bulanInput) return;

  const now = new Date();
  bulanInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (tanggalInput) tanggalInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  toggleRekapInputs();

  const monitor = isMonitoringJurnal();

  const gsel = document.getElementById('rekapGuruSelect');
  if (gsel) gsel.style.display = monitor ? 'inline-block' : 'none';

  try {
    const kelasSnap = await db.collection('kelas').where('archived', '==', false).get();
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    const kelasList = [];
    kelasSnap.forEach(doc => {
      const data = doc.data();
      const isMyClass = 
        (data.pengajar_uids && data.pengajar_uids.includes(currentUser.uid)) ||
        (data.wali_kelas_uid && data.wali_kelas_uid === currentUser.uid) ||
        (data.guru_email && data.guru_email === currentUser.email);
      if (monitor || isMyClass) kelasList.push({ id: doc.id, ...data });
    });
    kelasList.sort((a, b) => a.nama.localeCompare(b.nama));
    kelasList.forEach(kelas => {
      const mapel = kelas.pengajar?.[currentUser.uid]?.mapel || kelas.mapel || '';
      const option = document.createElement('option');
      option.value = kelas.id;
      option.textContent = `${kelas.nama}${mapel ? ' (' + mapel + ')' : ''}`;
      option.dataset.nama = kelas.nama;
      option.dataset.mapel = mapel;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error initRekapPage:', error);
  }
}

let USERS_CACHE = null;

async function getUsersCache() {
  if (USERS_CACHE) return USERS_CACHE;

  const byUid = new Map();
  const byEmail = new Map();

  try {
    const snap = await db.collection('users').get();
    snap.forEach(doc => {
      const d = doc.data();
      const nama = d.namaResmi || d.nama || d.name || d.displayName || '';
      const email = d.email || d.userEmail || '';

      if (nama) {
        byUid.set(doc.id, nama);
        if (email) {
          byEmail.set(String(email).toLowerCase(), nama);
        }
      }
    });
  } catch (e) {
    console.warn('⚠️ users cache:', e.message);
  }

  try {
    const jsnap = await db.collection('jurnal_mengajar').get();
    jsnap.forEach(doc => {
      const d = doc.data();
      const email = d.userEmail || d.email || d.guru_email || '';
      const nama = d.userName || d.guru_nama || d.nama_guru || '';

      if (email && nama && !String(nama).includes('@')) {
        const em = String(email).toLowerCase();
        if (!byEmail.has(em)) {
          byEmail.set(em, nama);
        }
      }
    });
  } catch (e) {
    console.warn('⚠️ jurnal cache:', e.message);
  }

  USERS_CACHE = { byUid, byEmail };
  return USERS_CACHE;
}

async function resolveNamaGuru(uid, fallback, email) {
  const { byUid, byEmail } = await getUsersCache();

  const fb = fallback || '';
  const em = email || (fb.includes('@') ? fb : '');

  if (uid && byUid.has(uid)) {
    return byUid.get(uid);
  }

  if (em && byEmail.has(String(em).toLowerCase())) {
    return byEmail.get(String(em).toLowerCase());
  }

  if (fb && !fb.includes('@')) {
    return fb;
  }

  return fb || em || '-';
}

async function onRekapKelasChange() {
  const gsel = document.getElementById('rekapGuruSelect');
  if (!gsel || gsel.style.display === 'none') return;
  const kelasId = document.getElementById('rekapKelasSelect').value;
  gsel.innerHTML = '<option value="">-- Semua Guru (Gabungan) --</option>';
  if (!kelasId) return;
  try {
    const snap = await db.collection('presensi').where('kelas_id', '==', kelasId).get();
    const map = new Map();
    snap.forEach(doc => {
      const d = doc.data();
      if (d.guru_uid && !map.has(d.guru_uid)) map.set(d.guru_uid, d.guru_nama || '');
    });

    for (const [uid, nama] of map.entries()) {
      if (!nama || nama.includes('@')) {
        const asli = await resolveNamaGuru(uid, nama);
        map.set(uid, asli);
      }
    }

    Array.from(map.entries())
      .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
      .forEach(([uid, nama]) => {
        const o = document.createElement('option');
        o.value = uid; o.textContent = nama;
        gsel.appendChild(o);
      });
  } catch (e) { console.warn('⚠️', e.message); }
}

async function loadRekapData() {
  const kelasId = document.getElementById('rekapKelasSelect').value;
  const jenis = document.getElementById('rekapJenisSelect').value;
  const area = document.getElementById('rekapTableArea');
  const selectKelas = document.getElementById('rekapKelasSelect');

  if (!kelasId) {
    showToast('Pilih kelas terlebih dahulu!', 'error');
    return;
  }

  let filterFn = null, periodeLabel = '', tahunAjaran = '';
  if (jenis === 'harian') {
    const tanggal = document.getElementById('rekapTanggal').value;
    if (!tanggal) { showToast('Pilih tanggal!', 'error'); return; }
    periodeLabel = formatTanggalIndo(tanggal);
    tahunAjaran = document.getElementById('rekapTahunAjaran').value || '2026/2027';
    filterFn = t => t === tanggal;
  } else if (jenis === 'bulanan') {
    const bulan = document.getElementById('rekapBulan').value;
    if (!bulan) { showToast('Pilih bulan!', 'error'); return; }
    const [y, m] = bulan.split('-');
    periodeLabel = `${NAMA_BULAN[parseInt(m) - 1]} ${y}`;
    tahunAjaran = document.getElementById('rekapTahunAjaran').value || '2026/2027';
    filterFn = t => t && t.startsWith(bulan);
  } else {
    const semester = document.getElementById('rekapSemesterSelect').value;
    tahunAjaran = document.getElementById('rekapTahunAjaran').value.trim() || '2026/2027';
    const range = getSemesterRange(semester, tahunAjaran);
    periodeLabel = `Semester ${semester === 'ganjil' ? 'Ganjil' : 'Genap'}`;
    filterFn = t => t >= range.start && t <= range.end;
  }

  area.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div> Memuat rekap...</div>';

  try {
    const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
    const siswaList = [];
    siswaSnap.forEach(doc => siswaList.push({ id: doc.id, ...doc.data() }));
    siswaList.sort((a, b) => a.student_name.localeCompare(b.student_name));

    const monitor = isMonitoringJurnal();
    const guruUid = (document.getElementById('rekapGuruSelect')?.value) || '';
    const presensiSnap = await db.collection('presensi').where('kelas_id', '==', kelasId).get();
    const presensiList = [];
    presensiSnap.forEach(doc => {
      const d = doc.data();
      if (d.tanggal && filterFn(d.tanggal)) {
        if (guruUid && d.guru_uid !== guruUid) return;
        presensiList.push(d);
      }
    });
    presensiList.sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    const kelasNama = selectKelas.options[selectKelas.selectedIndex].textContent;
    const mapel = selectKelas.options[selectKelas.selectedIndex].dataset.mapel || '';
    const guruNama = currentUserData.nama || currentUser.email;

    if (jenis === 'harian') {
      if (monitor && !guruUid && presensiList.length > 0) {
        const sessions = [];
        for (const p of presensiList) {
          const cnt = { H:0, I:0, S:0, A:0, B:0 };
          Object.values(p.records || {}).forEach(st => { if (cnt[st] !== undefined) cnt[st]++; });
          const nama = await resolveNamaGuru(p.guru_uid, p.guru_nama);
          sessions.push({ guru: nama, cnt, total: Object.values(cnt).reduce((a,b)=>a+b,0) });
        }
        const totH = sessions.reduce((s,x)=>s+x.cnt.H,0);
        const totAll = sessions.reduce((s,x)=>s+x.total,0);
        document.getElementById('rekapNilai1').textContent = sessions.length;
        document.getElementById('rekapLabel1').textContent = 'Sesi Mengajar';
        document.getElementById('rekapNilai2').textContent = (totAll>0?Math.round(totH/totAll*100):0)+'%';
        document.getElementById('rekapLabel2').textContent = 'Rata-rata Kehadiran';
        document.getElementById('rekapNilai3').textContent = siswaList.length;
        document.getElementById('rekapLabel3').textContent = 'Jumlah Siswa';
        document.getElementById('rekapSummaryArea').style.display = 'grid';
        document.getElementById('rekapExportArea').style.display = 'flex';
        let html = `<table><thead><tr><th width="40">No</th><th>Guru Pengajar</th><th style="color:#10b981;">H</th><th style="color:#3b82f6;">I</th><th style="color:#f59e0b;">S</th><th style="color:#ef4444;">A</th><th style="color:#8b5cf6;">B</th><th>% Kehadiran</th></tr></thead><tbody>`;
        sessions.forEach((s,i) => {
          const pct = s.total>0 ? Math.round(s.cnt.H/s.total*100) : 0;
          html += `<tr><td style="text-align:center;">${i+1}</td><td style="font-weight:600;">${s.guru}</td>
            <td style="text-align:center;font-weight:700;color:#10b981;">${s.cnt.H}</td>
            <td style="text-align:center;font-weight:700;color:#3b82f6;">${s.cnt.I}</td>
            <td style="text-align:center;font-weight:700;color:#f59e0b;">${s.cnt.S}</td>
            <td style="text-align:center;font-weight:700;color:#ef4444;">${s.cnt.A}</td>
            <td style="text-align:center;font-weight:700;color:#8b5cf6;">${s.cnt.B}</td>
            <td style="text-align:center;">${pct}%</td></tr>`;
        });
        area.innerHTML = html + '</tbody></table>';
        rekapDataCache = { jenis, kelasNama, mapel, guruNama, tahunAjaran, periodeLabel, siswaList, harianMulti: true, sessions, totalPertemuan: sessions.length };
        return;
      }
      const rec = presensiList.length > 0 ? (presensiList[0].records || {}) : null;
      let hadir = 0, tidakHadir = 0, belum = 0;
      siswaList.forEach(s => {
        const st = rec ? rec[s.id] : undefined;
        if (st === 'H') hadir++;
        else if (st) tidakHadir++;
        else belum++;
      });

      document.getElementById('rekapNilai1').textContent = siswaList.length;
      document.getElementById('rekapLabel1').textContent = 'Jumlah Siswa';
      document.getElementById('rekapNilai2').textContent = hadir;
      document.getElementById('rekapLabel2').textContent = 'Hadir (H)';
      document.getElementById('rekapNilai3').textContent = tidakHadir + belum;
      document.getElementById('rekapLabel3').textContent = 'Tidak Hadir / Belum Diisi';
      document.getElementById('rekapSummaryArea').style.display = 'grid';
      document.getElementById('rekapExportArea').style.display = 'flex';

      if (!rec) {
        area.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Belum ada presensi pada tanggal ini.</div>';
        rekapDataCache = { jenis, kelasNama, mapel, guruNama, tahunAjaran, periodeLabel, siswaList, hariRecords: null, totalPertemuan: 0 };
        return;
      }

      let html = `<table><thead><tr><th width="40">No</th><th>Nama Siswa</th><th width="150">Status</th></tr></thead><tbody>`;
      siswaList.forEach((s, i) => {
        const st = rec[s.id];
        const info = STATUS_INFO[st];
        const badge = info
          ? `<span style="background:${info.color}; color:white; padding:4px 12px; border-radius:9999px; font-weight:700; font-size:0.8rem;">${info.label}</span>`
          : `<span style="background:#e2e8f0; color:#64748b; padding:4px 12px; border-radius:9999px; font-weight:700; font-size:0.8rem;">Belum diisi</span>`;
        html += `<tr><td style="text-align:center;">${i + 1}</td><td style="font-weight:600;">${s.student_name}</td><td style="text-align:center;">${badge}</td></tr>`;
      });
      html += '</tbody></table>';
      area.innerHTML = html;

      rekapDataCache = { jenis, kelasNama, mapel, guruNama, tahunAjaran, periodeLabel, siswaList, hariRecords: rec, totalPertemuan: presensiList.length };
      return;
    }

    const stats = {};
    siswaList.forEach(s => { stats[s.id] = { H: 0, I: 0, S: 0, A: 0, B: 0 }; });
    presensiList.forEach(p => {
      const records = p.records || {};
      Object.keys(records).forEach(sid => {
        if (stats[sid] && stats[sid][records[sid]] !== undefined) stats[sid][records[sid]]++;
      });
    });

    const totalPertemuan = presensiList.length;
    let totalH = 0, totalAll = 0;
    siswaList.forEach(s => {
      const st = stats[s.id];
      totalH += st.H;
      totalAll += st.H + st.I + st.S + st.A + st.B;
    });
    const rata = totalAll > 0 ? Math.round((totalH / totalAll) * 100) : 0;

    document.getElementById('rekapNilai1').textContent = totalPertemuan;
    document.getElementById('rekapLabel1').textContent = 'Total Pertemuan';
    document.getElementById('rekapNilai2').textContent = rata + '%';
    document.getElementById('rekapLabel2').textContent = 'Rata-rata Kehadiran';
    document.getElementById('rekapNilai3').textContent = siswaList.length;
    document.getElementById('rekapLabel3').textContent = 'Jumlah Siswa';
    document.getElementById('rekapSummaryArea').style.display = 'grid';
    document.getElementById('rekapExportArea').style.display = 'flex';

    if (siswaList.length === 0) {
      area.innerHTML = '<div style="text-align: center; padding: 2rem;">Tidak ada siswa di kelas ini.</div>';
      return;
    }
    if (totalPertemuan === 0) {
      area.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Belum ada data presensi pada periode ini.</div>';
      rekapDataCache = { jenis, kelasNama, mapel, guruNama, tahunAjaran, periodeLabel, siswaList, stats, totalPertemuan, semester: jenis === 'semester' ? (document.getElementById('rekapSemesterSelect').value === 'ganjil' ? 'Ganjil' : 'Genap') : '' };
      return;
    }

    let html = `<table><thead><tr>
      <th width="40">No</th><th>Nama Siswa</th>
      <th style="color:#10b981;">H</th><th style="color:#3b82f6;">I</th><th style="color:#f59e0b;">S</th>
      <th style="color:#ef4444;">A</th><th style="color:#8b5cf6;">B</th><th>% Kehadiran</th>
    </tr></thead><tbody>`;

    siswaList.forEach((s, i) => {
      const st = stats[s.id];
      const filled = st.H + st.I + st.S + st.A + st.B;
      const pct = filled > 0 ? Math.round((st.H / filled) * 100) : 0;
      const pctColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
      html += `<tr>
        <td style="text-align:center;">${i + 1}</td>
        <td style="font-weight:600;">${s.student_name}</td>
        <td style="text-align:center; font-weight:700; color:#10b981;">${st.H}</td>
        <td style="text-align:center; font-weight:700; color:#3b82f6;">${st.I}</td>
        <td style="text-align:center; font-weight:700; color:#f59e0b;">${st.S}</td>
        <td style="text-align:center; font-weight:700; color:#ef4444;">${st.A}</td>
        <td style="text-align:center; font-weight:700; color:#8b5cf6;">${st.B}</td>
        <td style="text-align:center;"><span style="background:${pctColor}; color:white; padding:4px 10px; border-radius:9999px; font-weight:700; font-size:0.8rem;">${pct}%</span></td>
      </tr>`;
    });
    html += '</tbody></table>';
    area.innerHTML = html;

    rekapDataCache = { jenis, kelasNama, mapel, guruNama, tahunAjaran, periodeLabel, siswaList, stats, totalPertemuan, semester: jenis === 'semester' ? (document.getElementById('rekapSemesterSelect').value === 'ganjil' ? 'Ganjil' : 'Genap') : '' };

  } catch (error) {
    console.error('Error loadRekapData:', error);
    area.innerHTML = `<div style="text-align:center; padding:2rem; color:red;">Gagal memuat rekap: ${error.message}</div>`;
  }
}

function exportRekapCSV() {
  if (!rekapDataCache) {
    showToast('Data rekap belum dimuat!', 'error');
    return;
  }
  const { jenis, kelasNama, periodeLabel, siswaList, stats, harianMulti, sessions, hariRecords } = rekapDataCache;
  let csv = `\uFEFF`; // UTF-8 BOM
  csv += `REKAP PRESENSI - ${kelasNama}\n`;
  csv += `Periode: ${periodeLabel}\n\n`;

  if (jenis === 'harian') {
    if (harianMulti && sessions) {
      csv += `"No","Guru Pengajar","Hadir","Izin","Sakit","Alpa","Bolos","% Kehadiran"\n`;
      sessions.forEach((s, i) => {
        const pct = s.total > 0 ? Math.round((s.cnt.H / s.total) * 100) : 0;
        csv += `"${i + 1}","${s.guru}","${s.cnt.H}","${s.cnt.I}","${s.cnt.S}","${s.cnt.A}","${s.cnt.B}","${pct}%"\n`;
      });
    } else {
      csv += `"No","Nama Siswa","Status Kehadiran"\n`;
      siswaList.forEach((s, i) => {
        const st = hariRecords ? (hariRecords[s.id] || 'Belum diisi') : 'Belum diisi';
        const label = STATUS_INFO[st] ? STATUS_INFO[st].label : st;
        csv += `"${i + 1}","${s.student_name}","${label}"\n`;
      });
    }
  } else {
    csv += `"No","Nama Siswa","Hadir","Izin","Sakit","Alpa","Bolos","% Kehadiran"\n`;
    siswaList.forEach((s, i) => {
      const st = stats[s.id] || { H: 0, I: 0, S: 0, A: 0, B: 0 };
      const total = st.H + st.I + st.S + st.A + st.B;
      const pct = total > 0 ? Math.round((st.H / total) * 100) : 0;
      csv += `"${i + 1}","${s.student_name}","${st.H}","${st.I}","${st.S}","${st.A}","${st.B}","${pct}%"\n`;
    });
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Rekap_Presensi_${kelasNama}_${periodeLabel.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function cetakRekap() {
  if (!rekapDataCache) {
    showToast('Data rekap belum dimuat!', 'error');
    return;
  }

  const { jenis, kelasNama, mapel, guruNama, tahunAjaran, periodeLabel, siswaList, stats, harianMulti, sessions, hariRecords } = rekapDataCache;

  const win = window.open('', '_blank');
  let tableRows = '';

  if (jenis === 'harian') {
    if (harianMulti && sessions) {
      sessions.forEach((s, i) => {
        const pct = s.total > 0 ? Math.round((s.cnt.H / s.total) * 100) : 0;
        tableRows += `<tr>
          <td style="text-align:center;">${i + 1}</td>
          <td>${s.guru}</td>
          <td style="text-align:center;">${s.cnt.H}</td>
          <td style="text-align:center;">${s.cnt.I}</td>
          <td style="text-align:center;">${s.cnt.S}</td>
          <td style="text-align:center;">${s.cnt.A}</td>
          <td style="text-align:center;">${s.cnt.B}</td>
          <td style="text-align:center;">${pct}%</td>
        </tr>`;
      });
    } else {
      siswaList.forEach((s, i) => {
        const st = hariRecords ? (hariRecords[s.id] || '-') : '-';
        const label = STATUS_INFO[st] ? STATUS_INFO[st].label : st;
        tableRows += `<tr>
          <td style="text-align:center;">${i + 1}</td>
          <td>${s.student_name}</td>
          <td style="text-align:center;">${label}</td>
        </tr>`;
      });
    }
  } else {
    siswaList.forEach((s, i) => {
      const st = stats[s.id] || { H: 0, I: 0, S: 0, A: 0, B: 0 };
      const total = st.H + st.I + st.S + st.A + st.B;
      const pct = total > 0 ? Math.round((st.H / total) * 100) : 0;
      tableRows += `<tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${s.student_name}</td>
        <td style="text-align:center;">${st.H}</td>
        <td style="text-align:center;">${st.I}</td>
        <td style="text-align:center;">${st.S}</td>
        <td style="text-align:center;">${st.A}</td>
        <td style="text-align:center;">${st.B}</td>
        <td style="text-align:center;">${pct}%</td>
      </tr>`;
    });
  }

  const tableHeader = (jenis === 'harian' && !harianMulti)
    ? `<tr><th width="40">No</th><th>Nama Siswa</th><th width="150">Status Kehadiran</th></tr>`
    : `<tr><th width="40">No</th><th>${(jenis === 'harian' && harianMulti) ? 'Nama Guru' : 'Nama Siswa'}</th><th width="50">H</th><th width="50">I</th><th width="50">S</th><th width="50">A</th><th width="50">B</th><th width="80">% Hadir</th></tr>`;

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Laporan Presensi - ${kelasNama}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin: 20px; line-height: 1.4; }
        .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 15px; }
        .header h3 { margin: 0; font-size: 14pt; text-transform: uppercase; font-weight: bold; }
        .header h2 { margin: 2px 0; font-size: 16pt; font-weight: bold; }
        .header p { margin: 0; font-size: 10pt; font-style: italic; }
        .meta { width: 100%; margin-bottom: 15px; font-size: 11pt; }
        .meta td { padding: 3px 0; }
        table.data { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11pt; }
        table.data th, table.data td { border: 1px solid #000; padding: 6px; }
        table.data th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
        .ttd { margin-top: 30px; width: 100%; font-size: 11pt; }
        .ttd td { text-align: center; vertical-align: top; width: 50%; }
        @media print { @page { size: A4; margin: 1.5cm; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h3>${CONFIG_MADRASAH.kop1}</h3>
        <h2>${CONFIG_MADRASAH.kop2}</h2>
        <p>${CONFIG_MADRASAH.alamat}</p>
      </div>

      <h3 style="text-align:center; text-decoration:underline; margin-bottom:15px; font-size:13pt;">REKAP PRESENSI SISWA</h3>

      <table class="meta">
        <tr>
          <td width="15%"><strong>Kelas</strong></td><td width="35%">: ${kelasNama}</td>
          <td width="15%"><strong>Periode</strong></td><td width="35%">: ${periodeLabel}</td>
        </tr>
        <tr>
          <td><strong>Mata Pelajaran</strong></td><td>: ${mapel || '-'}</td>
          <td><strong>Tahun Ajaran</strong></td><td>: ${tahunAjaran}</td>
        </tr>
      </table>

      <table class="data">
        <thead>${tableHeader}</thead>
        <tbody>${tableRows}</tbody>
      </table>

      <table class="ttd">
        <tr>
          <td>
            <br>Mengetahui,<br>Kepala Madrasah
            <br><br><br><br>
            <strong>${formatKapital(CONFIG_MADRASAH.kepalaMadrasah, FORMAT_NAMA.kepala)}</strong><br>
            ${CONFIG_MADRASAH.nipKepala}
          </td>
          <td>
            ${CONFIG_MADRASAH.kota}, ${formatTanggalIndo(new Date().toISOString().split('T')[0])}<br>
            Guru Mata Pelajaran
            <br><br><br><br>
            <strong>${formatKapital(guruNama, FORMAT_NAMA.guru)}</strong><br>
            ${currentUserData?.nip ? 'NIP. ' + currentUserData.nip : ''}
          </td>
        </tr>
      </table>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `);
  win.document.close();
}

// ══════════════════════════════════════════════
// 11. MODUL PENILAIAN, REKAP NILAI, ANALISIS, BANK SOAL, JURNAL
// ══════════════════════════════════════════════
function initPenilaianPage() {
  if (!currentUser) return;
  const select = document.getElementById('nilaiKelasSelect');
  if (!select) return;

  updateJenisPenilaian();

  db.collection('kelas').where('archived', '==', false).get().then(kelasSnap => {
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    const kelasList = [];
    kelasSnap.forEach(doc => {
      const data = doc.data();
      const isMyClass = 
        (data.pengajar_uids && data.pengajar_uids.includes(currentUser.uid)) ||
        (data.wali_kelas_uid && data.wali_kelas_uid === currentUser.uid) ||
        (data.guru_email && data.guru_email === currentUser.email);
      if (isMyClass) kelasList.push({ id: doc.id, ...data });
    });
    kelasList.sort((a, b) => a.nama.localeCompare(b.nama));
    kelasList.forEach(k => {
      const option = document.createElement('option');
      option.value = k.id;
      option.textContent = k.nama;
      option.dataset.nama = k.nama;
      select.appendChild(option);
    });
  });
}

function updateJenisPenilaian() {
  const kat = document.getElementById('nilaiKategoriSelect').value;
  const jenisSelect = document.getElementById('nilaiJenisSelect');
  if (!jenisSelect) return;

  let options = '';
  if (kat === 'pengetahuan') {
    options = `
      <option value="UH1">Ulangan Harian 1 (UH1)</option>
      <option value="UH2">Ulangan Harian 2 (UH2)</option>
      <option value="UH3">Ulangan Harian 3 (UH3)</option>
      <option value="PTS">Penilaian Tengah Semester (PTS)</option>
      <option value="PAS">Penilaian Akhir Semester (PAS)</option>
    `;
  } else if (kat === 'keterampilan') {
    options = `
      <option value="Praktek">Tugas Praktik</option>
      <option value="Proyek">Proyek</option>
      <option value="Portofolio">Portofolio</option>
    `;
  } else {
    options = `
      <option value="Spiritual">Sikap Spiritual</option>
      <option value="Sosial">Sikap Sosial</option>
    `;
  }
  jenisSelect.innerHTML = options;
}

async function loadPenilaianSiswa() {
  const kelasId = document.getElementById('nilaiKelasSelect').value;
  const kategori = document.getElementById('nilaiKategoriSelect').value;
  const jenis = document.getElementById('nilaiJenisSelect').value;
  const namaNilai = document.getElementById('nilaiNamaInput').value.trim();
  const tbody = document.getElementById('bodyNilai');
  const actionArea = document.getElementById('nilaiActionArea');

  if (!kelasId) {
    showToast('Silakan pilih kelas terlebih dahulu!', 'error');
    return;
  }

  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;"><div class="spinner"></div> Memuat data...</div></td></tr>';
  if (actionArea) actionArea.style.display = 'block';

  const kelasNama = document.getElementById('nilaiKelasSelect').options[document.getElementById('nilaiKelasSelect').selectedIndex].dataset.nama;
  const elKat = document.getElementById('nilaiInfoKategori');
  if (elKat) elKat.textContent = `${kategori.toUpperCase()} - ${jenis} (${namaNilai || 'Utama'})`;
  const elKls = document.getElementById('nilaiInfoKelas');
  if (elKls) elKls.textContent = kelasNama;

  try {
    const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
    const siswaList = [];
    siswaSnap.forEach(doc => siswaList.push({ id: doc.id, ...doc.data() }));
    siswaList.sort((a, b) => a.student_name.localeCompare(b.student_name));

    if (siswaList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Tidak ada siswa di kelas ini.</td></tr>';
      return;
    }

    const nilaiSnap = await db.collection('penilaian')
      .where('kelas_id', '==', kelasId)
      .where('kategori', '==', kategori)
      .where('jenis', '==', jenis)
      .get();

    const nilaiExisting = {};
    const catatanExisting = {};
    if (!nilaiSnap.empty) {
      const data = nilaiSnap.docs[0].data();
      Object.assign(nilaiExisting, data.scores || {});
      Object.assign(catatanExisting, data.notes || {});
    }

    let html = '';
    siswaList.forEach((s, idx) => {
      const val = nilaiExisting[s.id] !== undefined ? nilaiExisting[s.id] : '';
      const cat = catatanExisting[s.id] || '';
      const foto = s.student_photo 
        ? `<img src="${s.student_photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` 
        : '<div style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">👤</div>';

      html += `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="text-align:center;">${foto}</td>
          <td style="font-weight:600;">${s.student_name}</td>
          <td>
            <input type="number" min="0" max="100" class="form-control input-nilai" data-siswa="${s.id}" value="${val}" placeholder="0-100" style="padding:0.4rem; border:1px solid #cbd5e1; border-radius:6px; width:100px;">
          </td>
          <td>
            <input type="text" class="form-control input-catatan" data-siswa="${s.id}" value="${cat}" placeholder="Catatan/Sikap" style="padding:0.4rem; border:1px solid #cbd5e1; border-radius:6px; width:100%;">
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;

  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Gagal memuat: ${error.message}</td></tr>`;
  }
}

async function simpanPenilaian() {
  const kelasId = document.getElementById('nilaiKelasSelect').value;
  const kategori = document.getElementById('nilaiKategoriSelect').value;
  const jenis = document.getElementById('nilaiJenisSelect').value;
  const namaNilai = document.getElementById('nilaiNamaInput').value.trim();
  const btn = document.getElementById('btnSimpanNilai');

  if (!kelasId) { showToast('Pilih kelas!', 'error'); return; }

  const scores = {};
  const notes = {};

  document.querySelectorAll('.input-nilai').forEach(inp => {
    const sid = inp.dataset.siswa;
    if (inp.value !== '') scores[sid] = parseFloat(inp.value) || 0;
  });

  document.querySelectorAll('.input-catatan').forEach(inp => {
    const sid = inp.dataset.siswa;
    if (inp.value.trim() !== '') notes[sid] = inp.value.trim();
  });

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

  try {
    const payload = {
      kelas_id: kelasId,
      kategori: kategori,
      jenis: jenis,
      keterangan: namaNilai,
      scores: scores,
      notes: notes,
      guru_uid: currentUser.uid,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    };

    const existingSnap = await db.collection('penilaian')
      .where('kelas_id', '==', kelasId)
      .where('kategori', '==', kategori)
      .where('jenis', '==', jenis)
      .get();

    if (!existingSnap.empty) {
      await db.collection('penilaian').doc(existingSnap.docs[0].id).update(payload);
    } else {
      payload.created_at = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('penilaian').add(payload);
    }

    showToast('✅ Nilai berhasil disimpan!', 'success');
  } catch (error) {
    showToast('❌ Gagal menyimpan: ' + error.message, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save"></i> Simpan Nilai';
}

function initRekapNilaiPage() {
  if (!currentUser) return;
  const select = document.getElementById('rekapNilaiKelasSelect');
  if (!select) return;

  db.collection('kelas').where('archived', '==', false).get().then(kelasSnap => {
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    kelasSnap.forEach(doc => {
      const data = doc.data();
      const isMyClass = 
        (data.pengajar_uids && data.pengajar_uids.includes(currentUser.uid)) ||
        (data.wali_kelas_uid && data.wali_kelas_uid === currentUser.uid) ||
        (data.guru_email && data.guru_email === currentUser.email);
      if (isMyClass) {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = data.nama;
        select.appendChild(opt);
      }
    });
  });
}

async function loadRekapNilaiData() {
  const kelasId = document.getElementById('rekapNilaiKelasSelect').value;
  const area = document.getElementById('rekapNilaiTableArea');
  if (!kelasId) { showToast('Pilih kelas terlebih dahulu!', 'error'); return; }

  area.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div> Memuat data...</div>';

  try {
    const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
    const siswaList = [];
    siswaSnap.forEach(d => siswaList.push({ id: d.id, ...d.data() }));
    siswaList.sort((a, b) => a.student_name.localeCompare(b.student_name));

    const nilaiSnap = await db.collection('penilaian').where('kelas_id', '==', kelasId).get();
    const nilaiDocs = [];
    nilaiSnap.forEach(d => nilaiDocs.push(d.data()));

    if (siswaList.length === 0) {
      area.innerHTML = '<div style="text-align: center; padding: 2rem;">Tidak ada siswa di kelas ini.</div>';
      return;
    }

    let html = `<table><thead><tr><th width="40">No</th><th>Nama Siswa</th>`;
    const jenisList = ['UH1', 'UH2', 'UH3', 'PTS', 'PAS'];
    jenisList.forEach(j => html += `<th width="70">${j}</th>`);
    html += `<th width="80">Rata-rata</th></tr></thead><tbody>`;

    siswaList.forEach((s, i) => {
      let sum = 0, count = 0;
      let cols = '';
      jenisList.forEach(j => {
        const docMatch = nilaiDocs.find(d => d.jenis === j);
        const val = docMatch?.scores?.[s.id];
        if (val !== undefined && val !== null) {
          cols += `<td style="text-align:center;">${val}</td>`;
          sum += parseFloat(val);
          count++;
        } else {
          cols += `<td style="text-align:center; color:#94a3b8;">-</td>`;
        }
      });
      const avg = count > 0 ? (sum / count).toFixed(1) : '-';
      html += `<tr><td style="text-align:center;">${i + 1}</td><td style="font-weight:600;">${s.student_name}</td>${cols}<td style="text-align:center; font-weight:700;">${avg}</td></tr>`;
    });
    html += '</tbody></table>';
    area.innerHTML = html;

  } catch (e) {
    area.innerHTML = `<div style="text-align:center; color:red;">Gagal: ${e.message}</div>`;
  }
}

function initAnalisisPage() {
  if (!currentUser) return;
  const select = document.getElementById('analisisKelasSelect');
  if (!select) return;

  db.collection('kelas').where('archived', '==', false).get().then(kelasSnap => {
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    kelasSnap.forEach(doc => {
      const data = doc.data();
      const isMyClass = 
        (data.pengajar_uids && data.pengajar_uids.includes(currentUser.uid)) ||
        (data.wali_kelas_uid && data.wali_kelas_uid === currentUser.uid) ||
        (data.guru_email && data.guru_email === currentUser.email);
      if (isMyClass) {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = data.nama;
        select.appendChild(opt);
      }
    });
  });
}

async function loadAnalisisData() {
  const kelasId = document.getElementById('analisisKelasSelect').value;
  const kkm = parseFloat(document.getElementById('analisisKKM').value) || 75;
  const area = document.getElementById('analisisResultArea');

  if (!kelasId) { showToast('Pilih kelas terlebih dahulu!', 'error'); return; }

  area.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div> Menganalisis...</div>';

  try {
    const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
    const siswaList = [];
    siswaSnap.forEach(d => siswaList.push({ id: d.id, ...d.data() }));

    const nilaiSnap = await db.collection('penilaian').where('kelas_id', '==', kelasId).get();
    const nilaiDocs = [];
    nilaiSnap.forEach(d => nilaiDocs.push(d.data()));

    let tuntasCount = 0, belumTuntasCount = 0;
    const remedialList = [], pengayaanList = [];

    siswaList.forEach(s => {
      let sum = 0, count = 0;
      nilaiDocs.forEach(d => {
        const val = d.scores?.[s.id];
        if (val !== undefined && val !== null) {
          sum += parseFloat(val);
          count++;
        }
      });
      const avg = count > 0 ? sum / count : 0;
      if (avg >= kkm) {
        tuntasCount++;
        pengayaanList.push({ nama: s.student_name, nilai: avg.toFixed(1) });
      } else {
        belumTuntasCount++;
        remedialList.push({ nama: s.student_name, nilai: avg.toFixed(1) });
      }
    });

    const total = siswaList.length;
    const pctTuntas = total > 0 ? Math.round((tuntasCount / total) * 100) : 0;

    area.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
        <div style="background:#f0fdf4; border-left:4px solid #10b981; padding:1rem; border-radius:8px;">
          <div style="font-size:1.5rem; font-weight:800; color:#047857;">${pctTuntas}%</div>
          <div style="font-size:0.85rem; color:#065f46;">Daya Serap Klasikal</div>
        </div>
        <div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:1rem; border-radius:8px;">
          <div style="font-size:1.5rem; font-weight:800; color:#1d4ed8;">${tuntasCount} Siswa</div>
          <div style="font-size:0.85rem; color:#1e40af;">Tuntas (≥ ${kkm})</div>
        </div>
        <div style="background:#fef2f2; border-left:4px solid #ef4444; padding:1rem; border-radius:8px;">
          <div style="font-size:1.5rem; font-weight:800; color:#b91c1c;">${belumTuntasCount} Siswa</div>
          <div style="font-size:0.85rem; color:#991b1b;">Belum Tuntas (< ${kkm})</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.5rem;">
        <div style="background:#fff; border:1px solid var(--border); border-radius:8px; padding:1rem;">
          <h4 style="color:#dc2626; margin-bottom:0.75rem;">🔻 Program Remedial (${remedialList.length})</h4>
          <ul style="padding-left:1.2rem; font-size:0.9rem;">
            ${remedialList.map(item => `<li><b>${item.nama}</b> - Rata-rata: ${item.nilai}</li>`).join('') || '<li>Tidak ada siswa remedial</li>'}
          </ul>
        </div>
        <div style="background:#fff; border:1px solid var(--border); border-radius:8px; padding:1rem;">
          <h4 style="color:#16a34a; margin-bottom:0.75rem;">🟢 Program Pengayaan (${pengayaanList.length})</h4>
          <ul style="padding-left:1.2rem; font-size:0.9rem;">
            ${pengayaanList.map(item => `<li><b>${item.nama}</b> - Rata-rata: ${item.nilai}</li>`).join('') || '<li>Tidak ada siswa pengayaan</li>'}
          </ul>
        </div>
      </div>
    `;

  } catch (e) {
    area.innerHTML = `<div style="text-align:center; color:red;">Gagal: ${e.message}</div>`;
  }
}

function initBankSoalPage() {
  loadBankSoal();
}

async function loadBankSoal() {
  const area = document.getElementById('bankSoalList');
  if (!area || !currentUser) return;

  area.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div> Memuat bank soal...</div>';

  try {
    const snap = await db.collection('bank_soal').where('created_by', '==', currentUser.uid).get();
    if (snap.empty) {
      area.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Belum ada soal yang dibuat.</div>';
      return;
    }

    let html = '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1rem;">';
    snap.forEach(doc => {
      const d = doc.data();
      html += `
        <div style="background:var(--bg-card); border:1px solid var(--border); padding:1rem; border-radius:8px;">
          <div style="font-weight:700; font-size:1rem; margin-bottom:0.5rem;">${d.judul || 'Tanpa Judul'}</div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.75rem;">📚 ${d.mapel || '-'} | Tingkat: ${d.tingkat || '-'}</div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="badge badge-blue">${d.jumlah_soal || 0} Soal</span>
            <button class="btn btn-danger btn-sm" onclick="hapusSoal('${doc.id}')">🗑 Hapus</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    area.innerHTML = html;
  } catch (e) {
    area.innerHTML = `<div style="text-align:center; color:red;">Gagal: ${e.message}</div>`;
  }
}

async function hapusSoal(id) {
  if (!confirm('Hapus paket soal ini?')) return;
  try {
    await db.collection('bank_soal').doc(id).delete();
    showToast('Soal berhasil dihapus', 'success');
    loadBankSoal();
    loadStats();
  } catch (e) {
    showToast('Gagal hapus: ' + e.message, 'error');
  }
}

function initJurnalPage() {
  if (!currentUser) return;
  const select = document.getElementById('jurnalKelasSelect');
  const tglInput = document.getElementById('jurnalTanggal');
  if (tglInput) tglInput.valueAsDate = new Date();

  if (select) {
    db.collection('kelas').where('archived', '==', false).get().then(kelasSnap => {
      select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
      kelasSnap.forEach(doc => {
        const data = doc.data();
        const isMyClass = 
          (data.pengajar_uids && data.pengajar_uids.includes(currentUser.uid)) ||
          (data.wali_kelas_uid && data.wali_kelas_uid === currentUser.uid) ||
          (data.guru_email && data.guru_email === currentUser.email);
        if (isMyClass) {
          const opt = document.createElement('option');
          opt.value = doc.id;
          opt.textContent = data.nama;
          opt.dataset.nama = data.nama;
          select.appendChild(opt);
        }
      });
    });
  }
  loadJurnalList();
}

async function loadJurnalList() {
  const tbody = document.getElementById('bodyJurnalList');
  if (!tbody || !currentUser) return;

  try {
    const snap = await db.collection('jurnal_mengajar')
      .where('guru_uid', '==', currentUser.uid)
      .get();

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-secondary);">Belum ada catatan jurnal mengajar.</td></tr>';
      return;
    }

    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

    let html = '';
    list.forEach(j => {
      html += `
        <tr>
          <td>${j.tanggal || '-'}</td>
          <td style="font-weight:600;">${j.kelas_nama || '-'}</td>
          <td>${j.jam_ke || '-'}</td>
          <td>${j.materi || '-'}</td>
          <td>${j.catatan || '-'}</td>
          <td><button class="btn btn-danger btn-sm" onclick="hapusJurnal('${j.id}')">🗑</button></td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Gagal: ${e.message}</td></tr>`;
  }
}

async function simpanJurnal(e) {
  if (e) e.preventDefault();
  const select = document.getElementById('jurnalKelasSelect');
  const kelasId = select.value;
  const kelasNama = select.options[select.selectedIndex]?.dataset?.nama || '';
  const tanggal = document.getElementById('jurnalTanggal').value;
  const jamKe = document.getElementById('jurnalJamKe').value.trim();
  const materi = document.getElementById('jurnalMateri').value.trim();
  const catatan = document.getElementById('jurnalCatatan').value.trim();

  if (!kelasId || !tanggal || !materi) {
    showToast('Harap isi tanggal, kelas, dan materi!', 'error');
    return;
  }

  try {
    await db.collection('jurnal_mengajar').add({
      guru_uid: currentUser.uid,
      guru_nama: currentUserData.namaResmi || currentUserData.nama || currentUser.email,
      guru_email: currentUser.email,
      kelas_id: kelasId,
      kelas_nama: kelasNama,
      tanggal: tanggal,
      jam_ke: jamKe,
      materi: materi,
      catatan: catatan,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    showToast('✅ Jurnal mengajar berhasil disimpan!', 'success');
    document.getElementById('jurnalJamKe').value = '';
    document.getElementById('jurnalMateri').value = '';
    document.getElementById('jurnalCatatan').value = '';
    loadJurnalList();
  } catch (err) {
    showToast('Gagal simpan jurnal: ' + err.message, 'error');
  }
}

async function hapusJurnal(id) {
  if (!confirm('Hapus catatan jurnal ini?')) return;
  try {
    await db.collection('jurnal_mengajar').doc(id).delete();
    showToast('Jurnal dihapus', 'success');
    loadJurnalList();
  } catch (e) {
    showToast('Gagal: ' + e.message, 'error');
  }
}

function initRekapJurnalPage() {
  const bulanInput = document.getElementById('rekapJurnalBulan');
  if (bulanInput) {
    const now = new Date();
    bulanInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  loadRekapJurnalData();
}

async function loadRekapJurnalData() {
  const bulan = document.getElementById('rekapJurnalBulan')?.value;
  const area = document.getElementById('rekapJurnalTableArea');
  if (!area || !currentUser) return;

  area.innerHTML = '<div style="text-align:center; padding:2rem;"><div class="spinner"></div> Memuat rekap jurnal...</div>';

  try {
    const snap = await db.collection('jurnal_mengajar').get();
    const list = [];
    snap.forEach(d => {
      const data = d.data();
      const isMine = data.guru_uid === currentUser.uid || data.guru_email === currentUser.email;
      const isHead = isRoleKepala();
      if ((isMine || isHead) && (!bulan || (data.tanggal && data.tanggal.startsWith(bulan)))) {
        list.push({ id: d.id, ...data });
      }
    });

    list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

    if (list.length === 0) {
      area.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary);">Tidak ada data jurnal pada periode ini.</div>';
      return;
    }

    let html = `<table><thead><tr><th width="40">No</th><th>Tanggal</th><th>Guru</th><th>Kelas</th><th>Jam</th><th>Materi Pembahasan</th><th>Catatan</th></tr></thead><tbody>`;
    list.forEach((j, i) => {
      html += `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td>${j.tanggal || '-'}</td>
          <td>${j.guru_nama || '-'}</td>
          <td style="font-weight:600;">${j.kelas_nama || '-'}</td>
          <td style="text-align:center;">${j.jam_ke || '-'}</td>
          <td>${j.materi || '-'}</td>
          <td>${j.catatan || '-'}</td>
        </tr>
      `;
    });
    html += '</tbody></table>';
    area.innerHTML = html;

  } catch (e) {
    area.innerHTML = `<div style="text-align:center; color:red;">Gagal memuat: ${e.message}</div>`;
  }
}

async function loadJadwalHariIni() {
  const container = document.getElementById('jadwalHariIniArea');
  if (!container || !currentUser) return;

  try {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const snap = await db.collection('jurnal_mengajar')
      .where('guru_uid', '==', currentUser.uid)
      .where('tanggal', '==', todayStr)
      .get();

    if (snap.empty) {
      container.innerHTML = `<div style="padding:0.75rem; background:#f8fafc; border-radius:8px; font-size:0.88rem; color:var(--text-secondary); text-align:center;">
        Belum ada entri jurnal mengajar untuk hari ini (${formatTanggalIndo(todayStr)}).
      </div>`;
      return;
    }

    let html = '';
    snap.forEach(doc => {
      const j = doc.data();
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.8rem; background:#f0fdf4; border-left:4px solid #10b981; border-radius:6px;">
          <div>
            <div style="font-weight:700; font-size:0.9rem;">🏫 Kelas: ${j.kelas_nama || '-'} (Jam ke-${j.jam_ke || '-'})</div>
            <div style="font-size:0.8rem; color:var(--text-secondary);">📖 Materi: ${j.materi || '-'}</div>
          </div>
          <span class="badge badge-green">Tercatat</span>
        </div>
      `;
    });
    container.innerHTML = html;

  } catch (e) {
    container.innerHTML = `<div style="font-size:0.85rem; color:red;">Gagal memuat jadwal: ${e.message}</div>`;
  }
}

// ══════════════════════════════════════════════
// 12. HAK AKSES & OTENTIKASI
// ══════════════════════════════════════════════
function isRoleKepala() {
  if (!currentUserData || !currentUserData.role) return false;
  const r = currentUserData.role.toString().toLowerCase();
  return r.includes('kepala') || r.includes('kamad') || r.includes('headmaster');
}

function isMonitoringJurnal() {
  return isRoleKepala();
}

function applyRoleRestrictions() {
  if (isRoleKepala()) {
    const hiddenPages = ['kelas', 'presensi', 'penilaian', 'bank-soal', 'jurnal'];
    hiddenPages.forEach(p => {
      document.querySelectorAll(`[data-page="${p}"]`).forEach(el => {
        el.style.display = 'none';
      });
    });
  }
}

function redirectToLogin() {
  window.location.href = 'login.html';
}

// ══════════════════════════════════════════════
// 13. INISIALISASI SAAT DOM READY
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initSession();
});