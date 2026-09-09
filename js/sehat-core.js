// ══════════════════════════════════════════════
// SEHAT CORE - UKS Digital (COMPAT MODE - FINAL)
// ══════════════════════════════════════════════

// Ambil Firebase dari global (karena sudah di-load di HTML)
const db = firebase.firestore();
const auth = firebase.auth();

// Cek auth
auth.onAuthStateChanged(u => { 
  if (!u) {
    window.location.href = '../home.html';
  } else {
    console.log('✅ User logged in:', u.email);
    initApp();
  }
});

let masterSiswa=[], kunjunganCache=[], daftarObat=[], logObat=[], skriningCache=[], daftarUsers=[];
let selectedSiswa=null, selectedProfil=null, selectedSkrining=null, petugas='Petugas UKS';
let currentUserEmail='', currentUserRole='', currentUserUid='';
let config={ pengelola_email:'', pengelola_nama:'' };
let canEdit=false;
let userSekolahId=''; // Untuk isolasi per sekolah

const $=id=>document.getElementById(id);
const toast=(m,e=false)=>{const t=document.createElement('div');t.className='toast'+(e?' err':'');t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2800);};
const localDate=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const formatDate=s=>s?new Date(s).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'-';
const sanitizeKey=s=>String(s).replace(/[^a-zA-Z0-9_-]/g,'_');
const isExpired=o=>o.ed&&new Date(o.ed)<new Date();
const hasilLabel={kelas:['✅ Kembali','b-kelas'],istirahat:['🛏️ Istirahat','b-istirahat'],pulang:['🏠 Pulang','b-pulang'],rujukan:['🏥 Dirujuk','b-rujukan']};

// ══════════ ROLE / AKSES ══════════
const isAdmin=()=> String(currentUserRole).toLowerCase()==='admin';

function computeAccess(){
  // Admin selalu bisa edit
  if (isAdmin()) {
    canEdit = true;
  } else {
    // Cek apakah user ini adalah pengelola yang ditunjuk di config
    const isConfigPengelola = currentUserEmail && currentUserEmail === config.pengelola_email;
    
    // Atau cek apakah user ini punya field akses_uks: true di database
    const currentUserData = daftarUsers.find(u => u.email === currentUserEmail);
    const hasUksAccess = currentUserData && currentUserData.akses_uks === true;
    
    canEdit = isConfigPengelola || hasUksAccess;
  }
  applyAccess();
}

function applyAccess(){
  const ab=$('accessBadge'); if(ab) ab.textContent = canEdit ? '✏️ Pengelola' : '👁️ Hanya Lihat';
  const bs=$('btnSettings'); if(bs) bs.style.display = isAdmin() ? 'inline-flex' : 'none';
  const ts=$('tabSettingsBtn'); if(ts) ts.style.display = isAdmin() ? 'inline-block' : 'none';
  const bAO=$('btnAddObat'); if(bAO) bAO.style.display = canEdit ? 'inline-flex' : 'none';
  const bSK=$('btnSimpanKunjungan'); if(bSK) bSK.style.display = canEdit ? 'inline-flex' : 'none';
  const bSP=$('btnSimpanProfil'); if(bSP) bSP.style.display = canEdit ? 'inline-flex' : 'none';
  const bSS=$('btnSimpanSkrining'); if(bSS) bSS.style.display = canEdit ? 'inline-flex' : 'none';
  document.querySelectorAll('#formProfil input,#formProfil select,#formProfil textarea').forEach(el=>el.disabled=!canEdit);
  renderApotek();
}

const guard=()=>{ if(!canEdit){ toast('⚠️ Anda hanya punya akses LIHAT!', true); return false; } return true; };

// ══════════ INIT APP ══════════
async function initApp(){
  const user = auth.currentUser;
  if(!user) return;
  
  currentUserUid = user.uid;
  currentUserEmail = user.email;
  
  try {
    // Ambil data user dari Firestore
    const userDoc = await db.collection('users').doc(currentUserEmail).get();
    if(userDoc && userDoc.exists) {
      const data = userDoc.data();
      currentUserRole = data.role || '';
      petugas = data.nama || data.namaResmi || currentUserEmail;
      userSekolahId = data.school_id || data.sekolah_id || '';
    }
    
    // Update UI
    const badge = $('schoolBadge');
    if(badge) badge.textContent = '🏫 ' + (userSekolahId || 'Sekolah');
    const pBadge = $('petugasBadge');
    if(pBadge) pBadge.textContent = '👤 ' + petugas;
    
    // Load semua data
    await Promise.all([
      loadMasterSiswa(), 
      loadKunjungan(), 
      loadApotek(), 
      loadLogObat(), 
      loadSkrining(), 
      loadUsers(),
      loadConfig()
    ]);
    
    computeAccess();
    renderDashboard(); 
    renderApotek(); 
    renderLogObat(); 
    populateObatSelect(); 
    renderSkriningTable();
    
    // Set tanggal default
    const vTanggal=$('vTanggal'); if (vTanggal) vTanggal.value=localDate();
    const vJam=$('vJam'); if (vJam) vJam.value=new Date().toTimeString().slice(0,5);
    const sTanggal=$('sTanggal'); if (sTanggal) sTanggal.value=localDate();
    
    console.log('✅ SEHAT initialized. Sekolah:', userSekolahId, '| Role:', currentUserRole);
    
  } catch(e) {
    console.error('Init Error:', e);
    toast('❌ Gagal memuat data: ' + e.message, true);
  }
}

