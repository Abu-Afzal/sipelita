// ══════════════════════════════════════════════
// SIPENA 2.0 - MAIN JAVASCRIPT (VERSI LENGKAP)
// ══════════════════════════════════════════════

// 1. Firebase Config
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
const db = firebase.firestore();
const auth = firebase.auth();

// ══════════════════════════════════════════════
// ✏️ KONFIGURASI MADRASAH (KOP & TTD PDF)
// ══════════════════════════════════════════════
const CONFIG_MADRASAH = {
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
  document.getElementById('userGreeting').textContent = 'Memverifikasi sesi...';

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
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      const nip = data.nip || data.NIP || data.Nip || '';
      currentUserData.nip = nip;
      if (data.role) currentUserData.role = data.role;
            
      if (data.nama || data.name || data.displayName) {
        currentUserData.namaResmi = data.nama || data.name || data.displayName;
      }
      
      localStorage.setItem('sipelita_user', JSON.stringify(currentUserData));
      
      console.log('✅ NIP user berhasil dimuat:', nip || '(kosong)');
    }
  } catch (error) {
    console.warn('⚠️ Gagal mengambil NIP user:', error.message);
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
    } else {
      console.warn('⚠️ Tidak ditemukan user dengan role "kepala" di collection users');
    }
  } catch (error) {
    console.warn('⚠️ Gagal mengambil data Kepala Madrasah:', error.message);
  }
}

function redirectToLogin() {
  showToast('⚠️ Sesi Anda berakhir. Silakan login ulang.', 'warning');
  setTimeout(() => { window.location.href = '../home.html'; }, 1500);
}

// ══════════════════════════════════════════════
// 5. UI HELPERS
// ══════════════════════════════════════════════
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'exclamation-circle';
  toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function openModal(modalId) { document.getElementById(modalId).classList.add('active'); }
function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }

// ══════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ══════════════════════════════════════════════

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
function loadPage(page) {
  const content = document.getElementById('pageContent');
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
            <select id="nilaiJenisSelect" class="form-control" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
            </select>
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

// ══════════════════════════════════════════════
// 7. DATA OPERATIONS
// ══════════════════════════════════════════════
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
    
    document.getElementById('statKelas').textContent = kelasCount;

    let totalSiswa = 0;
    if (kelasIds.length > 0) {
      const semuaSiswaSnap = await db.collection('siswa').get();
      semuaSiswaSnap.forEach(doc => {
        if (kelasIds.includes(doc.data().kelas_id)) {
          totalSiswa++;
        }
      });
    }
    
    document.getElementById('statSiswa').textContent = totalSiswa;

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
    document.getElementById('statPresensi').textContent = presensiText;

    let soalCount = 0;
    try {
      const soalSnap = await db.collection('bank_soal')
        .where('created_by', '==', currentUser.uid)
        .get();
      soalCount = soalSnap.size;
    } catch (e) {
      console.warn('⚠️ Stat bank soal:', e.message);
    }
    document.getElementById('statSoal').textContent = soalCount;
  } catch (error) {
    console.error('Error loading stats:', error);
    document.getElementById('statKelas').textContent = '0';
    document.getElementById('statSiswa').textContent = '0';
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
  document.getElementById('titleKelolaSiswa').textContent = `👥 Kelola Siswa — ${className}`;
  openModal('modalKelolaSiswa');
  await loadDaftarSiswa();
}

