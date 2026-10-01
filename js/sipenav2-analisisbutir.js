// ═══════════════════════════════════════════════════════════
// SIPENA 2.0 - MODUL ANALISIS BUTIR SOAL
// ═══════════════════════════════════════════════════════════

let butirCache = null;

// ═══════════════════════════════════════════════════════════
// RENDER HALAMAN ANALISIS BUTIR SOAL
// ═══════════════════════════════════════════════════════════
function renderAnalisisButir() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700;">📊 Analisis Hasil Penilaian Per Butir Soal</h3>
      </div>

      <div style="background: #f0f9ff; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #0ea5e9;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">🏫 Kelas</label>
            <select id="butirKelasSelect" onchange="loadButirOptions()" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
              <option value="">-- Pilih Kelas --</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">📝 Penilaian</label>
            <select id="butirPenilaianSelect" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
              <option value="">-- Pilih Penilaian --</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">🎯 KKM</label>
            <input type="number" id="butirKKM" value="75" min="0" max="100" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
          </div>
          <div style="display: flex; align-items: flex-end;">
            <button class="btn btn-primary" onclick="runAnalisisButir()" style="width: 100%;">
              <i class="fas fa-list-ol"></i> Analisis Butir
            </button>
          </div>
        </div>
      </div>

      <div id="butirSummary" style="display: none; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;"></div>

      <div class="table-container" id="butirTableArea">
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          Pilih kelas dan penilaian, lalu klik "Analisis Butir".
        </div>
      </div>

      <div id="butirExport" style="display: none; margin-top: 1.5rem; gap: 0.75rem; justify-content: flex-end;">
        <button class="btn btn-success btn-sm" onclick="exportAnalisisButirCSV()">
          <i class="fas fa-file-csv"></i> Export CSV
        </button>
        <button class="btn btn-secondary btn-sm" onclick="cetakAnalisisButir()">
          <i class="fas fa-print"></i> Cetak PDF
        </button>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// INISIALISASI HALAMAN
// ═══════════════════════════════════════════════════════════
async function initAnalisisButirPage() {
  if (!currentUser) return;
  const select = document.getElementById('butirKelasSelect');
  if (!select) return;

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
    console.error('Error initAnalisisButirPage:', error);
  }
}

