// ══════════════════════════════════════════════
// SIAGA CORE - Ekstrakurikuler (ISOLASI SEKOLAH + AKSES PENGELOLA)
// ══════════════════════════════════════════════
import { auth, db } from "../js/firebase-config.js";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

onAuthStateChanged(auth, async (u) => { 
  if (!u) {
    window.location.href = '../home.html';
  } else {
    await initApp(u);
  }
});

let currentUser = { uid: '', nama: '', email: '', role: 'guru' };
let userSekolahId = '';
let canEditEkskul = false;

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
const JABATAN = ['Anggota','Ketua','Wakil','Sekretaris','Bendahara'];
const kapitalNama = (n='') => { const i=n.indexOf(','); return i===-1 ? n.toUpperCase() : n.slice(0,i).toUpperCase()+n.slice(i); };

const MADRASAH = {
  kemenag : 'KEMENTERIAN AGAMA KABUPATEN BANTAENG',
  nama    : 'MADRASAH ALIYAH NEGERI BANTAENG',
  alamat  : 'Jl. ... (isi alamat lengkap madrasah)',
  kepala  : { nama: 'Muhammad Arif Pither, S.Ag.,M.M.,M.Pd', nip: '19710930 200710 1 001' }
};

// ══════════ INIT ══════════
async function initApp(u) {
  currentUser.uid = u.uid;
  currentUser.email = u.email;
  
  try {
    const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', currentUser.email)));
    if (!userDoc.empty) {
      const data = userDoc.docs[0].data();
      currentUser.nama = data.nama || data.namaResmi || currentUser.email;
      currentUser.role = data.role || 'guru';
      userSekolahId = data.school_id || data.sekolah_id || '';
    }
  } catch(e) { console.error('Gagal ambil data user:', e); }

  if (!userSekolahId) {
    toast('⚠️ Akun Anda belum terdaftar di sekolah manapun!', true);
    return;
  }

  $('userBadge').textContent = (currentUser.role==='admin'?'👑':'👤') + ' ' + currentUser.nama;

  if (currentUser.role === 'admin') {
    $('tabMasterBtn').style.display = 'inline-block';
    $('tabPengelolaBtn').style.display = 'inline-block';
  }
  if (['admin','kepala','wakil'].includes(currentUser.role)) {
    $('tabMonitorBtn').style.display = 'inline-block';
  }

  $('kTanggal').value = localDate();
  $('kJam').value = new Date().toTimeString().slice(0,5);

  await Promise.all([ loadMasterSiswa(), loadUsers(), loadEkskul() ]);

  if (['admin','kepala','wakil'].includes(currentUser.role)) {
    await loadAllData();
    renderMonitoring();
  }

  computeAccessEkskul();
  bindEvents();
  refreshAll();
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
    const snap = await getDocs(collection(db,'users'));
    daftarUsers = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.email) {
        daftarUsers.push({
          id: d.id, email: data.email, nama: data.nama || data.namaResmi || '',
          role: data.role || '', akses_ekskul: data.akses_ekskul || false
        });
      }
    });
    
    const pembinaSelect = $('ePembina');
    if (pembinaSelect) {
      pembinaSelect.innerHTML = '<option value="">-- Pilih Pembina --</option>' +
        daftarUsers.map(u => `<option value="${u.email}">${u.nama} (${u.role})</option>`).join('');
    }
  } catch(e){ console.error(e); }
}

