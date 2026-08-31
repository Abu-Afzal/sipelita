// ══════════════════════════════════════════════
// SIPENA 2.0 - MODUL ANALISIS NILAI SUMATIF
// ══════════════════════════════════════════════

let analisisCache = null;

function renderAnalisis() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700;">📈 Analisis Nilai Sumatif</h3>
      </div>

      <div style="background: #f0f9ff; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #0ea5e9;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">🏫 Kelas</label>
            <select id="analisisKelasSelect" onchange="loadSumatifOptions()" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
              <option value="">-- Pilih Kelas --</option>
            </select>
          </div>
                    <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">📚 Kategori</label>
            <select id="analisisKategoriSelect" onchange="loadSumatifOptions()" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
              <option value="sumatif">Penilaian Sumatif</option>
              <option value="formatif">Penilaian Formatif</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">📝 Penilaian</label>
            <select id="analisisPenilaianSelect" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
              <option value="">-- Pilih Penilaian --</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">🎯 KKM</label>
            <input type="number" id="analisisKKM" value="75" min="0" max="100" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
          </div>
          <div style="display: flex; align-items: flex-end;">
            <button class="btn btn-primary" onclick="runAnalisis()" style="width: 100%;"><i class="fas fa-chart-pie"></i> Analisis</button>
          </div>
        </div>
      </div>

      <div id="analisisSummary" style="display: none; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;"></div>

      <div id="analisisDistArea" style="margin-bottom: 1.5rem;"></div>

      <div class="table-container" id="analisisTableArea">
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          Pilih kelas dan penilaian sumatif, lalu klik "Analisis".
        </div>
      </div>

      <div id="analisisExport" style="display: none; margin-top: 1.5rem; gap: 0.75rem; justify-content: flex-end;">
        <button class="btn btn-success btn-sm" onclick="exportAnalisisCSV()"><i class="fas fa-file-csv"></i> Export CSV</button>
        <button class="btn btn-secondary btn-sm" onclick="cetakAnalisis()"><i class="fas fa-print"></i> Cetak PDF</button>
      </div>
    </div>
  `;
}

async function initAnalisisPage() {
  if (!currentUser) return;
  const select = document.getElementById('analisisKelasSelect');
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
    console.error('Error initAnalisisPage:', error);
  }
}

// Muat daftar penilaian SUMATIF untuk kelas terpilih
async function loadSumatifOptions() {
  const kelasId = document.getElementById('analisisKelasSelect').value;
  const kategori = document.getElementById('analisisKategoriSelect').value;
  const select = document.getElementById('analisisPenilaianSelect');
  select.innerHTML = '<option value="">-- Pilih Penilaian --</option>';
  if (!kelasId) return;

  try {
    const snap = await db.collection('penilaian')
      .where('kelas_id', '==', kelasId)
      .where('kategori', '==', kategori)
      .get();

    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    const urutan = kategori === 'sumatif' ? ['PTS', 'PAS', 'Proyek'] : ['PH', 'Tugas', 'Kuis'];
    list.sort((a, b) => (urutan.indexOf(a.jenis) - urutan.indexOf(b.jenis)) || (a.nama_penilaian || '').localeCompare(b.nama_penilaian || ''));

    list.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nama_penilaian} (${p.jenis})`;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error('Error loadSumatifOptions:', error);
  }
}