async function loadDaftarSiswa() {
  const container = document.getElementById('daftarSiswaModal');
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

    document.getElementById('totalSiswaKelas').textContent = siswaDiKelas.length;
    document.getElementById('totalSiswaSICAN').textContent = sicanSiswa.length;

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

async function tambahkanSemuaSiswa() {
  const btn = event.target;
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
    currentImg.src = foto;
    currentContainer.style.display = 'block';
  } else {
    currentContainer.style.display = 'none';
  }
  
  newContainer.style.display = 'none';
  document.getElementById('editFotoNew').src = '';
  fileInput.value = '';
  
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
      option.textContent = `${kelas.nama} (${mapel})`;
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
  
  let html = '<div class="status-btn-group">';
  
  ['H', 'I', 'S', 'A', 'B'].forEach(kode => {
    const aktif = status === kode;
    const style = aktif 
      ? `background:${colors[kode]};border:2px solid ${colors[kode]};color:white;font-weight:700;`
      : `background:white;border:2px solid #e2e8f0;color:#64748b;font-weight:600;`;
    
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
    actionArea.style.display = 'none';
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Silakan pilih kelas dan tanggal terlebih dahulu.</td></tr>';
    return;
  }

  tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;"><div class="spinner"></div> Memuat data...</td></tr>';
  actionArea.style.display = 'block';
  
  const kelasNama = document.getElementById('presensiKelasSelect').options[document.getElementById('presensiKelasSelect').selectedIndex].dataset.nama;
  document.getElementById('presensiInfoKelas').textContent = `${kelasNama} (${tanggal})`;

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
// 10. REKAP: HARIAN / BULANAN / SEMESTERAN + PDF BERKOP
// ══════════════════════════════════════════════
function toggleRekapInputs() {
  const jenis = document.getElementById('rekapJenisSelect').value;
  document.getElementById('rekapTanggal').style.display = (jenis === 'harian') ? 'inline-block' : 'none';
  document.getElementById('rekapBulan').style.display = (jenis === 'bulanan') ? 'inline-block' : 'none';
  document.getElementById('rekapSemesterSelect').style.display = (jenis === 'semester') ? 'inline-block' : 'none';
  document.getElementById('rekapTahunAjaran').style.display = (jenis === 'semester') ? 'inline-block' : 'none';
}

function formatTanggalIndo(tanggal) {
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

// ══════════════════════════════════════════════
// REKAP PRESENSI - INIT & DROPDOWN GURU
// ══════════════════════════════════════════════
async function initRekapPage() {
  if (!currentUser) return;
  const select = document.getElementById('rekapKelasSelect');
  const bulanInput = document.getElementById('rekapBulan');
  const tanggalInput = document.getElementById('rekapTanggal');
  if (!select || !bulanInput) return;

  const now = new Date();
  bulanInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  tanggalInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  toggleRekapInputs();

  const monitor = (typeof isMonitoringJurnal === 'function') ? isMonitoringJurnal() : isRoleKepala();

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

// ══════════════════════════════════════════════
// ✅ CACHE NAMA GURU RESMI
// ══════════════════════════════════════════════
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

// 👁 Isi dropdown guru sesuai kelas yang dipilih
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

    const monitor = (typeof isMonitoringJurnal === 'function') ? isMonitoringJurnal() : isRoleKepala();
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
  if (!rekapDataCache) { showToast('Tampilkan rekap terlebih dahulu!', 'error'); return; }
  const c = rekapDataCache;

  let csv = '\uFEFF';
  csv += `REKAP PRESENSI ${c.jenis.toUpperCase()} - ${c.kelasNama};Periode: ${c.periodeLabel};Total Pertemuan: ${c.totalPertemuan}\n`;

  if (c.jenis === 'harian' && c.harianMulti) {
    csv += 'No;Guru Pengajar;H;I;S;A;B;% Kehadiran\n';
    c.sessions.forEach((s,i) => {
      const pct = s.total>0?Math.round(s.cnt.H/s.total*100):0;
      csv += `${i+1};${s.guru};${s.cnt.H};${s.cnt.I};${s.cnt.S};${s.cnt.A};${s.cnt.B};${pct}%\n`;
    });
  } else if (c.jenis === 'harian') {
    csv += 'No;Nama Siswa;Status\n';
    c.siswaList.forEach((s, i) => {
      const st = c.hariRecords ? (c.hariRecords[s.id] || '') : '';
      const label = STATUS_INFO[st] ? STATUS_INFO[st].label : 'Belum diisi';
      csv += `${i + 1};${s.student_name};${label}\n`;
    });
  } else {
    csv += 'No;Nama Siswa;H;I;S;A;B;% Kehadiran\n';
    c.siswaList.forEach((s, i) => {
      const st = c.stats[s.id];
      const filled = st.H + st.I + st.S + st.A + st.B;
      const pct = filled > 0 ? Math.round((st.H / filled) * 100) : 0;
      csv += `${i + 1};${s.student_name};${st.H};${st.I};${st.S};${st.A};${st.B};${pct}%\n`;
    });
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekap_${c.jenis}_${c.kelasNama.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✅ File CSV berhasil diunduh!', 'success');
}

function cetakRekap() {
  if (!rekapDataCache) { showToast('Tampilkan rekap terlebih dahulu!', 'error'); return; }
  const c = rekapDataCache;
  const today = new Date();
  const tglSurat = `${today.getDate()} ${NAMA_BULAN[today.getMonth()]} ${today.getFullYear()}`;

  const rawNipGuru = currentUserData?.nip || '';
  const nipGuru = rawNipGuru 
    ? (rawNipGuru.startsWith('NIP.') ? rawNipGuru : 'NIP. ' + rawNipGuru)
    : 'NIP. ............................................';
  const namaGuruCetak = formatKapital(currentUserData?.namaResmi || currentUserData?.nama || c.guruNama || '', FORMAT_NAMA.guru);

  const b = 'border:1px solid #000; padding:5px; font-size:11pt;';
  const thStyle = `style="${b} background:#f0f0f0; font-weight:bold; text-align:center;"`;
  const tdStyle = `style="${b}"`;
  const tdCenter = `style="${b} text-align:center;"`;

  let headCols = '', rows = '';
  
  if (c.jenis === 'harian' && c.harianMulti) {
    headCols = `
      <th ${thStyle}>No</th>
      <th ${thStyle}>Guru Pengajar</th>
      <th ${thStyle}>H</th><th ${thStyle}>I</th>
      <th ${thStyle}>S</th><th ${thStyle}>A</th>
      <th ${thStyle}>B</th><th ${thStyle}>% Kehadiran</th>`;
    c.sessions.forEach((s,i) => {
      const pct = s.total>0?Math.round(s.cnt.H/s.total*100):0;
      rows += `<tr>
        <td ${tdCenter}>${i+1}</td><td ${tdStyle}>${s.guru}</td>
        <td ${tdCenter}>${s.cnt.H}</td><td ${tdCenter}>${s.cnt.I}</td>
        <td ${tdCenter}>${s.cnt.S}</td><td ${tdCenter}>${s.cnt.A}</td>
        <td ${tdCenter}>${s.cnt.B}</td><td ${tdCenter}>${pct}%</td>
      </tr>`;
    });
  } else if (c.jenis === 'harian') {
    headCols = `
      <th ${thStyle}>No</th><th ${thStyle}>Nama Siswa</th><th ${thStyle}>Status</th><th ${thStyle}>Keterangan</th>`;
    c.siswaList.forEach((s, i) => {
      const st = c.hariRecords ? (c.hariRecords[s.id] || '') : '';
      const label = STATUS_INFO[st] ? STATUS_INFO[st].label : 'Belum diisi';
      rows += `<tr>
        <td ${tdCenter}>${i + 1}</td>
        <td ${tdStyle}>${s.student_name}</td>
        <td ${tdCenter} style="${b} text-align:center; font-weight:bold;">${label}</td>
        <td ${tdStyle}>&nbsp;</td>
      </tr>`;
    });
  } else {
    headCols = `
      <th ${thStyle}>No</th><th ${thStyle}>Nama Siswa</th>
      <th ${thStyle}>H</th><th ${thStyle}>I</th>
      <th ${thStyle}>S</th><th ${thStyle}>A</th>
      <th ${thStyle}>B</th><th ${thStyle}>% Kehadiran</th>`;
    c.siswaList.forEach((s, i) => {
      const st = c.stats[s.id];
      const filled = st.H + st.I + st.S + st.A + st.B;
      const pct = filled > 0 ? Math.round((st.H / filled) * 100) : 0;
      rows += `<tr>
        <td ${tdCenter}>${i + 1}</td><td ${tdStyle}>${s.student_name}</td>
        <td ${tdCenter}>${st.H}</td><td ${tdCenter}>${st.I}</td>
        <td ${tdCenter}>${st.S}</td><td ${tdCenter}>${st.A}</td>
        <td ${tdCenter}>${st.B}</td><td ${tdCenter}>${pct}%</td>
      </tr>`;
    });
  }

  const monitor = (typeof isMonitoringJurnal === 'function') ? isMonitoringJurnal() : false;
  const judul = (c.jenis === 'harian' ? 'REKAP PRESENSI HARIAN'
    : c.jenis === 'bulanan' ? 'REKAP PRESENSI BULANAN'
    : 'REKAP PRESENSI SEMESTERAN') + (monitor ? ' — MONITORING' : '');

  const kopHtml = `
    <div style="text-align:center; border-bottom:3px double #000; padding-bottom:10px; margin-bottom:16px;">
      <div style="font-size:12pt; font-weight:bold;">${CONFIG_MADRASAH.kop1}</div>
      <div style="font-size:14pt; font-weight:bold;">${CONFIG_MADRASAH.kop2}</div>
      <div style="font-size:10pt; font-style:italic;">${CONFIG_MADRASAH.alamat}</div>
    </div>`;

  let infoRows = `
    <tr><td style="width:140px; border:none; padding:1px 0; font-size:12pt;">Kelas</td><td style="border:none; font-size:12pt;">: <b>${c.kelasNama}</b></td></tr>
    <tr><td style="border:none; padding:1px 0; font-size:12pt;">Tahun Ajaran</td><td style="border:none; font-size:12pt;">: <b>${c.tahunAjaran}</b></td></tr>`;
  if (c.jenis === 'semester') {
    infoRows += `<tr><td style="border:none; padding:1px 0; font-size:12pt;">Semester</td><td style="border:none; font-size:12pt;">: <b>${c.semester || 'Ganjil'}</b></td></tr>`;
  }
  infoRows += `<tr><td style="border:none; padding:1px 0; font-size:12pt;">Mata Pelajaran</td><td style="border:none; font-size:12pt;">: <b>${c.mapel || '-'}</b></td></tr>`;
  if (c.jenis === 'harian') {
    infoRows += `<tr><td style="border:none; padding:1px 0; font-size:12pt;">Tanggal</td><td style="border:none; font-size:12pt;">: <b>${c.periodeLabel}</b></td></tr>`;
  }
  if (c.jenis === 'bulanan') {
    infoRows += `<tr><td style="border:none; padding:1px 0; font-size:12pt;">Bulan</td><td style="border:none; font-size:12pt;">: <b>${c.periodeLabel}</b></td></tr>`;
  }

  const OFFSET_KOTA = 22;
  const SPASI_TTD = 60;
  const GESER_KANAN = 100;

  const ttdHtml = monitor ? `
    <table style="width:100%; margin-top:28px; font-size:12pt;">
      <tr>
        <td style="width:50%; border:none;"></td>
        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:40px;">
          ${CONFIG_MADRASAH.kota}, ${tglSurat}<br>Kepala Madrasah
          <div style="height:60px;"></div>
          <b><u><span style="font-size:10pt;">${formatKapital(CONFIG_MADRASAH.kepalaMadrasah, FORMAT_NAMA.kepala)}</span></u></b><br><b style="font-size:11pt;">${CONFIG_MADRASAH.nipKepala}</b>
        </td>
      </tr>
    </table>` : `
    <table style="width:100%; margin-top:28px; font-size:12pt;">
      <tr>
        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:24px; padding-top:${OFFSET_KOTA}px;">
          Mengetahui,<br>Kepala Madrasah
          <div style="height:${SPASI_TTD}px;"></div>
          <b><u><span style="font-size:10pt;">${formatKapital(CONFIG_MADRASAH.kepalaMadrasah, FORMAT_NAMA.kepala)}</span></u></b><br><b style="font-size:11pt;">${CONFIG_MADRASAH.nipKepala}</b>
        </td>
        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:${GESER_KANAN}px;">
          ${CONFIG_MADRASAH.kota}, ${tglSurat}
          <div style="height:${OFFSET_KOTA}px;"></div>
          Guru Mata Pelajaran
          <div style="height:${SPASI_TTD}px;"></div>
          <b><u><span style="font-size:10pt;">${namaGuruCetak}</span></u></b><br><b style="font-size:11pt;">${nipGuru}</b>
        </td>
      </tr>
    </table>`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
    <head><title>${judul} - ${c.kelasNama}</title></head>
    <body style="font-family: 'Times New Roman', serif; font-size: 12pt; padding: 24px; color:#000;">
      ${kopHtml}
      <div style="text-align:center; margin:0 0 12px;">
        <div style="font-size:12pt; font-weight:bold; text-decoration:underline;">${judul}</div>
      </div>
      <table style="width:100%; margin-bottom:12px; font-size:12pt;">${infoRows}</table>
      <table style="width:100%; border-collapse:collapse; font-size:11pt;">
        <thead><tr>${headCols}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${ttdHtml}
      <script>window.print();<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function extractTingkat(nama) {
  const upper = nama.toUpperCase();
  if (upper.includes('XII') || upper.includes('12')) return 'XII';
  if (upper.includes('XI') || upper.includes('11')) return 'XI';
  if (upper.includes('X') || upper.includes('10')) return 'X';
  return 'Lainnya';
}

// ══════════════════════════════════════════════
// 👑 PEMBATASAN AKUN KEPALA MADRASAH
// ══════════════════════════════════════════════
function isRoleKepala() {
  const role = (currentUserData && currentUserData.role ? String(currentUserData.role) : '').toLowerCase();
  return role.includes('kepala');
}

function applyRoleRestrictions() {
  if (!isRoleKepala()) return;
  document.querySelectorAll('.guru-only').forEach(el => el.style.display = 'none');
  const stats = document.querySelector('.stats-grid');
  if (stats) stats.style.display = 'none';
  const title = document.querySelector('.page-title');
  if (title) title.textContent = 'Monitoring PBM';
}

// ══════════════════════════════════════════════
// TOGGLE SIDEBAR
// ══════════════════════════════════════════════
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      document.querySelector('.sidebar').classList.remove('open');
    }
  });
});

// Init
// ══════════════════════════════════════════════
// AKSI SUB-MENU ACCORDION
// ══════════════════════════════════════════════
function setActiveNavItem(el) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  const parent = el ? el.closest('.nav-parent') : null;
  if (parent) parent.classList.add('open');
  if (window.innerWidth <= 768) {
    document.querySelector('.sidebar').classList.remove('open');
  }
}

