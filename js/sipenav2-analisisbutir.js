// ═══════════════════════════════════════════════════════════
// SIPENA 2.0 - MODUL ANALISIS BUTIR SOAL (FORMAT SOS EKA)
// ═══════════════════════════════════════════════════════════

let butirCache = null;

// ═══════════════════════════════════════════════════════════
// 1. RENDER HALAMAN ANALISIS BUTIR SOAL
// ═══════════════════════════════════════════════════════════
function renderAnalisisButir() {
  return `
    <div class="content-card">
      <div class="section-title">📝 Analisis Hasil Asesmen Per Butir Soal</div>
      
      <div style="background:#f0f9ff; padding:16px; border-radius:10px; margin-bottom:18px; border-left:4px solid #0ea5e9;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <div class="fg" style="margin:0;">
            <label>🏫 Kelas</label>
            <select id="butirKelasSelect" onchange="loadButirOptions()" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;">
              <option value="">-- Pilih Kelas --</option>
            </select>
          </div>
          <div class="fg" style="margin:0;">
            <label>📝 Penilaian</label>
            <select id="butirPenilaianSelect" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;">
              <option value="">-- Pilih Penilaian --</option>
            </select>
          </div>
          <div class="fg" style="margin:0;">
            <label>🎯 KKM</label>
            <input type="number" id="butirKKM" value="75" min="0" max="100" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;">
          </div>
          <div style="display:flex;align-items:flex-end;">
            <button class="btn btn-primary" onclick="runAnalisisButir()" style="width:100%;">
              <i class="fas fa-calculator"></i> Analisis Butir Soal
            </button>
          </div>
        </div>
      </div>

      <div id="butirTableArea">
        <div style="text-align:center; padding:40px; color:#64748b;">
          <div style="font-size:2rem; margin-bottom:10px;">📊</div>
          <p>Pilih kelas dan penilaian, lalu klik "Analisis Butir Soal".</p>
        </div>
      </div>

      <div id="butirExport" style="display:none; margin-top:18px; display:flex; gap:10px; justify-content:flex-end;">
        <button class="btn btn-success" onclick="exportAnalisisButirExcel()">
          <i class="fas fa-file-excel"></i> Export Excel
        </button>
        <button class="btn btn-info" onclick="previewAnalisisButirPDF()">
          <i class="fas fa-eye"></i> Preview PDF
        </button>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// 2. INISIALISASI & LOAD DATA
// ═══════════════════════════════════════════════════════════
async function initAnalisisButirPage() {
  const select = document.getElementById('butirKelasSelect');
  if (!select) return;

  try {
    // Menggunakan Firestore (sesuai arsitektur sebelumnya)
    // Jika menggunakan Realtime Database, ganti dengan logika allData filter
    const kelasSnap = await db.collection('kelas').where('archived', '==', false).get();
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    
    kelasSnap.forEach(doc => {
      const data = doc.data();
      const isMyClass = (data.pengajar_uids && data.pengajar_uids.includes(currentUser.uid)) || 
                        (data.guru_email === currentUser.email);
      if (isMyClass) {
        const mapel = data.pengajar?.[currentUser.uid]?.mapel || data.mapel || '';
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = mapel ? `${data.nama} (${mapel})` : data.nama;
        opt.dataset.nama = data.nama;
        opt.dataset.mapel = mapel;
        select.appendChild(opt);
      }
    });
  } catch (error) {
    console.error('Error initAnalisisButirPage:', error);
  }
}

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
      opt.textContent = `${p.nama_penilaian} (${p.jenis || 'Asesmen'})`;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error('Error loadButirOptions:', error);
  }
}

// ═══════════════════════════════════════════════════════════
// 3. CORE LOGIC: JALANKAN ANALISIS (FORMAT SOS EKA)
// ═══════════════════════════════════════════════════════════
async function runAnalisisButir() {
  const kelasId = document.getElementById('butirKelasSelect').value;
  const penilaianId = document.getElementById('butirPenilaianSelect').value;
  const kkm = Number(document.getElementById('butirKKM').value) || 75;
  const area = document.getElementById('butirTableArea');
  const exportArea = document.getElementById('butirExport');

  if (!kelasId || !penilaianId) {
    window.toast ? window.toast('Pilih kelas dan penilaian terlebih dahulu!', 'err') : alert('Pilih kelas dan penilaian!');
    return;
  }

  area.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div><p>Menganalisis data...</p></div>';
  exportArea.style.display = 'none';

  try {
    const docSnap = await db.collection('penilaian').doc(penilaianId).get();
    if (!docSnap.exists) { throw new Error('Data penilaian tidak ditemukan!'); }
    
    const penilaian = { id: docSnap.id, ...docSnap.data() };
    const soalButir = penilaian.soal_butir || {};
    const records = penilaian.nilai || {};

    const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
    const siswaList = [];
    siswaSnap.forEach(doc => siswaList.push({ id: doc.id, ...doc.data() }));
    siswaList.sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));

    const butirKeys = Object.keys(soalButir).sort();
    if (butirKeys.length === 0) {
      area.innerHTML = `
        <div style="text-align:center; padding:40px; color:#ef4444; background:#fef2f2; border-radius:10px; border:1px solid #fecaca;">
          <div style="font-size:2rem; margin-bottom:10px;">⚠️</div>
          <p style="font-weight:600;">Data penilaian ini belum memiliki konfigurasi butir soal.</p>
          <p style="font-size:0.9rem; color:#64748b;">Silakan tambahkan data skor per nomor soal terlebih dahulu pada menu Input Penilaian.</p>
        </div>
      `;
      return;
    }

    // --- PROSES DATA PER SISWA ---
    const analisisData = [];
    let totalSkorPerSoal = {};
    butirKeys.forEach(k => totalSkorPerSoal[k] = 0);

    const totalSkorMaksimal = butirKeys.reduce((sum, key) => sum + Number(soalButir[key].max || 0), 0);

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

      // Fallback jika hanya ada total
      if (totalNilaiSiswa === 0 && studentRecord.total !== undefined) {
        totalNilaiSiswa = Number(studentRecord.total);
      }

      const pctKetercapaianSiswa = totalSkorMaksimal > 0 ? ((totalNilaiSiswa / totalSkorMaksimal) * 100).toFixed(0) : 0;
      const isTuntas = totalNilaiSiswa >= kkm;
      
      analisisData.push({
        siswa: s,
        nilaiPerSoal,
        total: totalNilaiSiswa,
        pctKetercapaian: pctKetercapaianSiswa,
        isTuntas
      });
    });

    const jmlPeserta = analisisData.length;
    const jmlTuntas = analisisData.filter(d => d.isTuntas).length;
    const jmlTidakTuntas = jmlPeserta - jmlTuntas;
    const ketuntasanKlasikal = jmlPeserta > 0 ? ((jmlTuntas / jmlPeserta) * 100).toFixed(1) : 0;

    // --- PROSES DATA PER BUTIR SOAL ---
    const analisisPerSoal = butirKeys.map(key => {
      const skorMax = Number(soalButir[key].max || 0);
      const skorDiperoleh = totalSkorPerSoal[key];
      const skorIdeal = skorMax * jmlPeserta;
      const pctKetercapaian = skorIdeal > 0 ? ((skorDiperoleh / skorIdeal) * 100).toFixed(2) : 0;
      const pctKegagalan = (100 - pctKetercapaian).toFixed(2);
      
      // Asumsi: Siswa "menguasai" soal jika mendapat >= 75% dari skor max soal tersebut
      const tidakTuntas = analisisData.filter(d => skorMax > 0 && (d.nilaiPerSoal[key] / skorMax) < 0.75).length;
      const tuntas = jmlPeserta - tidakTuntas;

      return {
        noSoal: key.replace('soal_', ''),
        skorMax,
        skorDiperoleh,
        skorIdeal,
        pctKetercapaian,
        pctKegagalan,
        tidakTuntas,
        tuntas
      };
    });

    // --- RENDER TABLE 1: RINCIAN NILAI PESERTA ---
    let headerSoal = '';
    butirKeys.forEach(k => {
      headerSoal += `<th style="border:1px solid #000; padding:6px; background:#f0f0f0; font-size:10pt; text-align:center;">${k.replace('soal_', '')}</th>`;
    });

    let rowsSiswa = '';
    analisisData.forEach((d, i) => {
      let colsSoal = '';
      butirKeys.forEach(k => {
        colsSoal += `<td style="border:1px solid #000; padding:4px; font-size:10pt; text-align:center;">${d.nilaiPerSoal[k] || 0}</td>`;
      });

      rowsSiswa += `<tr>
        <td style="border:1px solid #000; padding:4px; font-size:10pt; text-align:center;">${i + 1}</td>
        <td style="border:1px solid #000; padding:4px; font-size:10pt; text-align:center;">${d.siswa.induk || '-'}</td>
        <td style="border:1px solid #000; padding:4px; font-size:10pt;">${d.siswa.student_name}</td>
        <td style="border:1px solid #000; padding:4px; font-size:10pt; text-align:center;">${d.siswa.l_p || 'L/P'}</td>
        ${colsSoal}
        <td style="border:1px solid #000; padding:4px; font-size:10pt; text-align:center; font-weight:bold;">${d.total}</td>
        <td style="border:1px solid #000; padding:4px; font-size:10pt; text-align:center;">${d.pctKetercapaian}%</td>
        <td style="border:1px solid #000; padding:4px; font-size:10pt; text-align:center; font-weight:bold; color:${d.isTuntas ? 'green' : 'red'};">${d.isTuntas ? 'Ya' : 'Tidak'}</td>
        <td style="border:1px solid #000; padding:4px; font-size:10pt; text-align:center;">${d.isTuntas ? '' : 'I'}</td>
        <td style="border:1px solid #000; padding:4px; font-size:10pt; text-align:center;">${d.isTuntas ? '' : 'II'}</td>
        <td style="border:1px solid #000; padding:4px; font-size:10pt; text-align:center; font-weight:bold;">${d.total}</td>
      </tr>`;
    });

    // --- RENDER TABLE 2: HASIL ANALISIS (FORMAT EXCEL SOS EKA) ---
    // Baris 1-8 dengan kolom Kesimpulan di sebelah kanan
    let rowsAnalisis = '';
    const kesimpulanRows = [
      '', // Row 1
      '', // Row 2
      `<strong>a. Ketuntasan klasikal:</strong><br>${ketuntasanKlasikal}%<br><span style="font-size:8pt;color:#666;">(Jml tuntas × 100 / Jml peserta)</span>`, // Row 3
      `<strong>b. Ketuntasan individual:</strong><br>Perlu remedial: <strong>${jmlTidakTuntas}</strong> orang`, // Row 4
      `<strong>c. Bentuk remedial:</strong><br>Pemberian tugas individu untuk menjawab Soal-soal dan melaporkan hasilnya.`, // Row 5
      ``, // Row 6
      ``, // Row 7
      ``  // Row 8
    ];

    analisisPerSoal.forEach((soal, idx) => {
      const rowNo = idx + 1;
      const ket = [
        'Jumlah skor yang diperoleh',
        'Juml. skor Ideal (seharusnya)',
        '% Ketercapaian',
        '% Kegagalan',
        'Skor maksimal tiap nomor',
        'Jumlah peserta ujian',
        'Jumlah peserta yang tidak tuntas',
        'Jumlah peserta yang tuntas'
      ][idx];

      const val = [
        soal.skorDiperoleh,
        soal.skorIdeal,
        soal.pctKetercapaian + '%',
        soal.pctKegagalan + '%',
        soal.skorMax,
        jmlPeserta,
        soal.tidakTuntas,
        soal.tuntas
      ][idx];

      rowsAnalisis += `<tr>
        <td style="border:1px solid #000; padding:6px; font-size:10pt; text-align:center;">${rowNo}</td>
        <td style="border:1px solid #000; padding:6px; font-size:10pt;">${ket}</td>
        <td style="border:1px solid #000; padding:6px; font-size:10pt; text-align:center; font-weight:bold;">${val}</td>
        <td style="border:1px solid #000; padding:6px; font-size:10pt; vertical-align:top;">${kesimpulanRows[idx]}</td>
      </tr>`;
    });

    const mapel = penilaian.mapel || document.getElementById('butirKelasSelect').options[document.getElementById('butirKelasSelect').selectedIndex].dataset.mapel || '-';
    const kelasNama = document.getElementById('butirKelasSelect').options[document.getElementById('butirKelasSelect').selectedIndex].dataset.nama;

    // --- GABUNGKAN SEMUA KE DALAM AREA ---
    area.innerHTML = `
      <div id="analisisPrintArea" style="background:white; padding:20px; font-family:'Times New Roman', serif;">
        <div style="text-align:center; margin-bottom:20px; border-bottom:3px double #000; padding-bottom:10px;">
          <h2 style="margin:0; font-size:16pt; font-weight:bold;">ANALISIS HASIL ASESMEN</h2>
          <table style="width:100%; margin-top:10px; font-size:11pt; text-align:left;">
            <tr><td style="width:120px; border:none;">Mata Pelajaran</td><td style="border:none;">: <strong>${mapel}</strong></td></tr>
            <tr><td style="border:none;">Kelas</td><td style="border:none;">: <strong>${kelasNama}</strong></td></tr>
            <tr><td style="border:none;">KKM</td><td style="border:none;">: <strong>${kkm}</strong></td></tr>
          </table>
        </div>

        <h3 style="font-size:12pt; margin:20px 0 10px 0; border-bottom:1px solid #000; padding-bottom:4px;">A. Rincian Nilai Peserta</h3>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:10pt;">
            <thead>
              <tr>
                <th style="border:1px solid #000; padding:6px; background:#f0f0f0;">No</th>
                <th style="border:1px solid #000; padding:6px; background:#f0f0f0;">Induk</th>
                <th style="border:1px solid #000; padding:6px; background:#f0f0f0;">Nama Peserta</th>
                <th style="border:1px solid #000; padding:6px; background:#f0f0f0;">L/P</th>
                ${headerSoal}
                <th style="border:1px solid #000; padding:6px; background:#f0f0f0;">Jml Skor</th>
                <th style="border:1px solid #000; padding:6px; background:#f0f0f0;">% Ketercapaian</th>
                <th style="border:1px solid #000; padding:6px; background:#f0f0f0;">Tuntas</th>
                <th style="border:1px solid #000; padding:6px; background:#f0f0f0;">Rem I</th>
                <th style="border:1px solid #000; padding:6px; background:#f0f0f0;">Rem II</th>
                <th style="border:1px solid #000; padding:6px; background:#f0f0f0;">Nilai Akhir</th>
              </tr>
            </thead>
            <tbody>${rowsSiswa}</tbody>
          </table>
        </div>

        <h3 style="font-size:12pt; margin:30px 0 10px 0; border-bottom:1px solid #000; padding-bottom:4px;">B. Hasil Analisis Per Butir Soal & Kesimpulan</h3>
        <table style="width:100%; border-collapse:collapse; font-size:10pt;">
          <thead>
            <tr>
              <th style="border:1px solid #000; padding:6px; background:#f0f0f0; width:40px;">No</th>
              <th style="border:1px solid #000; padding:6px; background:#f0f0f0;">Keterangan</th>
              <th style="border:1px solid #000; padding:6px; background:#f0f0f0; width:100px;">Nilai</th>
              <th style="border:1px solid #000; padding:6px; background:#f0f0f0;">Kesimpulan</th>
            </tr>
          </thead>
          <tbody>${rowsAnalisis}</tbody>
        </table>

        <div style="margin-top:40px; display:flex; justify-content:flex-end; font-size:11pt;">
          <div style="text-align:center; width:250px;">
            <p style="margin:0;">Bantaeng, ${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
            <p style="margin:5px 0 60px 0;">Guru Mata Pelajaran</p>
            <p style="margin:0; font-weight:bold; text-decoration:underline;">${currentUserData?.nama || 'ELIS HARIANTO, S.Pd'}</p>
            <p style="margin:0;">NIP. ${currentUserData?.nip || '19900211 202012 1 007'}</p>
          </div>
        </div>
      </div>
    `;

    exportArea.style.display = 'flex';
    
    // Simpan ke cache untuk export
    butirCache = {
      kelasNama, mapel, kkm, analisisData, analisisPerSoal, 
      jmlPeserta, jmlTuntas, jmlTidakTuntas, ketuntasanKlasikal,
      namaGuru: currentUserData?.nama || 'ELIS HARIANTO, S.Pd',
      nipGuru: currentUserData?.nip || '19900211 202012 1 007'
    };

  } catch (error) {
    console.error('Error runAnalisisButir:', error);
    area.innerHTML = `<div style="text-align:center; padding:40px; color:red;">Gagal menganalisis: ${error.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════
// 4. EXPORT EXCEL (MENGGUNAKAN SHEETJS)
// ═══════════════════════════════════════════════════════════
function exportAnalisisButirExcel() {
  if (!butirCache) {
    window.toast ? window.toast('Jalankan analisis terlebih dahulu!', 'err') : alert('Jalankan analisis terlebih dahulu!');
    return;
  }
  const c = butirCache;
  
  // Buat worksheet untuk Rincian Siswa
  const dataSiswa = c.analisisData.map((d, i) => ({
    'No': i + 1,
    'Induk': d.siswa.induk || '-',
    'Nama': d.siswa.student_name,
    'L/P': d.siswa.l_p || '-',
    ...Object.fromEntries(Object.entries(d.nilaiPerSoal).map(([k, v]) => [`Soal ${k.replace('soal_', '')}`, v])),
    'Total Skor': d.total,
    '% Ketercapaian': d.pctKetercapaian + '%',
    'Tuntas': d.isTuntas ? 'Ya' : 'Tidak',
    'Nilai Akhir': d.total
  }));

  const wsSiswa = XLSX.utils.json_to_sheet(dataSiswa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSiswa, "Rincian Nilai");

  // Buat worksheet untuk Hasil Analisis
  const dataAnalisis = c.analisisPerSoal.map((soal, i) => ({
    'No': i + 1,
    'Keterangan': ['Jml skor diperoleh', 'Skor Ideal', '% Ketercapaian', '% Kegagalan', 'Skor Max', 'Jml Peserta', 'Jml Tidak Tuntas', 'Jml Tuntas'][i],
    'Nilai': [soal.skorDiperoleh, soal.skorIdeal, soal.pctKetercapaian+'%', soal.pctKegagalan+'%', soal.skorMax, c.jmlPeserta, soal.tidakTuntas, soal.tuntas][i]
  }));
  
  // Tambahkan baris kesimpulan
  dataAnalisis.push({ 'No': '', 'Keterangan': 'Ketuntasan Klasikal', 'Nilai': c.ketuntasanKlasikal + '%' });
  dataAnalisis.push({ 'No': '', 'Keterangan': 'Perlu Remedial', 'Nilai': c.jmlTidakTuntas + ' orang' });

  const wsAnalisis = XLSX.utils.json_to_sheet(dataAnalisis);
  XLSX.utils.book_append_sheet(wb, wsAnalisis, "Hasil Analisis");

  XLSX.writeFile(wb, `Analisis_Butir_Soal_${c.kelasNama}_${c.mapel}.xlsx`);
  window.toast ? window.toast('✅ File Excel berhasil diunduh!', 'success') : alert('File Excel berhasil diunduh!');
}

// ═══════════════════════════════════════════════════════════
// 5. PREVIEW & CETAK PDF
// ═══════════════════════════════════════════════════════════
function previewAnalisisButirPDF() {
  const content = document.getElementById('analisisPrintArea');
  if (!content) return;
  
  const modalContent = document.getElementById('pdfPreviewContent');
  if (modalContent) {
    modalContent.innerHTML = content.innerHTML;
    window.openModal('modalPreviewPDF');
  } else {
    // Fallback jika modal tidak ada di HTML
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Cetak Analisis Butir Soal</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px; font-size: 10pt; }
        @media print { .no-print { display: none; } }
      </style>
      </head><body>
      ${content.innerHTML}
      <div class="no-print" style="margin-top:20px; text-align:center;">
        <button onclick="window.print()" style="padding:10px 20px; font-size:12pt; cursor:pointer;">🖨️ Cetak Sekarang</button>
        <button onclick="window.close()" style="padding:10px 20px; font-size:12pt; cursor:pointer;">Tutup</button>
      </div>
      </body></html>
    `);
    printWindow.document.close();
  }
}

function cetakAnalisisButirPDF() {
  previewAnalisisButirPDF();
  setTimeout(() => {
    if (document.getElementById('modalPreviewPDF').classList.contains('active')) {
      window.print();
    }
  }, 500);
}