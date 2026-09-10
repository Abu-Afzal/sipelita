// ══════════════════════════════════════════════
// SIAGA CORE - Ekstrakurikuler (SIG INTEGRATED - FINAL CLEAN)
// ══════════════════════════════════════════════
import { auth, db } from "../js/firebase-config.js";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ══════════════════════════════════════════════
// ✏️ KONFIGURASI MADRASAH (SIG) - EKSKUL
// ══════════════════════════════════════════════
const CONFIG_MADRASAH = {
  logo: '',
  kop1: 'KEMENTERIAN AGAMA KABUPATEN BANTAENG',
  kop2: 'MADRASAH ALIYAH NEGERI BANTAENG',
  alamat: 'Jl. ... (isi alamat madrasah)',
  kota: 'Bantaeng',
  kepalaMadrasah: '................................................',
  nipKepala: 'NIP. ............................................'
};

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const JABATAN = ['Anggota','Ketua','Wakil','Sekretaris','Bendahara'];

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

function ekstrakSIG(d) {
  const hasil = { kota:'', kepala:'', nip:'', kop1:'', kop2:'', alamat:'' };
  for (const [k, v] of Object.entries(d || {})) {
    if (typeof v !== 'string' || !v) continue;
    const key = k.toLowerCase();
    const isKepalaKey = key.includes('kamad') || key.includes('kepala') || key.includes('kepsek');

    if (!hasil.kota && (key.includes('kota') || key.includes('tempat'))) hasil.kota = v;
    if (!hasil.nip && isKepalaKey && key.includes('nip')) hasil.nip = v;
    if (!hasil.kepala && isKepalaKey && !key.includes('nip') && !key.includes('link') && !v.includes('@')) hasil.kepala = v;
    if (!hasil.kop1 && key === 'kop1') hasil.kop1 = v;
    if (!hasil.kop2 && (key.includes('madrasah') || key.includes('sekolah')) && key.includes('nama')) hasil.kop2 = v;
    if (!hasil.alamat && key.includes('alamat')) hasil.alamat = v;
  }
  return hasil;
}

async function fetchIdentitasSekolah() {
  if (!currentUserEmail) return;
  const sumber = [];

  if (userSekolahId) {
    try {
      const s = await db.collection('sekolah').doc(userSekolahId).get();
      if (s.exists) sumber.push(s.data());
    } catch (e) {}
  }

  const cols = ['pengaturan_user', 'identitas_madrasah', 'sekolah', 'ekskul_config', 'pengaturan', 'settings', 'config', 'sig'];
  for (const c of cols) {
    try { const a = await db.collection(c).doc(currentUserEmail).get(); if (a.exists) { sumber.push(a.data()); continue; } } catch (e) {}
    try { const q = await db.collection(c).where('email', '==', currentUserEmail).limit(1).get(); q.forEach(d => sumber.push(d.data())); } catch (e) {}
  }

  try {
    const u1 = await db.collection('users').doc(currentUserEmail).get();
    if (u1.exists) sumber.push(u1.data());
  } catch (e) {}

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

  console.log(ketemu ? '✅ SIG dimuat → ' + CONFIG_MADRASAH.kop1 + ' / ' + CONFIG_MADRASAH.kop2 : '⚠️ SIG: data identitas tidak ditemukan');
}

async function fetchSekolahAktif() {
  if (!currentUserEmail || !userSekolahId) return;
  try {
    const sdoc = await db.collection('sekolah').doc(userSekolahId).get();
    if (!sdoc.exists) return;
    const d = sdoc.data();
    console.log('🏫 Data sekolah aktif ditemukan:', d);
    
    // ✅ Simpan nama sekolah untuk badge
    namaSekolah = d.kop2 || d.nama || 'Sekolah';
    
    if (d.kop1) CONFIG_MADRASAH.kop1 = d.kop1;
    if (d.kop2) CONFIG_MADRASAH.kop2 = d.kop2;
    else if (d.nama) CONFIG_MADRASAH.kop2 = d.nama.toUpperCase();
    if (d.alamat) CONFIG_MADRASAH.alamat = d.alamat;
    if (d.kota) CONFIG_MADRASAH.kota = d.kota;
    if (d.kepala_nama) CONFIG_MADRASAH.kepalaMadrasah = d.kepala_nama;
    if (d.kepala_nip) {
      CONFIG_MADRASAH.nipKepala = d.kepala_nip.startsWith('NIP.') ? d.kepala_nip : 'NIP. ' + d.kepala_nip;
    }
    console.log('✅ [Multi-Sekolah] CONFIG_MADRASAH di-override');
  } catch (e) {
    console.warn('⚠️ fetchSekolahAktif gagal:', e.message);
  }
}

// ══════════ INIT ══════════
console.log('🚀 SIAGA Core dimulai...');

let currentUser = { uid: '', nama: '', email: '', role: 'guru', nip: '' };
let userSekolahId = '';
let namaSekolah = 'Sekolah';
let canEditEkskul = false;
let currentUserEmail = '';

let daftarUsers = [];
let masterSiswa = [];
let daftarEkskul = [];
let semuaEkskul = [];
let selectedEkskul = null;
let daftarAnggota = [];
let daftarKegiatan = [];
let allAnggota = [];    
let allKegiatan = [];   

const $ = id => document.getElementById(id);
const toast = (m, e=false) => { const t=document.createElement('div'); t.className='toast'+(e?' err':''); t.textContent=m; document.body.appendChild(t); setTimeout(()=>t.remove(),2800); };
const localDate = () => { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };

onAuthStateChanged(auth, async (u) => { 
  console.log('🔍 Auth state changed:', u ? u.email : 'tidak ada user');
  if (!u) {
    console.warn('⚠️ Tidak ada user, redirect ke home...');
    window.location.href = '../home.html';
  } else {
    console.log('✅ User terautentikasi:', u.email);
    await initApp(u);
  }
});