// ═══════════════════════════════════════════════════════════
// LOAD DAFTAR PENILAIAN
// ═══════════════════════════════════════════════════════════
async function loadButirOptions() {
  const kelasId = document.getElementById('butirKelasSelect').value;
  const select = document.getElementById('butirPenilaianSelect');
  select.innerHTML = '<option value="">-- Pilih Penilaian --</option>';
  if (!kelasId) return;

  try {
    const snap = await db.collection('penilaian').where('kelas_id', '==', kelasId).get();
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    list.sort((a, b) => (a.nama_penilaian || '').localeCompare(b.nama_penilaian || ''));

    list.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nama_penilaian} (${p.jenis || 'Umum'})`;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error('Error loadButirOptions:', error);
  }
}

// ══════════════════════════════════════════════════════════
// JALANKAN ANALISIS BUTIR SOAL
// ═══════════════════════════════════════════════════════════
async function runAnalisisButir() {
  const kelasId = document.getElementById('butirKelasSelect').value;
  const penilaianId = document.getElementById('butirPenilaianSelect').value;
  const kkm = Number(document.getElementById('butirKKM').value) || 75;
  const area = document.getElementById('butirTableArea');

  if (!kelasId || !penilaianId) {
    showToast('Pilih kelas dan penilaian terlebih dahulu!', 'error');
    return;
  }

  area.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div> Menganalisis butir soal...</div>';

  try {
    // 1. Ambil dokumen penilaian
    const docSnap = await db.collection('penilaian').doc(penilaianId).get();
    if (!docSnap.exists) { showToast('Data penilaian tidak ditemukan!', 'error'); return; }
    const penilaian = { id: docSnap.id, ...docSnap.data() };
    
    // 2. Ambil data soal per butir
    const soalButir = penilaian.soal_butir || {};
    const records = penilaian.nilai || {};

    // 3. Ambil siswa
    const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
    const siswaList = [];
    siswaSnap.forEach(doc => siswaList.push({ id: doc.id, ...doc.data() }));
    siswaList.sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));

    // 4. Ambil kunci soal
    const butirKeys = Object.keys(soalButir).sort();
    if (butirKeys.length === 0) {
      area.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ef4444;">⚠️ Data penilaian ini tidak memiliki rincian per butir soal.</div>';
      return;
    }

    // 5. Proses data per siswa
    const analisisData = [];
    let totalSkorPerSoal = {};
    butirKeys.forEach(k => totalSkorPerSoal[k] = 0);

    siswaList.forEach(s => {
      const studentRecord = records[s.id] || {};
      let totalNilaiSiswa = 0;
      const nilaiPerSoal = {};
      
      butirKeys.forEach(k => {
        const skor = studentRecord[k] !== undefined ? Number(studentRecord[k]) : 0;
        nilaiPerSoal[k] = skor;
        totalSkorPerSoal[k] += skor;
        totalNilaiSiswa += skor;
      });

      if (totalNilaiSiswa === 0 && studentRecord.total !== undefined) {
        totalNilaiSiswa = Number(studentRecord.total);
      }

      const isTuntas = totalNilaiSiswa >= kkm;
      analisisData.push({
        siswa: s,
        nilaiPerSoal,
        total: totalNilaiSiswa,
        isTuntas
      });
    });

    const jmlPeserta = analisisData.length;
    const jmlTuntas = analisisData.filter(d => d.isTuntas).length;
    const jmlTidakTuntas = jmlPeserta - jmlTuntas;
    const ketuntasanKlasikal = jmlPeserta > 0 ? ((jmlTuntas / jmlPeserta) * 100).toFixed(1) : 0;

    // 6. Render Tabel 1: Rincian Nilai Peserta
    let headerSoal = '';
    butirKeys.forEach(k => {
      const noSoal = k.replace('soal_', '');
      headerSoal += `<th style="border:1px solid #000; padding:4px; background:#f0f0f0; font-size:9pt;">${noSoal}</th>`;
    });

    let rowsSiswa = '';
    analisisData.forEach((d, i) => {
      let colsSoal = '';
      butirKeys.forEach(k => {
        colsSoal += `<td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${d.nilaiPerSoal[k] || 0}</td>`;
      });
      
      rowsSiswa += `<tr>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${i + 1}</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${d.siswa.induk || '-'}</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt;">${d.siswa.student_name}</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${d.siswa.l_p || 'L/P'}</td>
        ${colsSoal}
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center; font-weight:bold;">${d.total}</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${((d.total / 100) * 100).toFixed(0)}%</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center; font-weight:bold;">${d.isTuntas ? 'Ya' : 'Tidak'}</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${d.isTuntas ? '-' : 'I'}</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${d.isTuntas ? '-' : 'II'}</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center; font-weight:bold;">${d.total}</td>
      </tr>`;
    });

    // 7. Render Tabel 2: Hasil Analisis Per Butir
    let summaryButirRows = '';
    butirKeys.forEach((k, idx) => {
      const noSoal = k.replace('soal_', '');
      const skorMax = Number(soalButir[k].max || soalButir[k].skor_max || 0);
      const skorDiperoleh = totalSkorPerSoal[k];
      const skorIdeal = skorMax * jmlPeserta;
      const pctKetercapaian = skorIdeal > 0 ? ((skorDiperoleh / skorIdeal) * 100).toFixed(1) : 0;
      const pctKegagalan = (100 - pctKetercapaian).toFixed(1);
      const tidakTuntas = analisisData.filter(d => (d.nilaiPerSoal[k] / skorMax) < 0.75).length;
      const tuntas = jmlPeserta - tidakTuntas;

      summaryButirRows += `<tr>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${noSoal}</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${skorDiperoleh}</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${skorIdeal}</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${pctKetercapaian}%</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${pctKegagalan}%</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${skorMax}</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${jmlPeserta}</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${tidakTuntas}</td>
        <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${tuntas}</td>
      </tr>`;
    });

    const mapel = penilaian.mapel || document.getElementById('butirKelasSelect').options[document.getElementById('butirKelasSelect').selectedIndex].dataset.mapel || '-';
    const kelasNama = document.getElementById('butirKelasSelect').options[document.getElementById('butirKelasSelect').selectedIndex].dataset.nama;

    area.innerHTML = `
      <div style="margin-bottom: 2rem;">
        <h4 style="text-align:center; font-size:14pt; font-weight:bold; margin-bottom:1rem;">ANALISIS HASIL ASESMEN</h4>
        <table style="width:100%; font-size:11pt; margin-bottom:1rem;">
          <tr><td style="width:150px; border:none;">Mata Pelajaran</td><td style="border:none;">: <b>${mapel}</b></td></tr>
          <tr><td style="border:none;">Kelas</td><td style="border:none;">: <b>${kelasNama}</b></td></tr>
        </table>

        <h4 style="font-size:11pt; font-weight:bold; margin: 1rem 0 0.5rem;">A. Rincian Nilai Peserta</h4>
        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse:collapse; font-size:9pt;">
            <thead>
              <tr>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">No</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Induk</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Nama Peserta</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">L/P</th>
                ${headerSoal}
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Jml Skor</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">% Ketercapaian</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Tuntas</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Rem I</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Rem II</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Nilai Akhir</th>
              </tr>
            </thead>
            <tbody>${rowsSiswa}</tbody>
          </table>
        </div>

        <h4 style="font-size:11pt; font-weight:bold; margin: 1.5rem 0 0.5rem;">B. Hasil Analisis Per Butir Soal</h4>
        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse:collapse; font-size:9pt;">
            <thead>
              <tr>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">No Soal</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Skor Diperoleh</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Skor Ideal</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">% Ketercapaian</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">% Kegagalan</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Skor Maksimal</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Jml Peserta</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Tidak Tuntas</th>
                <th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Tuntas</th>
              </tr>
            </thead>
            <tbody>${summaryButirRows}</tbody>
          </table>
        </div>

        <h4 style="font-size:11pt; font-weight:bold; margin: 1.5rem 0 0.5rem;">C. Kesimpulan dan Tindak Lanjut</h4>
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 1rem; border-radius: 8px; font-size: 10pt; line-height: 1.6;">
          <ul style="margin: 0; padding-left: 1.5rem;">
            <li><strong>Ketuntasan Klasikal:</strong> ${ketuntasanKlasikal}%</li>
            <li><strong>Peserta Tuntas:</strong> ${jmlTuntas} Orang | <strong>Peserta Tidak Tuntas:</strong> ${jmlTidakTuntas} Orang</li>
            <li><strong>Bentuk Remedial:</strong> Pemberian tugas individu untuk menjawab soal-soal dan melaporkan hasilnya.</li>
          </ul>
        </div>
      </div>
    `;

    document.getElementById('butirExport').style.display = 'flex';

    butirCache = {
      kelasNama, mapel, namaPenilaian: penilaian.nama_penilaian, kkm,
      analisisData, butirKeys, soalButir, jmlPeserta, jmlTuntas, jmlTidakTuntas, ketuntasanKlasikal
    };

  } catch (error) {
    console.error('Error runAnalisisButir:', error);
    area.innerHTML = `<div style="text-align:center; padding:2rem; color:red;">Gagal menganalisis: ${error.message}</div>`;
  }
}

// ══════════════════════════════════════════════════════════
// EXPORT CSV
// ═══════════════════════════════════════════════════════════
function exportAnalisisButirCSV() {
  if (!butirCache) { showToast('Jalankan analisis terlebih dahulu!', 'error'); return; }
  const c = butirCache;
  let csv = '\uFEFF';
  csv += `ANALISIS PER BUTIR SOAL - ${c.kelasNama};${c.namaPenilaian};KKM: ${c.kkm}\n\n`;
  
  csv += 'No;Nama;L/P;';
  c.butirKeys.forEach(k => csv += `${k.replace('soal_', '')};`);
  csv += 'Total;Status\n';
  
  c.analisisData.forEach((d, i) => {
    csv += `${i+1};${d.siswa.student_name};${d.siswa.l_p || '-'};`;
    c.butirKeys.forEach(k => csv += `${d.nilaiPerSoal[k] || 0};`);
    csv += `${d.total};${d.isTuntas ? 'Tuntas' : 'Belum Tuntas'}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Analisis_Butir_${c.kelasNama}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  showToast('✅ CSV berhasil diunduh!', 'success');
}

