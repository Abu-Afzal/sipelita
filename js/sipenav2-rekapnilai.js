// ══════════════════════════════════════════════
// SIPENA 2.0 - MODUL REKAP NILAI (KURIKULUM MERDEKA)
// ══════════════════════════════════════════════

let rekapNilaiCache = null;

function renderRekapNilai() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700;">📊 Rekap Nilai</h3>
        <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center;">
          <select id="rekapNilaiKategori" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
            <option value="formatif">Penilaian Formatif</option>
            <option value="sumatif">Penilaian Sumatif</option>
            <option value="sikap">Penilaian Sikap</option>
          </select>
          <select id="rekapNilaiKelas" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
            <option value="">-- Pilih Kelas --</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="loadRekapNilai()"><i class="fas fa-search"></i> Tampilkan</button>
        </div>
      </div>

      <div id="rekapNilaiSummary" style="display: none; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 1rem; border-radius: 8px;">
          <div style="font-size: 1.5rem; font-weight: 800;" id="rnStat1">0</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);" id="rnLabel1">Jumlah Siswa</div>
        </div>
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 1rem; border-radius: 8px;">
          <div style="font-size: 1.5rem; font-weight: 800;" id="rnStat2">0</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);" id="rnLabel2">Jumlah Penilaian</div>
        </div>
        <div style="background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 1rem; border-radius: 8px;">
          <div style="font-size: 1.5rem; font-weight: 800;" id="rnStat3">0</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);" id="rnLabel3">Rata-rata Kelas</div>
        </div>
      </div>

      <div class="table-container" id="rekapNilaiArea" style="overflow-x: auto;">
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          Pilih kategori dan kelas, lalu klik "Tampilkan" untuk melihat rekap nilai.
        </div>
      </div>

      <div id="rekapNilaiExport" style="display: none; margin-top: 1.5rem; gap: 0.75rem; justify-content: flex-end;">
        <button class="btn btn-success btn-sm" onclick="exportRekapNilaiCSV()"><i class="fas fa-file-csv"></i> Export CSV</button>
        <button class="btn btn-secondary btn-sm" onclick="cetakRekapNilai()"><i class="fas fa-print"></i> Cetak PDF</button>
      </div>
    </div>
  `;
}

async function initRekapNilaiPage() {
  if (!currentUser) return;
  const select = document.getElementById('rekapNilaiKelas');
  if (!select) return;

  select.innerHTML = '<option value="">Memuat...</option>';

  try {
    const kelasSnap = await db.collection('kelas').where('archived', '==', false).get();
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    const kelasList = [];
    
    kelasSnap.forEach(doc => {
      const data = doc.data();
      const isMyClass =
        (Array.isArray(data.pengajar_uids) && data.pengajar_uids.includes(currentUser.uid)) ||
        (data.wali_kelas_uid && data.wali_kelas_uid === currentUser.uid) ||
        (data.guru_email && data.guru_email === currentUser.email) ||
        (data.pengajar && data.pengajar[currentUser.uid]);
      if (isMyClass) kelasList.push({ id: doc.id, ...data });
    });
    
    kelasList.sort((a, b) => a.nama.localeCompare(b.nama));
    kelasList.forEach(kelas => {
      const mapel = kelas.pengajar?.[currentUser.uid]?.mapel || kelas.mapel || '';
      const opt = document.createElement('option');
      opt.value = kelas.id;
      opt.textContent = mapel ? `${kelas.nama} (${mapel})` : kelas.nama;
      opt.dataset.nama = kelas.nama;
      opt.dataset.mapel = mapel;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error('Error initRekapNilaiPage:', error);
    select.innerHTML = '<option value="">Gagal memuat</option>';
  }
}

async function loadRekapNilai() {
  const kategori = document.getElementById('rekapNilaiKategori').value;
  const kelasId = document.getElementById('rekapNilaiKelas').value;
  const area = document.getElementById('rekapNilaiArea');
  const selectKelas = document.getElementById('rekapNilaiKelas');

  if (!kelasId) {
    showToast('Pilih kelas terlebih dahulu!', 'error');
    return;
  }

  area.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div> Memuat rekap nilai...</div>';

  try {
    // 1. Ambil siswa
    const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
    const siswaList = [];
    siswaSnap.forEach(doc => siswaList.push({ id: doc.id, ...doc.data() }));
    siswaList.sort((a, b) => a.student_name.localeCompare(b.student_name));

    // 2. Ambil semua penilaian dengan kategori ini
    const nilaiSnap = await db.collection('penilaian')
      .where('kelas_id', '==', kelasId)
      .where('kategori', '==', kategori)
      .get();

    const penilaianList = [];
    nilaiSnap.forEach(doc => {
      const d = doc.data();
      penilaianList.push({
        id: doc.id,
        nama: d.nama_penilaian || d.jenis,
        jenis: d.jenis,
        nilai: d.nilai || {},
        deskripsi: d.deskripsi || {}
      });
    });

    // Urutkan: PH dulu, lalu Tugas, lalu Kuis; Sumatif: PTS, PAS, Proyek
    const urutan = kategori === 'formatif' ? ['PH','Tugas','Kuis'] :
                   kategori === 'sumatif' ? ['PTS','PAS','Proyek'] :
                   ['Beriman','Berkebinekaan','GotongRoyong','Mandiri','BernalarKritis','Kreatif'];
    penilaianList.sort((a, b) => {
      const iA = urutan.indexOf(a.jenis);
      const iB = urutan.indexOf(b.jenis);
      if (iA !== iB) return iA - iB;
      return a.nama.localeCompare(b.nama);
    });

    const kelasNama = selectKelas.options[selectKelas.selectedIndex].dataset.nama;
    const mapel = selectKelas.options[selectKelas.selectedIndex].dataset.mapel || '';

    // Stats
    document.getElementById('rnStat1').textContent = siswaList.length;
    document.getElementById('rnLabel1').textContent = 'Jumlah Siswa';
    document.getElementById('rnStat2').textContent = penilaianList.length;
    document.getElementById('rnLabel2').textContent = 'Jumlah Penilaian';
    
    if (siswaList.length === 0) {
      area.innerHTML = '<div style="text-align: center; padding: 2rem;">Tidak ada siswa di kelas ini.</div>';
      return;
    }
    if (penilaianList.length === 0) {
      area.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Belum ada data ${kategori} untuk kelas ini.</div>`;
      return;
    }

    // 3. Render tabel