document.getElementById('navTambahKelas').addEventListener('click', function () {
  setActiveNavItem(this);
  loadPage('kelas');
  setTimeout(() => openModal('modalTambahKelas'), 300);
});

document.getElementById('navTambahSiswa').addEventListener('click', function () {
  setActiveNavItem(this);
  loadPage('kelas');
  setTimeout(() => openModalPilihKelas(), 300);
});

async function openModalPilihKelas() {
  const select = document.getElementById('selectKelasUntukSiswa');
  select.innerHTML = '<option value="">-- Memuat kelas... --</option>';
  openModal('modalPilihKelasSiswa');
  try {
    const snap = await db.collection('kelas').where('archived', '==', false).get();
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    snap.forEach(doc => {
      const d = doc.data();
      const isMyClass =
        (Array.isArray(d.pengajar_uids) && d.pengajar_uids.includes(currentUser.uid)) ||
        (d.wali_kelas_uid && d.wali_kelas_uid === currentUser.uid) ||
        (d.guru_email && d.guru_email === currentUser.email) ||
        (d.pengajar && d.pengajar[currentUser.uid]);
      if (isMyClass) {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = d.nama;
        opt.dataset.nama = d.nama;
        select.appendChild(opt);
      }
    });
  } catch (e) {
    showToast('Gagal memuat kelas: ' + e.message, 'error');
  }
}