async function initApp(u) {
  console.log('📱 initApp() dipanggil untuk:', u.email);
  
  currentUser.uid = u.uid;
  currentUser.email = u.email;
  currentUserEmail = u.email;
  
  try {
    console.log('🔎 Mencari user di Firestore...');
    const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', currentUser.email)));
    
    if (!userDoc.empty) {
      const data = userDoc.docs[0].data();
      console.log('✅ User ditemukan:', data);
      
      currentUser.nama = data.nama || data.namaResmi || currentUser.email;
      currentUser.role = data.role || 'guru';
      userSekolahId = data.school_id || data.sekolah_id || '';
      currentUser.nip = data.nip || '';
      
      console.log('📊 Data user:', { nama: currentUser.nama, role: currentUser.role, school_id: userSekolahId, nip: currentUser.nip });
    } else {
      console.warn('⚠️ User tidak ditemukan di collection users!');
    }
    
    // ✅ AUTO-SET SCHOOL_ID JIKA KOSONG (Fallback)
    if (!userSekolahId) {
      console.warn('⚠️ userSekolahId kosong! Mencoba auto-detect...');
      const sekolahSnap = await getDocs(collection(db, 'sekolah'));
      if (!sekolahSnap.empty) {
        userSekolahId = sekolahSnap.docs[0].id;
        console.log('✅ Auto-set school_id:', userSekolahId);
        try {
          const userRef = doc(db, 'users', currentUser.email);
          await updateDoc(userRef, { school_id: userSekolahId });
          console.log('✅ User document diupdate dengan school_id');
        } catch(e) {
          console.warn('⚠️ Gagal update user document:', e.message);
        }
      } else {
        console.error('❌ Tidak ada data sekolah di Firestore!');
      }
    }
  } catch(e) { 
    console.error('❌ Gagal ambil data user:', e); 
  }

  if (!userSekolahId) {
    console.error('❌ userSekolahId masih kosong. Aplikasi tidak bisa berjalan.');
    toast('⚠️ Akun Anda belum terdaftar di sekolah manapun! Hubungi admin.', true);
    return;
  }

  console.log('🏫 School ID:', userSekolahId);
  $('userBadge').textContent = (currentUser.role==='admin'?'👑 ':'') + currentUser.nama;
  $('schoolBadge').textContent = '🏫 ' + namaSekolah;

  if (currentUser.role === 'admin') {
    $('tabMasterBtn').style.display = 'inline-block';
    $('tabPengelolaBtn').style.display = 'inline-block';
  }
  if (['admin','kepala','wakil'].includes(currentUser.role)) {
    $('tabMonitorBtn').style.display = 'inline-block';
  }

  $('kTanggal').value = localDate();
  $('kJam').value = new Date().toTimeString().slice(0,5);

  console.log('📡 Memuat data SIG...');
  await fetchIdentitasSekolah();
  await fetchSekolahAktif();

  // ✅ Update badge sekolah dengan nama yang benar
  $('schoolBadge').textContent = '🏫 ' + namaSekolah;

  console.log('📡 Memuat data master...');
  await Promise.all([ loadMasterSiswa(), loadUsers(), loadEkskul() ]);

  console.log('📊 Data dimuat:', { masterSiswa: masterSiswa.length, users: daftarUsers.length, ekskul: daftarEkskul.length });

  if (['admin','kepala','wakil'].includes(currentUser.role)) {
    console.log('👑 Admin/Kepala detected, memuat monitoring...');
    await loadAllData();
    renderMonitoring();
  }

  computeAccessEkskul();
  bindEvents();
  refreshAll();
  
  console.log('✅ SIAGA initialized successfully!');
}

function computeAccessEkskul() {
  if (currentUser.role === 'admin') {
    canEditEkskul = true;
  } else {
    const userData = daftarUsers.find(u => u.email === currentUser.email);
    canEditEkskul = userData && userData.akses_ekskul === true;
  }
  applyAccessEkskul();
}

function applyAccessEkskul() {
  const btnAdd = $('btnAddEkskul');
  if (btnAdd) btnAdd.style.display = canEditEkskul ? 'inline-block' : 'none';
  
  const btnSimpanKeg = $('btnSimpanKegiatan');
  if (btnSimpanKeg) btnSimpanKeg.style.display = canEditEkskul ? 'inline-block' : 'none';

  document.querySelectorAll('#tab-kegiatan input, #tab-kegiatan textarea, #tab-kegiatan select').forEach(el => {
    el.disabled = !canEditEkskul;
  });
}

// ══════════ LOAD DATA (DENGAN FILTER SEKOLAH) ══════════
async function loadMasterSiswa(){
  try {
    const snap = await getDocs(collection(db,'sican_siswa'));
    masterSiswa = [];
    snap.forEach(d => masterSiswa.push({ id:d.id, ...d.data() }));
  } catch(e){ console.error(e); }
}

async function loadUsers(){
  try {
    console.log('🔎 Memuat users...');
    const snap = await getDocs(collection(db,'users'));
    daftarUsers = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.email) {
        daftarUsers.push({
          id: d.id, email: data.email, nama: data.nama || data.namaResmi || '',
          role: data.role || '', akses_ekskul: data.akses_ekskul || false, nip: data.nip || ''
        });
      }
    });
    console.log('✅ Users loaded:', daftarUsers.length);
    
    const pembinaSelect = $('ePembina');
    if (pembinaSelect) {
      pembinaSelect.innerHTML = '<option value="">-- Pilih Pembina --</option>' +
        daftarUsers.map(u => `<option value="${u.email}">${u.nama} (${u.role})</option>`).join('');
    }
  } catch(e){ console.error('❌ Error load users:', e); }
}

async function loadEkskul(){
  try {
    console.log('📦 Memuat ekskul untuk school_id:', userSekolahId);
    const q = query(collection(db,'ekskul_master'), where('sekolah_id', '==', userSekolahId));
    const snap = await getDocs(q);
    console.log('📦 Ekskul ditemukan:', snap.size);
    
    semuaEkskul = [];
    snap.forEach(d => {
      console.log('  - Ekskul:', d.data().nama);
      semuaEkskul.push({ id:d.id, ...d.data() });
    });
    
    daftarEkskul = semuaEkskul; 
    populateSelectEkskul();
  } catch(e){ console.error('❌ Error load ekskul:', e); }
}

