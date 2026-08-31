// ══════════════════════════════════════════════
// SIPENA 2.0 - MODUL JURNAL MENGAJAR KELAS
// Collection: jurnal_mengajar (terkoneksi ke Kepala Madrasah)
// Jadwal PBM: Senin - Jumat
// ══════════════════════════════════════════════

let jurnalKelasList = [];
let jurnalRiwayat = [];
let jurnalEditId = null;

// ══════════════════════════════════════════════
// RENDER HALAMAN INPUT
// ══════════════════════════════════════════════
function renderJurnal() {
  return `
  <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow); margin-bottom: 1.25rem;">
    <h3 style="font-family:'Plus Jakarta Sans',sans-serif; font-size:1.25rem; font-weight:700; margin-bottom:1.25rem; display:flex; align-items:center; gap:8px;">
      📖 Input Jurnal Mengajar
    </h3>
    <div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:0.75rem 1rem; border-radius:8px; margin-bottom:1rem; font-size:0.85rem; color:#1e40af;">
      <strong>ℹ️ Info:</strong> Nama, NIP, dan kelas otomatis terisi dari jadwal mengajar Anda. Data tersimpan otomatis dan dapat dilihat oleh Kepala Madrasah.
    </div>

    <form id="formJurnalSipena" onsubmit="event.preventDefault(); simpanJurnalKelas();">
      <input type="hidden" id="jurnalEditId" value="">
      
      <!-- Data Guru (Auto-fill) -->
      <div style="background:#f8fafc; padding:1rem; border-radius:8px; margin-bottom:1rem;">
        <div style="font-weight:700; color:#475569; margin-bottom:0.5rem; font-size:0.9rem;">👨‍🏫 Data Guru</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1rem;">
          <div>
            <label style="font-size:0.8rem; color:var(--text-secondary);">Nama Guru</label>
            <input type="text" id="jurnalNamaGuru" readonly style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:8px; background:white;">
          </div>
          <div>
            <label style="font-size:0.8rem; color:var(--text-secondary);">NIP</label>
            <input type="text" id="jurnalNipGuru" readonly style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:8px; background:white;">
          </div>
        </div>
      </div>

      <!-- Info Mengajar -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1rem; margin-bottom:1rem;">
        <div>
          <label style="display:block; font-weight:600; margin-bottom:0.4rem; font-size:0.9rem;">📅 Hari/Tanggal *</label>
          <input type="date" id="jurnalTanggal" required onchange="autoIsiJamDariJadwal()" style="width:100%; padding:0.5rem; border:1.5px solid var(--border); border-radius:8px;">
        </div>
        
        <div>
          <label style="display:block; font-weight:600; margin-bottom:0.4rem; font-size:0.9rem;">🏫 Kelas *</label>
          <select id="jurnalKelasSelect" required onchange="autoIsiJamDariJadwal()" style="width:100%; padding:0.5rem; border:1.5px solid var(--border); border-radius:8px;">
            <option value="">-- Pilih Kelas --</option>
          </select>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.25rem;">Otomatis dari jadwal mengajar</div>
        </div>
      </div>

      <!-- Jam Mengajar (Range) -->
      <div style="margin-bottom:1rem;">
        <label style="display:block; font-weight:600; margin-bottom:0.4rem; font-size:0.9rem;">⏰ Jam Mengajar *</label>
        <div style="display:grid; grid-template-columns: 1fr auto 1fr; gap:0.75rem; align-items:center;">
          <select id="jurnalJamMulai" required onchange="updateJamPreview()" style="width:100%; padding:0.5rem; border:1.5px solid var(--border); border-radius:8px;">
            <option value="">Jam Mulai</option>
            ${Array.from({length:10},(_,i)=>`<option value="${i+1}">Jam ke-${i+1}</option>`).join('')}
          </select>
          <div style="font-weight:700; color:var(--primary); font-size:1.1rem;">s/d</div>
          <select id="jurnalJamSelesai" required onchange="updateJamPreview()" style="width:100%; padding:0.5rem; border:1.5px solid var(--border); border-radius:8px;">
            <option value="">Jam Selesai</option>
            ${Array.from({length:10},(_,i)=>`<option value="${i+1}">Jam ke-${i+1}</option>`).join('')}
          </select>
        </div>
        <div id="jurnalJamPreview" style="display:none; padding:0.5rem 0.75rem; border-radius:6px; margin-top:0.5rem; font-weight:600; text-align:center; font-size:0.88rem;"></div>
        <div id="jurnalAutoInfo" style="display:none; background:#eff6ff; border-left:4px solid #3b82f6; color:#1e40af; padding:0.5rem 0.75rem; border-radius:6px; margin-top:0.5rem; font-size:0.82rem;"></div>
      </div>

      <!-- Kehadiran Murid -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem; margin-bottom:1rem;">
        <div>
          <label style="display:block; font-weight:600; margin-bottom:0.4rem; font-size:0.9rem;">👥 Murid Hadir *</label>
          <input type="number" id="jurnalMuridHadir" min="0" value="0" required style="width:100%; padding:0.5rem; border:1.5px solid var(--border); border-radius:8px;">
        </div>
        <div>
          <label style="display:block; font-weight:600; margin-bottom:0.4rem; font-size:0.9rem;">❌ Murid Tidak Hadir *</label>
          <input type="number" id="jurnalMuridTidakHadir" min="0" value="0" required style="width:100%; padding:0.5rem; border:1.5px solid var(--border); border-radius:8px;">
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.25rem;">Sakit + Izin + Alpha</div>
        </div>
      </div>

      <!-- Materi -->
      <div style="margin-bottom:1rem;">
        <label style="display:block; font-weight:600; margin-bottom:0.4rem; font-size:0.9rem;">📝 Materi / Tugas *</label>
        <textarea id="jurnalMateri" required rows="4" placeholder="Tuliskan materi yang diajarkan atau tugas yang diberikan..." style="width:100%; padding:0.6rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; resize:vertical;"></textarea>
      </div>

      <div style="display:flex; gap:0.75rem; justify-content:flex-end; flex-wrap:wrap;">
        <button type="button" class="btn btn-secondary" onclick="resetFormJurnal()"><i class="fas fa-redo"></i> Reset</button>
        <button type="submit" class="btn btn-primary" id="btnSimpanJurnal"><i class="fas fa-save"></i> <span id="btnSimpanJurnalText">Simpan Jurnal</span></button>
      </div>
    </form>
  </div>

  <!-- Riwayat Jurnal -->
  <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1rem;">
      <h3 style="font-family:'Plus Jakarta Sans',sans-serif; font-size:1.1rem; font-weight:700;">📜 Riwayat Jurnal Mengajar</h3>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <select id="jurnalFilterBulan" style="padding:0.4rem; border:1.5px solid var(--border); border-radius:8px; font-size:0.85rem;"></select>
        <select id="jurnalFilterTahun" style="padding:0.4rem; border:1.5px solid var(--border); border-radius:8px; font-size:0.85rem;"></select>
        <button class="btn btn-primary btn-sm" onclick="loadRiwayatJurnal()"><i class="fas fa-sync"></i> Muat</button>
      </div>
    </div>
    <div class="table-container">
      <table style="width:100%;">
        <thead>
          <tr>
            <th style="width:40px;">No</th>
            <th>Tanggal</th>
            <th>Kelas</th>
            <th>Jam</th>
            <th>Materi</th>
            <th style="width:80px;">Hadir/Tdk</th>
            <th style="width:110px;">Aksi</th>
          </tr>
        </thead>
        <tbody id="riwayatJurnalBody">
          <tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-secondary);">Klik "Muat" untuk menampilkan riwayat.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  `;
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
async function initJurnalPage() {
  const tgl = document.getElementById('jurnalTanggal');
  if (tgl) tgl.value = new Date().toISOString().split('T')[0];

  if (currentUserData) {
    const nama = document.getElementById('jurnalNamaGuru');
    const nip = document.getElementById('jurnalNipGuru');
    if (nama) nama.value = currentUserData.namaResmi || currentUserData.nama || currentUser.email;
    if (nip) nip.value = currentUserData.nip || '-';
  }

  const bln = document.getElementById('jurnalFilterBulan');
  const thn = document.getElementById('jurnalFilterTahun');
  if (bln) bln.innerHTML = NAMA_BULAN.map((n,i)=>`<option value="${i+1}" ${i===new Date().getMonth()?'selected':''}>${n}</option>`).join('');
  if (thn) {
    const y = new Date().getFullYear();
    thn.innerHTML = [y-1,y,y+1].map(t=>`<option value="${t}" ${t===y?'selected':''}>${t}</option>`).join('');
  }

  await loadKelasJurnal();
}

async function loadKelasJurnal() {
  const select = document.getElementById('jurnalKelasSelect');
  if (!select || !currentUser) return;
  select.innerHTML = '<option value="">-- Memuat... --</option>';
  try {
    const snap = await db.collection('jadwal_alarm').where('user_uid', '==', currentUser.uid).get();
    jurnalKelasList = [];
    const unique = new Map();
    snap.forEach(doc => {
      const d = doc.data();
      if (!d.kelas) return;
      const key = d.kelas;
      if (!unique.has(key)) {
        unique.set(key, { nama: d.kelas, mapel: d.mapel || '' });
      }
    });
    if (unique.size === 0) {
      select.innerHTML = '<option value="">-- Belum ada kelas (tambahkan di Jadwal Mengajar) --</option>';
      return;
    }
    const list = Array.from(unique.values()).sort((a,b)=>a.nama.localeCompare(b.nama));
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>' + 
      list.map(k=>`<option value="${k.nama}" data-mapel="${k.mapel}">${k.nama}${k.mapel?' — '+k.mapel:''}</option>`).join('');
    jurnalKelasList = list;
  } catch (e) {
    console.error('⚠️ Load kelas jurnal:', e);
    select.innerHTML = '<option value="">-- Gagal memuat --</option>';
  }
}

function updateJamPreview() {
  const mulai = parseInt(document.getElementById('jurnalJamMulai').value);
  const selesai = parseInt(document.getElementById('jurnalJamSelesai').value);
  const preview = document.getElementById('jurnalJamPreview');
  if (!preview) return;
  if (!mulai || !selesai) { preview.style.display = 'none'; return; }
  if (selesai < mulai) {
    preview.style.display = 'block';
    preview.style.background = '#fee2e2';
    preview.style.color = '#dc2626';
    preview.textContent = '⚠️ Jam selesai harus lebih besar dari jam mulai';
    return;
  }
  const total = selesai - mulai + 1;
  preview.style.display = 'block';
  preview.style.background = '#d1fae5';
  preview.style.color = '#047857';
  preview.textContent = `🕐 Mengajar ${total} jam pelajaran (Jam ke-${mulai} s/d Jam ke-${selesai})`;
}

function resetFormJurnal() {
  document.getElementById('formJurnalSipena').reset();
  document.getElementById('jurnalEditId').value = '';
  document.getElementById('btnSimpanJurnalText').textContent = 'Simpan Jurnal';
  const preview = document.getElementById('jurnalJamPreview');
  if (preview) preview.style.display = 'none';
  const info = document.getElementById('jurnalAutoInfo');
  if (info) info.style.display = 'none';
  jurnalEditId = null;
  initJurnalPage();
}

// ══════════════════════════════════════════════
// SIMPAN / EDIT
// ══════════════════════════════════════════════
async function simpanJurnalKelas() {
  const btn = document.getElementById('btnSimpanJurnal');
  const btnText = document.getElementById('btnSimpanJurnalText');
  btn.disabled = true;
  btnText.innerHTML = '<span class="spinner"></span> Menyimpan...';

  const jamMulai = parseInt(document.getElementById('jurnalJamMulai').value);
  const jamSelesai = parseInt(document.getElementById('jurnalJamSelesai').value);
  if (jamSelesai < jamMulai) {
    showToast('⚠️ Jam selesai harus lebih besar dari jam mulai!', 'warning');
    btn.disabled = false;
    btnText.textContent = 'Simpan Jurnal';
    return;
  }

  const kelasEl = document.getElementById('jurnalKelasSelect');
  const mapel = kelasEl.options[kelasEl.selectedIndex]?.dataset.mapel || '';

  const data = {
    userEmail: currentUser.email,
    userName: currentUserData.namaResmi || currentUserData.nama || currentUser.email,
    userRole: currentUserData.role || 'Guru',
    userNip: currentUserData.nip || '',
    userMapel: mapel,
    tanggal: document.getElementById('jurnalTanggal').value,
    kelas: kelasEl.value,
    jamMulai: jamMulai,
    jamSelesai: jamSelesai,
    jumlahJam: jamSelesai - jamMulai + 1,
    muridHadir: parseInt(document.getElementById('jurnalMuridHadir').value) || 0,
    muridTidakHadir: parseInt(document.getElementById('jurnalMuridTidakHadir').value) || 0,
    materi: document.getElementById('jurnalMateri').value.trim(),
    fotoBase64: [],
    fotoCount: 0,
    keterangan: '',
    activities: [],
    vol: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const editId = document.getElementById('jurnalEditId').value;
    if (editId) {
      await db.collection('jurnal_mengajar').doc(editId).update({
        ...data,
        updatedAt: new Date().toISOString()
      });
      showToast('✅ Jurnal berhasil diperbarui!', 'success');
    } else {
      await db.collection('jurnal_mengajar').add(data);
      showToast('✅ Jurnal berhasil disimpan! Data sudah masuk ke sistem Kepala Madrasah.', 'success');
    }
    resetFormJurnal();
    loadRiwayatJurnal();
  } catch (e) {
    console.error('❌ Gagal simpan:', e);
    showToast('❌ Gagal menyimpan: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Simpan Jurnal';
  }
}

// ══════════════════════════════════════════════
// RIWAYAT
// ══════════════════════════════════════════════
async function loadRiwayatJurnal() {
  const tbody = document.getElementById('riwayatJurnalBody');
  const bln = parseInt(document.getElementById('jurnalFilterBulan').value);
  const thn = parseInt(document.getElementById('jurnalFilterTahun').value);
  if (!tbody || !currentUser) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem;"><span class="spinner"></span> Memuat...</td></tr>';

  try {
    const snap = await db.collection('jurnal_mengajar')
      .where('userEmail', '==', currentUser.email)
      .get();
    
    jurnalRiwayat = [];
    snap.forEach(doc => {
      const d = doc.data();
      const dt = new Date(d.tanggal);
      if (dt.getMonth() + 1 === bln && dt.getFullYear() === thn) {
        jurnalRiwayat.push({ id: doc.id, ...d });
      }
    });
    jurnalRiwayat.sort((a,b) => b.tanggal.localeCompare(a.tanggal) || (b.jamMulai || 0) - (a.jamMulai || 0));

    if (!jurnalRiwayat.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-secondary);">Tidak ada jurnal di bulan ini.</td></tr>';
      return;
    }

    tbody.innerHTML = jurnalRiwayat.map((j, i) => {
      const tgl = new Date(j.tanggal).toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short' });
      const materiShort = (j.materi || '-').length > 60 ? (j.materi.substring(0,60) + '...') : (j.materi || '-');
      const jam = j.jamMulai && j.jamSelesai ? `${j.jamMulai}-${j.jamSelesai}` : '-';
      return `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td>${tgl}</td>
          <td><b>${j.kelas || '-'}</b></td>
          <td>${jam}</td>
          <td style="font-size:0.8rem;">${materiShort}</td>
          <td style="text-align:center;">${j.muridHadir ?? 0}/${j.muridTidakHadir ?? 0}</td>
          <td>
            <div style="display:flex; gap:4px;">
              <button class="btn btn-warning btn-sm" onclick="editJurnalKelas('${j.id}')" style="padding:3px 8px;">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="hapusJurnalKelas('${j.id}')" style="padding:3px 8px;">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    console.error('❌ Gagal riwayat:', e);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:#dc2626;">Gagal: ${e.message}</td></tr>`;
  }
}

function editJurnalKelas(id) {
  const j = jurnalRiwayat.find(x => x.id === id);
  if (!j) return;
  jurnalEditId = id;
  document.getElementById('jurnalEditId').value = id;
  document.getElementById('jurnalTanggal').value = j.tanggal || '';
  document.getElementById('jurnalKelasSelect').value = j.kelas || '';
  document.getElementById('jurnalJamMulai').value = j.jamMulai || '';
  document.getElementById('jurnalJamSelesai').value = j.jamSelesai || '';
  document.getElementById('jurnalMuridHadir').value = j.muridHadir ?? 0;
  document.getElementById('jurnalMuridTidakHadir').value = j.muridTidakHadir ?? 0;
  document.getElementById('jurnalMateri').value = j.materi || '';
  document.getElementById('btnSimpanJurnalText').textContent = 'Update Jurnal';
  updateJamPreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('✏️ Mode edit aktif. Ubah data lalu klik Update.', 'warning');
}

async function hapusJurnalKelas(id) {
  if (!confirm('⚠️ Hapus jurnal ini? Tindakan tidak dapat dibatalkan.')) return;
  try {
    await db.collection('jurnal_mengajar').doc(id).delete();
    showToast('✅ Jurnal dihapus.', 'success');
    loadRiwayatJurnal();
  } catch (e) {
    showToast('❌ Gagal: ' + e.message, 'error');
  }
}

// ══════════════════════════════════════════════
// ⚙️ PETA JAM PELAJARAN PER HARI (SENIN - JUMAT)
// ══════════════════════════════════════════════
const JAM_PELAJARAN = {
  'Senin':  ['07:45','08:25','09:05','09:45','10:40','11:20','12:30','13:10','13:50','14:30','15:10'],
  'Selasa': ['07:30','08:10','08:50','09:30','10:25','11:05','11:45','12:50','13:30','14:10','14:50'],
  'Rabu':   ['07:30','08:10','08:50','09:30','10:25','11:05','11:45','12:50','13:30','14:10','14:50'],
  'Kamis':  ['07:30','08:10','08:50','09:30','10:25','11:05','11:45','12:50','13:30','14:10','14:50'],
  'Jumat':  ['08:00','08:40','09:20','10:00','10:55','11:35','13:20','14:00','14:40','15:20']
};

function jamKeDariWaktu(hari, waktu, isSelesai = false) {
  if (!waktu) return '';
  const tabel = JAM_PELAJARAN[hari];
  if (!tabel) return '';
  for (let i = 0; i < tabel.length; i++) {
    const cur = tabel[i];
    const next = tabel[i + 1] || '99:99';
    if (waktu === cur) return isSelesai ? Math.max(1, i) : i + 1;
    if (waktu > cur && waktu < next) return i + 1;
  }
  return '';
}

// ══════════════════════════════════════════════
// AUTO-ISI JAM DARI JADWAL MENGAJAR
// ══════════════════════════════════════════════
async function autoIsiJamDariJadwal() {
  const kelas = document.getElementById('jurnalKelasSelect').value;
  const tanggal = document.getElementById('jurnalTanggal').value;
  const info = document.getElementById('jurnalAutoInfo');
  if (!kelas || !currentUser || !info) return;

  const hariMap = {0:'Minggu',1:'Senin',2:'Selasa',3:'Rabu',4:'Kamis',5:'Jumat',6:'Sabtu'};
  const [y, m, d] = tanggal.split('-').map(Number);
  const hari = hariMap[new Date(y, m - 1, d).getDay()];

  try {
    const snap = await db.collection('jadwal_alarm').where('user_uid', '==', currentUser.uid).get();
    let kandidat = null;
    snap.forEach(doc => {
      const jd = doc.data();
      if (jd.kelas !== kelas) return;
      if (jd.hari === hari) kandidat = jd;
      else if (!kandidat) kandidat = jd;
    });

    if (kandidat && kandidat.mulai) {
      const keMulai = jamKeDariWaktu(hari, kandidat.mulai);
      const keSelesai = jamKeDariWaktu(hari, kandidat.selesai, true) || keMulai;
      if (keMulai) document.getElementById('jurnalJamMulai').value = keMulai;
      if (keSelesai) document.getElementById('jurnalJamSelesai').value = keSelesai;
      updateJamPreview();
      info.style.display = 'block';
      info.innerHTML = `🕐 <b>Auto-fill dari jadwal:</b> ${kandidat.hari}, ${kandidat.mulai}–${kandidat.selesai || '?'} → jam ke-${keMulai} s/d ke-${keSelesai}. <i>(Bisa diubah manual)</i>`;
    } else {
      info.style.display = 'none';
    }
  } catch (e) {
    console.warn('⚠️ autoIsiJam:', e.message);
    info.style.display = 'none';
  }
}

// ══════════════════════════════════════════════
// 📊 REKAP JURNAL + MONITORING KAMAD + CETAK PDF
// ══════════════════════════════════════════════

let rekapJurnalCache = null;

// ✅ Deteksi akun monitoring (Kepala / Wakil / Admin)
function isMonitoringJurnal() {
  const role = (currentUserData && currentUserData.role ? String(currentUserData.role) : '').toLowerCase();
  return role.includes('kepala') || role.includes('wakil') || role.includes('admin');
}

function renderRekapJurnal() {
  const monitor = isMonitoringJurnal();
  return `
  <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.25rem;">
      <h3 style="font-family:'Plus Jakarta Sans',sans-serif; font-size:1.25rem; font-weight:700;">
        📊 Rekap Jurnal Mengajar ${monitor ? '<span class="badge badge-blue" style="font-size:0.7rem; vertical-align:middle;">👁 MODE MONITORING</span>' : ''}
      </h3>
      <div style="display:flex; gap:0.6rem; flex-wrap:wrap; align-items:center;">
        <select id="rekapJurnalBulan" style="padding:0.5rem; border:1.5px solid var(--border); border-radius:8px; font-size:0.9rem;"></select>
        <select id="rekapJurnalTahun" style="padding:0.5rem; border:1.5px solid var(--border); border-radius:8px; font-size:0.9rem;"></select>
        ${monitor ? '<select id="rekapJurnalGuru" style="padding:0.5rem; border:1.5px solid var(--border); border-radius:8px; font-size:0.9rem;"><option value="">-- Semua Guru --</option></select>' : ''}
        <select id="rekapJurnalKelas" style="padding:0.5rem; border:1.5px solid var(--border); border-radius:8px; font-size:0.9rem;">
          <option value="">-- Semua Kelas --</option>
        </select>
        <button class="btn btn-primary btn-sm" onclick="loadRekapJurnal()"><i class="fas fa-search"></i> Tampilkan</button>
      </div>
    </div>

    ${monitor ? '<div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:0.7rem 1rem; border-radius:8px; margin-bottom:1rem; font-size:0.85rem; color:#1e40af;"><strong>👁 Mode Monitoring Aktif:</strong> Anda dapat melihat & memantau seluruh jurnal mengajar guru untuk evaluasi PBM.</div>' : ''}

    <div id="rekapJurnalSummary" style="display:none; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:0.75rem; margin-bottom:1.25rem;">
      ${monitor ? '<div style="background:#ede9fe; border-left:4px solid #7c3aed; padding:0.85rem; border-radius:8px;"><div style="font-size:1.4rem; font-weight:800;" id="rjGuru">0</div><div style="font-size:0.82rem; color:var(--text-secondary);">Guru Aktif</div></div>' : ''}
      <div style="background:#f0fdf4; border-left:4px solid #10b981; padding:0.85rem; border-radius:8px;">
        <div style="font-size:1.4rem; font-weight:800;" id="rjTotal">0</div>
        <div style="font-size:0.82rem; color:var(--text-secondary);">Total Pertemuan</div>
      </div>
      <div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:0.85rem; border-radius:8px;">
        <div style="font-size:1.4rem; font-weight:800;" id="rjJam">0</div>
        <div style="font-size:0.82rem; color:var(--text-secondary);">Total Jam Pelajaran</div>
      </div>
      <div style="background:#f5f3ff; border-left:4px solid #8b5cf6; padding:0.85rem; border-radius:8px;">
        <div style="font-size:1.4rem; font-weight:800;" id="rjKelas">0</div>
        <div style="font-size:0.82rem; color:var(--text-secondary);">Kelas Diajar</div>
      </div>
      <div style="background:#fef3c7; border-left:4px solid #f59e0b; padding:0.85rem; border-radius:8px;">
        <div style="font-size:1.4rem; font-weight:800;" id="rjHadir">0</div>
        <div style="font-size:0.82rem; color:var(--text-secondary);">Murid Hadir</div>
      </div>
      <div style="background:#fee2e2; border-left:4px solid #ef4444; padding:0.85rem; border-radius:8px;">
        <div style="font-size:1.4rem; font-weight:800;" id="rjTidak">0</div>
        <div style="font-size:0.82rem; color:var(--text-secondary);">Tidak Hadir</div>
      </div>
    </div>

    <div class="table-container" id="rekapJurnalTable">
      <div style="text-align:center; padding:2rem; color:var(--text-secondary);">Pilih periode, lalu klik "Tampilkan".</div>
    </div>

    <div id="rekapJurnalExport" style="display:none; margin-top:1.25rem; gap:0.75rem; justify-content:flex-end; flex-wrap:wrap;">
      <button class="btn btn-success btn-sm" onclick="exportRekapJurnalCSV()"><i class="fas fa-file-csv"></i> Export Excel</button>
      <button class="btn btn-secondary btn-sm" onclick="cetakRekapJurnal()"><i class="fas fa-print"></i> Cetak PDF (Berkop)</button>
    </div>
  </div>
  `;
}

function initRekapJurnalPage() {
  const bln = document.getElementById('rekapJurnalBulan');
  const thn = document.getElementById('rekapJurnalTahun');
  if (bln) bln.innerHTML = NAMA_BULAN.map((n,i)=>`<option value="${i+1}" ${i===new Date().getMonth()?'selected':''}>${n}</option>`).join('');
  if (thn) {
    const y = new Date().getFullYear();
    thn.innerHTML = [y-1,y,y+1].map(t=>`<option value="${t}" ${t===y?'selected':''}>${t}</option>`).join('');
  }
  if (isMonitoringJurnal()) loadDaftarGuruJurnal();
  loadRekapJurnalKelas();
}

// ✅ Dropdown daftar guru (khusus monitoring)
async function loadDaftarGuruJurnal() {
  const select = document.getElementById('rekapJurnalGuru');
  if (!select) return;
  try {
    const snap = await db.collection('jurnal_mengajar').get();
    const map = new Map();
    snap.forEach(doc => {
      const d = doc.data();
      if (d.userEmail && !map.has(d.userEmail)) map.set(d.userEmail, d.userName || d.userEmail);
    });
    const list = Array.from(map.entries()).sort((a,b) => a[1].localeCompare(b[1]));
    select.innerHTML = '<option value="">-- Semua Guru --</option>' +
      list.map(([email, nama]) => `<option value="${email}">${nama}</option>`).join('');
  } catch (e) { console.warn('⚠️', e.message); }
}

async function loadRekapJurnalKelas() {
  const select = document.getElementById('rekapJurnalKelas');
  if (!select || !currentUser) return;
  try {
    const monitor = isMonitoringJurnal();
    const q = monitor
      ? db.collection('jurnal_mengajar')
      : db.collection('jurnal_mengajar').where('userEmail','==',currentUser.email);
    const snap = await q.get();
    const set = new Map();
    snap.forEach(doc => {
      const k = doc.data().kelas;
      if (k && !set.has(k)) set.set(k, k);
    });
    const list = Array.from(set.keys()).sort();
    select.innerHTML = '<option value="">-- Semua Kelas --</option>' + list.map(k=>`<option value="${k}">${k}</option>`).join('');
  } catch(e) { console.warn('⚠️', e.message); }
}

async function loadRekapJurnal() {
  const bln = parseInt(document.getElementById('rekapJurnalBulan').value);
  const thn = parseInt(document.getElementById('rekapJurnalTahun').value);
  const kelas = document.getElementById('rekapJurnalKelas').value;
  const monitor = isMonitoringJurnal();
  const guruEmail = monitor ? (document.getElementById('rekapJurnalGuru')?.value || '') : currentUser.email;
  const area = document.getElementById('rekapJurnalTable');
  if (!currentUser) return;

  area.innerHTML = '<div style="text-align:center; padding:2rem;"><span class="spinner"></span> Memuat...</div>';

  try {
    const q = guruEmail
      ? db.collection('jurnal_mengajar').where('userEmail','==',guruEmail)
      : db.collection('jurnal_mengajar');
    const snap = await q.get();

    const list = [];
    snap.forEach(doc => {
      const d = doc.data();
      const dt = new Date(d.tanggal);
      if (dt.getMonth()+1 === bln && dt.getFullYear() === thn) {
        if (!kelas || d.kelas === kelas) list.push({ id: doc.id, ...d });
      }
    });
    list.sort((a,b) => a.tanggal.localeCompare(b.tanggal) || (a.jamMulai||0) - (b.jamMulai||0));

    if (!list.length) {
      area.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary);">Tidak ada jurnal di periode ini.</div>';
      document.getElementById('rekapJurnalSummary').style.display = 'none';
      document.getElementById('rekapJurnalExport').style.display = 'none';
      rekapJurnalCache = null;
      return;
    }

    const totalJam = list.reduce((s,j)=> s + (j.jumlahJam || ((j.jamSelesai && j.jamMulai) ? j.jamSelesai - j.jamMulai + 1 : 0)), 0);
    const totalHadir = list.reduce((s,j)=> s + (j.muridHadir||0), 0);
    const totalTidak = list.reduce((s,j)=> s + (j.muridTidakHadir||0), 0);
    const kelasSet = new Set(list.map(j=>j.kelas));
    const guruSet = new Set(list.map(j=>j.userEmail));

    if (monitor && document.getElementById('rjGuru')) document.getElementById('rjGuru').textContent = guruSet.size;
    document.getElementById('rjTotal').textContent = list.length;
    document.getElementById('rjJam').textContent = totalJam;
    document.getElementById('rjKelas').textContent = kelasSet.size;
    document.getElementById('rjHadir').textContent = totalHadir;
    document.getElementById('rjTidak').textContent = totalTidak;
    document.getElementById('rekapJurnalSummary').style.display = 'grid';
    document.getElementById('rekapJurnalExport').style.display = 'flex';

    let html = `<table style="width:100%;">
      <thead><tr>
        <th style="width:40px;">No</th>
        ${monitor ? '<th>Guru</th>' : ''}
        <th>Tanggal</th>
        <th>Kelas</th>
        <th style="width:70px;">Jam</th>
        <th style="width:50px;">JP</th>
        <th>Materi</th>
        <th style="width:60px;">Hadir</th>
        <th style="width:60px;">Tdk</th>
      </tr></thead><tbody>`;

    list.forEach((j,i) => {
      const tgl = new Date(j.tanggal).toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short'});
      const materi = (j.materi||'-').length > 60 ? j.materi.substring(0,60)+'...' : (j.materi||'-');
      const jp = j.jumlahJam || ((j.jamSelesai && j.jamMulai) ? j.jamSelesai - j.jamMulai + 1 : '-');
      html += `<tr>
        <td style="text-align:center;">${i+1}</td>
        ${monitor ? `<td style="font-weight:600;">${j.userName || j.userEmail || '-'}</td>` : ''}
        <td>${tgl}</td>
        <td><b>${j.kelas||'-'}</b></td>
        <td style="text-align:center;">${j.jamMulai||'-'}-${j.jamSelesai||'-'}</td>
        <td style="text-align:center;">${jp}</td>
        <td style="font-size:0.8rem;">${materi}</td>
        <td style="text-align:center; color:#10b981; font-weight:700;">${j.muridHadir??0}</td>
        <td style="text-align:center; color:#ef4444; font-weight:700;">${j.muridTidakHadir??0}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    area.innerHTML = html;

    rekapJurnalCache = { bln, thn, kelas, monitor, guruEmail, list, totalJam, totalHadir, totalTidak, kelasSet, guruSet };
  } catch(e) {
    console.error('❌', e);
    area.innerHTML = `<div style="text-align:center; padding:2rem; color:#dc2626;">Gagal: ${e.message}</div>`;
  }
}

function exportRekapJurnalCSV() {
  if (!rekapJurnalCache) return;
  const c = rekapJurnalCache;
  let csv = '\uFEFF';
  csv += `REKAP JURNAL MENGAJAR ${c.monitor ? '(MONITORING) ' : ''}- ${NAMA_BULAN[c.bln-1]} ${c.thn}\n`;
  if (!c.monitor) {
    csv += `Guru: ${currentUserData.namaResmi || currentUser.email}\nNIP: ${currentUserData.nip || '-'}\n`;
  }
  csv += `\nNo;${c.monitor ? 'Guru;' : ''}Tanggal;Kelas;Jam;JP;Materi;Hadir;Tidak Hadir\n`;
  c.list.forEach((j,i) => {
    const materi = (j.materi||'').replace(/;/g,',').replace(/\n/g,' ');
    csv += `${i+1};${c.monitor ? (j.userName||'-')+';' : ''}${j.tanggal};${j.kelas};${j.jamMulai||'-'}-${j.jamSelesai||'-'};${j.jumlahJam||'-'};${materi};${j.muridHadir||0};${j.muridTidakHadir||0}\n`;
  });
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekap_Jurnal_${c.monitor ? 'Monitoring_' : ''}${NAMA_BULAN[c.bln-1]}_${c.thn}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast('✅ CSV berhasil diunduh!', 'success');
}

// ══════════════════════════════════════════════
// 🖨️ CETAK PDF BERKOP (MODE GURU & MODE MONITORING)
// ══════════════════════════════════════════════
function cetakRekapJurnal() {
  if (!rekapJurnalCache) { showToast('Tampilkan rekap dulu!', 'error'); return; }
  const c = rekapJurnalCache;
  const now = new Date();
  const tglSurat = `${now.getDate()} ${NAMA_BULAN[now.getMonth()]} ${now.getFullYear()}`;

  const rawNipGuru = currentUserData?.nip || '';
  const nipGuru = rawNipGuru ? (rawNipGuru.startsWith('NIP.') ? rawNipGuru : 'NIP. ' + rawNipGuru) : 'NIP. ............................................';
  const namaGuruCetak = formatKapital(currentUserData?.namaResmi || currentUserData?.nama || currentUser.email, FORMAT_NAMA.guru);

  const b = 'border:1px solid #000; padding:5px; font-size:10pt;';
  const thStyle = `style="${b} background:#f0f0f0; font-weight:bold; text-align:center;"`;
  const tdStyle = `style="${b}"`;
  const tdCenter = `style="${b} text-align:center;"`;

  let rows = '';
  c.list.forEach((j,i) => {
    const hariMap = {0:'Minggu',1:'Senin',2:'Selasa',3:'Rabu',4:'Kamis',5:'Jumat',6:'Sabtu'};
    const dt = new Date(j.tanggal);
    const hari = hariMap[dt.getDay()];
    const tgl = `${dt.getDate()} ${NAMA_BULAN[dt.getMonth()]} ${dt.getFullYear()}`;
    const jp = j.jumlahJam || ((j.jamSelesai && j.jamMulai) ? j.jamSelesai - j.jamMulai + 1 : '-');
    rows += `<tr>
      <td ${tdCenter}>${i+1}</td>
      ${c.monitor ? `<td ${tdStyle}>${j.userName || j.userEmail || '-'}</td>` : ''}
      <td ${tdCenter}>${hari}, ${tgl}</td>
      <td ${tdStyle}>${j.kelas||'-'}</td>
      <td ${tdCenter}>${j.jamMulai||'-'}-${j.jamSelesai||'-'}</td>
      <td ${tdCenter}>${jp}</td>
      <td ${tdStyle}>${j.materi||'-'}</td>
      <td ${tdCenter}>${j.muridHadir||0}</td>
      <td ${tdCenter}>${j.muridTidakHadir||0}</td>
    </tr>`;
  });

  const kopHtml = `
    <div style="text-align:center; border-bottom:3px double #000; padding-bottom:10px; margin-bottom:16px;">
      <div style="font-size:12pt; font-weight:bold;">${CONFIG_MADRASAH.kop1}</div>
      <div style="font-size:14pt; font-weight:bold;">${CONFIG_MADRASAH.kop2}</div>
      <div style="font-size:10pt; font-style:italic;">${CONFIG_MADRASAH.alamat}</div>
    </div>`;

  const infoRows = c.monitor ? `
    <tr><td style="width:160px; border:none; padding:1px 0; font-size:12pt;">Periode</td><td style="border:none; font-size:12pt;">: <b>${NAMA_BULAN[c.bln-1]} ${c.thn}</b></td></tr>
    <tr><td style="border:none; padding:1px 0; font-size:12pt;">Jumlah Guru Aktif</td><td style="border:none; font-size:12pt;">: <b>${c.guruSet.size} guru</b></td></tr>
    <tr><td style="border:none; padding:1px 0; font-size:12pt;">Total Pertemuan</td><td style="border:none; font-size:12pt;">: <b>${c.list.length} pertemuan</b></td></tr>
    <tr><td style="border:none; padding:1px 0; font-size:12pt;">Total Jam Pelajaran</td><td style="border:none; font-size:12pt;">: <b>${c.totalJam} JP</b></td></tr>`
  : `
    <tr><td style="width:160px; border:none; padding:1px 0; font-size:12pt;">Guru Mata Pelajaran</td><td style="border:none; font-size:12pt;">: <b>${namaGuruCetak}</b></td></tr>
    <tr><td style="border:none; padding:1px 0; font-size:12pt;">NIP</td><td style="border:none; font-size:12pt;">: <b>${currentUserData.nip || '-'}</b></td></tr>
    <tr><td style="border:none; padding:1px 0; font-size:12pt;">Bulan</td><td style="border:none; font-size:12pt;">: <b>${NAMA_BULAN[c.bln-1]} ${c.thn}</b></td></tr>
    <tr><td style="border:none; padding:1px 0; font-size:12pt;">Total Pertemuan</td><td style="border:none; font-size:12pt;">: <b>${c.list.length} pertemuan</b></td></tr>
    <tr><td style="border:none; padding:1px 0; font-size:12pt;">Total Jam Pelajaran</td><td style="border:none; font-size:12pt;">: <b>${c.totalJam} JP</b></td></tr>`;

  const summaryHtml = `
    <table style="width:100%; border-collapse:collapse; margin:12px 0; font-size:10pt;">
      <tr style="background:#f0fdf4;">
        ${c.monitor ? `<th ${thStyle}>Guru</th>` : ''}
        <th ${thStyle}>Pertemuan</th>
        <th ${thStyle}>JP</th>
        <th ${thStyle}>Kelas</th>
        <th ${thStyle}>Murid Hadir</th>
        <th ${thStyle}>Tidak Hadir</th>
      </tr>
      <tr>
        ${c.monitor ? `<td ${tdCenter}>${c.guruSet.size}</td>` : ''}
        <td ${tdCenter}>${c.list.length}</td>
        <td ${tdCenter}>${c.totalJam}</td>
        <td ${tdCenter}>${c.kelasSet.size}</td>
        <td ${tdCenter} style="font-weight:700; color:#10b981;">${c.totalHadir}</td>
        <td ${tdCenter} style="font-weight:700; color:#ef4444;">${c.totalTidak}</td>
      </tr>
    </table>`;

  // TTD: monitoring → hanya Kamad; guru → Kamad + Guru
  const ttdHtml = c.monitor ? `
    <table style="width:100%; margin-top:28px; font-size:12pt;">
      <tr>
        <td style="width:50%; border:none;"></td>
        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:40px;">
          ${CONFIG_MADRASAH.kota}, ${tglSurat}<br>Kepala Madrasah
          <div style="height:60px;"></div>
          <b><u><span style="font-size:10pt;">${formatKapital(CONFIG_MADRASAH.kepalaMadrasah, FORMAT_NAMA.kepala)}</span></u></b><br><b style="font-size:11pt;">${CONFIG_MADRASAH.nipKepala}</b>
        </td>
      </tr>
    </table>`
  : `
    <table style="width:100%; margin-top:28px; font-size:12pt;">
      <tr>
        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:24px; padding-top:22px;">
          Mengetahui,<br>Kepala Madrasah
          <div style="height:60px;"></div>
          <b><u><span style="font-size:10pt;">${formatKapital(CONFIG_MADRASAH.kepalaMadrasah, FORMAT_NAMA.kepala)}</span></u></b><br><b style="font-size:11pt;">${CONFIG_MADRASAH.nipKepala}</b>
        </td>
        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:100px;">
          ${CONFIG_MADRASAH.kota}, ${tglSurat}
          <div style="height:22px;"></div>
          Guru Mata Pelajaran
          <div style="height:60px;"></div>
          <b><u><span style="font-size:10pt;">${namaGuruCetak}</span></u></b><br><b style="font-size:11pt;">${nipGuru}</b>
        </td>
      </tr>
    </table>`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
    <head><title>Rekap Jurnal ${NAMA_BULAN[c.bln-1]} ${c.thn}</title></head>
    <body style="font-family:'Times New Roman',serif; font-size:11pt; padding:24px; color:#000;">
      ${kopHtml}
      <div style="text-align:center; margin:0 0 12px;">
        <div style="font-size:12pt; font-weight:bold; text-decoration:underline;">REKAP JURNAL MENGAJAR${c.monitor ? ' — MONITORING PBM' : ''}</div>
        <div style="font-size:11pt; margin-top:4px;">Bulan ${NAMA_BULAN[c.bln-1]} Tahun ${c.thn}</div>
      </div>
      <table style="width:100%; margin-bottom:12px; font-size:12pt;">${infoRows}</table>
      ${summaryHtml}
      <table style="width:100%; border-collapse:collapse; font-size:10pt;">
        <thead><tr>
          <th ${thStyle} style="width:30px;">No</th>
          ${c.monitor ? `<th ${thStyle}>Guru</th>` : ''}
          <th ${thStyle} style="width:140px;">Hari/Tanggal</th>
          <th ${thStyle}>Kelas</th>
          <th ${thStyle} style="width:55px;">Jam</th>
          <th ${thStyle} style="width:32px;">JP</th>
          <th ${thStyle}>Materi/Tugas</th>
          <th ${thStyle} style="width:42px;">Hadir</th>
          <th ${thStyle} style="width:48px;">Tdk</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${ttdHtml}
      <script>window.print();<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}