let headerCols = '<th style="position: sticky; left: 0; background: white; font-weight: 700; z-index: 10;">No</th><th style="position: sticky; left: 50px; background: white; font-weight: 700; min-width: 200px; z-index: 10;">Nama Siswa</th>';
penilaianList.forEach(p => {
  headerCols += `
    <th style="text-align: center; min-width: 120px;">
      <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
        <span style="font-weight:700;">${p.nama}</span>
        <button class="btn btn-sm btn-warning" onclick="window.openEditNilaiModal('${p.id}', '${p.nama.replace(/'/g, "\\'")}', '${kelasId}', '${kategori}')" style="padding: 2px 8px; font-size: 0.75rem; border-radius: 4px;">
          <i class="fas fa-edit"></i> Edit
        </button>
      </div>
    </th>`;
});
    
    let hasilCol = '';
    if (kategori === 'sikap') {
      hasilCol = '<th style="text-align: center; background: #fef3c7; font-weight: 700; min-width: 120px;">Predikat</th>';
    } else {
      hasilCol = '<th style="text-align: center; background: #dcfce7; font-weight: 700; min-width: 100px;">Rata-rata</th>';
    }

    let rows = '';
    let totalNilaiKelas = 0;
    let countNilaiKelas = 0;

    siswaList.forEach((s, i) => {
      let rowHtml = `<tr>
        <td style="position: sticky; left: 0; background: white; text-align: center; font-weight: 600;">${i + 1}</td>
        <td style="position: sticky; left: 50px; background: white; font-weight: 600;">${s.student_name}</td>`;
      
      let totalSiswa = 0, countSiswa = 0;
      let sikapSiswa = {}; // { SB: 2, B: 1, C: 0, K: 0 }

      penilaianList.forEach(p => {
        const nilai = p.nilai[s.id];
        if (kategori === 'sikap') {
          if (!sikapSiswa[nilai]) sikapSiswa[nilai] = 0;
          sikapSiswa[nilai]++;
          const bg = nilai === 'SB' ? '#10b981' : nilai === 'B' ? '#3b82f6' : nilai === 'C' ? '#f59e0b' : nilai === 'K' ? '#ef4444' : '#e2e8f0';
          const txt = nilai === 'SB' ? 'Sangat Baik' : nilai === 'B' ? 'Baik' : nilai === 'C' ? 'Cukup' : nilai === 'K' ? 'Kurang' : '-';
          rowHtml += `<td style="text-align: center; color: ${nilai ? 'white' : '#64748b'}; background: ${bg}; font-weight: 600; font-size: 0.85rem;">${txt}</td>`;
        } else {
          if (nilai !== undefined && nilai !== '') {
            const n = Number(nilai);
            const color = n >= 80 ? '#10b981' : n >= 60 ? '#f59e0b' : '#ef4444';
            rowHtml += `<td style="text-align: center; font-weight: 700; color: ${color};">${n}</td>`;
            totalSiswa += n;
            countSiswa++;
            totalNilaiKelas += n;
            countNilaiKelas++;
          } else {
            rowHtml += `<td style="text-align: center; color: #94a3b8;">-</td>`;
          }
        }
      });

      if (kategori === 'sikap') {
        // Cari predikat dominan
        const max = Math.max(...Object.values(sikapSiswa));
        const dominan = Object.keys(sikapSiswa).find(k => sikapSiswa[k] === max);
        const bg = dominan === 'SB' ? '#10b981' : dominan === 'B' ? '#3b82f6' : dominan === 'C' ? '#f59e0b' : dominan === 'K' ? '#ef4444' : '#e2e8f0';
        const txt = dominan === 'SB' ? 'Sangat Baik' : dominan === 'B' ? 'Baik' : dominan === 'C' ? 'Cukup' : dominan === 'K' ? 'Kurang' : '-';
        rowHtml += `<td style="text-align: center; color: white; background: ${bg}; font-weight: 800;">${txt}</td>`;
        s.predikat = dominan;
      } else {
        const rata = countSiswa > 0 ? (totalSiswa / countSiswa) : 0;
        const rataColor = rata >= 80 ? '#10b981' : rata >= 60 ? '#f59e0b' : '#ef4444';
        s.rata = Math.round(rata * 10) / 10;
        rowHtml += `<td style="text-align: center; background: #f0fdf4; color: ${rataColor}; font-weight: 800;">${s.rata.toFixed(1)}</td>`;
      }
      
      rowHtml += '</tr>';
      rows += rowHtml;
    });

    const rataKelas = countNilaiKelas > 0 ? (totalNilaiKelas / countNilaiKelas) : 0;
    document.getElementById('rnStat3').textContent = rataKelas.toFixed(1);
    document.getElementById('rnLabel3').textContent = kategori === 'sikap' ? 'Predikat Umum' : 'Rata-rata Kelas';

    document.getElementById('rekapNilaiSummary').style.display = 'grid';
    document.getElementById('rekapNilaiExport').style.display = 'flex';

    const html = `<table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
      <thead style="background: #f1f5f9;">
        <tr>${headerCols}${hasilCol}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
    
    area.innerHTML = html;

    rekapNilaiCache = {
      kategori, kelasNama, kelasId, mapel, siswaList, penilaianList, rataKelas,
      tahunAjaran: document.getElementById('rekapTahunAjaran')?.value || '2026/2027'
    };

  } catch (error) {
    console.error('Error loadRekapNilai:', error);
    area.innerHTML = `<div style="text-align: center; padding: 2rem; color: red;">Gagal memuat: ${error.message}</div>`;
  }
}

function exportRekapNilaiCSV() {
  if (!rekapNilaiCache) { showToast('Tampilkan rekap terlebih dahulu!', 'error'); return; }
  const c = rekapNilaiCache;

  let csv = '\uFEFF';
  csv += `REKAP NILAI ${c.kategori.toUpperCase()} - ${c.kelasNama};Jumlah Penilaian: ${c.penilaianList.length}\n`;
  
  let header = 'No;Nama Siswa;';
  c.penilaianList.forEach(p => header += `${p.nama};`);
  header += c.kategori === 'sikap' ? 'Predikat\n' : 'Rata-rata\n';
  csv += header;

  c.siswaList.forEach((s, i) => {
    csv += `${i + 1};${s.student_name};`;
    c.penilaianList.forEach(p => {
      csv += `${p.nilai[s.id] !== undefined ? p.nilai[s.id] : '-'};`;
    });
    csv += c.kategori === 'sikap' ? `${s.predikat || '-'}\n` : `${s.rata || 0}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekap_Nilai_${c.kategori}_${c.kelasNama.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✅ CSV berhasil diunduh!', 'success');
}