function konfirmasiTambahSiswa() {
  const select = document.getElementById('selectKelasUntukSiswa');
  if (!select.value) { showToast('Pilih kelas terlebih dahulu!', 'error'); return; }
  const nama = select.options[select.selectedIndex].dataset.nama;
  closeModal('modalPilihKelasSiswa');
  bukaKelolaSiswa(select.value, nama);
}

document.getElementById('navUploadSoal').addEventListener('click', function () {
  setActiveNavItem(this);
  loadPage('bank-soal');
  setTimeout(() => { if (typeof openUploadModal === 'function') openUploadModal(); }, 400);
});

// ══════════════════════════════════════════════
// DASHBOARD: NAVIGASI CEPAT & DATA RINGKAS
// ══════════════════════════════════════════════
function gotoPage(page) {
  const item = document.querySelector('.nav-item[data-page="' + page + '"]');
  if (item) item.click();
}

async function loadJadwalHariIni() {
  const area = document.getElementById('jadwalHariIniArea');
  if (!area || !currentUser) return;
  const hariMap = {0:'Minggu',1:'Senin',2:'Selasa',3:'Rabu',4:'Kamis',5:'Jumat',6:'Sabtu'};
  const hariIni = hariMap[new Date().getDay()];
  const today = new Date(); today.setHours(0,0,0,0);

  try {
    const snap = await db.collection('jadwal_alarm').where('user_uid', '==', currentUser.uid).get();
    const list = [];
    snap.forEach(doc => {
      const j = doc.data();
      if (j.hari !== hariIni) return;
      if (j.periode_mulai && j.periode_sampai) {
        const m = new Date(j.periode_mulai); const s = new Date(j.periode_sampai);
        if (today < m || today > s) return;
      }
      list.push(j);
    });
    list.sort((a, b) => (a.mulai || '').localeCompare(b.mulai || ''));

    if (!list.length) {
      area.innerHTML = '<div style="text-align:center; padding:1.25rem; color:var(--text-secondary);">🎉 Tidak ada jadwal mengajar hari ini.</div>';
      return;
    }

    area.innerHTML = list.map(j => `
      <div style="display:flex; align-items:center; gap:0.75rem; padding:0.6rem 0.75rem; background:#f8fafc; border-radius:8px; border-left:4px solid #10b981;">
        <div style="font-weight:800; color:#059669; font-family:'Courier New',monospace; font-size:0.85rem;">${j.mulai || '--:--'}${j.selesai ? '–' + j.selesai : ''}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; font-size:0.9rem;">${j.kelas}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">${j.mapel || ''}${j.ruang ? ' • Ruang ' + j.ruang : ''}</div>
        </div>
      </div>`).join('');
  } catch (e) {
    console.warn('⚠️ Jadwal hari ini:', e.message);
    area.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-secondary);">Jadwal belum tersedia.</div>';
  }
}