// ══════════ LOAD DATA (DENGAN FILTER SEKOLAH) ══════════
async function loadMasterSiswa(){ 
  try{ 
    const s=await db.collection('sican_siswa').get(); 
    masterSiswa=[]; 
    s.forEach(d=>masterSiswa.push({id:d.id,...d.data()}));
    masterSiswa.sort((a,b)=>(a.kelas||'').localeCompare(b.kelas||'')||(a.nama||'').localeCompare(b.nama||'')); 
    const el=$('statSiswa'); if(el) el.textContent=masterSiswa.length; 
  }catch(e){console.error(e);} 
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

// ✅ HANYA 1 FUNGSI loadUsers YANG BENAR
async function loadUsers(){ 
  try{ 
    const s = await db.collection('users').get(); 
    daftarUsers = []; 
    s.forEach(d => {
      const data = d.data();
      // Hanya ambil user yang punya email
      if(data.email) {
        daftarUsers.push({
          id: d.id, 
          email: data.email,
          nama: data.nama || data.namaResmi || '',
          role: data.role || '',
          akses_uks: data.akses_uks || false  // ✅ AMBIL FIELD INI
        });
      }
    });
    console.log('✅ Users loaded:', daftarUsers.length, '| Pengelola UKS:', daftarUsers.filter(u => u.akses_uks).length);
  } catch(e){
    console.error('❌ Error load users:', e);
  } 
}

async function loadConfig(){ 
  try{ 
    const g=await db.collection('sehat_config').doc('settings').get(); 
    if(g && g.exists) config={...config,...g.data()}; 
  }catch(e){console.error(e);} 
}

// ══════════ DASHBOARD ══════════
function renderDashboard(){
  const today=localDate(), bulan=today.slice(0,7), tahun=today.slice(0,4);
  const hi=kunjunganCache.filter(k=>k.tanggal===today);
  const sh=$('statHariIni'); if(sh) sh.textContent=hi.length;
  const sp=$('statPerlu'); if(sp) sp.textContent=hi.filter(k=>k.hasil==='istirahat'||k.hasil==='rujukan').length;
  const sb=$('statBulan'); if(sb) sb.textContent=kunjunganCache.filter(k=>(k.tanggal||'').startsWith(bulan)).length;
  const ss=$('statSkrining'); if(ss) ss.textContent=skriningCache.filter(k=>(k.tanggal||'').startsWith(tahun)).length;
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

// ═════════ SEARCH ══════════
function bindSearch(inputId,dropId,onPick){
  const input=$(inputId),drop=$(dropId); if(!input||!drop)return;
  input.addEventListener('input',()=>{ const q=input.value.toLowerCase().trim();
    if(q.length<1){drop.style.display='none';return;}
    const res=masterSiswa.filter(s=>(s.nama||'').toLowerCase().includes(q)||(s.kelas||'').toLowerCase().includes(q)||(s.nis||'').toLowerCase().includes(q)).slice(0,10);
    drop.innerHTML=res.length?res.map(s=>`<div class="search-item" data-id="${s.id}"><b>${s.nama}</b> — ${s.kelas||'-'}</div>`).join(''):'<div class="search-item">Tidak ditemukan</div>';
    drop.style.display='block';
    drop.querySelectorAll('.search-item').forEach(el=>el.onclick=()=>{const s=masterSiswa.find(x=>x.id===el.dataset.id);onPick(s);drop.style.display='none';input.value='';});
  });
  document.addEventListener('click',e=>{if(!e.target.closest('#'+inputId))drop.style.display='none';});
}

// ══════════ KUNJUNGAN ══════════
bindSearch('cariSiswa','dropSiswa',s=>{selectedSiswa=s;$('chipSiswa').innerHTML=`<span class="chip">👤 ${s.nama} • ${s.kelas||'-'}</span>`;});

$('btnSimpanKunjungan').onclick=async()=>{
  if(!guard())return;
  if(!selectedSiswa){toast('⚠️ Pilih siswa!',true);return;}
  if(!$('vKeluhan').value.trim()){toast('⚠️ Keluhan wajib!',true);return;}
  const obatId=$('vObatSelect').value,qty=parseInt($('vObatQty').value)||0;
  let ob=null,obatText='';
  if(obatId&&qty>0){ ob=daftarObat.find(x=>x.id===obatId);
    if(!ob){toast('⚠️ Obat tidak ditemukan!',true);return;}
    if((ob.stok||0)<qty){toast(`⚠️ Stok ${ob.nama} tidak cukup!`,true);return;}
    obatText=`${ob.nama} ×${qty} ${ob.satuan||''}`; }
  const btn=$('btnSimpanKunjungan');btn.disabled=true;btn.textContent='⏳ Menyimpan...';
  try{
    await db.collection('sehat_kunjungan').add({ 
      sekolah_id: userSekolahId,
      guru_uid: currentUserUid,
      guru_nama: petugas,
      tanggal:$('vTanggal').value,jam:$('vJam').value,
      siswa_id:selectedSiswa.id,siswa_nis:selectedSiswa.nis||'',siswa_nama:selectedSiswa.nama,siswa_kelas:selectedSiswa.kelas||'',
      keluhan:$('vKeluhan').value.trim(),suhu:$('vSuhu').value||null,tensi:$('vTensi').value||null,
      tindakan:$('vTindakan').value.trim()||null,obat:obatText,obat_id:obatId||'',obat_qty:qty,
      hasil:$('vHasil').value,catatan:$('vCatatan').value.trim()||null,createdAt:new Date().toISOString()});
    if(ob&&qty>0){ 
      await db.collection('sehat_apotek').doc(ob.id).update({stok:(ob.stok||0)-qty,updatedAt:new Date().toISOString()});
      await db.collection('sehat_apotek_log').add({
        sekolah_id: userSekolahId,
        guru_uid: currentUserUid,
        obat_id:ob.id,obat_nama:ob.nama,tipe:'keluar',jumlah:qty,
        keterangan:`Kunjungan: ${selectedSiswa.nama}`,tanggal:$('vTanggal').value,createdAt:new Date().toISOString()}); 
    }
    toast('✅ Kunjungan tersimpan!');
    ['vKeluhan','vSuhu','vTensi','vTindakan','vCatatan'].forEach(id=>$(id).value='');
    $('vObatSelect').value='';$('vObatQty').value=1;$('chipSiswa').innerHTML='';selectedSiswa=null;
    await Promise.all([loadKunjungan(),loadApotek(),loadLogObat()]);
    renderDashboard();renderRiwayat();renderApotek();renderLogObat();populateObatSelect();
  }catch(e){toast('❌ '+e.message,true);}
  finally{btn.disabled=false;btn.textContent='💾 Simpan Kunjungan';}
};

// ══════════ RIWAYAT ══════════
function initFilterRiwayat(){
  const names=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  $('fBulan').innerHTML=names.map((m,i)=>`<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('');
  const y=new Date().getFullYear();$('fTahun').innerHTML=[y-1,y,y+1].map(v=>`<option>${v}</option>`).join('');
  $('fBulan').value=String(new Date().getMonth()+1).padStart(2,'0');
  ['fBulan','fTahun','fNama'].forEach(id=>$(id).addEventListener('input',renderRiwayat));
}

function renderRiwayat(){
  const pre=$('fTahun').value+'-'+$('fBulan').value,q=$('fNama').value.toLowerCase();
  const rows=kunjunganCache.filter(k=>(k.tanggal||'').startsWith(pre)&&(!q||(k.siswa_nama||'').toLowerCase().includes(q)));
  $('tbodyRiwayat').innerHTML=rows.length?rows.map(k=>{const [hl,bc]=hasilLabel[k.hasil]||['-','b-kelas'];
    return `<tr><td>${k.tanggal}</td><td><b>${k.siswa_nama}</b></td><td>${k.siswa_kelas||'-'}</td><td>${k.keluhan||'-'}</td><td>${k.obat||'-'}</td><td><span class="badge ${bc}">${hl}</span></td></tr>`;}).join('')
    :'<tr><td colspan="6" class="empty">Tidak ada data.</td></tr>';
}

// ══════════ PROFIL ══════════
bindSearch('cariProfil','dropProfil',async s=>{
  selectedProfil=s;$('chipProfil').innerHTML=`<span class="chip">👤 ${s.nama} • ${s.kelas||'-'}</span>`;$('formProfil').style.display='block';
  ['pKontak','pAlergi','pPenyakit','pCatatan'].forEach(id=>$(id).value='');$('pGol').value='-';
  try{const g=await db.collection('sehat_profil').doc(sanitizeKey(s.nis||s.id)).get();
    if(g && g.exists){const d=g.data();$('pGol').value=d.golongan_darah||'-';$('pKontak').value=d.kontak_darurat||'';$('pAlergi').value=d.alergi||'';$('pPenyakit').value=d.penyakit_bawaan||'';$('pCatatan').value=d.catatan||'';}}catch(e){}
  renderRiwayatProfil(s);
});

$('btnSimpanProfil').onclick=async()=>{
  if(!guard())return;
  if(!selectedProfil){toast('⚠️ Pilih siswa!',true);return;}
  await db.collection('sehat_profil').doc(sanitizeKey(selectedProfil.nis||selectedProfil.id)).set({
    sekolah_id: userSekolahId,
    guru_uid: currentUserUid,
    siswa_id:selectedProfil.id,nis:selectedProfil.nis||'',nama:selectedProfil.nama,kelas:selectedProfil.kelas||'',
    golongan_darah:$('pGol').value,kontak_darurat:$('pKontak').value.trim(),alergi:$('pAlergi').value.trim(),
    penyakit_bawaan:$('pPenyakit').value.trim(),catatan:$('pCatatan').value.trim(),updatedAt:new Date().toISOString()
  });
  toast('✅ Profil tersimpan!');
};

function renderRiwayatProfil(s){
  const rows=kunjunganCache.filter(k=>(k.siswa_nis===s.nis)||(k.siswa_nama===s.nama)||(k.siswa_id===s.id));
  $('riwayatProfil').innerHTML = rows.length ? '<h4 style="color:#0f766e">📒 Riwayat Kunjungan</h4><table><thead><tr><th>Tanggal</th><th>Keluhan</th><th>Obat</th><th>Hasil</th></tr></thead><tbody>'+
    rows.map(k=>{ const [hl,bc]=hasilLabel[k.hasil]||['-','b-kelas']; return `<tr><td>${k.tanggal}</td><td>${k.keluhan||'-'}</td><td>${k.obat||'-'}</td><td><span class="badge ${bc}">${hl}</span></td></tr>`; }).join('')+'</tbody></table>'
    : '<div class="empty">Belum ada riwayat.</div>';
}

// ══════════ APOTEK ══════════
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
    <div class="row-item"><div><b>${l.tipe==='masuk'?'📥':'📤'} ${l.obat_nama}</b> ×${l.jumlah}
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
  const data={ 
    sekolah_id: userSekolahId,
    guru_uid: currentUserUid,
    nama, kategori:$('oKategori').value, bentuk:$('oBentuk').value, stok:parseInt($('oStok').value)||0,
    satuan:$('oSatuan').value, ed:$('oED').value||'', minStok:parseInt($('oMin').value)||10, updatedAt:new Date().toISOString() 
  };
  const key=$('obatEditKey').value;
  try{
    if(key){ await db.collection('sehat_apotek').doc(key).update(data); toast('✅ Obat diperbarui'); }
    else { const r=await db.collection('sehat_apotek').add({...data, createdAt:new Date().toISOString()});
      if(data.stok>0) await db.collection('sehat_apotek_log').add({ 
        sekolah_id: userSekolahId, guru_uid: currentUserUid,
        obat_id:r.id, obat_nama:nama, tipe:'masuk', jumlah:data.stok, keterangan:'Stok awal', tanggal:localDate(), createdAt:new Date().toISOString() 
      });
      toast('✅ Obat ditambahkan'); }
    $('modalObat').classList.remove('show');
    await Promise.all([loadApotek(),loadLogObat()]); renderApotek(); renderLogObat(); populateObatSelect(); renderApotekAlertBar();
  }catch(e){ toast('❌ '+e.message, true); }
}

async function simpanStok(){
  if(!guard())return;
  const key=$('stokObatKey').value, qty=parseInt($('stokQty').value)||0;
  if(!key||qty<1){ toast('⚠️ Isi jumlah!', true); return; }
  const o=daftarObat.find(x=>x.id===key); if(!o)return;
  try{
    await db.collection('sehat_apotek').doc(key).update({ stok:(o.stok||0)+qty, updatedAt:new Date().toISOString() });
    await db.collection('sehat_apotek_log').add({ 
      sekolah_id: userSekolahId, guru_uid: currentUserUid,
      obat_id:key, obat_nama:o.nama, tipe:'masuk', jumlah:qty, keterangan:$('stokKet').value||'Penerimaan stok', tanggal:localDate(), createdAt:new Date().toISOString() 
    });
    $('modalStok').classList.remove('show'); toast('✅ Stok ditambah');
    await Promise.all([loadApotek(),loadLogObat()]); renderApotek(); renderLogObat(); populateObatSelect(); renderApotekAlertBar();
  }catch(e){ toast('❌ '+e.message, true); }
}

// ═════════ SKRINING ══════════
function hitungIMT(tbCm, bbKg){
  if(!tbCm||!bbKg) return null;
  const m = tbCm/100;
  return (bbKg/(m*m)).toFixed(1);
}

function statusGizi(imt){
  if(!imt) return {text:'-', cls:'b-kelas'};
  const v = parseFloat(imt);
  if(v < 17) return {text:'🔻 Kurus', cls:'b-red'};
  if(v < 18.5) return {text:'🟡 Agak Kurus', cls:'b-amber'};
  if(v < 23) return {text:'✅ Normal', cls:'b-green'};
  if(v < 27) return {text:'🟡 Agak Gemuk', cls:'b-amber'};
  return {text:'🔴 Obesitas', cls:'b-red'};
}

bindSearch('cariSkrining','dropSkrining', s=>{
  selectedSkrining=s;
  $('chipSkrining').innerHTML=`<span class="chip">👤 ${s.nama} • ${s.kelas||'-'}</span>`;
  $('sKelas').value = s.kelas || '';
  renderSkriningDetail(s);
});

['sTinggi','sBerat'].forEach(id=>{
  const el=$(id); if(el) el.addEventListener('input', ()=>{
    const tb=parseFloat($('sTinggi').value), bb=parseFloat($('sBerat').value);
    const imt=hitungIMT(tb,bb);
    const imtBox=$('sImt'), statusBox=$('sStatus');
    if(imtBox) imtBox.textContent = imt ? imt : '-';
    if(statusBox){
      if(imt){
        const st=statusGizi(imt);
        statusBox.textContent=st.text;
        statusBox.className='imt-box '+st.cls;
      } else {
        statusBox.textContent='-'; statusBox.className='imt-box';
      }
    }
  });
});

$('btnSimpanSkrining').onclick = async ()=>{
  if(!guard())return;
  if(!selectedSkrining){ toast('⚠️ Pilih siswa!', true); return; }
  const tb=parseFloat($('sTinggi').value), bb=parseFloat($('sBerat').value);
  if(!tb||!bb){ toast('⚠️ TB & BB wajib diisi!', true); return; }
  const imt=hitungIMT(tb,bb), st=statusGizi(imt);
  const btn=$('btnSimpanSkrining'); btn.disabled=true; btn.textContent='⏳ Menyimpan...';
  try{
    await db.collection('sehat_skrining').add({
      sekolah_id: userSekolahId,
      guru_uid: currentUserUid,
      guru_nama: petugas,
      siswa_id:selectedSkrining.id, siswa_nis:selectedSkrining.nis||'', siswa_nama:selectedSkrining.nama, siswa_kelas:selectedSkrining.kelas||'',
      tanggal:$('sTanggal').value, tb, bb, imt:parseFloat(imt), status_gizi:st.text,
      catatan:$('sCatatan').value.trim()||'', createdAt:new Date().toISOString()
    });
    toast('✅ Skrining tersimpan!');
    $('sTinggi').value=''; $('sBerat').value=''; $('sCatatan').value=''; $('sImt').textContent='-'; $('sStatus').textContent='-'; $('sKelas').value='';
    $('chipSkrining').innerHTML=''; selectedSkrining=null;
    await loadSkrining(); renderDashboard(); renderSkriningTable();
  }catch(e){ toast('❌ '+e.message, true); }
  finally{ btn.disabled=false; btn.textContent='💾 Simpan Skrining'; }
};

function renderSkriningTable(){
  const rows = [...skriningCache].sort((a,b)=>(b.tanggal||'').localeCompare(a.tanggal||''));
  $('tbodySkrining').innerHTML = rows.length ? rows.map(r=>{
    const st=statusGizi(r.imt);
    return `<tr><td>${r.tanggal}</td><td><b>${r.siswa_nama}</b></td><td>${r.siswa_kelas||'-'}</td>
      <td>${r.tb} cm</td><td>${r.bb} kg</td><td>${r.imt}</td>
      <td><span class="badge ${st.cls}">${r.status_gizi||st.text}</span></td></tr>`;
  }).join('') : '<tr><td colspan="7" class="empty">Belum ada data skrining.</td></tr>';
}

function renderSkriningDetail(s){
  const rows = skriningCache.filter(k=>(k.siswa_nis===s.nis)||(k.siswa_id===s.id));
  rows.sort((a,b)=>(a.tanggal||'').localeCompare(b.tanggal||''));
  const card=$('chartCard'), info=$('chartInfo');
  if(!card) return;
  if(rows.length<1){ card.style.display='none'; return; }
  card.style.display='block';
  if(info) info.textContent = `— ${s.nama}`;
  renderChart(rows);
}

function renderChart(rows){
  const svg=$('chartSvg'); if(!svg) return;
  const W=600, H=220, pad=40;
  const tbs=rows.map(r=>r.tb), bbs=rows.map(r=>r.bb);
  const minTB=Math.min(...tbs)*0.95, maxTB=Math.max(...tbs)*1.05||1;
  const minBB=Math.min(...bbs)*0.95, maxBB=Math.max(...bbs)*1.05||1;
  const dx = rows.length>1 ? (W-pad*2)/(rows.length-1) : 0;
  const pointsTB = rows.map((r,i)=>({ x:pad+i*dx, y:pad+(H-pad*2)*(1-(r.tb-minTB)/(maxTB-minTB||1)), v:r.tb, t:r.tanggal }));
  const pointsBB = rows.map((r,i)=>({ x:pad+i*dx, y:pad+(H-pad*2)*(1-(r.bb-minBB)/(maxBB-minBB||1)), v:r.bb, t:r.tanggal }));
  const pathTB = pointsTB.map((p,i)=>(i===0?'M':'L')+p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
  const pathBB = pointsBB.map((p,i)=>(i===0?'M':'L')+p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
  const dotsTB = pointsTB.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#0f766e"><title>${p.t}: ${p.v} cm</title></circle>`).join('');
  const dotsBB = pointsBB.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#3b82f6"><title>${p.t}: ${p.v} kg</title></circle>`).join('');
  const labels = pointsTB.filter((_,i)=>i===0||i===pointsTB.length-1||pointsTB.length<=6||i%Math.ceil(pointsTB.length/6)===0).map(p=>
    `<text x="${p.x}" y="${H-12}" font-size="10" text-anchor="middle" fill="#64748b">${(p.t||'').slice(5,10)}</text>`).join('');
  svg.innerHTML = `
    <line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="#e2e8f0"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="#e2e8f0"/>
    <path d="${pathTB}" fill="none" stroke="#0f766e" stroke-width="2"/>
    <path d="${pathBB}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4,2"/>
    ${dotsTB}${dotsBB}${labels}
    <text x="${pad}" y="${pad-5}" font-size="10" fill="#0f766e">TB ${maxTB.toFixed(0)}</text>
    <text x="${pad}" y="${H-pad+14}" font-size="10" fill="#0f766e">TB ${minTB.toFixed(0)}</text>
    <text x="${W-pad}" y="${pad-5}" font-size="10" fill="#3b82f6" text-anchor="end">BB ${maxBB.toFixed(0)}</text>
    <text x="${W-pad}" y="${H-pad+14}" font-size="10" fill="#3b82f6" text-anchor="end">BB ${minBB.toFixed(0)}</text>
  `;
}

// ══════════ SETTINGS (Admin Only) ══════════
async function simpanPengelola(){
  if(!isAdmin()){ toast('⚠️ Hanya admin!', true); return; }
  
  // ✅ PERBAIKAN: 'setPengelola' bukan 'selPengelola'
  const emailBaru = $('setPengelola').value;
  if(!emailBaru){ toast('⚠️ Pilih user terlebih dahulu!', true); return; }
  
  const userBaru = daftarUsers.find(x => x.email === emailBaru);
  if(!userBaru){ toast('️ User tidak ditemukan!', true); return; }
  
  try{
    // 1. ✅ CABUT AKSES PENGELOLA LAMA
    if(config.pengelola_email && config.pengelola_email !== emailBaru){
      await db.collection('users').doc(config.pengelola_email).update({
        akses_uks: false
      });
      console.log('✅ Akses pengelola lama dicabut:', config.pengelola_email);
    }
    
    // 2. BERI AKSES PENGELOLA BARU
    config = { 
      pengelola_email: emailBaru, 
      pengelola_nama: userBaru.nama || userBaru.namaResmi || emailBaru 
    };
    await db.collection('sehat_config').doc('settings').set(config);
    
    await db.collection('users').doc(emailBaru).update({
      akses_uks: true
    });
    
    toast('✅ Pengelola UKS diganti: ' + (userBaru.nama || userBaru.namaResmi || emailBaru));
    
    // 3. Update UI
    const pn = $('pengelolaNow'); 
    if(pn) pn.textContent = config.pengelola_nama;
    
    // 4. Refresh access & reload users
    await loadUsers();
    await computeAccess();
    updateModalSettingsUI();
    
    // 5. Close modal
    closeModal('modalSettings');
    
  } catch(e){ 
    toast('❌ Gagal: ' + e.message, true); 
  }
}

// ✅ FUNGSI BARU: Cabut akses pengelola tanpa ganti user
async function cabutAksesPengelola(){
  if(!isAdmin()){ toast('⚠️ Hanya admin!', true); return; }
  
  if(!config.pengelola_email){ 
    toast('⚠️ Tidak ada pengelola yang aktif!', true); 
    return; 
  }
  
  if(!confirm(`❌ Cabut akses UKS dari "${config.pengelola_nama}"?\n\nUser ini akan kembali menjadi "Hanya Lihat".`)){ 
    return; 
  }
  
  try{
    // 1. Cabut akses user lama
    await db.collection('users').doc(config.pengelola_email).update({
      akses_uks: false
    });
    
    // 2. Hapus config pengelola
    await db.collection('sehat_config').doc('settings').set({
      pengelola_email: '',
      pengelola_nama: ''
    });
    
    config = { pengelola_email: '', pengelola_nama: '' };
    
    toast('✅ Akses pengelola UKS telah dicabut!');
    
    // 3. Update UI
    await loadUsers();
    await computeAccess();
    updateModalSettingsUI();
    
    // 4. Close modal
    closeModal('modalSettings');
    
  } catch(e){ 
    toast(' Gagal: ' + e.message, true); 
  }
}

// ✅ FUNGSI BARU: Update UI modal settings
function updateModalSettingsUI(){
  const infoBox = $('infoPengelolaAktif');
  const namaBox = $('namaPengelolaAktif');
  const btnCabut = $('btnCabutAkses');
  
  if(infoBox && namaBox){
    if(config.pengelola_email){
      infoBox.style.display = 'block';
      namaBox.textContent = config.pengelola_nama || config.pengelola_email;
    } else {
      infoBox.style.display = 'none';
    }
  }
  
  if(btnCabut){
    // Tampilkan tombol "Cabut Akses" hanya jika ada pengelola aktif
    btnCabut.style.display = config.pengelola_email ? 'inline-flex' : 'none';
  }
}

// ══════════ LAPORAN ══════════
const MONTHS=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const kapitalNama=(n='')=>{const i=n.indexOf(',');return i===-1?n.toUpperCase():n.slice(0,i).toUpperCase()+n.slice(i);};
const MADRASAH={kemenag:'KEMENTERIAN AGAMA KABUPATEN BANTAENG',nama:'MADRASAH ALIYAH NEGERI BANTAENG',
  alamat:'Jl. ... (isi alamat madrasah)',kepala:{nama:'Muhammad Arif Pither, S.Ag.,M.M.,M.Pd',nip:'19710930 200710 1 001'}};

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

function exportLaporanPDF(){
  const d=getLaporanData();
  const bn=MONTHS[parseInt(d.pre.slice(5,7))-1], th=d.pre.slice(0,4);
  const tgl=new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'});
  const petugasNama=config.pengelola_nama||petugas;
  const pu=daftarUsers.find(u=>u.email===config.pengelola_email)||{};
  const nipPetugas=pu.nip||'-';
  const kRows=d.kunj.map((k,i)=>`<tr><td>${i+1}</td><td>${k.tanggal}</td><td>${k.siswa_nama}</td><td>${k.siswa_kelas||'-'}</td><td>${k.keluhan||'-'}</td><td>${k.obat||'-'}</td><td>${(hasilLabel[k.hasil]||['-'])[0]}</td></tr>`).join('')||'<tr><td colspan="7" style="text-align:center">Tidak ada data</td></tr>';
  const sRows=d.skr.map((s,i)=>`<tr><td>${i+1}</td><td>${s.tanggal}</td><td>${s.siswa_nama}</td><td>${s.siswa_kelas||'-'}</td><td>${s.tb}</td><td>${s.bb}</td><td>${s.imt}</td><td>${s.status_gizi||'-'}</td></tr>`).join('')||'<tr><td colspan="8" style="text-align:center">Tidak ada data</td></tr>';
  const lRows=d.log.map((l,i)=>`<tr><td>${i+1}</td><td>${l.tanggal}</td><td>${l.obat_nama}</td><td>${l.tipe==='masuk'?'Masuk':'Keluar'}</td><td>${l.jumlah}</td><td>${l.keterangan||'-'}</td></tr>`).join('')||'<tr><td colspan="6" style="text-align:center">Tidak ada data</td></tr>';
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Laporan UKS ${bn} ${th}</title><style>
    body{font-family:'Times New Roman',serif;font-size:11pt;color:#000;padding:20px}
    .kop{text-align:center;border-bottom:3px double #000;padding-bottom:8px;margin-bottom:14px}
    .kop h2{margin:2px 0;font-size:14pt}.kop h3{margin:2px 0;font-size:12pt}.kop p{margin:2px 0;font-size:9pt}
    h4{margin:14px 0 6px} table{width:100%;border-collapse:collapse;font-size:10pt}
    th,td{border:1px solid #000;padding:5px;text-align:left} th{background:#eee}
    .sign{display:flex;justify-content:space-between;margin-top:30px}
    .sign div{text-align:left;line-height:1.5}.sign .kiri{width:48%;padding-top:22px}.sign .kanan{width:34%}.sign .ttd{height:70px}
  </style></head><body>
  <div class="kop">
    <h2>${MADRASAH.kemenag}</h2>
    <h3>${MADRASAH.nama}</h3>
    <p>${MADRASAH.alamat}</p>
  </div>
  <h3 style="text-align:center">LAPORAN BULANAN UNIT KESEHATAN SEKOLAH</h3>
  <p style="text-align:center"><b>Bulan ${bn} ${th}</b></p>
  <h4>A. Rekapitulasi Kunjungan</h4>
  <p>Total kunjungan: <b>${d.kunj.length}</b> • Istirahat: ${d.c.istirahat||0} • Dipulangkan: ${d.c.pulang||0} • Dirujuk: ${d.c.rujukan||0} • Kembali ke kelas: ${d.c.kelas||0}</p>
  <table><thead><tr><th>No</th><th>Tanggal</th><th>Nama</th><th>Kelas</th><th>Keluhan</th><th>Obat</th><th>Hasil</th></tr></thead>
  <tbody>${kRows}</tbody></table>
  <h4>B. Hasil Skrining Kesehatan</h4>
  <p>Total siswa diskrining: <b>${d.skr.length}</b></p>
  <table><thead><tr><th>No</th><th>Tanggal</th><th>Nama</th><th>Kelas</th><th>TB</th><th>BB</th><th>IMT</th><th>Status</th></tr></thead>
  <tbody>${sRows}</tbody></table>
  <h4>C. Penggunaan Obat</h4>
  <table><thead><tr><th>No</th><th>Tanggal</th><th>Obat</th><th>Tipe</th><th>Jumlah</th><th>Keterangan</th></tr></thead>
  <tbody>${lRows}</tbody></table>
  <div class="sign">
    <div class="kiri">Mengetahui,<br>Kepala Madrasah<div class="ttd"></div><b><u>${kapitalNama(MADRASAH.kepala.nama)}</u></b><br><b>NIP. ${MADRASAH.kepala.nip}</b></div>
    <div class="kanan">Bantaeng, &nbsp;&nbsp;&nbsp; ${tgl}<div style="height:22px"></div>Pengelola UKS<div class="ttd"></div><b><u>${kapitalNama(petugasNama)}</u></b><br><b>NIP. ${nipPetugas}</b></div>
  </div>
  <script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}

// ══════════ BIND & TABS ══════════
const btnAddObat = $('btnAddObat');
if (btnAddObat) btnAddObat.onclick = ()=>{ if(!guard())return; $('obatEditKey').value=''; $('modalObatTitle').textContent='➕ Tambah Obat';
  ['oNama'].forEach(id=>$(id).value=''); $('oStok').value=0; $('oMin').value=10; $('oKategori').value='Obat'; $('oBentuk').value='Tablet'; $('oSatuan').value='tablet'; $('oED').value='';
  $('modalObat').classList.add('show'); };
const btnBatalObat = $('btnBatalObat'); if (btnBatalObat) btnBatalObat.onclick = ()=> $('modalObat').classList.remove('show');
const btnSimpanObat = $('btnSimpanObat'); if (btnSimpanObat) btnSimpanObat.onclick = simpanObat;
const btnBatalStok = $('btnBatalStok'); if (btnBatalStok) btnBatalStok.onclick = ()=> $('modalStok').classList.remove('show');
const btnSimpanStok = $('btnSimpanStok'); if (btnSimpanStok) btnSimpanStok.onclick = simpanStok;

// ✅ PERBAIKAN: Hapus referensi ke btnSimpanPengelola (tidak ada di HTML baru)
// const btnSP = $('btnSimpanPengelola'); if (btnSP) btnSP.onclick = simpanPengelola;

const btnExportLaporan = $('btnExportLaporan'); if (btnExportLaporan) btnExportLaporan.onclick = exportLaporanPDF;
const btnBatalSettings = $('btnBatalSettings'); if (btnBatalSettings) btnBatalSettings.onclick = ()=> closeModal('modalSettings');
const btnSimpanConfig = $('btnSimpanConfig'); if (btnSimpanConfig) btnSimpanConfig.onclick = simpanPengelola;

// ✅ TAMBAHKAN: Binding untuk tombol Cabut Akses
const btnCabutAkses = $('btnCabutAkses'); 
if (btnCabutAkses) btnCabutAkses.onclick = cabutAksesPengelola;

// ✅ PERBAIKAN: Tambahkan 'async' agar 'await loadUsers()' bisa berjalan
document.querySelectorAll('.tab').forEach(t => t.onclick = async () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active')); 
  t.classList.add('active');
  
  if(t.dataset.tab === 'laporan'){ 
    initFilterLaporan(); 
    renderLaporan(); 
  }
  
  ['dashboard','kunjungan','riwayat','profil','apotek','skrining','laporan','settings'].forEach(id => {
    const el = $('tab-'+id); 
    if(el) el.style.display = (id === t.dataset.tab) ? 'block' : 'none';
  });
  
  if(t.dataset.tab === 'riwayat') renderRiwayat();
  if(t.dataset.tab === 'dashboard') renderDashboard();
  if(t.dataset.tab === 'apotek'){ renderApotek(); renderLogObat(); }
  if(t.dataset.tab === 'skrining') renderSkriningTable();
  
  // ✅ PERBAIKAN: Logika populate dropdown yang robust
if(t.dataset.tab === 'settings'){
  const sel = $('setPengelola');
  
  // Reload users jika belum ada atau kosong
  if(!daftarUsers || daftarUsers.length === 0) {
    await loadUsers();
  }
  
  let options = '<option value="">-- Pilih User --</option>';
  
  if(daftarUsers.length > 0) {
    options += daftarUsers
      .filter(u => u.email && u.email.trim() !== '')
      .map(u => {
        const isSelected = u.email === config.pengelola_email ? 'selected' : '';
        const nama = u.nama || u.namaResmi || u.email || 'Tanpa Nama';
        const role = u.role ? ` - ${u.role}` : '';
        const hasUksAccess = u.akses_uks ? ' (✅ Pengelola UKS)' : '';
        return `<option value="${u.email}" ${isSelected}>${nama}${role}${hasUksAccess}</option>`;
      })
      .join('');
  }
  
  sel.innerHTML = options;
  
  const pn = $('pengelolaNow'); 
  if(pn) pn.textContent = config.pengelola_nama || 'Belum ada';
  
  // ✅ PANGGIL FUNGSI UPDATE UI
  updateModalSettingsUI();
}
});

// Close modal on outside click
document.querySelectorAll('.modal').forEach(m=>{
  m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('show'); });
});