function cetakRekapNilai() {
  if (!rekapNilaiCache) { showToast('Tampilkan rekap terlebih dahulu!', 'error'); return; }
  const c = rekapNilaiCache;
  const today = new Date();
  const tglSurat = `${today.getDate()} ${NAMA_BULAN[today.getMonth()]} ${today.getFullYear()}`;
  const rawNipGuru = currentUserData?.nip || '';
  const nipGuru = rawNipGuru ? (rawNipGuru.startsWith('NIP.') ? rawNipGuru : 'NIP. ' + rawNipGuru) : 'NIP. ............................................';
  const namaGuruCetak = formatKapital(currentUserData?.namaResmi || currentUserData?.nama || currentUser.email || '', FORMAT_NAMA.guru);

  const b = 'border:1px solid #000; padding:4px; font-size:11pt;';
  const thStyle = `style="${b} background:#f0f0f0; font-weight:bold; text-align:center;"`;

  let headerCols = `<th ${thStyle}>No</th><th ${thStyle}>Nama Siswa</th>`;
  c.penilaianList.forEach(p => headerCols += `<th ${thStyle}>${p.nama}</th>`);
  headerCols += c.kategori === 'sikap' 
    ? `<th ${thStyle} style="${b} background:#fef3c7;">Predikat</th>` 
    : `<th ${thStyle} style="${b} background:#dcfce7;">Rata-rata</th>`;

  let rows = '';
  c.siswaList.forEach((s, i) => {
    let row = `<tr><td style="${b} text-align:center;">${i + 1}</td><td style="${b}">${s.student_name}</td>`;
    c.penilaianList.forEach(p => {
      const v = p.nilai[s.id];
      if (c.kategori === 'sikap') {
        const txt = v === 'SB' ? 'SB' : v === 'B' ? 'B' : v === 'C' ? 'C' : v === 'K' ? 'K' : '-';
        row += `<td style="${b} text-align:center; font-weight:600;">${txt}</td>`;
      } else {
        row += `<td style="${b} text-align:center;">${v !== undefined ? v : '-'}</td>`;
      }
    });
    if (c.kategori === 'sikap') {
      row += `<td style="${b} text-align:center; font-weight:700;">${s.predikat || '-'}</td>`;
    } else {
      row += `<td style="${b} text-align:center; font-weight:700;">${(s.rata || 0).toFixed(1)}</td>`;
    }
    row += '</tr>';
    rows += row;
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

  const ttdHtml = `
    <table style="width:100%; margin-top:28px; font-size:12pt;">
      <tr>
        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:24px; padding-top:22px;">
          Mengetahui,<br>Kepala Madrasah
          <div style="height:60px;"></div>
          <b><u><span style="font-size:10pt;">${formatKapital(CONFIG_MADRASAH.kepalaMadrasah, FORMAT_NAMA.kepala)}</span></u></b><br><b style="font-size:10pt;">${CONFIG_MADRASAH.nipKepala}</b>
        </td>
        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:100px;">
          ${CONFIG_MADRASAH.kota}, ${tglSurat}
          <div style="height:22px;"></div>
          Guru Mata Pelajaran
          <div style="height:60px;"></div>
          <b><u><span style="font-size:10pt;">${namaGuruCetak}</span></u></b><br><b style="font-size:10pt;">${nipGuru}</b>
        </td>
      </tr>
    </table>`;

  const judul = `REKAP NILAI ${c.kategori.toUpperCase()}`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
    <head><title>${judul} - ${c.kelasNama}</title></head>
    <body style="font-family: 'Times New Roman', serif; font-size: 12pt; padding: 24px; color:#000;">
      ${kopHtml}
      <div style="text-align:center; margin:0 0 12px;">
        <div style="font-size:12pt; font-weight:bold; text-decoration:underline;">${judul}</div>
      </div>
      <table style="width:100%; margin-bottom:12px; font-size:12pt;">
        <tr><td style="width:140px; border:none;">Kelas</td><td style="border:none;">: <b>${c.kelasNama}</b></td></tr>
        <tr><td style="border:none;">Tahun Ajaran</td><td style="border:none;">: <b>${c.tahunAjaran}</b></td></tr>
        <tr><td style="border:none;">Mata Pelajaran</td><td style="border:none;">: <b>${c.mapel || '-'}</b></td></tr>
        <tr><td style="border:none;">Jumlah Penilaian</td><td style="border:none;">: <b>${c.penilaianList.length}</b></td></tr>
      </table>
      <table style="width:100%; border-collapse:collapse; font-size:11pt;">
        <thead><tr>${headerCols}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${ttdHtml}
      <script>
  window.onload = function() {
    setTimeout(function() {
      window.focus();
      window.print();
    }, 300);
  };
<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ══════════════════════════════════════════════
// MODAL EDIT NILAI (TAMBAHAN)
// ══════════════════════════════════════════════
let currentEditPenilaianId = null;
let currentEditKelasId = null;
let currentEditKategori = null;
let currentEditSiswaList = [];

window.openEditNilaiModal = async (penilaianId, penilaianNama, kelasId, kategori) => {
  currentEditPenilaianId = penilaianId;
  currentEditKelasId = kelasId;
  currentEditKategori = kategori;
  
  document.getElementById('editNilaiTitle').textContent = `Edit Nilai: ${penilaianNama}`;
  document.getElementById('editNilaiBody').innerHTML = '<div style="text-align:center; padding:2rem;"><div class="spinner"></div> Memuat data siswa...</div>';
  
  // Buka modal - cek apakah fungsi openModal tersedia
  if (typeof openModal === 'function') {
    openModal('modalEditNilai');
  } else {
    document.getElementById('modalEditNilai').classList.add('active');
  }
  
  try {
    // 1. Ambil data siswa di kelas ini
    const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
    currentEditSiswaList = [];
    siswaSnap.forEach(doc => currentEditSiswaList.push({ id: doc.id, ...doc.data() }));
    currentEditSiswaList.sort((a, b) => a.student_name.localeCompare(b.student_name));
    
    // 2. Ambil data penilaian saat ini
    const nilaiDoc = await db.collection('penilaian').doc(penilaianId).get();
    
    // ✅ PERBAIKAN: Tambahkan fallback yang lebih aman
    let nilaiData = {};
    if (nilaiDoc.exists) {
      nilaiData = nilaiDoc.data();
    }
    
    // ✅ Pastikan field 'nilai' dan 'deskripsi' selalu berupa object
    const nilaiMap = nilaiData.nilai || {};
    const deskripsiMap = nilaiData.deskripsi || {};
    
    console.log('✅ Data penilaian dimuat:', {
      docId: penilaianId,
      hasNilai: Object.keys(nilaiMap).length,
      hasDeskripsi: Object.keys(deskripsiMap).length,
      totalSiswa: currentEditSiswaList.length
    });
    
    // 3. Render tabel input
    let html = '<table style="width:100%; border-collapse: collapse; font-size: 0.9rem;">';
    html += '<thead style="background: #f8fafc; position: sticky; top: 0;"><tr>';
    html += '<th style="padding:8px; text-align:left; border-bottom: 2px solid #e2e8f0;">No</th>';
    html += '<th style="padding:8px; text-align:left; border-bottom: 2px solid #e2e8f0;">Nama Siswa</th>';
    html += '<th style="padding:8px; text-align:center; border-bottom: 2px solid #e2e8f0; width: 130px;">Nilai / Predikat</th>';
    html += '<th style="padding:8px; text-align:left; border-bottom: 2px solid #e2e8f0;">Deskripsi / Catatan</th>';
    html += '</tr></thead><tbody>';
    
    currentEditSiswaList.forEach((s, i) => {
      // ✅ PERBAIKAN: Akses nilai dengan aman
      const currentNilai = (nilaiMap[s.id] !== undefined && nilaiMap[s.id] !== null) ? nilaiMap[s.id] : '';
      const currentDesk = deskripsiMap[s.id] || '';
      
      let inputField = '';
      if (kategori === 'sikap') {
        inputField = `
          <select id="edit_nilai_${s.id}" style="padding:6px; border-radius:6px; border:1px solid #cbd5e1; width:100%; font-size:0.85rem;">
            <option value="">- Pilih -</option>
            <option value="SB" ${currentNilai === 'SB' ? 'selected' : ''}>SB (Sangat Baik)</option>
            <option value="B" ${currentNilai === 'B' ? 'selected' : ''}>B (Baik)</option>
            <option value="C" ${currentNilai === 'C' ? 'selected' : ''}>C (Cukup)</option>
            <option value="K" ${currentNilai === 'K' ? 'selected' : ''}>K (Kurang)</option>
          </select>`;
      } else {
        inputField = `<input type="number" id="edit_nilai_${s.id}" value="${currentNilai}" min="0" max="100" placeholder="0-100" style="padding:6px; border-radius:6px; border:1px solid #cbd5e1; width:80px; text-align:center; font-size:0.85rem;">`;
      }
      
      html += `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding:8px; text-align:center;">${i + 1}</td>
          <td style="padding:8px; font-weight:600;">${s.student_name}</td>
          <td style="padding:8px; text-align:center;">${inputField}</td>
          <td style="padding:8px;"><input type="text" id="edit_desk_${s.id}" value="${currentDesk}" placeholder="Catatan..." style="padding:6px; border-radius:6px; border:1px solid #cbd5e1; width:100%; font-size:0.85rem;"></td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    document.getElementById('editNilaiBody').innerHTML = html;
    
  } catch (error) {
    console.error('Error load edit nilai:', error);
    document.getElementById('editNilaiBody').innerHTML = `<div style="text-align:center; color:#ef4444; padding:2rem;">
      <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:0.5rem;"></i><br>
      <b>Gagal memuat data</b><br>
      <small style="color:#64748b;">${error.message}</small>
    </div>`;
  }
};

window.simpanEditNilai = async () => {
  if (!currentEditPenilaianId) return;
  
  const btn = document.getElementById('btnSimpanEditNilai');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
  
  try {
    const updateData = {
      nilai: {},
      deskripsi: {},
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    let adaYangDiisi = false;
    
    currentEditSiswaList.forEach(s => {
      const nilaiInput = document.getElementById(`edit_nilai_${s.id}`);
      const deskInput = document.getElementById(`edit_desk_${s.id}`);
      
      if (nilaiInput) {
        let val = nilaiInput.value.trim();
        if (val !== '') {
          updateData.nilai[s.id] = currentEditKategori === 'sikap' ? val : Number(val);
          adaYangDiisi = true;
        }
      }
      if (deskInput) {
        const desk = deskInput.value.trim();
        if (desk !== '') {
          updateData.deskripsi[s.id] = desk;
        }
      }
    });
    
    if (!adaYangDiisi && Object.keys(updateData.deskripsi).length === 0) {
      showToast('⚠️ Tidak ada perubahan nilai atau deskripsi yang diisi!', 'warning');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan';
      return;
    }
    
    await db.collection('penilaian').doc(currentEditPenilaianId).update(updateData);
    
    showToast('✅ Nilai berhasil diperbarui!', 'success');
    closeModal('modalEditNilai');
    
    // Refresh tampilan rekap nilai agar data terbaru muncul
    loadRekapNilai();
    
  } catch (error) {
    console.error('Error simpan edit nilai:', error);
    showToast('❌ Gagal menyimpan: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan';
  }
};