async function loadKelasRingkas() {
  const area = document.getElementById('kelasRingkasArea');
  if (!area || !currentUser) return;
  try {
    const snap = await db.collection('kelas').where('archived', '==', false).get();
    const mine = [];
    snap.forEach(doc => {
      const d = doc.data();
      const isMy =
        (Array.isArray(d.pengajar_uids) && d.pengajar_uids.includes(currentUser.uid)) ||
        (d.wali_kelas_uid && d.wali_kelas_uid === currentUser.uid) ||
        (d.guru_email && d.guru_email === currentUser.email) ||
        (d.pengajar && d.pengajar[currentUser.uid]);
      if (isMy) mine.push({ id: doc.id, ...d });
    });
    mine.sort((a, b) => a.nama.localeCompare(b.nama));

    if (!mine.length) {
      area.innerHTML = '<div style="text-align:center; padding:1.25rem; color:var(--text-secondary);">Belum ada kelas. Klik "Kelola Kelas → Tambah Kelas".</div>';
      return;
    }

    const siswaSnap = await db.collection('siswa').get();
    const counts = {};
    siswaSnap.forEach(doc => {
      const k = doc.data().kelas_id;
      counts[k] = (counts[k] || 0) + 1;
    });

    area.innerHTML = mine.map(k => `
      <div style="display:flex; align-items:center; gap:0.6rem; padding:0.55rem 0.75rem; background:#f8fafc; border-radius:8px; border-left:4px solid #3b82f6;">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; font-size:0.9rem;">${k.nama}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">📚 ${k.pengajar?.[currentUser.uid]?.mapel || k.mapel || '-'}</div>
        </div>
        <span class="badge badge-blue">👥 ${counts[k.id] || 0}</span>
      </div>`).join('');
  } catch (e) {
    console.warn('⚠️ Kelas ringkas:', e.message);
    area.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-secondary);">Gagal memuat kelas.</div>';
  }
}

window.addEventListener('load', initSession);