function populateSelectEkskul(){
  const sel = $('selectEkskul');
  if (!daftarEkskul.length) { sel.innerHTML = '<option value="">-- Belum ada ekskul --</option>'; return; }
  sel.innerHTML = daftarEkskul.map(e => `<option value="${e.id}">${e.ikon||'🏹'} ${e.nama}</option>`).join('');
  selectEkskul(daftarEkskul[0].id);
}

async function selectEkskul(id){
  selectedEkskul = daftarEkskul.find(e => e.id === id) || null;
  await Promise.all([ loadAnggota(), loadKegiatan() ]);
  renderAnggota(); renderChecklist(); renderKegiatan(); renderRekap(); renderDashboard();
}

async function loadAnggota(){
  daftarAnggota = [];
  if (!selectedEkskul) return;
  const q = query(collection(db,'ekskul_anggota'), where('sekolah_id', '==', userSekolahId), where('ekskul_id', '==', selectedEkskul.id));
  const snap = await getDocs(q);
  snap.forEach(d => daftarAnggota.push({id:d.id,...d.data()}));
  daftarAnggota.sort((a,b)=>(a.nama||'').localeCompare(b.nama||''));
}

async function loadKegiatan(){
  daftarKegiatan = [];
  if (!selectedEkskul) return;
  const q = query(collection(db,'ekskul_kegiatan'), where('sekolah_id', '==', userSekolahId), where('ekskul_id', '==', selectedEkskul.id));
  const snap = await getDocs(q);
  snap.forEach(d => daftarKegiatan.push({id:d.id,...d.data()}));
  daftarKegiatan.sort((a,b)=>(b.tanggal||'').localeCompare(a.tanggal||''));
}

function refreshAll(){
  renderMaster(); renderAnggota(); renderChecklist(); renderKegiatan(); renderRekap(); renderDashboard();
}

// ══════════ MASTER (Admin & Pengelola) ══════════
function renderMaster(){
  const list = $('masterEkskulList');
  if (!semuaEkskul.length) { list.innerHTML = '<div class="empty">Belum ada ekskul. Klik ➕ Tambah.</div>'; return; }
  list.innerHTML = semuaEkskul.map(e => `
    <div class="row-item">
      <div><b style="font-size:1rem">${e.ikon||'🏹'} ${e.nama}</b>
        <div style="font-size:.8rem;color:#64748b">👤 ${e.pembina_nama||'Belum ada pembina'} • 📅 ${e.hari||'-'} ${e.jam_mulai||''}-${e.jam_selesai||''}</div></div>
      <div style="display:flex;gap:6px">
        ${canEditEkskul ? `
        <button class="btn btn-secondary btn-sm" onclick="editEkskul('${e.id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="hapusEkskul('${e.id}','${(e.nama||'').replace(/'/g,"\\'")}')">🗑️</button>
        ` : ''}
      </div>
    </div>`).join('');
}

window.editEkskul = (id) => {
  if (!canEditEkskul) return;
  const e = semuaEkskul.find(x=>x.id===id); if(!e) return;
  $('ekskulEditKey').value = id;
  $('modalEkskulTitle').textContent = '✏️ Edit Ekskul';
  $('eNama').value=e.nama||''; $('eIkon').value=e.ikon||'⚜️'; $('eHari').value=e.hari||'Senin';
  $('eRuang').value=e.ruang||''; $('eJamMulai').value=e.jam_mulai||''; $('eJamSelesai').value=e.jam_selesai||'';
  $('ePembina').value=e.pembina_email||''; $('eDesk').value=e.deskripsi||'';
  $('modalEkskul').classList.add('show');
};

window.hapusEkskul = async (id, nama) => {
  if (!canEditEkskul) return;
  if (!confirm(`Hapus ekskul "${nama}"? Anggota & kegiatan tidak ikut terhapus.`)) return;
  await deleteDoc(doc(db,'ekskul_master', id));
  toast('✅ Ekskul dihapus'); await loadEkskul(); refreshAll();
};

async function simpanEkskul(){
  if (!canEditEkskul) return;
  const nama = $('eNama').value.trim();
  const pembinaEmail = $('ePembina').value;
  if (!nama){ toast('⚠️ Nama ekskul wajib diisi!', true); return; }
  if (!pembinaEmail){ toast('⚠️ Pilih pembina!', true); return; }
  
  const u = daftarUsers.find(x=>x.email===pembinaEmail);
  const data = {
    sekolah_id: userSekolahId, guru_uid: currentUser.uid, guru_nama: currentUser.nama,
    nama, ikon: $('eIkon').value, hari: $('eHari').value, ruang: $('eRuang').value.trim(),
    jam_mulai: $('eJamMulai').value, jam_selesai: $('eJamSelesai').value,
    deskripsi: $('eDesk').value.trim(),
    pembina_email: pembinaEmail, pembina_nama: u ? (u.nama||pembinaEmail) : pembinaEmail,
    aktif: true, updatedAt: new Date().toISOString()
  };
  
  const key = $('ekskulEditKey').value;
  if (key) await updateDoc(doc(db,'ekskul_master', key), data);
  else await addDoc(collection(db,'ekskul_master'), { ...data, createdAt: new Date().toISOString() });
  
  $('modalEkskul').classList.remove('show');
  toast('✅ Ekskul tersimpan'); await loadEkskul(); refreshAll();
}

