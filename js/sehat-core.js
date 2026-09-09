// ══════════════════════════════════════════════
// SEHAT CORE - UKS Digital (SIG INTEGRATED)
// ══════════════════════════════════════════════

const db = firebase.firestore();
const auth = firebase.auth();

// ══════════════════════════════════════════════
// ✏️ KONFIGURASI MADRASAH (KOP & TTD PDF) - SIG
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

  const cols = ['pengaturan_user', 'identitas_madrasah', 'sekolah', 'sehat_config',
                'pengaturan', 'settings', 'config', 'sig'];
  for (const c of cols) {
    try { const a = await db.collection(c).doc(currentUserEmail).get();   if (a.exists) { sumber.push(a.data()); continue; } } catch (e) {}
    try { const q = await db.collection(c).where('email', '==', currentUserEmail).limit(1).get(); q.forEach(d => sumber.push(d.data())); } catch (e) {}
  }

  try {
    const g = await db.collection('identitas_madrasah').limit(1).get();
    g.forEach(d => sumber.push(d.data()));
  } catch (e) {}

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

  console.log(ketemu
    ? '✅ SIG dimuat → ' + CONFIG_MADRASAH.kop1 + ' / ' + CONFIG_MADRASAH.kop2
    : '⚠️ SIG: data identitas tidak ditemukan di sumber mana pun');
}

async function fetchSekolahAktif() {
  if (!currentUserEmail || !userSekolahId) return;
  
  try {
    const sdoc = await db.collection('sekolah').doc(userSekolahId).get();
    if (!sdoc.exists) return;
    
    const d = sdoc.data();
    console.log('🏫 Data sekolah aktif ditemukan:', d);
    
    if (d.kop1) CONFIG_MADRASAH.kop1 = d.kop1;
    if (d.kop2) CONFIG_MADRASAH.kop2 = d.kop2;
    else if (d.nama) CONFIG_MADRASAH.kop2 = d.nama.toUpperCase();
    if (d.alamat) CONFIG_MADRASAH.alamat = d.alamat;
    if (d.kota) CONFIG_MADRASAH.kota = d.kota;
    if (d.kepala_nama) CONFIG_MADRASAH.kepalaMadrasah = d.kepala_nama;
    if (d.kepala_nip) {
      CONFIG_MADRASAH.nipKepala = d.kepala_nip.startsWith('NIP.') 
        ? d.kepala_nip 
        : 'NIP. ' + d.kepala_nip;
    }
    
    console.log('✅ [Multi-Sekolah] CONFIG_MADRASAH di-override:', {
      kop2: CONFIG_MADRASAH.kop2,
      kepala: CONFIG_MADRASAH.kepalaMadrasah
    });
  } catch (e) {
    console.warn('⚠️ fetchSekolahAktif gagal:', e.message);
  }
}

auth.onAuthStateChanged(u => { 
  if (!u) {
    window.location.href = '../home.html';
  } else {
    console.log('✅ User logged in:', u.email);
    initApp();
  }
});

let kunjunganCache=[], daftarObat=[], logObat=[], skriningCache=[], daftarUsers=[];
let currentUserEmail='', currentUserRole='', currentUserUid='';
let config={ pengelola_email:'', pengelola_nama:'' };
let canEdit=false;
let userSekolahId=''; 

const $=id=>document.getElementById(id);
const toast=(m,e=false)=>{const t=document.createElement('div');t.className='toast'+(e?' err':'');t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2800);};
const localDate=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const formatDate=s=>s?new Date(s).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'-';
const sanitizeKey=s=>String(s).replace(/[^a-zA-Z0-9_-]/g,'_');
const isExpired=o=>o.ed&&new Date(o.ed)<new Date();
const hasilLabel={kelas:['✅ Kembali','b-kelas'],istirahat:['🛏️ Istirahat','b-istirahat'],pulang:['🏠 Pulang','b-pulang'],rujukan:['🏥 Dirujuk','b-rujukan']};

const isAdmin=()=> String(currentUserRole).toLowerCase()==='admin';

function computeAccess(){
  if (isAdmin()) {
    canEdit = true;
  } else {
    const isConfigPengelola = currentUserEmail && currentUserEmail === config.pengelola_email;
    const currentUserData = daftarUsers.find(u => u.email === currentUserEmail);
    const hasUksAccess = currentUserData && currentUserData.akses_uks === true;
    canEdit = isConfigPengelola || hasUksAccess;
  }
  applyAccess();
}

function applyAccess(){
  const ab=$('accessBadge'); if(ab) ab.textContent = canEdit ? '✏️ Pengelola' : '👁️ Hanya Lihat';
  const ts=$('tabSettingsBtn'); if(ts) ts.style.display = isAdmin() ? 'inline-block' : 'none';
  const bAO=$('btnAddObat'); if(bAO) bAO.style.display = canEdit ? 'inline-flex' : 'none';
  const bSK=$('btnSimpanKunjungan'); if(bSK) bSK.style.display = canEdit ? 'inline-flex' : 'none';
  const bSP=$('btnSimpanProfil'); if(bSP) bSP.style.display = canEdit ? 'inline-flex' : 'none';
  const bSS=$('btnSimpanSkrining'); if(bSS) bSS.style.display = canEdit ? 'inline-flex' : 'none';
  
  ['vNamaSiswa','vKelasSiswa','vKeluhan','vSuhu','vTensi','vTindakan','vObatSelect','vObatQty','vHasil','vCatatan',
   'pNamaSiswa','pKelasSiswa','pGol','pKontak','pAlergi','pPenyakit','pCatatan',
   'sNamaSiswa','sKelasSiswa','sTinggi','sBerat','sCatatan'].forEach(id => {
    if($(id)) $(id).disabled = !canEdit;
  });
  renderApotek();
}