async function loadEkskul(){
  try {
    const q = query(collection(db,'ekskul_master'), where('sekolah_id', '==', userSekolahId));
    const snap = await getDocs(q);
    semuaEkskul = [];
    snap.forEach(d => semuaEkskul.push({ id:d.id, ...d.data() }));
    daftarEkskul = semuaEkskul; 
    populateSelectEkskul();
  } catch(e){ console.error(e); }
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
  if (!daftarAnggota.length) { tb.innerHTML = '<tr><td colspan="5" class="empty">Belum ada anggota.</td></tr>'; return; }
  tb.innerHTML = daftarAnggota.map(a => `
    <tr>
      <td>${a.nis||'-'}</td><td><b>${a.nama}</b></td><td>${a.kelas||'-'}</td>
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

// ══════════ EXPORT PDF LAPORAN ══════════
function exportPDF(){
  if (!selectedEkskul){ toast('⚠️ Pilih ekskul!', true); return; }
  const e = selectedEkskul;
  const tgl = new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'});
  const y = new Date().getFullYear();
  const tp = `${y}/${y+1}`;
  const pembinaUser = daftarUsers.find(u => u.email === e.pembina_email) || {};
  const pembinaNip = pembinaUser.nip || '-';

  const kegRows = daftarKegiatan.map((k,i)=>{
    const h=(k.absensi||[]).filter(x=>x.status==='Hadir').length, t=(k.absensi||[]).length||0;
    return `<tr><td>${i+1}</td><td>${k.tanggal}</td><td>${k.judul}</td><td>${k.materi||'-'}</td><td>${h}/${t}</td></tr>`;
  }).join('');

  const rekapRows = daftarAnggota.map((a,i)=>{
    let H=0,S=0,I=0,A=0;
    daftarKegiatan.forEach(k=>{ const r=(k.absensi||[]).find(x=>x.nis===a.nis); if(r){ if(r.status==='Hadir')H++; else if(r.status==='Sakit')S++; else if(r.status==='Izin')I++; else A++; } });
    const tot=daftarKegiatan.length||1, pct=Math.round(H/tot*100);
    const pred=pct>=90?'Sangat Baik':pct>=75?'Baik':pct>=60?'Cukup':'Kurang';
    return `<tr><td>${i+1}</td><td>${a.nis||'-'}</td><td>${a.nama}</td><td>${a.kelas||'-'}</td><td>${H}</td><td>${S}</td><td>${I}</td><td>${A}</td><td>${pct}%</td><td>${pred}</td></tr>`;
  }).join('');

  let dokHtml = '';
  daftarKegiatan.forEach(k => {
    if (k.fotoBase64 && k.fotoBase64.length) {
      dokHtml += `<p style="margin:8px 0 4px"><b>${k.tanggal} — ${k.judul}</b></p>
        <div class="dok">${k.fotoBase64.map(f=>`<img src="${f}">`).join('')}</div>`;
    }
  });

  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Laporan ${e.nama}</title><style>
    body{font-family:'Times New Roman',serif;font-size:11pt;color:#000;padding:20px;}
    .kop{text-align:center;border-bottom:3px double #000;padding-bottom:8px;margin-bottom:14px;}
    .kop h2{margin:2px 0;font-size:14pt}.kop h3{margin:2px 0;font-size:12pt}.kop p{margin:2px 0;font-size:9pt}
    h4{margin:14px 0 6px} table{width:100%;border-collapse:collapse;font-size:10pt}
    th,td{border:1px solid #000;padding:6px;text-align:left} th{background:#eee}
    .dok{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 12px}
    .dok img{width:48%;height:auto;border:1px solid #999;border-radius:4px;page-break-inside:avoid}
    .sign{display:flex;justify-content:space-between;margin-top:30px}
    .sign div{text-align:left;line-height:1.5} .sign .kiri{width:48%;padding-top:22px} .sign .kanan{width:34%} .sign .ttd{height:70px}
  </style></head><body>
  <div class="kop"><h2>${MADRASAH.kemenag}</h2><h3>${MADRASAH.nama}</h3><p>${MADRASAH.alamat}</p></div>
  <h3 style="text-align:center">LAPORAN KEGIATAN & KEHADIRAN EKSTRAKURIKULER</h3>
  <p style="text-align:center"><b>${e.ikon||''} ${e.nama}</b> — Tahun Pelajaran ${tp}</p>
  <p>Pembina: <b>${e.pembina_nama||'-'}</b><br>Jadwal: ${e.hari||'-'}, ${e.jam_mulai||''}–${e.jam_selesai||''} ${e.ruang?'• '+e.ruang:''}</p>
  <h4>A. Daftar Kegiatan</h4>
  <table><thead><tr><th>No</th><th>Tanggal</th><th>Kegiatan</th><th>Materi</th><th>Hadir/Total</th></tr></thead>
  <tbody>${kegRows||'<tr><td colspan="5">Belum ada kegiatan</td></tr>'}</tbody></table>
  <h4>B. Rekap Kehadiran per Siswa</h4>
  <table><thead><tr><th>No</th><th>NIS</th><th>Nama</th><th>Kelas</th><th>H</th><th>S</th><th>I</th><th>A</th><th>%</th><th>Predikat</th></tr></thead>
  <tbody>${rekapRows||'<tr><td colspan="10">Belum ada anggota</td></tr>'}</tbody></table>
  <h4>C. Dokumentasi Kegiatan</h4>
  ${dokHtml || '<p>Tidak ada dokumentasi foto.</p>'}
  <div class="sign">
    <div class="kiri">Mengetahui,<br>Kepala Madrasah<div class="ttd"></div><b><u>${kapitalNama(MADRASAH.kepala.nama)}</u></b><br><b>NIP. ${MADRASAH.kepala.nip}</b></div>
    <div class="kanan">Bantaeng, &nbsp;&nbsp;&nbsp; ${tgl}<div style="height:22px"></div>Pembina ${e.nama}<div class="ttd"></div><b><u>${kapitalNama(e.pembina_nama||'')}</u></b><br><b>NIP. ${pembinaNip}</b></div>
  </div>
  <script>window.onload=function(){window.print();}<\/script></body></html>`);
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
    const configDoc = await getDocs(query(collection(db, 'ekskul_config'), where('type', '==', 'pengelola')));
    if (!configDoc.empty) {
      const oldConfig = configDoc.docs[0].data();
      if (oldConfig.pengelola_email && oldConfig.pengelola_email !== emailBaru) {
        await updateDoc(doc(db, 'users', oldConfig.pengelola_email), { akses_ekskul: false });
      }
      await updateDoc(configDoc.docs[0].ref, { pengelola_email: emailBaru, pengelola_nama: userBaru.nama || userBaru.namaResmi || emailBaru });
    } else {
      await addDoc(collection(db, 'ekskul_config'), { type: 'pengelola', sekolah_id: userSekolahId, pengelola_email: emailBaru, pengelola_nama: userBaru.nama || userBaru.namaResmi || emailBaru });
    }
    await updateDoc(doc(db, 'users', emailBaru), { akses_ekskul: true });
    toast('✅ Pengelola Ekskul ditetapkan: ' + (userBaru.nama || userBaru.namaResmi || emailBaru));
    await loadUsers(); computeAccessEkskul(); updateTabPengelolaUI();
    $('modalPengelolaEkskul')?.classList.remove('show');
  } catch(e) { toast('❌ Gagal: ' + e.message, true); }
}