// ══════════ ANGGOTA ══════════
function renderAnggota(){
  const tb = $('tbodyAnggota');
  if (!daftarAnggota.length) { 
    tb.innerHTML = '<tr><td colspan="5" class="empty" style="padding:2rem;">Belum ada anggota. Isi form di atas untuk menambah.</td></tr>'; 
    return; 
  }
  tb.innerHTML = daftarAnggota.map(a => `
    <tr>
      <td>${a.nis || '<span style="color:#94a3b8;font-style:italic">-</span>'}</td>
      <td><b>${a.nama}</b></td>
      <td>${a.kelas||'-'}</td>
      <td><select onchange="setJabatan('${a.id}', this.value)" ${!canEditEkskul?'disabled':''}>
        ${JABATAN.map(j=>`<option ${j===a.jabatan?'selected':''}>${j}</option>`).join('')}
      </select></td>
      <td>${canEditEkskul ? `<button class="btn btn-danger btn-sm" onclick="hapusAnggota('${a.id}')">🗑️</button>` : ''}</td>
    </tr>`).join('');
}

window.setJabatan = async (id, val) => { 
  if (!canEditEkskul) return;
  await updateDoc(doc(db,'ekskul_anggota', id), { jabatan: val }); 
  toast('✅ Jabatan diperbarui'); 
};

window.hapusAnggota = async (id) => { 
  if (!canEditEkskul) return;
  if(!confirm('Hapus anggota ini?')) return; 
  await deleteDoc(doc(db,'ekskul_anggota', id)); 
  toast('✅ Anggota dihapus'); 
  await loadAnggota(); renderAnggota(); renderChecklist(); 
};

async function tambahAnggota(s){
  if (!canEditEkskul) { toast('⚠️ Anda hanya punya akses LIHAT!', true); return; }
  if (!selectedEkskul){ toast('⚠️ Pilih ekskul dulu!', true); return; }
  if (daftarAnggota.some(a => a.nis === s.nis)){ toast('⚠️ Siswa sudah jadi anggota!', true); return; }
  
  await addDoc(collection(db,'ekskul_anggota'), {
    sekolah_id: userSekolahId, guru_uid: currentUser.uid,
    ekskul_id: selectedEkskul.id, nis: s.nis||'', nama: s.nama, kelas: s.kelas||'',
    jabatan: 'Anggota', status: 'aktif', joinedAt: new Date().toISOString()
  });
  toast('✅ Anggota ditambahkan'); await loadAnggota(); renderAnggota(); renderChecklist();
}

// ══════════ TAMBAH ANGGOTA MANUAL ══════════
function tambahAnggotaManual(){
  if (!canEditEkskul) { toast('⚠️ Anda hanya punya akses LIHAT!', true); return; }
  if (!selectedEkskul){ toast('⚠️ Pilih ekskul dulu!', true); return; }
  
  const nis = $('manualNIS').value.trim();
  const nama = $('manualNama').value.trim();
  const kelas = $('manualKelas').value.trim();
  
  if (!nama){ toast('⚠️ Nama wajib diisi!', true); return; }
  if (!kelas){ toast('⚠️ Kelas wajib diisi!', true); return; }
  
  // Cek apakah sudah ada anggota dengan NIS yang sama (jika NIS diisi)
  if (nis && daftarAnggota.some(a => a.nis === nis)){ 
    toast('️ Siswa dengan NIS ini sudah jadi anggota!', true); 
    return; 
  }
  
  // Tambah ke database
  const dataAnggota = {
    sekolah_id: userSekolahId, 
    guru_uid: currentUser.uid,
    ekskul_id: selectedEkskul.id, 
    nis: nis || '', // Bisa kosong
    nama: nama, 
    kelas: kelas,
    jabatan: 'Anggota', 
    status: 'aktif', 
    joinedAt: new Date().toISOString()
  };
  
  addDoc(collection(db,'ekskul_anggota'), dataAnggota)
    .then(() => {
      toast('✅ Anggota ditambahkan: ' + nama);
      resetFormAnggota();
      loadAnggota(); 
      renderAnggota(); 
      renderChecklist();
    })
    .catch(e => {
      toast('❌ Gagal menambah: ' + e.message, true);
    });
}

function resetFormAnggota(){
  $('manualNIS').value = '';
  $('manualNama').value = '';
  $('manualKelas').value = '';
}

// ══════════ KEGIATAN + ABSENSI ══════════
function renderChecklist(){
  const box = $('absensiList');
  if (!daftarAnggota.length) { box.innerHTML = '<div class="empty">Pilih ekskul & pastikan ada anggota.</div>'; return; }
  box.innerHTML = daftarAnggota.map(a => `
    <div class="abs-row" data-nis="${a.nis||''}" data-nama="${a.nama}" data-kelas="${a.kelas||''}">
      <div><b>${a.nama}</b> <span style="color:#94a3b8;font-size:.8rem">${a.kelas||''}</span></div>
      <select class="abs-status" ${!canEditEkskul?'disabled':''}>
        <option value="Hadir">✅ Hadir</option><option value="Sakit">🟡 Sakit</option>
        <option value="Izin">🔵 Izin</option><option value="Alpha">❌ Alpha</option>
      </select>
    </div>`).join('');
}

async function simpanKegiatan(){
  if (!canEditEkskul) { toast('⚠️ Anda hanya punya akses LIHAT!', true); return; }
  if (!selectedEkskul){ toast('⚠️ Pilih ekskul!', true); return; }
  if (!$('kJudul').value.trim()){ toast('⚠️ Judul kegiatan wajib diisi!', true); return; }
  if (!daftarAnggota.length){ toast('⚠️ Belum ada anggota untuk diabsen!', true); return; }

  const absensi = [...document.querySelectorAll('#absensiList .abs-row')].map(r => ({
    nis: r.dataset.nis, nama: r.dataset.nama, kelas: r.dataset.kelas,
    status: r.querySelector('.abs-status').value,
  }));

  let fotoBase64 = [];
  const files = [...$('kFoto').files].slice(0,3);
  for (const f of files) fotoBase64.push(await compressImage(f, 800, 0.7));

  const btn = $('btnSimpanKegiatan'); btn.disabled = true; btn.textContent = '⏳ Menyimpan...';
  try {
    await addDoc(collection(db,'ekskul_kegiatan'), {
      sekolah_id: userSekolahId, guru_uid: currentUser.uid, guru_nama: currentUser.nama,
      ekskul_id: selectedEkskul.id, ekskul_nama: selectedEkskul.nama,
      tanggal: $('kTanggal').value, jam: $('kJam').value,
      judul: $('kJudul').value.trim(), materi: $('kMateri').value.trim(),
      tempat: $('kTempat').value.trim(), deskripsi: $('kDesk').value.trim(),
      fotoBase64, fotoCount: fotoBase64.length, absensi,
      createdAt: new Date().toISOString()
    });
    toast('✅ Laporan kegiatan tersimpan!');
    ['kJudul','kMateri','kTempat','kDesk'].forEach(id=>$(id).value=''); $('kFoto').value='';
    renderChecklist(); await loadKegiatan(); renderKegiatan(); renderRekap(); renderDashboard();

    if (['admin','kepala','wakil'].includes(currentUser.role)) {
      await loadAllData(); renderMonitoring();
    }
  } catch(e){ toast('❌ '+e.message, true); }
  finally { btn.disabled=false; btn.textContent='💾 Simpan Laporan'; }
}