const guard=()=>{ if(!canEdit){ toast('️ Anda hanya punya akses LIHAT!', true); return false; } return true; };

async function initApp(){
  const user = auth.currentUser;
  if(!user) return;
  
  currentUserUid = user.uid;
  currentUserEmail = user.email;
  
  try {
    const userDoc = await db.collection('users').doc(currentUserEmail).get();
    if(userDoc && userDoc.exists) {
      const data = userDoc.data();
      currentUserRole = data.role || '';
      userSekolahId = data.school_id || data.sekolah_id || '';
    }
    
    const badge = $('schoolBadge');
    if(badge) badge.textContent = ' ' + (userSekolahId || 'Sekolah');
    const pBadge = $('petugasBadge');
    if(pBadge) pBadge.textContent = ' ' + (userDoc.data()?.nama || userDoc.data()?.namaResmi || currentUserEmail);
    
    // ✅ LOAD SIG DATA
    await fetchIdentitasSekolah();
    await fetchSekolahAktif();
    
    await Promise.all([ loadKunjungan(), loadApotek(), loadLogObat(), loadSkrining(), loadUsers(), loadConfig() ]);
    
    computeAccess();
    renderDashboard(); renderApotek(); renderLogObat(); populateObatSelect(); renderSkriningTable();
    
    const vTanggal=$('vTanggal'); if (vTanggal) vTanggal.value=localDate();
    const vJam=$('vJam'); if (vJam) vJam.value=new Date().toTimeString().slice(0,5);
    const sTanggal=$('sTanggal'); if (sTanggal) sTanggal.value=localDate();
    
    console.log('✅ SEHAT initialized. Sekolah:', userSekolahId, '| Role:', currentUserRole);
  } catch(e) {
    console.error('Init Error:', e);
    toast('❌ Gagal memuat data: ' + e.message, true);
  }
}

async function loadKunjungan(){ 
  try{ 
    let q = db.collection('sehat_kunjungan');
    if(userSekolahId) q = q.where('sekolah_id', '==', userSekolahId);
    const s=await q.get(); 
    kunjunganCache=[]; 
    s.forEach(d=>kunjunganCache.push({id:d.id,...d.data()}));
    kunjunganCache.sort((a,b)=>(b.tanggal||'').localeCompare(a.tanggal||'')||(b.jam||'').localeCompare(a.jam||'')); 
  }catch(e){console.error(e);} 
}

async function loadApotek(){ 
  try{ 
    let q = db.collection('sehat_apotek');
    if(userSekolahId) q = q.where('sekolah_id', '==', userSekolahId);
    const s=await q.get(); 
    daftarObat=[]; 
    s.forEach(d=>daftarObat.push({id:d.id,...d.data()}));
    daftarObat.sort((a,b)=>(a.nama||'').localeCompare(b.nama||'')); 
  }catch(e){console.error(e);} 
}

async function loadLogObat(){ 
  try{ 
    let q = db.collection('sehat_apotek_log');
    if(userSekolahId) q = q.where('sekolah_id', '==', userSekolahId);
    const s=await q.get(); 
    logObat=[]; 
    s.forEach(d=>logObat.push({id:d.id,...d.data()}));
    logObat.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')); 
  }catch(e){console.error(e);} 
}

async function loadSkrining(){ 
  try{ 
    let q = db.collection('sehat_skrining');
    if(userSekolahId) q = q.where('sekolah_id', '==', userSekolahId);
    const s=await q.get(); 
    skriningCache=[]; 
    s.forEach(d=>skriningCache.push({id:d.id,...d.data()})); 
  }catch(e){console.error(e);} 
}

async function loadUsers(){ 
  try{ 
    const s = await db.collection('users').get(); 
    daftarUsers = []; 
    s.forEach(d => {
      const data = d.data();
      if(data.email) {
        daftarUsers.push({
          id: d.id, email: data.email, nama: data.nama || data.namaResmi || '',
          role: data.role || '', akses_uks: data.akses_uks || false,
          nip: data.nip || ''
        });
      }
    });
  } catch(e){ console.error('❌ Error load users:', e); } 
}

async function loadConfig(){ 
  try{ 
    const g=await db.collection('sehat_config').doc('settings').get(); 
    if(g && g.exists) config={...config,...g.data()}; 
  }catch(e){console.error(e);} 
}

function renderDashboard(){
  const today=localDate(), bulan=today.slice(0,7), tahun=today.slice(0,4);
  const hi=kunjunganCache.filter(k=>k.tanggal===today);
  const sh=$('statHariIni'); if(sh) sh.textContent=hi.length;
  const sp=$('statPerlu'); if(sp) sp.textContent=hi.filter(k=>k.hasil==='istirahat'||k.hasil==='rujukan').length;
  const sb=$('statBulan'); if(sb) sb.textContent=kunjunganCache.filter(k=>(k.tanggal||'').startsWith(bulan)).length;
  const ss=$('statSkrining'); if(ss) ss.textContent=skriningCache.filter(k=>(k.tanggal||'').startsWith(tahun)).length;
  
  const uniqueSiswa = new Set(kunjunganCache.map(k => k.siswa_nama + '_' + k.siswa_kelas));
  const sts=$('statSiswa'); if(sts) sts.textContent=uniqueSiswa.size;

  const rows=kunjunganCache.slice(0,8);
  $('listTerbaru').innerHTML=rows.length?rows.map(k=>{const [hl,bc]=hasilLabel[k.hasil]||['-','b-kelas'];
    return `<div class="row-item"><div><b>${k.siswa_nama}</b> <span style="color:#94a3b8;font-size:.8rem">${k.siswa_kelas||''}</span>
      <div style="font-size:.8rem;color:#64748b">${k.keluhan||'-'}</div></div>
      <div style="text-align:right"><span class="badge ${bc}">${hl}</span><div style="font-size:.75rem;color:#94a3b8">${k.tanggal}</div></div></div>`;}).join('')
    :'<div class="empty">Belum ada kunjungan.</div>';
  renderApotekAlertBar();
}