async function cabutAksesPengelolaEkskul(){
  if (currentUser.role !== 'admin') { toast('⚠️ Hanya admin!', true); return; }
  const configDoc = await getDocs(query(collection(db, 'ekskul_config'), where('type', '==', 'pengelola')));
  if (configDoc.empty) { toast('⚠️ Tidak ada pengelola yang aktif!', true); return; }
  const oldConfig = configDoc.docs[0].data();
  if (!oldConfig.pengelola_email) { toast('⚠️ Tidak ada pengelola yang aktif!', true); return; }
  if (!confirm(`❌ Cabut akses Ekskul dari "${oldConfig.pengelola_nama}"?\n\nUser ini akan kembali menjadi "Hanya Lihat".`)) return;
  
  try {
    await updateDoc(doc(db, 'users', oldConfig.pengelola_email), { akses_ekskul: false });
    await updateDoc(configDoc.docs[0].ref, { pengelola_email: '', pengelola_nama: '' });
    toast('✅ Akses pengelola Ekskul telah dicabut!');
    await loadUsers(); computeAccessEkskul(); updateTabPengelolaUI();
    if ($('selPengelolaEkskul')) $('selPengelolaEkskul').value = '';
    if ($('pengelolaEkskulNow')) $('pengelolaEkskulNow').textContent = 'Belum ada';
  } catch(e) { toast('❌ Gagal: ' + e.message, true); }
}

function updateTabPengelolaUI(){
  getDocs(query(collection(db, 'ekskul_config'), where('type', '==', 'pengelola'))).then(snap => {
    let config = { pengelola_email: '', pengelola_nama: '' };
    if (!snap.empty) config = snap.docs[0].data();
    
    const infoBox = $('infoPengelolaEkskulAktif');
    const namaBox = $('namaPengelolaEkskulAktif');
    const btnCabut = $('btnCabutAksesEkskul');
    
    if (infoBox && namaBox) {
      if (config.pengelola_email) { infoBox.style.display = 'block'; namaBox.textContent = config.pengelola_nama || config.pengelola_email; } 
      else { infoBox.style.display = 'none'; }
    }
    if (btnCabut) btnCabut.style.display = config.pengelola_email ? 'inline-flex' : 'none';
    if ($('pengelolaEkskulNow')) $('pengelolaEkskulNow').textContent = config.pengelola_nama || 'Belum ada';
  });
}

// ══════════ HELPERS ══════════
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
  bindSearch('cariAnggota','dropAnggota', tambahAnggota);

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