function renderKegiatan(){
  const list = $('listKegiatan');
  if (!daftarKegiatan.length) { list.innerHTML = '<div class="empty">Belum ada kegiatan.</div>'; return; }
  list.innerHTML = daftarKegiatan.map(k => {
    const hadir = (k.absensi||[]).filter(a=>a.status==='Hadir').length;
    const total = (k.absensi||[]).length || 0;
    const fotoBtn = (k.fotoBase64 && k.fotoBase64.length)
      ? `<button class="btn btn-secondary btn-sm" onclick="lihatFoto('${k.id}')">📷 ${k.fotoBase64.length}</button>` : '';
    return `<div class="row-item">
      <div><b>${k.judul}</b>
        <div style="font-size:.8rem;color:#64748b">📅 ${k.tanggal} ${k.jam||''} • ✅ ${hadir}/${total} hadir</div></div>
      <div style="display:flex;gap:6px;align-items:center">${fotoBtn}<span class="badge b-aktif">${k.ekskul_nama||''}</span></div>
    </div>`;
  }).join('');
}

window.lihatFoto = (id) => {
  const k = daftarKegiatan.find(x=>x.id===id); if(!k) return;
  $('fotoModalImgs').innerHTML = (k.fotoBase64||[]).length
    ? (k.fotoBase64||[]).map(f=>`<img src="${f}" style="width:100%;border-radius:8px;margin-bottom:10px;cursor:zoom-in" onclick="window.open(this.src,'_blank')">`).join('')
    : '<div class="empty">Tidak ada foto</div>';
  $('fotoModalTitle').textContent = `📷 Dokumentasi: ${k.judul}`;
  $('fotoModal').classList.add('show');
};

// ══════════ REKAP & DASHBOARD ══════════
function renderRekap(){
  const tb = $('tbodyRekap');
  if (!daftarAnggota.length) { tb.innerHTML = '<tr><td colspan="10" class="empty">Belum ada anggota.</td></tr>'; return; }
  const rows = daftarAnggota.map(a => {
    let H=0,S=0,I=0,A=0;
    daftarKegiatan.forEach(k => {
      const rec = (k.absensi||[]).find(x => x.nis === a.nis);
      if (rec) { if(rec.status==='Hadir')H++; else if(rec.status==='Sakit')S++; else if(rec.status==='Izin')I++; else A++; }
    });
    const total = daftarKegiatan.length || 1;
    const pct = Math.round((H/total)*100);
    const pred = pct>=90?'Sangat Baik':pct>=75?'Baik':pct>=60?'Cukup':'Kurang';
    return { ...a, H,S,I,A, pct, pred };
  });
  tb.innerHTML = rows.map((r,i) => `
    <tr><td>${i+1}</td><td>${r.nis||'-'}</td><td><b>${r.nama}</b></td><td>${r.kelas||'-'}</td>
    <td>${r.H}</td><td>${r.S}</td><td>${r.I}</td><td>${r.A}</td><td><b>${r.pct}%</b></td><td>${r.pred}</td></tr>`).join('');
}

function renderDashboard(){
  $('stEkskul').textContent = daftarEkskul.length;
  $('stAnggota').textContent = daftarAnggota.length;
  const bulan = localDate().slice(0,7);
  $('stKegiatan').textContent = daftarKegiatan.filter(k => (k.tanggal||'').startsWith(bulan)).length;
  let totH=0, totAll=0;
  daftarKegiatan.forEach(k => (k.absensi||[]).forEach(a => { totAll++; if(a.status==='Hadir') totH++; }));
  $('stHadir').textContent = (totAll ? Math.round((totH/totAll)*100) : 0) + '%';
  const terbaru = daftarKegiatan.slice(0,6);
  $('listTerbaru').innerHTML = terbaru.length ? terbaru.map(k => `
    <div class="row-item"><div><b>${k.judul}</b><div style="font-size:.8rem;color:#64748b">📅 ${k.tanggal} • ${k.ekskul_nama||''}</div></div></div>`).join('')
    : '<div class="empty">Belum ada kegiatan.</div>';
}