function renderApotekAlertBar(){
  const bar=$('apotekAlertBar'); if(!bar)return;
  const m=daftarObat.filter(o=>(o.stok||0)<=(o.minStok||10)).length;
  const s=daftarObat.filter(o=>o.ed&&!isExpired(o)&&(new Date(o.ed)-new Date())/86400000/30<=3).length;
  const x=daftarObat.filter(isExpired).length;
  if(m+s+x===0){bar.style.display='none';return;}
  bar.style.display='block';
  bar.innerHTML=`⚠️ <b>Apotek:</b> ${m} stok menipis • ${s} segera ED • ${x} kadaluarsa — buka tab 💊 Apotek.`;
}

$('btnSimpanKunjungan').onclick=async()=>{
  if(!guard())return;
  
  const namaSiswa = $('vNamaSiswa').value.trim();
  const kelasSiswa = $('vKelasSiswa').value.trim();
  
  if(!namaSiswa){ toast('️ Nama siswa wajib diisi!', true); return; }
  if(!kelasSiswa){ toast('️ Kelas wajib diisi!', true); return; }
  if(!$('vKeluhan').value.trim()){ toast('⚠️ Keluhan wajib!', true); return; }
  
  const obatId=$('vObatSelect').value, qty=parseInt($('vObatQty').value)||0;
  let ob=null, obatText='';
  if(obatId&&qty>0){ 
    ob=daftarObat.find(x=>x.id===obatId);
    if(!ob){toast('⚠️ Obat tidak ditemukan!',true);return;}
    if((ob.stok||0)<qty){toast(`⚠️ Stok ${ob.nama} tidak cukup!`,true);return;}
    obatText=`${ob.nama} ×${qty} ${ob.satuan||''}`; 
  }
  
  const btn=$('btnSimpanKunjungan'); btn.disabled=true; btn.textContent='⏳ Menyimpan...';
  try{
    await db.collection('sehat_kunjungan').add({ 
      sekolah_id: userSekolahId, guru_uid: currentUserUid, guru_nama: $('petugasBadge').textContent.replace('👤 ','').trim(),
      tanggal:$('vTanggal').value, jam:$('vJam').value,
      siswa_nama: namaSiswa, siswa_kelas: kelasSiswa,
      keluhan:$('vKeluhan').value.trim(), suhu:$('vSuhu').value||null, tensi:$('vTensi').value||null,
      tindakan:$('vTindakan').value.trim()||null, obat:obatText, obat_id:obatId||'', obat_qty:qty,
      hasil:$('vHasil').value, catatan:$('vCatatan').value.trim()||null, createdAt:new Date().toISOString()
    });
    
    if(ob&&qty>0){ 
      await db.collection('sehat_apotek').doc(ob.id).update({stok:(ob.stok||0)-qty, updatedAt:new Date().toISOString()});
      await db.collection('sehat_apotek_log').add({
        sekolah_id: userSekolahId, guru_uid: currentUserUid,
        obat_id:ob.id, obat_nama:ob.nama, tipe:'keluar', jumlah:qty,
        keterangan:`Kunjungan: ${namaSiswa}`, tanggal:$('vTanggal').value, createdAt:new Date().toISOString()
      }); 
    }
    
    toast('✅ Kunjungan tersimpan!');
    $('vNamaSiswa').value=''; $('vKelasSiswa').value='';
    ['vKeluhan','vSuhu','vTensi','vTindakan','vCatatan'].forEach(id=>$(id).value='');
    $('vObatSelect').value=''; $('vObatQty').value=1;
    
    await Promise.all([loadKunjungan(), loadApotek(), loadLogObat()]);
    renderDashboard(); renderRiwayat(); renderApotek(); renderLogObat(); populateObatSelect();
  }catch(e){toast('❌ '+e.message,true);}
  finally{btn.disabled=false; btn.textContent='💾 Simpan Kunjungan';}
};