async function runAnalisis() {
  const kelasId = document.getElementById('analisisKelasSelect').value;
  const penilaianId = document.getElementById('analisisPenilaianSelect').value;
  const kkm = Number(document.getElementById('analisisKKM').value) || 75;
  const area = document.getElementById('analisisTableArea');

  if (!kelasId || !penilaianId) {
    showToast('Pilih kelas dan penilaian terlebih dahulu!', 'error');
    return;
  }

  area.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div> Menganalisis...</div>';

  try {
    // 1. Ambil dokumen penilaian
    const docSnap = await db.collection('penilaian').doc(penilaianId).get();
    if (!docSnap.exists) { showToast('Data penilaian tidak ditemukan!', 'error'); return; }
    const penilaian = { id: docSnap.id, ...docSnap.data() };
    const records = penilaian.nilai || {};

    // 2. Ambil siswa
    const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
    const siswaList = [];
    siswaSnap.forEach(doc => siswaList.push({ id: doc.id, ...doc.data() }));
    siswaList.sort((a, b) => a.student_name.localeCompare(b.student_name));

    // 3. Hitung statistik
    const dataNilai = [];
    siswaList.forEach(s => {
      const v = records[s.id];
      if (v !== undefined && v !== '') {
        dataNilai.push({ siswa: s, nilai: Number(v) });
      }
    });

    if (dataNilai.length === 0) {
      area.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Belum ada nilai untuk penilaian ini.</div>';
      return;
    }

    const nilaiArr = dataNilai.map(d => d.nilai);
    const tertinggi = Math.max(...nilaiArr);
    const terendah = Math.min(...nilaiArr);
    const rata = nilaiArr.reduce((a, b) => a + b, 0) / nilaiArr.length;
    const dayaSerap = (nilaiArr.reduce((a, b) => a + b, 0) / (nilaiArr.length * 100)) * 100;
    const tuntas = dataNilai.filter(d => d.nilai >= kkm);
    const belum = dataNilai.filter(d => d.nilai < kkm);
    const pctTuntas = (tuntas.length / dataNilai.length) * 100;

    // 4. Distribusi interval
    const intervals = [
      { label: '0 – 49', min: 0, max: 49, kategori: 'Sangat Kurang', color: '#ef4444' },
      { label: '50 – 64', min: 50, max: 64, kategori: 'Kurang', color: '#f97316' },
      { label: '65 – 74', min: 65, max: 74, kategori: 'Cukup', color: '#f59e0b' },
      { label: '75 – 84', min: 75, max: 84, kategori: 'Baik', color: '#10b981' },
      { label: '85 – 100', min: 85, max: 100, kategori: 'Sangat Baik', color: '#3b82f6' }
    ];
    intervals.forEach(iv => {
      iv.count = nilaiArr.filter(n => n >= iv.min && n <= iv.max).length;
    });

    // 5. Render kartu ringkasan
    const cards = [
      { label: 'Jumlah Siswa', value: dataNilai.length, color: '#0ea5e9' },
      { label: 'Nilai Tertinggi', value: tertinggi, color: '#10b981' },
      { label: 'Nilai Terendah', value: terendah, color: '#ef4444' },
      { label: 'Rata-rata', value: rata.toFixed(1), color: '#3b82f6' },
      { label: 'Daya Serap', value: dayaSerap.toFixed(1) + '%', color: '#8b5cf6' },
      { label: `Tuntas (≥${kkm})`, value: `${tuntas.length} (${pctTuntas.toFixed(0)}%)`, color: '#10b981' },
      { label: `Belum Tuntas`, value: `${belum.length} (${(100 - pctTuntas).toFixed(0)}%)`, color: '#ef4444' }
    ];
    document.getElementById('analisisSummary').innerHTML = cards.map(c => `
      <div style="background: white; border-left: 4px solid ${c.color}; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-size: 1.3rem; font-weight: 800; color: ${c.color};">${c.value}</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">${c.label}</div>
      </div>
    `).join('');
    document.getElementById('analisisSummary').style.display = 'grid';

    // 6. Render distribusi (bar sederhana)
    const maxCount = Math.max(...intervals.map(i => i.count), 1);
    document.getElementById('analisisDistArea').innerHTML = `
      <h4 style="margin-bottom: 0.75rem; font-size: 0.95rem;">📊 Distribusi Nilai</h4>
      ${intervals.map(iv => `
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.4rem;">
          <div style="width: 70px; font-size: 0.85rem; font-weight: 600;">${iv.label}</div>
          <div style="flex: 1; background: #f1f5f9; border-radius: 9999px; height: 18px; overflow: hidden;">
            <div style="width: ${(iv.count / maxCount) * 100}%; background: ${iv.color}; height: 100%; border-radius: 9999px;"></div>
          </div>
          <div style="width: 90px; font-size: 0.8rem; color: var(--text-secondary);">${iv.count} siswa</div>
        </div>
      `).join('')}
    `;

    // 7. Render tabel siswa
    let html = `<table><thead><tr>
      <th width="40">No</th><th>Nama Siswa</th><th width="80">Nilai</th>
      <th width="120">Status</th><th width="140">Tindak Lanjut</th>
    </tr></thead><tbody>`;
    dataNilai.forEach((d, i) => {
      const isTuntas = d.nilai >= kkm;
      html += `<tr>
        <td style="text-align:center;">${i + 1}</td>
        <td style="font-weight:600;">${d.siswa.student_name}</td>
        <td style="text-align:center; font-weight:700; color:${isTuntas ? '#10b981' : '#ef4444'};">${d.nilai}</td>
        <td style="text-align:center;">
          <span style="background:${isTuntas ? '#10b981' : '#ef4444'}; color:white; padding:3px 10px; border-radius:9999px; font-weight:700; font-size:0.75rem;">${isTuntas ? 'TUNTAS' : 'BELUM'}</span>
        </td>
        <td style="text-align:center; font-size:0.85rem; font-weight:600; color:${isTuntas ? '#3b82f6' : '#f59e0b'};">${isTuntas ? 'Pengayaan' : 'Remedial'}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    area.innerHTML = html;

    document.getElementById('analisisExport').style.display = 'flex';

    const selectKelas = document.getElementById('analisisKelasSelect');
    analisisCache = {
      kelasNama: selectKelas.options[selectKelas.selectedIndex].dataset.nama,
      mapel: selectKelas.options[selectKelas.selectedIndex].dataset.mapel || '',
      kategori: document.getElementById('analisisKategoriSelect').value,
      namaPenilaian: penilaian.nama_penilaian,
      jenis: penilaian.jenis,
      kkm, dataNilai, intervals,
      stats: { tertinggi, terendah, rata, dayaSerap, tuntas: tuntas.length, belum: belum.length, pctTuntas }
    };

  } catch (error) {
    console.error('Error runAnalisis:', error);
    area.innerHTML = `<div style="text-align:center; padding:2rem; color:red;">Gagal menganalisis: ${error.message}</div>`;
  }
}

function exportAnalisisCSV() {
  if (!analisisCache) { showToast('Jalankan analisis terlebih dahulu!', 'error'); return; }
  const c = analisisCache;

  let csv = '\uFEFF';
  csv += `ANALISIS NILAI SUMATIF - ${c.kelasNama};${c.namaPenilaian};KKM: ${c.kkm}\n`;
  csv += `Tertinggi;${c.stats.tertinggi}\nTerendah;${c.stats.terendah}\nRata-rata;${c.stats.rata.toFixed(1)}\nDaya Serap;${c.stats.dayaSerap.toFixed(1)}%\nTuntas;${c.stats.tuntas}\nBelum Tuntas;${c.stats.belum}\n\n`;
  csv += 'No;Nama Siswa;Nilai;Status;Tindak Lanjut\n';
  c.dataNilai.forEach((d, i) => {
    const t = d.nilai >= c.kkm;
    csv += `${i + 1};${d.siswa.student_name};${d.nilai};${t ? 'Tuntas' : 'Belum Tuntas'};${t ? 'Pengayaan' : 'Remedial'}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Analisis_Sumatif_${c.kelasNama.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✅ CSV berhasil diunduh!', 'success');
}

function cetakAnalisis() {
  if (!analisisCache) { showToast('Jalankan analisis terlebih dahulu!', 'error'); return; }
  const c = analisisCache;
  const today = new Date();
  const tglSurat = `${today.getDate()} ${NAMA_BULAN[today.getMonth()]} ${today.getFullYear()}`;
  const rawNipGuru = currentUserData?.nip || '';
  const nipGuru = rawNipGuru ? (rawNipGuru.startsWith('NIP.') ? rawNipGuru : 'NIP. ' + rawNipGuru) : 'NIP. ............................................';
  const namaGuruCetak = formatKapital(currentUserData?.namaResmi || currentUserData?.nama || currentUser.email || '', FORMAT_NAMA.guru);

  const b = 'border:1px solid #000; padding:4px; font-size:11pt;';
  const thStyle = `style="${b} background:#f0f0f0; font-weight:bold; text-align:center;"`;

  // Tabel statistik
  const statRows = `
    <tr><td style="${b}">Nilai Tertinggi</td><td style="${b} text-align:center; font-weight:bold;">${c.stats.tertinggi}</td>
        <td style="${b}">Jumlah Siswa</td><td style="${b} text-align:center; font-weight:bold;">${c.dataNilai.length}</td></tr>
    <tr><td style="${b}">Nilai Terendah</td><td style="${b} text-align:center; font-weight:bold;">${c.stats.terendah}</td>
        <td style="${b}">Tuntas (≥ ${c.kkm})</td><td style="${b} text-align:center; font-weight:bold;">${c.stats.tuntas} (${c.stats.pctTuntas.toFixed(0)}%)</td></tr>
    <tr><td style="${b}">Rata-rata</td><td style="${b} text-align:center; font-weight:bold;">${c.stats.rata.toFixed(1)}</td>
        <td style="${b}">Belum Tuntas</td><td style="${b} text-align:center; font-weight:bold;">${c.stats.belum} (${(100 - c.stats.pctTuntas).toFixed(0)}%)</td></tr>
    <tr><td style="${b}">Daya Serap</td><td style="${b} text-align:center; font-weight:bold;">${c.stats.dayaSerap.toFixed(1)}%</td>
        <td style="${b}">KKM</td><td style="${b} text-align:center; font-weight:bold;">${c.kkm}</td></tr>`;

  // Tabel distribusi
  const distRows = c.intervals.map(iv =>
    `<tr><td style="${b} text-align:center;">${iv.label}</td><td style="${b} text-align:center;">${iv.count}</td><td style="${b} text-align:center;">${((iv.count / c.dataNilai.length) * 100).toFixed(0)}%</td><td style="${b}">${iv.kategori}</td></tr>`
  ).join('');

  // Tabel siswa
  const siswaRows = c.dataNilai.map((d, i) => {
    const t = d.nilai >= c.kkm;
    return `<tr><td style="${b} text-align:center;">${i + 1}</td><td style="${b}">${d.siswa.student_name}</td><td style="${b} text-align:center; font-weight:bold;">${d.nilai}</td><td style="${b} text-align:center;">${t ? 'Tuntas' : 'Belum Tuntas'}</td><td style="${b} text-align:center;">${t ? 'Pengayaan' : 'Remedial'}</td></tr>`;
  }).join('');

  const kopHtml = `
    <div style="text-align:center; border-bottom:3px double #000; padding-bottom:10px; margin-bottom:16px;">
      <div style="font-size:12pt; font-weight:bold;">${CONFIG_MADRASAH.kop1}</div>
      <div style="font-size:14pt; font-weight:bold;">${CONFIG_MADRASAH.kop2}</div>
      <div style="font-size:10pt; font-style:italic;">${CONFIG_MADRASAH.alamat}</div>
    </div>`;

  const ttdHtml = `
    <table style="width:100%; margin-top:28px; font-size:12pt;">
      <tr>
        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:24px; padding-top:22px;">
          Mengetahui,<br>Kepala Madrasah
          <div style="height:60px;"></div>
          <b><u><span style="font-size:10pt; white-space:nowrap;">${formatKapital(CONFIG_MADRASAH.kepalaMadrasah, FORMAT_NAMA.kepala)}</span></u></b><br><b style="font-size:10pt;">${CONFIG_MADRASAH.nipKepala}</b>
        </td>
        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:100px;">
          ${CONFIG_MADRASAH.kota}, ${tglSurat}
          <div style="height:22px;"></div>
          Guru Mata Pelajaran
          <div style="height:60px;"></div>
          <b><u><span style="font-size:10pt; white-space:nowrap;">${namaGuruCetak}</span></u></b><br><b style="font-size:10pt;">${nipGuru}</b>
        </td>
      </tr>
    </table>`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
    <head><title>Analisis Nilai Sumatif - ${c.kelasNama}</title></head>
    <body style="font-family: 'Times New Roman', serif; font-size: 12pt; padding: 24px; color:#000;">
      ${kopHtml}
      <div style="text-align:center; margin:0 0 12px;">
        <div style="font-size:12pt; font-weight:bold; text-decoration:underline;">ANALISIS HASIL PENILAIAN ${c.kategori.toUpperCase()}</div>
      </div>
      <table style="width:100%; margin-bottom:12px; font-size:12pt;">
        <tr><td style="width:140px; border:none;">Kelas</td><td style="border:none;">: <b>${c.kelasNama}</b></td></tr>
        <tr><td style="border:none;">Mata Pelajaran</td><td style="border:none;">: <b>${c.mapel || '-'}</b></td></tr>
        <tr><td style="border:none;">Penilaian</td><td style="border:none;">: <b>${c.namaPenilaian} (${c.jenis})</b></td></tr>
      </table>
      <table style="width:100%; border-collapse:collapse; font-size:11pt; margin-bottom:14px;">
        <tbody>${statRows}</tbody>
      </table>
      <div style="font-size:11pt; font-weight:bold; margin-bottom:6px;">A. Distribusi Nilai</div>
      <table style="width:100%; border-collapse:collapse; font-size:11pt; margin-bottom:14px;">
        <thead><tr><th ${thStyle}>Interval</th><th ${thStyle}>Jumlah Siswa</th><th ${thStyle}>Persentase</th><th ${thStyle}>Kategori</th></tr></thead>
        <tbody>${distRows}</tbody>
      </table>
      <div style="font-size:11pt; font-weight:bold; margin-bottom:6px;">B. Rincian Ketuntasan Siswa</div>
      <table style="width:100%; border-collapse:collapse; font-size:11pt;">
        <thead><tr><th ${thStyle}>No</th><th ${thStyle}>Nama Siswa</th><th ${thStyle}>Nilai</th><th ${thStyle}>Status</th><th ${thStyle}>Tindak Lanjut</th></tr></thead>
        <tbody>${siswaRows}</tbody>
      </table>
      ${ttdHtml}
      <script>window.print();<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}