// ═══════════════════════════════════════════════════════════
// CETAK PDF
// ═══════════════════════════════════════════════════════════
function cetakAnalisisButir() {
  if (!butirCache) { showToast('Jalankan analisis terlebih dahulu!', 'error'); return; }
  const c = butirCache;
  const today = new Date();
  const tglSurat = `${today.getDate()} ${NAMA_BULAN[today.getMonth()]} ${today.getFullYear()}`;
  const namaGuru = currentUserData?.nama || currentUser?.email || 'Guru';
  const nipGuru = currentUserData?.nip ? `NIP. ${currentUserData.nip}` : 'NIP. ............................................';

  let headerSoal = '';
  c.butirKeys.forEach(k => { headerSoal += `<th style="border:1px solid #000; padding:4px; background:#f0f0f0; font-size:9pt;">${k.replace('soal_', '')}</th>`; });

  let rowsSiswa = '';
  c.analisisData.forEach((d, i) => {
    let colsSoal = '';
    c.butirKeys.forEach(k => { colsSoal += `<td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${d.nilaiPerSoal[k] || 0}</td>`; });
    rowsSiswa += `<tr>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${i + 1}</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${d.siswa.induk || '-'}</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt;">${d.siswa.student_name}</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${d.siswa.l_p || 'L/P'}</td>
      ${colsSoal}
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center; font-weight:bold;">${d.total}</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${((d.total / 100) * 100).toFixed(0)}%</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center; font-weight:bold;">${d.isTuntas ? 'Ya' : 'Tidak'}</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${d.isTuntas ? '-' : 'I'}</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${d.isTuntas ? '-' : 'II'}</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center; font-weight:bold;">${d.total}</td>
    </tr>`;
  });

  let summaryButirRows = '';
  c.butirKeys.forEach((k, idx) => {
    const noSoal = k.replace('soal_', '');
    const skorMax = Number(c.soalButir[k].max || c.soalButir[k].skor_max || 0);
    const skorDiperoleh = c.analisisData.reduce((sum, d) => sum + (d.nilaiPerSoal[k] || 0), 0);
    const skorIdeal = skorMax * c.jmlPeserta;
    const pctKetercapaian = skorIdeal > 0 ? ((skorDiperoleh / skorIdeal) * 100).toFixed(1) : 0;
    const pctKegagalan = (100 - pctKetercapaian).toFixed(1);
    const tidakTuntas = c.analisisData.filter(d => (d.nilaiPerSoal[k] / skorMax) < 0.75).length;
    const tuntas = c.jmlPeserta - tidakTuntas;

    summaryButirRows += `<tr>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${noSoal}</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${skorDiperoleh}</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${skorIdeal}</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${pctKetercapaian}%</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${pctKegagalan}%</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${skorMax}</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${c.jmlPeserta}</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${tidakTuntas}</td>
      <td style="border:1px solid #000; padding:4px; font-size:9pt; text-align:center;">${tuntas}</td>
    </tr>`;
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

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html><head><title>Analisis Per Butir Soal - ${c.kelasNama}</title></head>
    <body style="font-family: 'Times New Roman', serif; font-size: 11pt; padding: 20px; color:#000;">
      ${kopHtml}
      <div style="text-align:center; margin:0 0 12px;"><div style="font-size:12pt; font-weight:bold; text-decoration:underline;">ANALISIS HASIL ASESMEN</div></div>
      <table style="width:100%; margin-bottom:12px; font-size:11pt;">
        <tr><td style="width:140px; border:none;">Mata Pelajaran</td><td style="border:none;">: <b>${c.mapel}</b></td></tr>
        <tr><td style="border:none;">Kelas</td><td style="border:none;">: <b>${c.kelasNama}</b></td></tr>
      </table>
      
      <div style="font-size:11pt; font-weight:bold; margin-bottom:6px;">A. Rincian Nilai Peserta</div>
      <div style="overflow-x: auto;">
        <table style="width:100%; border-collapse:collapse; font-size:9pt;">
          <thead><tr><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">No</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Induk</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Nama</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">L/P</th>${headerSoal}<th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Total</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">%</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Tuntas</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Rem I</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Rem II</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Akhir</th></tr></thead>
          <tbody>${rowsSiswa}</tbody>
        </table>
      </div>

      <div style="font-size:11pt; font-weight:bold; margin: 1rem 0 0.5rem;">B. Hasil Analisis Per Butir Soal</div>
      <table style="width:100%; border-collapse:collapse; font-size:9pt;">
        <thead><tr><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">No</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Skor Diperoleh</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Skor Ideal</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">% Ketercapaian</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">% Kegagalan</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Skor Max</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Jml Peserta</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Tidak Tuntas</th><th style="border:1px solid #000; padding:4px; background:#f0f0f0;">Tuntas</th></tr></thead>
        <tbody>${summaryButirRows}</tbody>
      </table>

      <div style="font-size:11pt; font-weight:bold; margin: 1rem 0 0.5rem;">C. Kesimpulan</div>
      <div style="border:1px solid #000; padding:8px; font-size:10pt; line-height:1.6;">
        - Ketuntasan klasikal: <b>${c.ketuntasanKlasikal}%</b><br>
        - Jumlah peserta tuntas: <b>${c.jmlTuntas}</b> | Tidak tuntas: <b>${c.jmlTidakTuntas}</b><br>
        - Bentuk remedial: Pemberian tugas individu untuk menjawab soal-soal dan melaporkan hasilnya.
      </div>

      <table style="width:100%; margin-top:28px; font-size:11pt;">
        <tr>
          <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:24px; padding-top:22px;">
            Mengetahui,<br>Kepala Madrasah<div style="height:60px;"></div>
            <b><u>${formatKapital(CONFIG_MADRASAH.kepalaMadrasah, FORMAT_NAMA.kepala)}</u></b><br><b>${CONFIG_MADRASAH.nipKepala}</b>
          </td>
          <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:100px;">
            ${CONFIG_MADRASAH.kota}, ${tglSurat}<div style="height:22px;"></div>Guru Mata Pelajaran<div style="height:60px;"></div>
            <b><u>${formatKapital(namaGuru, FORMAT_NAMA.guru)}</u></b><br><b>${nipGuru}</b>
          </td>
        </tr>
      </table>
      <script>window.onload = function() { setTimeout(function() { window.focus(); window.print(); }, 300); };<\/script>
    </body></html>
  `);
  printWindow.document.close();
}