function initFilterRiwayat(){
  const names=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  $('fBulan').innerHTML=names.map((m,i)=>`<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('');
  const y=new Date().getFullYear(); $('fTahun').innerHTML=[y-1,y,y+1].map(v=>`<option>${v}</option>`).join('');
  $('fBulan').value=String(new Date().getMonth()+1).padStart(2,'0');
  ['fBulan','fTahun','fNama'].forEach(id=>$(id).addEventListener('input',renderRiwayat));
}

function renderRiwayat(){
  const pre=$('fTahun').value+'-'+$('fBulan').value, q=$('fNama').value.toLowerCase();
  const rows=kunjunganCache.filter(k=>(k.tanggal||'').startsWith(pre)&&(!q||(k.siswa_nama||'').toLowerCase().includes(q)));
  $('tbodyRiwayat').innerHTML=rows.length?rows.map(k=>{const [hl,bc]=hasilLabel[k.hasil]||['-','b-kelas'];
    return `<tr><td>${k.tanggal}</td><td><b>${k.siswa_nama}</b></td><td>${k.siswa_kelas||'-'}</td><td>${k.keluhan||'-'}</td><td>${k.obat||'-'}</td><td><span class="badge ${bc}">${hl}</span></td></tr>`;}).join('')
    :'<tr><td colspan="6" class="empty">Tidak ada data.</td></tr>';
}

$('btnSimpanProfil').onclick=async()=>{
  if(!guard())return;
  const namaSiswa = $('pNamaSiswa').value.trim();
  const kelasSiswa = $('pKelasSiswa').value.trim();
  if(!namaSiswa || !kelasSiswa) { toast('⚠️ Nama dan Kelas wajib diisi!', true); return; }
  
  const docId = sanitizeKey(namaSiswa + '_' + kelasSiswa);
  
  await db.collection('sehat_profil').doc(docId).set({
    sekolah_id: userSekolahId, guru_uid: currentUserUid,
    nama: namaSiswa, kelas: kelasSiswa,
    golongan_darah:$('pGol').value, kontak_darurat:$('pKontak').value.trim(),
    alergi:$('pAlergi').value.trim(), penyakit_bawaan:$('pPenyakit').value.trim(),
    catatan:$('pCatatan').value.trim(), updatedAt:new Date().toISOString()
  }, { merge: true });
  
  toast('✅ Profil tersimpan/diperbarui!');
  $('pNamaSiswa').value=''; $('pKelasSiswa').value='';
  $('pGol').value='-'; $('pKontak').value=''; $('pAlergi').value='';
  $('pPenyakit').value=''; $('pCatatan').value='';
};

function statusObat(o){
  if(isExpired(o)) return {text:'❌ Kadaluarsa', cls:'b-red'};
  if(o.ed && (new Date(o.ed)-new Date())/86400000/30<=3) return {text:'⚠️ Segera ED', cls:'b-amber'};
  if((o.stok||0)<=(o.minStok||10)) return {text:'🔻 Menipis', cls:'b-amber'};
  return {text:'✅ Aman', cls:'b-green'};
}

function renderApotek(){
  const tb=$('tbodyApotek'); if(!tb) return;
  tb.innerHTML = daftarObat.length ? daftarObat.map(o=>{ const st=statusObat(o);
    return `<tr><td><b>${o.nama}</b></td><td>${o.kategori||'-'}</td><td>${o.bentuk||'-'}</td>
    <td><b>${o.stok||0}</b> ${o.satuan||''}</td><td>${formatDate(o.ed)}</td><td><span class="badge ${st.cls}">${st.text}</span></td>
    <td class="col-aksi"><div style="display:flex;gap:4px">
      <button class="btn btn-primary btn-sm" onclick="window.openStokModal('${o.id}')" ${canEdit?'':'disabled'}>📥</button>
      <button class="btn btn-warning btn-sm" onclick="window.editObat('${o.id}')" ${canEdit?'':'disabled'}>✏️</button>
      <button class="btn btn-danger btn-sm" onclick="window.hapusObat('${o.id}','${(o.nama||'').replace(/'/g,"\\'")}')" ${canEdit?'':'disabled'}>🗑️</button>
    </div></td></tr>`; }).join('')
    : '<tr><td colspan="7" class="empty">Belum ada obat. Klik ➕ Tambah Obat.</td></tr>';
  $('stTotalObat').textContent = daftarObat.length;
  $('stMenipis').textContent = daftarObat.filter(o=>(o.stok||0)<=(o.minStok||10)).length;
  $('stSegeraED').textContent = daftarObat.filter(o=>o.ed&&!isExpired(o)&&(new Date(o.ed)-new Date())/86400000/30<=3).length;
  $('stExpired').textContent = daftarObat.filter(isExpired).length;
}

function renderLogObat(){
  const list=$('listLogObat'); if(!list) return;
  const rows=logObat.slice(0,8);
  list.innerHTML = rows.length ? rows.map(l=>`
    <div class="row-item"><div><b>${l.tipe==='masuk'?'📥':''} ${l.obat_nama}</b> ×${l.jumlah}
      <div style="font-size:.8rem;color:#64748b">${l.keterangan||''} • ${l.tanggal||''}</div></div>
      <span class="badge ${l.tipe==='masuk'?'b-green':'b-red'}">${l.tipe==='masuk'?'MASUK':'KELUAR'}</span></div>`).join('')
    : '<div class="empty">Belum ada log stok.</div>';
}

function populateObatSelect(){
  const avail = daftarObat.filter(o=>(o.stok||0)>0 && !isExpired(o));
  const html = '<option value="">-- Tidak ada --</option>' + avail.map(o=>`<option value="${o.id}">${o.nama} (stok: ${o.stok||0} ${o.satuan||''})</option>`).join('');
  const a=$('vObatSelect'); if(a) a.innerHTML=html;
}

window.openStokModal = id => { if(!guard())return; const o=daftarObat.find(x=>x.id===id); if(!o)return;
  $('stokObatKey').value=id; $('stokNama').value=o.nama; $('stokQty').value=1; $('stokKet').value=''; $('modalStok').classList.add('show'); };

window.editObat = id => { if(!guard())return; const o=daftarObat.find(x=>x.id===id); if(!o)return;
  $('obatEditKey').value=id; $('modalObatTitle').textContent='✏️ Edit Obat';
  $('oNama').value=o.nama||''; $('oKategori').value=o.kategori||'Obat'; $('oBentuk').value=o.bentuk||'Tablet';
  $('oStok').value=o.stok||0; $('oSatuan').value=o.satuan||'tablet'; $('oED').value=o.ed||''; $('oMin').value=o.minStok||10;
  $('modalObat').classList.add('show'); };

window.hapusObat = async (id,nama) => { if(!guard())return; if(!confirm(`Hapus obat "${nama}"?`))return;
  await db.collection('sehat_apotek').doc(id).delete(); toast('✅ Obat dihapus');
  await Promise.all([loadApotek(),loadLogObat()]); renderApotek(); renderLogObat(); populateObatSelect(); };

async function simpanObat(){
  if(!guard())return;
  const nama=$('oNama').value.trim(); if(!nama){ toast('⚠️ Nama obat wajib!', true); return; }
  const data={ sekolah_id: userSekolahId, guru_uid: currentUserUid, nama, kategori:$('oKategori').value, bentuk:$('oBentuk').value, stok:parseInt($('oStok').value)||0,
    satuan:$('oSatuan').value, ed:$('oED').value||'', minStok:parseInt($('oMin').value)||10, updatedAt:new Date().toISOString() };
  const key=$('obatEditKey').value;
  try{
    if(key){ await db.collection('sehat_apotek').doc(key).update(data); toast('✅ Obat diperbarui'); }
    else { const r=await db.collection('sehat_apotek').add({...data, createdAt:new Date().toISOString()});
      if(data.stok>0) await db.collection('sehat_apotek_log').add({ sekolah_id: userSekolahId, guru_uid: currentUserUid,
        obat_id:r.id, obat_nama:nama, tipe:'masuk', jumlah:data.stok, keterangan:'Stok awal', tanggal:localDate(), createdAt:new Date().toISOString() });
      toast('✅ Obat ditambahkan'); }
    $('modalObat').classList.remove('show');
    await Promise.all([loadApotek(),loadLogObat()]); renderApotek(); renderLogObat(); populateObatSelect(); renderApotekAlertBar();
  }catch(e){ toast('❌ '+e.message, true); }
}

async function simpanStok(){
  if(!guard())return;
  const key=$('stokObatKey').value, qty=parseInt($('stokQty').value)||0;
  if(!key||qty<1){ toast('️ Isi jumlah!', true); return; }
  const o=daftarObat.find(x=>x.id===key); if(!o)return;
  try{
    await db.collection('sehat_apotek').doc(key).update({ stok:(o.stok||0)+qty, updatedAt:new Date().toISOString() });
    await db.collection('sehat_apotek_log').add({ sekolah_id: userSekolahId, guru_uid: currentUserUid,
      obat_id:key, obat_nama:o.nama, tipe:'masuk', jumlah:qty, keterangan:$('stokKet').value||'Penerimaan stok', tanggal:localDate(), createdAt:new Date().toISOString() });
    $('modalStok').classList.remove('show'); toast('✅ Stok ditambah');
    await Promise.all([loadApotek(),loadLogObat()]); renderApotek(); renderLogObat(); populateObatSelect(); renderApotekAlertBar();
  }catch(e){ toast('❌ '+e.message, true); }
}

function hitungIMT(tbCm, bbKg){ if(!tbCm||!bbKg) return null; const m = tbCm/100; return (bbKg/(m*m)).toFixed(1); }
function statusGizi(imt){
  if(!imt) return {text:'-', cls:'b-kelas'};
  const v = parseFloat(imt);
  if(v < 17) return {text:'🔻 Kurus', cls:'b-red'};
  if(v < 18.5) return {text:'🟡 Agak Kurus', cls:'b-amber'};
  if(v < 23) return {text:'✅ Normal', cls:'b-green'};
  if(v < 27) return {text:'🟡 Agak Gemuk', cls:'b-amber'};
  return {text:'🔴 Obesitas', cls:'b-red'};
}

['sTinggi','sBerat'].forEach(id=>{
  const el=$(id); if(el) el.addEventListener('input', ()=>{
    const tb=parseFloat($('sTinggi').value), bb=parseFloat($('sBerat').value);
    const imt=hitungIMT(tb,bb);
    const imtBox=$('sImt'), statusBox=$('sStatus');
    if(imtBox) imtBox.textContent = imt ? imt : '-';
    if(statusBox){
      if(imt){ const st=statusGizi(imt); statusBox.textContent=st.text; statusBox.className='imt-box '+st.cls; } 
      else { statusBox.textContent='-'; statusBox.className='imt-box'; }
    }
  });
});

$('btnSimpanSkrining').onclick = async ()=>{
  if(!guard())return;
  const namaSiswa = $('sNamaSiswa').value.trim();
  const kelasSiswa = $('sKelasSiswa').value.trim();
  if(!namaSiswa || !kelasSiswa) { toast('⚠️ Nama dan Kelas wajib diisi!', true); return; }
  
  const tb=parseFloat($('sTinggi').value), bb=parseFloat($('sBerat').value);
  if(!tb||!bb){ toast('⚠️ TB & BB wajib diisi!', true); return; }
  
  const imt=hitungIMT(tb,bb), st=statusGizi(imt);
  const btn=$('btnSimpanSkrining'); btn.disabled=true; btn.textContent='⏳ Menyimpan...';
  try{
    await db.collection('sehat_skrining').add({
      sekolah_id: userSekolahId, guru_uid: currentUserUid, guru_nama: $('petugasBadge').textContent.replace('👤 ','').trim(),
      siswa_nama: namaSiswa, siswa_kelas: kelasSiswa,
      tanggal:$('sTanggal').value, tb, bb, imt:parseFloat(imt), status_gizi:st.text,
      catatan:$('sCatatan').value.trim()||'', createdAt:new Date().toISOString()
    });
    toast('✅ Skrining tersimpan!');
    $('sNamaSiswa').value=''; $('sKelasSiswa').value='';
    $('sTinggi').value=''; $('sBerat').value=''; $('sCatatan').value=''; 
    $('sImt').textContent='-'; $('sStatus').textContent='-';
    await loadSkrining(); renderDashboard(); renderSkriningTable();
  }catch(e){ toast('❌ '+e.message, true); }
  finally{ btn.disabled=false; btn.textContent=' Simpan Skrining'; }
};

function renderSkriningTable(){
  const rows = [...skriningCache].sort((a,b)=>(b.tanggal||'').localeCompare(a.tanggal||''));
  $('tbodySkrining').innerHTML = rows.length ? rows.map(r=>{
    const st=statusGizi(r.imt);
    return `<tr><td>${r.tanggal}</td><td><b>${r.siswa_nama}</b></td><td>${r.siswa_kelas||'-'}</td><td>${r.tb} cm</td><td>${r.bb} kg</td><td>${r.imt}</td><td><span class="badge ${st.cls}">${r.status_gizi||st.text}</span></td></tr>`;
  }).join('') : '<tr><td colspan="7" class="empty">Belum ada data skrining.</td></tr>';
}

// ══════════ PROFIL - FUNGSI TAMBAHAN ══════════
async function cariProfilSiswa(){
  const namaSiswa = $('pNamaSiswa').value.trim();
  const kelasSiswa = $('pKelasSiswa').value.trim();
  
  if(!namaSiswa || !kelasSiswa) {
    toast('⚠️ Nama dan Kelas wajib diisi!', true);
    return;
  }
  
  const docId = sanitizeKey(namaSiswa + '_' + kelasSiswa);
  
  try {
    const docRef = await db.collection('sehat_profil').doc(docId).get();
    
    if(docRef.exists) {
      const data = docRef.data();
      $('pGol').value = data.golongan_darah || '-';
      $('pKontak').value = data.kontak_darurat || '';
      $('pAlergi').value = data.alergi || '';
      $('pPenyakit').value = data.penyakit_bawaan || '';
      $('pCatatan').value = data.catatan || '';
      toast('✅ Profil ditemukan! Silakan edit jika perlu.');
    } else {
      // Reset form untuk data baru
      $('pGol').value = '-';
      $('pKontak').value = '';
      $('pAlergi').value = '';
      $('pPenyakit').value = '';
      $('pCatatan').value = '';
      toast('️ Profil belum ada. Silakan isi data di bawah.');
    }
    
    $('formProfil').style.display = 'block';
    renderRiwayatProfil({nama: namaSiswa, kelas: kelasSiswa});
    
  } catch(e) {
    toast('❌ Gagal memuat profil: ' + e.message, true);
  }
}

function resetFormProfil(){
  $('formProfil').style.display = 'none';
  $('pNamaSiswa').value = '';
  $('pKelasSiswa').value = '';
  $('riwayatProfil').innerHTML = '';
}

function renderRiwayatProfil(s){
  const rows = kunjunganCache.filter(k => 
    k.siswa_nama.toLowerCase() === s.nama.toLowerCase() && 
    k.siswa_kelas.toLowerCase() === s.kelas.toLowerCase()
  );
  
  $('riwayatProfil').innerHTML = rows.length ? `
    <h4 style="margin:0 0 12px;color:#0f766e;">📒 Riwayat Kunjungan ${s.nama} (${s.kelas})</h4>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Tanggal</th><th>Keluhan</th><th>Obat</th><th>Hasil</th></tr>
        </thead>
        <tbody>
          ${rows.map(k => {
            const [hl,bc] = hasilLabel[k.hasil] || ['-','b-kelas'];
            return `<tr>
              <td>${k.tanggal}</td>
              <td>${k.keluhan||'-'}</td>
              <td>${k.obat||'-'}</td>
              <td><span class="badge ${bc}">${hl}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  ` : '<p style="color:#64748b; font-style:italic;">Belum ada riwayat kunjungan.</p>';
}

async function simpanPengelola(){
  if(!isAdmin()){ toast('⚠️ Hanya admin!', true); return; }
  const emailBaru = $('selPengelola').value;
  if(!emailBaru){ toast('⚠️ Pilih user terlebih dahulu!', true); return; }
  const userBaru = daftarUsers.find(x => x.email === emailBaru);
  if(!userBaru){ toast('⚠️ User tidak ditemukan!', true); return; }
  
  try{
    if(config.pengelola_email && config.pengelola_email !== emailBaru){
      await db.collection('users').doc(config.pengelola_email).update({ akses_uks: false });
    }
    config = { pengelola_email: emailBaru, pengelola_nama: userBaru.nama || userBaru.namaResmi || emailBaru };
    await db.collection('sehat_config').doc('settings').set(config);
    await db.collection('users').doc(emailBaru).update({ akses_uks: true });
    
    toast('✅ Pengelola UKS diganti: ' + config.pengelola_nama);
    $('pengelolaNow').textContent = config.pengelola_nama;
    await loadUsers(); computeAccess(); updateTabSettingsUI();
  } catch(e){ toast('❌ Gagal: ' + e.message, true); }
}

async function cabutAksesPengelola(){
  if(!isAdmin()){ toast('⚠️ Hanya admin!', true); return; }
  if(!config.pengelola_email){ toast('⚠️ Tidak ada pengelola yang aktif!', true); return; }
  if(!confirm(`❌ Cabut akses UKS dari "${config.pengelola_nama}"?`)) return;
  
  try{
    await db.collection('users').doc(config.pengelola_email).update({ akses_uks: false });
    await db.collection('sehat_config').doc('settings').set({ pengelola_email: '', pengelola_nama: '' });
    config = { pengelola_email: '', pengelola_nama: '' };
    toast('✅ Akses pengelola UKS telah dicabut!');
    await loadUsers(); computeAccess(); updateTabSettingsUI();
    if($('selPengelola')) $('selPengelola').value = '';
    if($('pengelolaNow')) $('pengelolaNow').textContent = 'Belum ada';
  } catch(e){ toast('❌ Gagal: ' + e.message, true); }
}

function updateTabSettingsUI(){
  const btnCabut = $('btnCabutAksesTab');
  if(btnCabut) btnCabut.style.display = config.pengelola_email ? 'inline-flex' : 'none';
}

const MONTHS=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function initFilterLaporan(){
  const b=$('lBulan'),t=$('lTahun'); if(!b||!t)return;
  b.innerHTML=MONTHS.map((m,i)=>`<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('');
  const y=new Date().getFullYear(); t.innerHTML=[y-1,y,y+1].map(v=>`<option>${v}</option>`).join('');
  b.value=String(new Date().getMonth()+1).padStart(2,'0');
  [b,t].forEach(el=>el.addEventListener('change',renderLaporan));
}

function getLaporanData(){
  const pre=$('lTahun').value+'-'+$('lBulan').value;
  const kunj=kunjunganCache.filter(k=>(k.tanggal||'').startsWith(pre));
  const skr=skriningCache.filter(s=>(s.tanggal||'').startsWith(pre));
  const log=logObat.filter(l=>(l.tanggal||'').startsWith(pre));
  const c={kelas:0,istirahat:0,pulang:0,rujukan:0};
  kunj.forEach(k=>{c[k.hasil]=(c[k.hasil]||0)+1;});
  return {pre,kunj,skr,log,c};
}

function renderLaporan(){
  const box=$('laporanPreview'); if(!box)return;
  const d=getLaporanData();
  box.innerHTML=`<div class="stat-row">
    <div class="stat"><h2>${d.kunj.length}</h2><p>Kunjungan</p></div>
    <div class="stat"><h2>${d.c.istirahat||0}</h2><p>Istirahat</p></div>
    <div class="stat"><h2>${d.c.pulang||0}</h2><p>Dipulangkan</p></div>
    <div class="stat"><h2>${d.c.rujukan||0}</h2><p>Dirujuk</p></div>
    <div class="stat"><h2>${d.skr.length}</h2><p>Skrining</p></div></div>
  <p style="font-size:.85rem;color:#64748b">📌 Klik <b>📄 Export PDF</b> untuk mencetak laporan lengkap bulan ini.</p>`;
}

// ══════════════════════════════════════════════
// 📄 EXPORT PDF LAPORAN (SIG INTEGRATED)
// ══════════════════════════════════════════════
async function exportLaporanPDF(){
  const d = getLaporanData();
  const bn = MONTHS[parseInt(d.pre.slice(5,7))-1];
  const th = d.pre.slice(0,4);
  const today = new Date();
  const tglSurat = `${today.getDate()} ${NAMA_BULAN[today.getMonth()]} ${today.getFullYear()}`;
  
  // Ambil data pengelola
  const pengelolaData = daftarUsers.find(u => u.email === config.pengelola_email) || {};
  const pengelolaNama = config.pengelola_nama || $('petugasBadge').textContent.replace('👤 ','').trim();
  const rawNipPengelola = pengelolaData.nip || '';
  const nipPengelola = rawNipPengelola 
    ? (rawNipPengelola.startsWith('NIP.') ? rawNipPengelola : 'NIP. ' + rawNipPengelola)
    : 'NIP. ............................................';
  const namaPengelolaCetak = formatKapital(pengelolaNama, 'upper');
  
  // Siapkan baris tabel
  const kRows = d.kunj.map((k,i) => `<tr>
    <td style="text-align:center">${i+1}</td>
    <td>${k.tanggal}</td>
    <td>${k.siswa_nama}</td>
    <td style="text-align:center">${k.siswa_kelas||'-'}</td>
    <td>${k.keluhan||'-'}</td>
    <td>${k.obat||'-'}</td>
    <td style="text-align:center">${(hasilLabel[k.hasil]||['-'])[0]}</td>
  </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;font-style:italic">Tidak ada data</td></tr>';
  
  const sRows = d.skr.map((s,i) => `<tr>
    <td style="text-align:center">${i+1}</td>
    <td>${s.tanggal}</td>
    <td>${s.siswa_nama}</td>
    <td style="text-align:center">${s.siswa_kelas||'-'}</td>
    <td style="text-align:right">${s.tb}</td>
    <td style="text-align:right">${s.bb}</td>
    <td style="text-align:right">${s.imt}</td>
    <td style="text-align:center">${s.status_gizi||'-'}</td>
  </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;font-style:italic">Tidak ada data</td></tr>';
  
  const lRows = d.log.map((l,i) => `<tr>
    <td style="text-align:center">${i+1}</td>
    <td>${l.tanggal}</td>
    <td>${l.obat_nama}</td>
    <td style="text-align:center">${l.tipe==='masuk'?'Masuk':'Keluar'}</td>
    <td style="text-align:right">${l.jumlah}</td>
    <td>${l.keterangan||'-'}</td>
  </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;font-style:italic">Tidak ada data</td></tr>';

  // KOP Surat dengan Logo
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

  // Tanda Tangan
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
          Pengelola UKS
          <div style="height:${SPASI_TTD}px;"></div>
          <b><u><span style="font-size:10pt;">${namaPengelolaCetak}</span></u></b><br><b style="font-size:11pt;">${nipPengelola}</b>
        </td>
      </tr>
    </table>`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
    <head><title>Laporan UKS ${bn} ${th}</title></head>
    <body style="font-family: 'Times New Roman', serif; font-size: 12pt; padding: 24px; color:#000;">
      ${kopHtml}
      <div style="text-align:center; margin:0 0 12px;">
        <div style="font-size:12pt; font-weight:bold; text-decoration:underline;">LAPORAN BULANAN UNIT KESEHATAN SEKOLAH (UKS)</div>
        <div style="font-size:11pt; margin-top:4px;">Bulan <b>${bn} ${th}</b></div>
      </div>
      <div style="margin-bottom:12px; font-size:11pt;">
        <p>Pengelola UKS: <b>${namaPengelolaCetak}</b> (${nipPengelola})</p>
      </div>
      
      <div style="font-size:11pt; font-weight:bold; margin-top:15px;">A. Rekapitulasi Kunjungan</div>
      <p style="font-size:11pt;">Total kunjungan: <b>${d.kunj.length}</b> • Istirahat: <b>${d.c.istirahat||0}</b> • Dipulangkan: <b>${d.c.pulang||0}</b> • Dirujuk: <b>${d.c.rujukan||0}</b> • Kembali ke kelas: <b>${d.c.kelas||0}</b></p>
      <table style="width:100%; border-collapse:collapse; font-size:11pt; margin-bottom:15px;">
        <thead><tr>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">No</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Tanggal</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Nama</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Kelas</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Keluhan</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Obat</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Hasil</th>
        </tr></thead>
        <tbody>${kRows}</tbody>
      </table>
      
      <div style="font-size:11pt; font-weight:bold; margin-top:15px;">B. Hasil Skrining Kesehatan</div>
      <p style="font-size:11pt;">Total siswa diskrining: <b>${d.skr.length}</b></p>
      <table style="width:100%; border-collapse:collapse; font-size:11pt; margin-bottom:15px;">
        <thead><tr>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">No</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Tanggal</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Nama</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Kelas</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">TB (cm)</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">BB (kg)</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">IMT</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Status</th>
        </tr></thead>
        <tbody>${sRows}</tbody>
      </table>
      
      <div style="font-size:11pt; font-weight:bold; margin-top:15px;">C. Penggunaan Obat</div>
      <table style="width:100%; border-collapse:collapse; font-size:11pt; margin-bottom:15px;">
        <thead><tr>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">No</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Tanggal</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Obat</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Tipe</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Jumlah</th>
          <th style="border:1px solid #000; padding:5px; background:#f0f0f0; text-align:center;">Keterangan</th>
        </tr></thead>
        <tbody>${lRows}</tbody>
      </table>
      
      ${ttdHtml}
      <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

const btnAddObat = $('btnAddObat');
if (btnAddObat) btnAddObat.onclick = ()=>{ if(!guard())return; $('obatEditKey').value=''; $('modalObatTitle').textContent='➕ Tambah Obat';
  ['oNama'].forEach(id=>$(id).value=''); $('oStok').value=0; $('oMin').value=10; $('oKategori').value='Obat'; $('oBentuk').value='Tablet'; $('oSatuan').value='tablet'; $('oED').value='';
  $('modalObat').classList.add('show'); };
const btnBatalObat = $('btnBatalObat'); if (btnBatalObat) btnBatalObat.onclick = ()=> $('modalObat').classList.remove('show');
const btnSimpanObat = $('btnSimpanObat'); if (btnSimpanObat) btnSimpanObat.onclick = simpanObat;
const btnBatalStok = $('btnBatalStok'); if (btnBatalStok) btnBatalStok.onclick = ()=> $('modalStok').classList.remove('show');
const btnSimpanStok = $('btnSimpanStok'); if (btnSimpanStok) btnSimpanStok.onclick = simpanStok;
const btnSP = $('btnSimpanPengelola'); if (btnSP) btnSP.onclick = simpanPengelola;
const btnExportLaporan = $('btnExportLaporan'); if (btnExportLaporan) btnExportLaporan.onclick = exportLaporanPDF;
const btnCabutAksesTab = $('btnCabutAksesTab'); if (btnCabutAksesTab) btnCabutAksesTab.onclick = cabutAksesPengelola;

document.querySelectorAll('.tab').forEach(t => t.onclick = async () => {
  // 1. Reset semua tab jadi tidak aktif
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active')); 
  t.classList.add('active');
  
  // 2. Sembunyikan semua konten tab
  ['dashboard','kunjungan','riwayat','profil','apotek','skrining','laporan','settings'].forEach(id => {
    const el = $('tab-'+id); 
    if(el) el.style.display = 'none';
  });
  
  // 3. Tampilkan hanya konten tab yang aktif
  const activeTab = $('tab-' + t.dataset.tab);
  if(activeTab) activeTab.style.display = 'block';
  
  // 4. Jalankan fungsi spesifik untuk setiap tab
  if(t.dataset.tab === 'laporan'){ 
    initFilterLaporan(); 
    renderLaporan(); 
  }
  
  if(t.dataset.tab === 'riwayat'){
    initFilterRiwayat(); // ✅ INI YANG DITAMBAHKAN (agar dropdown Bulan/Tahun terisi)
    renderRiwayat();
  }
  
  if(t.dataset.tab === 'dashboard') renderDashboard();
  if(t.dataset.tab === 'apotek'){ renderApotek(); renderLogObat(); }
  if(t.dataset.tab === 'skrining') renderSkriningTable();
  
  if(t.dataset.tab === 'settings'){
    const selTab = $('selPengelola');
    if(!daftarUsers || daftarUsers.length === 0) await loadUsers();
    let options = '<option value="">-- Pilih User --</option>';
    if(daftarUsers.length > 0) {
      options += daftarUsers.filter(u => u.email && u.email.trim() !== '').map(u => {
        const isSelected = u.email === config.pengelola_email ? 'selected' : '';
        const nama = u.nama || u.namaResmi || u.email || 'Tanpa Nama';
        const role = u.role ? ` - ${u.role}` : '';
        const hasUksAccess = u.akses_uks ? ' (✅ Pengelola UKS)' : '';
        return `<option value="${u.email}" ${isSelected}>${nama}${role}${hasUksAccess}</option>`;
      }).join('');
    }
    if(selTab) selTab.innerHTML = options;
    if($('pengelolaNow')) $('pengelolaNow').textContent = config.pengelola_nama || 'Belum ada';
    updateTabSettingsUI();
  }
});

// Tutup modal jika klik di luar area modal
document.querySelectorAll('.modal').forEach(m=>{
  m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('show'); });
});