// ══════════ EXPORT PDF LAPORAN (SIG INTEGRATED) ══════════
function exportPDF(){
  if (!selectedEkskul){ toast('⚠️ Pilih ekskul!', true); return; }
  const e = selectedEkskul;
  const today = new Date();
  const tglSurat = `${today.getDate()} ${NAMA_BULAN[today.getMonth()]} ${today.getFullYear()}`;
  const y = new Date().getFullYear();
  const tp = `${y}/${y+1}`;
  
  const pembinaUser = daftarUsers.find(u => u.email === e.pembina_email) || {};
  const rawNipPembina = pembinaUser.nip || '';
  const nipPembina = rawNipPembina ? (rawNipPembina.startsWith('NIP.') ? rawNipPembina : 'NIP. ' + rawNipPembina) : 'NIP. ............................................';
  const namaPembinaCetak = formatKapital(e.pembina_nama || '', 'upper');

  const kegRows = daftarKegiatan.map((k,i)=>{
    const h=(k.absensi||[]).filter(x=>x.status==='Hadir').length, t=(k.absensi||[]).length||0;
    return `<tr><td style="text-align:center">${i+1}</td><td>${k.tanggal}</td><td>${k.judul}</td><td>${k.materi||'-'}</td><td style="text-align:center">${h}/${t}</td></tr>`;
  }).join('') || '<tr><td colspan="5" style="text-align:center;font-style:italic">Tidak ada kegiatan</td></tr>';

  const rekapRows = daftarAnggota.map((a,i)=>{
    let H=0,S=0,I=0,A=0;
    daftarKegiatan.forEach(k=>{ const r=(k.absensi||[]).find(x=>x.nis===a.nis); if(r){ if(r.status==='Hadir')H++; else if(r.status==='Sakit')S++; else if(r.status==='Izin')I++; else A++; } });
    const tot=daftarKegiatan.length||1, pct=Math.round(H/tot*100);
    const pred=pct>=90?'Sangat Baik':pct>=75?'Baik':pct>=60?'Cukup':'Kurang';
    return `<tr><td style="text-align:center">${i+1}</td><td>${a.nis||'-'}</td><td>${a.nama}</td><td style="text-align:center">${a.kelas||'-'}</td><td style="text-align:center">${H}</td><td style="text-align:center">${S}</td><td style="text-align:center">${I}</td><td style="text-align:center">${A}</td><td style="text-align:center">${pct}%</td><td style="text-align:center">${pred}</td></tr>`;
  }).join('') || '<tr><td colspan="10" style="text-align:center;font-style:italic">Belum ada anggota</td></tr>';

  let dokHtml = '';
  daftarKegiatan.forEach(k => {
    if (k.fotoBase64 && k.fotoBase64.length) {
      dokHtml += `<div style="margin:15px 0;"><p style="font-weight:bold; margin:5px 0;">${k.tanggal} — ${k.judul}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">${k.fotoBase64.map(f=>`<img src="${f}" style="width:48%;max-width:250px;height:auto;border:1px solid #999;border-radius:4px;">`).join('')}</div></div>`;
    }
  });

  const logoKop = CONFIG_MADRASAH.logo || (location.origin + '/assets/images/kemenag-app.png');
  const kopHtml = `
    <div style="border-bottom:3px double #000; padding-bottom:8px; margin-bottom:16px;">
      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="width:75px; text-align:center; vertical-align:middle; border:none;">
            <img src="${logoKop}" style="width:62px; height:auto;" onerror="this.style.visibility='hidden'">
          </td>
          <td style="text-align:center; border:none;">
            <div style="font-size:14pt; font-weight:bold;">${CONFIG_MADRASAH.kop1}</div>
            <div style="font-size:14pt; font-weight:bold;">${CONFIG_MADRASAH.kop2}</div>
            <div style="font-size:12pt; font-style:italic;">${CONFIG_MADRASAH.alamat}</div>
          </td>
          <td style="width:75px; border:none;"></td>
        </tr>
      </table>
    </div>`;

  const OFFSET_KOTA = 22;
  const SPASI_TTD = 60;
  const GESER_KANAN = 100;
  
  const ttdHtml = `
    <table style="width:100%; margin-top:28px; font-size:12pt;">
      <tr>
        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:24px; padding-top:${OFFSET_KOTA}px;">
          Mengetahui,<br>Kepala Madrasah
          <div style="height:${SPASI_TTD}px;"></div>
          <b><u><span style="font-size:10pt;">${formatKapital(CONFIG_MADRASAH.kepalaMadrasah, 'upper')}</span></u></b><br><b style="font-size:11pt;">${CONFIG_MADRASAH.nipKepala}</b>
        </td>
        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:${GESER_KANAN}px;">
          ${CONFIG_MADRASAH.kota}, ${tglSurat}
          <div style="height:${OFFSET_KOTA}px;"></div>
          Pembina ${e.nama}
          <div style="height:${SPASI_TTD}px;"></div>
          <b><u><span style="font-size:10pt;">${namaPembinaCetak}</span></u></b><br><b style="font-size:11pt;">${nipPembina}</b>
        </td>
      </tr>
    </table>`;

  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Laporan ${e.nama}</title>
  <style>
    @page { size: A4; margin: 15mm 15mm; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; line-height: 1.4; }
    h3 { font-size: 12pt; font-weight: bold; margin: 5px 0; text-transform: uppercase; }
    h4 { font-size: 11pt; font-weight: bold; margin: 15px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 15px; }
    th, td { border: 1px solid #000; padding: 5px 8px; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; font-weight: bold; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  ${kopHtml}
  <div style="text-align:center; margin:0 0 12px;">
    <h3>LAPORAN KEGIATAN & KEHADIRAN EKSTRAKURIKULER</h3>
    <p style="font-size:11pt; margin:3px 0;">${e.ikon||''} ${e.nama} — Tahun Pelajaran ${tp}</p>
  </div>
  <div style="margin-bottom:12px; font-size:11pt;">
    <p>Pembina: <b>${e.pembina_nama||'-'}</b><br>Jadwal: ${e.hari||'-'}, ${e.jam_mulai||''}–${e.jam_selesai||''} ${e.ruang?'• '+e.ruang:''}</p>
  </div>
  <h4>A. Daftar Kegiatan</h4>
  <table><thead><tr><th style="width:5%">No</th><th style="width:12%">Tanggal</th><th>Kegiatan</th><th>Materi</th><th style="width:12%">Hadir/Total</th></tr></thead><tbody>${kegRows}</tbody></table>
  <h4>B. Rekap Kehadiran per Siswa</h4>
  <table><thead><tr><th style="width:5%">No</th><th style="width:12%">NIS</th><th>Nama</th><th style="width:10%">Kelas</th><th style="width:5%">H</th><th style="width:5%">S</th><th style="width:5%">I</th><th style="width:5%">A</th><th style="width:8%">%</th><th style="width:12%">Predikat</th></tr></thead><tbody>${rekapRows}</tbody></table>
  <h4>C. Dokumentasi Kegiatan</h4>
  ${dokHtml || '<p style="font-style:italic;color:#64748b;">Tidak ada dokumentasi foto.</p>'}
  ${ttdHtml}
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }<\/script>
</body>
</html>`);
  w.document.close();
}

// ══════════ MONITORING (Kamad/Waka/Admin) ══════════
async function loadAllData(){
  try {
    const qAnggota = query(collection(db,'ekskul_anggota'), where('sekolah_id', '==', userSekolahId));
    const qKegiatan = query(collection(db,'ekskul_kegiatan'), where('sekolah_id', '==', userSekolahId));
    const [sa, sk] = await Promise.all([ getDocs(qAnggota), getDocs(qKegiatan) ]);
    allAnggota = []; allKegiatan = [];
    sa.forEach(d => allAnggota.push({id:d.id, ...d.data()}));
    sk.forEach(d => allKegiatan.push({id:d.id, ...d.data()}));
  } catch(e) { console.error('Gagal load all data:', e); }
}

function renderMonitoring(){
  const box = $('monitorContent');
  if (!semuaEkskul.length) { box.innerHTML = '<div class="empty">Belum ada ekskul.</div>'; return; }

  const data = semuaEkskul.map(e => {
    const ang = allAnggota.filter(a => a.ekskul_id === e.id).length;
    const keg = allKegiatan.filter(k => k.ekskul_id === e.id);
    let h = 0, t = 0;
    keg.forEach(k => (k.absensi||[]).forEach(a => { t++; if (a.status === 'Hadir') h++; }));
    return { e, ang, keg: keg.length, pct: t ? Math.round(h/t*100) : 0 };
  });

  const totAng = data.reduce((s, x) => s + x.ang, 0);
  const totKeg = data.reduce((s, x) => s + x.keg, 0);
  const avgPct = Math.round(data.reduce((s, x) => s + x.pct, 0) / (data.length || 1));
  const maxAng = Math.max(...data.map(x => x.ang), 1);

  box.innerHTML = `
    <div class="stat-row">
      <div class="stat"><h2>${semuaEkskul.length}</h2><p>Ekskul</p></div>
      <div class="stat"><h2>${totAng}</h2><p>Total Anggota</p></div>
      <div class="stat"><h2>${totKeg}</h2><p>Total Kegiatan</p></div>
      <div class="stat"><h2>${avgPct}%</h2><p>Rata-rata Kehadiran</p></div>
    </div>
    <div class="card">
      <h4 style="margin:0 0 12px;color:#5b21b6">👥 Jumlah Anggota per Ekskul</h4>
      ${data.map(x => `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:4px"><b>${x.e.ikon||''} ${x.e.nama}</b><span>${x.ang} anggota</span></div><div style="background:#ede9fe;border-radius:6px;height:12px"><div style="background:#7c3aed;height:12px;border-radius:6px;width:${Math.round(x.ang/maxAng*100)}%"></div></div></div>`).join('')}
    </div>
    <div class="card">
      <h4 style="margin:0 0 12px;color:#5b21b6">✅ Tingkat Kehadiran per Ekskul</h4>
      ${data.map(x => `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:4px"><b>${x.e.nama}</b><span>${x.pct}%</span></div><div style="background:#ede9fe;border-radius:6px;height:12px"><div style="background:${x.pct>=75?'#16a34a':x.pct>=60?'#f59e0b':'#dc2626'};height:12px;border-radius:6px;width:${x.pct}%"></div></div></div>`).join('')}
    </div>
    <div class="card">
      <h4 style="margin:0 0 12px;color:#5b21b6">📋 Ringkasan Lintas Ekskul</h4>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ekskul</th><th>Pembina</th><th>Anggota</th><th>Kegiatan</th><th>Kehadiran</th></tr></thead>
          <tbody>${data.map(x => `<tr><td><b>${x.e.ikon||''} ${x.e.nama}</b></td><td>${x.e.pembina_nama||'-'}</td><td>${x.ang}</td><td>${x.keg}</td><td><b>${x.pct}%</b></td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

// ══════════ PENGELOLA EKSKUL (Admin Only) ══════════
async function simpanPengelolaEkskul(){
  if (currentUser.role !== 'admin') { toast('⚠️ Hanya admin!', true); return; }
  const emailBaru = $('selPengelolaEkskul').value;
  if (!emailBaru) { toast('⚠️ Pilih user terlebih dahulu!', true); return; }
  const userBaru = daftarUsers.find(x => x.email === emailBaru);
  if (!userBaru) { toast('⚠️ User tidak ditemukan!', true); return; }
  
  try {
    const configSnap = await getDocs(query(collection(db, 'ekskul_config'), where('type', '==', 'pengelola'), where('sekolah_id', '==', userSekolahId)));
    if (!configSnap.empty) {
      const oldConfig = configSnap.docs[0].data();
      if (oldConfig.pengelola_email && oldConfig.pengelola_email !== emailBaru) {
        await updateDoc(doc(db, 'users', oldConfig.pengelola_email), { akses_ekskul: false });
      }
      await updateDoc(configSnap.docs[0].ref, { pengelola_email: emailBaru, pengelola_nama: userBaru.nama || userBaru.namaResmi || emailBaru });
    } else {
      await addDoc(collection(db, 'ekskul_config'), { type: 'pengelola', sekolah_id: userSekolahId, pengelola_email: emailBaru, pengelola_nama: userBaru.nama || userBaru.namaResmi || emailBaru });
    }
    await updateDoc(doc(db, 'users', emailBaru), { akses_ekskul: true });
    toast('✅ Pengelola Ekskul ditetapkan: ' + (userBaru.nama || userBaru.namaResmi || emailBaru));
    await loadUsers(); computeAccessEkskul(); updateTabPengelolaUI();
  } catch(e) { toast('❌ Gagal: ' + e.message, true); }
}

async function cabutAksesPengelolaEkskul(){
  if (currentUser.role !== 'admin') { toast('⚠️ Hanya admin!', true); return; }
  const configSnap = await getDocs(query(collection(db, 'ekskul_config'), where('type', '==', 'pengelola'), where('sekolah_id', '==', userSekolahId)));
  if (configSnap.empty) { toast('⚠️ Tidak ada pengelola yang aktif!', true); return; }
  const oldConfig = configSnap.docs[0].data();
  if (!oldConfig.pengelola_email) { toast('⚠️ Tidak ada pengelola yang aktif!', true); return; }
  if (!confirm(`❌ Cabut akses Ekskul dari "${oldConfig.pengelola_nama}"?\n\nUser ini akan kembali menjadi "Hanya Lihat".`)) return;
  
  try {
    await updateDoc(doc(db, 'users', oldConfig.pengelola_email), { akses_ekskul: false });
    await updateDoc(configSnap.docs[0].ref, { pengelola_email: '', pengelola_nama: '' });
    toast('✅ Akses pengelola Ekskul telah dicabut!');
    await loadUsers(); computeAccessEkskul(); updateTabPengelolaUI();
    if ($('selPengelolaEkskul')) $('selPengelolaEkskul').value = '';
    if ($('pengelolaEkskulNow')) $('pengelolaEkskulNow').textContent = 'Belum ada';
  } catch(e) { toast('❌ Gagal: ' + e.message, true); }
}

async function updateTabPengelolaUI(){
  try {
    const snap = await getDocs(query(collection(db, 'ekskul_config'), where('type', '==', 'pengelola'), where('sekolah_id', '==', userSekolahId)));
    let config = { pengelola_email: '', pengelola_nama: '' };
    if (!snap.empty) config = snap.docs[0].data();
    
    const btnCabut = $('btnCabutAksesEkskul');
    if (btnCabut) btnCabut.style.display = config.pengelola_email ? 'inline-flex' : 'none';
    if ($('pengelolaEkskulNow')) $('pengelolaEkskulNow').textContent = config.pengelola_nama || 'Belum ada';
  } catch(e) { console.error('Gagal update UI pengelola:', e); }
}

// ══════════ HELPERS ═════════
function compressImage(file, maxWidth, quality){
  return new Promise(res => {
    const r = new FileReader();
    r.onload = e => { const img = new Image(); img.onload = () => {
      let w=img.width,h=img.height; if(w>maxWidth){h=(h*maxWidth)/w;w=maxWidth;}
      const c=document.createElement('canvas'); c.width=w;c.height=h;
      const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.drawImage(img,0,0,w,h);
      res(c.toDataURL('image/jpeg',quality)); }; img.src=e.target.result; };
    r.readAsDataURL(file);
  });
}

function bindSearch(inputId, dropId, onPick){
  const input=$(inputId), drop=$(dropId);
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (q.length<1){ drop.style.display='none'; return; }
    const res = masterSiswa.filter(s => (s.nama||'').toLowerCase().includes(q)||(s.kelas||'').toLowerCase().includes(q)||(s.nis||'').toLowerCase().includes(q)).slice(0,10);
    drop.innerHTML = res.length ? res.map(s=>`<div class="search-item" data-id="${s.id}"><b>${s.nama}</b> — ${s.kelas||'-'}</div>`).join('') : '<div class="search-item">Tidak ditemukan</div>';
    drop.style.display='block';
    drop.querySelectorAll('.search-item').forEach(el => el.onclick = () => { const s=masterSiswa.find(x=>x.id===el.dataset.id); onPick(s); drop.style.display='none'; input.value=''; });
  });
  document.addEventListener('click', e => { if(!e.target.closest('#'+inputId)) drop.style.display='none'; });
}

function bindEvents(){
  $('selectEkskul').onchange = e => selectEkskul(e.target.value);
  $('btnAddEkskul').onclick = () => { if (!canEditEkskul) return; $('ekskulEditKey').value=''; $('modalEkskulTitle').textContent='➕ Tambah Ekskul'; ['eNama','eRuang','eDesk'].forEach(id=>$(id).value=''); $('modalEkskul').classList.add('show'); };
  $('btnBatalEkskul').onclick = () => $('modalEkskul').classList.remove('show');
  $('btnSimpanEkskul').onclick = simpanEkskul;
  $('btnSemuaHadir').onclick = () => document.querySelectorAll('#absensiList .abs-status').forEach(s=>s.value='Hadir');
  $('btnSimpanKegiatan').onclick = simpanKegiatan;
  $('btnTutupFoto').onclick = () => $('fotoModal').classList.remove('show');
  $('btnExportPDF').onclick = exportPDF;
  $('btnSimpanPengelolaEkskul').onclick = simpanPengelolaEkskul;
  $('btnCabutAksesEkskul').onclick = cabutAksesPengelolaEkskul;
  // Event listener untuk tambah anggota manual
const btnTambahManual = $('btnTambahAnggotaManual');
if(btnTambahManual) {
  btnTambahManual.onclick = tambahAnggotaManual;
}

  document.querySelectorAll('.tab').forEach(t => t.onclick = async () => {
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
    ['dashboard','master','anggota','kegiatan','rekap','monitor','pengelola'].forEach(id => {
      const el = $('tab-'+id); if(el) el.style.display = (id===t.dataset.tab)?'block':'none';
    });
    if (t.dataset.tab === 'pengelola') {
      await loadUsers(); updateTabPengelolaUI();
      const sel = $('selPengelolaEkskul');
      if (sel && daftarUsers.length > 0) {
        let options = '<option value="">-- Pilih User --</option>';
        options += daftarUsers.filter(u => u.email && u.email.trim() !== '').map(u => {
          const nama = u.nama || u.namaResmi || u.email || 'Tanpa Nama';
          const role = u.role ? ` - ${u.role}` : '';
          const hasAccess = u.akses_ekskul ? ' (✅ Pengelola Ekskul)' : '';
          return `<option value="${u.email}">${nama}${role}${hasAccess}</option>`;
        }).join('');
        sel.innerHTML = options;
      }
    }
  });
}