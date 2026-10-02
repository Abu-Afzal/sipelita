// ═══════════════════════════════════════════════════════════
// SIPENA 2.0 - MODUL ANALISIS BUTIR SOAL
// FORMAT: ANALISIS HASIL SUMATIF AKHIR SEMESTER (MAN BANTAENG)
// ═══════════════════════════════════════════════════════════

let butirCache = null;
let currentButirSetup = null;

// ═══════════════════════════════════════════════════════════
// 1. RENDER HALAMAN UTAMA
// ═══════════════════════════════════════════════════════════
function renderAnalisisButir() {
  return `
    <div class="content-card">
      <div class="section-title">📝 Analisis Hasil Asesmen Per Butir Soal</div>
      
      <div id="step1" style="background:#f0f9ff; padding:16px; border-radius:10px; margin-bottom:18px; border-left:4px solid #0ea5e9;">
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
            <button class="btn btn-primary" onclick="checkButirData()" style="width:100%;">
              <i class="fas fa-arrow-right"></i> Lanjutkan
            </button>
          </div>
        </div>
      </div>

      <div id="step2" style="display:none; background:#fef3c7; padding:16px; border-radius:10px; margin-bottom:18px; border-left:4px solid #f59e0b;">
        <h3 style="margin:0 0 12px 0; color:#92400e;">⚙️ Konfigurasi Butir Soal</h3>
        <p style="margin:0 0 12px 0; color:#78350f; font-size:0.9rem;">Penilaian ini belum memiliki data butir soal. Silakan setup terlebih dahulu.</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="fg" style="margin:0;">
            <label>Jumlah Soal</label>
            <input type="number" id="setupJumlahSoal" min="1" max="50" value="10" onchange="generateSkorMaxInputs()" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;">
          </div>
          <div class="fg" style="margin:0;">
            <label>Total Skor Maksimal</label>
            <input type="number" id="setupTotalSkor" readonly style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px; background:#f3f4f6;">
          </div>
        </div>
        <div id="skorMaxContainer" style="margin-top:12px; display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:8px;"></div>
        <div style="margin-top:12px; display:flex; gap:10px;">
          <button class="btn btn-primary" onclick="simpanSetupButir()"><i class="fas fa-save"></i> Simpan Setup</button>
          <button class="btn btn-secondary" onclick="batalSetup()"><i class="fas fa-times"></i> Batal</button>
        </div>
      </div>

      <div id="step3" style="display:none;">
        <div style="background:#f0fdf4; padding:16px; border-radius:10px; margin-bottom:18px; border-left:4px solid #10b981; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="margin:0; color:#065f46;" id="asesmenTitle">Asesmen: -</h3>
            <p style="margin:4px 0 0 0; color:#047857; font-size:0.9rem;" id="asesmenInfo">Kelas: - | Semester: - | KKM: - | Total Skor Max: -</p>
          </div>
          <button class="btn btn-danger" onclick="resetSetup()" style="padding:8px 16px;"><i class="fas fa-redo"></i> Reset Setup</button>
        </div>
        <div style="overflow-x:auto;">
          <table id="tabelInputNilai" style="width:100%; border-collapse:collapse; font-size:0.9rem;">
            <thead><tr id="headerTabelInput"></tr></thead>
            <tbody id="bodyTabelInput"></tbody>
          </table>
        </div>
        <div style="margin-top:18px; display:flex; gap:10px; justify-content:flex-end;">
          <button class="btn btn-success" onclick="simpanNilaiButir()"><i class="fas fa-save"></i> Simpan Nilai</button>
          <button class="btn btn-primary" onclick="tampilkanHasilAnalisis()"><i class="fas fa-chart-bar"></i> Tampilkan Analisis</button>
        </div>
      </div>

      <div id="step4" style="display:none;">
        <div style="margin-bottom:18px; display:flex; gap:10px; justify-content:flex-end;">
          <button class="btn btn-secondary" onclick="kembaliKeInput()"><i class="fas fa-arrow-left"></i> Kembali ke Input</button>
          <button class="btn btn-success" onclick="exportAnalisisButirExcel()"><i class="fas fa-file-excel"></i> Export Excel</button>
          <button class="btn btn-info" onclick="previewAnalisisButirPDF()"><i class="fas fa-eye"></i> Preview PDF</button>
        </div>
        <div id="hasilAnalisisContent"></div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// 2. INISIALISASI
// ═══════════════════════════════════════════════════════════
async function initAnalisisButirPage() {
  const select = document.getElementById('butirKelasSelect');
  if (!select) return;
  try {
    const kelasSnap = await db.collection('kelas').where('archived', '==', false).get();
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    kelasSnap.forEach(doc => {
      const data = doc.data();
      const isMyClass = (data.pengajar_uids && data.pengajar_uids.includes(currentUser.uid)) || (data.guru_email === currentUser.email);
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
  } catch (error) { console.error('Error initAnalisisButirPage:', error); }
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
  } catch (error) { console.error('Error loadButirOptions:', error); }
}

// ═══════════════════════════════════════════════════════════
// 3. CEK DATA
// ═══════════════════════════════════════════════════════════
async function checkButirData() {
  const kelasId = document.getElementById('butirKelasSelect').value;
  const penilaianId = document.getElementById('butirPenilaianSelect').value;
  const kkm = Number(document.getElementById('butirKKM').value) || 75;

  if (!kelasId || !penilaianId) { alert('Pilih kelas dan penilaian!'); return; }

  try {
    const docSnap = await db.collection('penilaian').doc(penilaianId).get();
    if (!docSnap.exists) { alert('Data penilaian tidak ditemukan!'); return; }

    const penilaian = { id: docSnap.id, ...docSnap.data() };
    const soalButir = penilaian.soal_butir || {};

    if (penilaian.kkm !== kkm) await db.collection('penilaian').doc(penilaianId).update({ kkm: kkm });

    if (Object.keys(soalButir).length === 0) {
      document.getElementById('step1').style.display = 'none';
      document.getElementById('step2').style.display = 'block';
      document.getElementById('step3').style.display = 'none';
      document.getElementById('step4').style.display = 'none';
      currentButirSetup = { penilaianId, kelasId, kkm, penilaian };
      generateSkorMaxInputs();
    } else {
      currentButirSetup = { penilaianId, kelasId, kkm, penilaian, soalButir };
      renderTabelInputNilai();
    }
  } catch (error) { console.error('Error:', error); alert('Gagal: ' + error.message); }
}

// ═══════════════════════════════════════════════════════════
// 4. SETUP WIZARD
// ═══════════════════════════════════════════════════════════
function generateSkorMaxInputs() {
  const jumlah = Number(document.getElementById('setupJumlahSoal').value) || 10;
  const container = document.getElementById('skorMaxContainer');
  container.innerHTML = '';
  for (let i = 1; i <= jumlah; i++) {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
    div.innerHTML = `<label style="font-size:0.8rem; font-weight:600;">Soal ${i}</label>
      <input type="number" class="input-skor-max" data-nomor="${i}" min="1" max="100" value="10" 
             onchange="hitungTotalSkor()" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:4px; text-align:center;">`;
    container.appendChild(div);
  }
  hitungTotalSkor();
}

function hitungTotalSkor() {
  const inputs = document.querySelectorAll('.input-skor-max');
  let total = 0;
  inputs.forEach(input => { total += Number(input.value) || 0; });
  document.getElementById('setupTotalSkor').value = total;
}

async function simpanSetupButir() {
  if (!currentButirSetup) return;
  const totalSkor = Number(document.getElementById('setupTotalSkor').value) || 0;
  if (totalSkor === 0) { alert('Total skor tidak boleh 0!'); return; }
  if (!confirm('Simpan konfigurasi?')) return;

  try {
    const soalButir = {};
    document.querySelectorAll('.input-skor-max').forEach(input => {
      soalButir[`soal_${input.dataset.nomor}`] = { max: Number(input.value) || 0 };
    });
    await db.collection('penilaian').doc(currentButirSetup.penilaianId).update({
      soal_butir: soalButir, total_skor_max: totalSkor
    });
    currentButirSetup.soalButir = soalButir;
    alert('Setup berhasil!');
    renderTabelInputNilai();
  } catch (error) { alert('Gagal: ' + error.message); }
}

function batalSetup() {
  document.getElementById('step1').style.display = 'block';
  document.getElementById('step2').style.display = 'none';
  currentButirSetup = null;
}

async function resetSetup() {
  if (!confirm('Yakin ingin mereset setup?')) return;
  try {
    await db.collection('penilaian').doc(currentButirSetup.penilaianId).update({
      soal_butir: {}, nilai: {}, total_skor_max: 0
    });
    currentButirSetup.soalButir = {};
    renderTabelInputNilai();
  } catch (error) { alert('Gagal: ' + error.message); }
}

// ═══════════════════════════════════════════════════════════
// 5. RENDER TABEL INPUT NILAI
// ══════════════════════════════════════════════════════════
async function renderTabelInputNilai() {
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step3').style.display = 'block';
  document.getElementById('step4').style.display = 'none';

  const { penilaianId, kelasId, kkm, penilaian, soalButir } = currentButirSetup;
  const butirKeys = Object.keys(soalButir).sort((a, b) => parseInt(a.replace('soal_', '')) - parseInt(b.replace('soal_', '')));
  const totalSkorMax = Object.values(soalButir).reduce((sum, s) => sum + Number(s.max || 0), 0);

  document.getElementById('asesmenTitle').textContent = `Asesmen: ${penilaian.nama_penilaian}`;
  document.getElementById('asesmenInfo').textContent = `Kelas: ${penilaian.kelas_nama || '-'} | KKM: ${kkm} | Total Skor Max: ${totalSkorMax}`;

  const headerRow = document.getElementById('headerTabelInput');
  headerRow.innerHTML = `
    <th style="border:1px solid #000; padding:8px; background:#f0f0f0;">No</th>
    <th style="border:1px solid #000; padding:8px; background:#f0f0f0;">Nama</th>
    <th style="border:1px solid #000; padding:8px; background:#f0f0f0;">L/P</th>
    ${butirKeys.map(k => `<th style="border:1px solid #000; padding:8px; background:#f0f0f0;">Soal ${k.replace('soal_', '')}<br>(${soalButir[k].max})</th>`).join('')}
    <th style="border:1px solid #000; padding:8px; background:#f0f0f0;">Total</th>
    <th style="border:1px solid #000; padding:8px; background:#f0f0f0;">%</th>
    <th style="border:1px solid #000; padding:8px; background:#f0f0f0;">Tuntas</th>
  `;

  const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
  const siswaList = [];
  siswaSnap.forEach(doc => siswaList.push({ id: doc.id, ...doc.data() }));
  siswaList.sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));

  const records = penilaian.nilai || {};
  const bodyRow = document.getElementById('bodyTabelInput');
  bodyRow.innerHTML = '';

  siswaList.forEach((s, idx) => {
    const studentRecord = records[s.id] || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="border:1px solid #000; padding:6px; text-align:center;">${idx + 1}</td>
      <td style="border:1px solid #000; padding:6px;">${s.student_name}</td>
      <td style="border:1px solid #000; padding:6px; text-align:center;">${s.l_p || '-'}</td>
      ${butirKeys.map(k => `
        <td style="border:1px solid #000; padding:4px; text-align:center;">
          <input type="number" class="input-nilai-butir" data-siswa="${s.id}" data-soal="${k}" min="0" max="${soalButir[k].max}" 
                 value="${studentRecord[k] || 0}" onchange="hitungTotalSiswa('${s.id}')"
                 style="width:100%; padding:4px; border:1px solid #e2e8f0; border-radius:4px; text-align:center;">
        </td>
      `).join('')}
      <td style="border:1px solid #000; padding:6px; text-align:center; font-weight:bold;" id="total-${s.id}">${studentRecord.total || 0}</td>
      <td style="border:1px solid #000; padding:6px; text-align:center;" id="pct-${s.id}">0%</td>
      <td style="border:1px solid #000; padding:6px; text-align:center;" id="tuntas-${s.id}">-</td>
    `;
    bodyRow.appendChild(tr);
  });

  currentButirSetup.siswaList = siswaList;
  currentButirSetup.totalSkorMax = totalSkorMax;
  currentButirSetup.butirKeys = butirKeys;
}

function hitungTotalSiswa(siswaId) {
  const inputs = document.querySelectorAll(`.input-nilai-butir[data-siswa="${siswaId}"]`);
  let total = 0;
  inputs.forEach(input => { total += Number(input.value) || 0; });
  const totalSkorMax = currentButirSetup.totalSkorMax;
  const kkm = currentButirSetup.kkm;
  const pct = totalSkorMax > 0 ? ((total / totalSkorMax) * 100).toFixed(0) : 0;
  document.getElementById(`total-${siswaId}`).textContent = total;
  document.getElementById(`pct-${siswaId}`).textContent = pct + '%';
  document.getElementById(`tuntas-${siswaId}`).textContent = total >= kkm ? 'Tuntas' : 'Tidak';
}

async function simpanNilaiButir() {
  if (!confirm('Simpan nilai?')) return;
  try {
    const { penilaianId, siswaList, butirKeys, soalButir } = currentButirSetup;
    const nilaiBaru = {};
    siswaList.forEach(s => {
      const inputs = document.querySelectorAll(`.input-nilai-butir[data-siswa="${s.id}"]`);
      let total = 0;
      const nilaiPerSoal = {};
      inputs.forEach(input => {
        const soal = input.dataset.soal;
        const nilai = Number(input.value) || 0;
        nilaiPerSoal[soal] = nilai;
        total += nilai;
      });
      nilaiPerSoal.total = total;
      nilaiBaru[s.id] = nilaiPerSoal;
    });
    await db.collection('penilaian').doc(penilaianId).update({ nilai: nilaiBaru });
    alert('Nilai disimpan!');
  } catch (error) { alert('Gagal: ' + error.message); }
}

function kembaliKeInput() {
  document.getElementById('step3').style.display = 'block';
  document.getElementById('step4').style.display = 'none';
}

// ══════════════════════════════════════════════════════════
// 6. TAMPILKAN HASIL ANALISIS (DIPERBAIKI MENYELURUH)
// ═══════════════════════════════════════════════════════════
async function tampilkanHasilAnalisis() {
  console.log('✅✅✅ tampilkanHasilAnalisis() DIPANGGIL ✅✅✅');
  await simpanNilaiButir();
  document.getElementById('step3').style.display = 'none';
  document.getElementById('step4').style.display = 'block';

  const { penilaianId, kelasId, kkm, penilaian, soalButir, siswaList, butirKeys, totalSkorMax } = currentButirSetup;
  const records = penilaian.nilai || {};

  // Proses data per siswa
  const analisisData = [];
  let totalSkorPerSoal = {}, maxPerSoal = {}, minPerSoal = {};
  butirKeys.forEach(k => { totalSkorPerSoal[k] = 0; maxPerSoal[k] = -1; minPerSoal[k] = 999999; });

  siswaList.forEach(s => {
    const studentRecord = records[s.id] || {};
    let totalNilaiSiswa = studentRecord.total || 0;
    const nilaiPerSoal = {};
    butirKeys.forEach(k => {
      const skor = studentRecord[k] !== undefined ? Number(studentRecord[k]) : 0;
      nilaiPerSoal[k] = skor;
      totalSkorPerSoal[k] += skor;
      if (skor > maxPerSoal[k]) maxPerSoal[k] = skor;
      if (skor < minPerSoal[k]) minPerSoal[k] = skor;
    });
    analisisData.push({
      siswa: s, nilaiPerSoal, total: totalNilaiSiswa,
      pctKetercapaian: totalSkorMax > 0 ? ((totalNilaiSiswa / totalSkorMax) * 100).toFixed(0) : 0,
      isTuntas: totalNilaiSiswa >= kkm
    });
  });

  const jmlPeserta = analisisData.length;
  const jmlTuntas = analisisData.filter(d => d.isTuntas).length;
  const jmlTidakTuntas = jmlPeserta - jmlTuntas;
  const ketuntasanKlasikal = jmlPeserta > 0 ? ((jmlTuntas / jmlPeserta) * 100).toFixed(0) : 0;

  // Statistik per soal
  const statistikPerSoal = butirKeys.map(key => {
    const skorMax = Number(soalButir[key].max || 0);
    const skorDiperoleh = totalSkorPerSoal[key];
    const skorIdeal = skorMax * jmlPeserta;
    const rataRata = jmlPeserta > 0 ? skorDiperoleh / jmlPeserta : 0;
    const pctKetercapaian = skorIdeal > 0 ? ((skorDiperoleh / skorIdeal) * 100).toFixed(0) : 0;
    return {
      noSoal: key.replace('soal_', ''), skorMax, skorDiperoleh, skorIdeal,
      rataRata: rataRata.toFixed(2), pctKetercapaian, pctKegagalan: (100 - pctKetercapaian).toFixed(0),
      skorKegagalan: skorIdeal - skorDiperoleh,
      max: maxPerSoal[key] >= 0 ? maxPerSoal[key] : 0,
      min: minPerSoal[key] < 999999 ? minPerSoal[key] : 0
    };
  });

  const totalJumlah = statistikPerSoal.reduce((sum, s) => sum + s.skorDiperoleh, 0);
  const totalRataRataSimple = (statistikPerSoal.reduce((sum, s) => sum + parseFloat(s.rataRata), 0) / butirKeys.length).toFixed(0);
  const maxTotal = Math.max(...analisisData.map(d => d.total));
  const minTotal = Math.min(...analisisData.map(d => d.total));

  // Hitung tidak tuntas per soal
  statistikPerSoal.forEach((s, idx) => {
    const tidakTuntas = analisisData.filter(d => {
      const skorMax = Number(soalButir[butirKeys[idx]].max || 0);
      return skorMax > 0 && (d.nilaiPerSoal[butirKeys[idx]] / skorMax) < 0.75;
    }).length;
    s.tidakTuntas = tidakTuntas;
    s.tuntas = jmlPeserta - tidakTuntas;
  });

  // Info asesmen
  const mapel = penilaian.mapel || (document.getElementById('butirKelasSelect').options[document.getElementById('butirKelasSelect').selectedIndex]?.dataset.mapel) || '-';
  const kelasNama = document.getElementById('butirKelasSelect').options[document.getElementById('butirKelasSelect').selectedIndex]?.dataset.nama || '-';
  const semester = penilaian.semester || 'Genap';
  const tahunAjaran = penilaian.tahun_ajaran || '2024/2025';
  const jumlahSoal = butirKeys.length;

  // ===== STYLE KONSISTEN UNTUK SEMUA TABEL =====
  const b = 'border:1px solid #000; padding:4px; font-size:10pt;';
  const thStyle = `style="${b} background:#f0f0f0; font-weight:bold; text-align:center;"`;
  const tdStyle = `style="${b}"`;
  const tdCenter = `style="${b} text-align:center;"`;
  const tdBold = `style="${b} text-align:center; font-weight:bold;"`;

  // ===== HEADER TABEL A (3 BARIS) =====
  const headerBaris1 = `<tr>
    <th rowspan="3" ${thStyle}>No.</th>
    <th rowspan="3" ${thStyle}>NAMA PESERTA DIDIK</th>
    <th rowspan="3" ${thStyle}>L/P</th>
    <th colspan="${jumlahSoal}" ${thStyle}>NO. SOAL / SKOR MAKSIMUM</th>
    <th rowspan="3" ${thStyle}>Jmlh<br>Skor</th>
    <th rowspan="3" ${thStyle}>%<br>Ketercapaian</th>
    <th rowspan="3" ${thStyle}>Tuntas</th>
  </tr>
  <tr>${butirKeys.map(k => `<th ${thStyle}>${k.replace('soal_', '')}</th>`).join('')}</tr>
  <tr>${butirKeys.map(k => `<th ${thStyle}>${soalButir[k].max}</th>`).join('')}</tr>`;

  // ===== BARIS SISWA =====
  let rowsSiswa = '';
  analisisData.forEach((d, i) => {
    rowsSiswa += `<tr>
      <td ${tdCenter}>${i + 1}</td>
      <td ${tdStyle}>${d.siswa.student_name}</td>
      <td ${tdCenter}>${d.siswa.l_p || '-'}</td>
      ${butirKeys.map(k => `<td ${tdCenter}>${d.nilaiPerSoal[k] || 0}</td>`).join('')}
      <td ${tdBold}>${d.total}</td>
      <td ${tdCenter}>${d.pctKetercapaian}%</td>
      <td ${tdBold}>${d.isTuntas ? 'Tuntas' : 'Tidak Tuntas'}</td>
    </tr>`;
  });

  // ===== BARIS STATISTIK (Jumlah, Rata-rata, Tertinggi, Terendah) =====
  const makeStatRow = (label, key) => `<tr>
    <td colspan="3" ${tdStyle} style="${b} font-weight:bold;">${label}</td>
    ${statistikPerSoal.map(s => `<td ${tdCenter}>${key === 'max' ? s.max : key === 'min' ? s.min : key === 'rataRata' ? s.rataRata : s.skorDiperoleh}</td>`).join('')}
    <td ${tdBold}>${key === 'max' ? maxTotal : key === 'min' ? minTotal : key === 'rataRata' ? totalRataRataSimple : totalJumlah}</td>
    <td ${tdCenter}></td>
    <td ${tdCenter}></td>
  </tr>`;

  // ===== HEADER TABEL B (2 BARIS) =====
  const headerTabelB = `<tr>
    <th rowspan="2" ${thStyle} style="${thStyle} width:30px;">No</th>
    <th rowspan="2" ${thStyle} style="${thStyle} width:200px;">Keterangan</th>
    <th colspan="${jumlahSoal}" ${thStyle}>Nomor Soal</th>
    <th rowspan="2" ${thStyle} style="${thStyle} width:80px;">Total</th>
    <th rowspan="2" ${thStyle} style="${thStyle} width:250px;">Kesimpulan</th>
  </tr>
  <tr>${butirKeys.map(k => `<th ${thStyle}>${k.replace('soal_', '')}</th>`).join('')}</tr>`;

  // ===== BARIS ANALISIS (8 BARIS) =====
  const barisAnalisis = [
    { no: 1, ket: 'Jumlah skor yang diperoleh', vals: statistikPerSoal.map(s => s.skorDiperoleh), total: totalJumlah },
    { no: 2, ket: 'Jumlah skor ideal (seharusnya)', vals: statistikPerSoal.map(s => s.skorIdeal), total: totalSkorMax * jmlPeserta },
    { no: 3, ket: '% Ketercapaian', vals: statistikPerSoal.map(s => s.pctKetercapaian + '%'), total: ((totalJumlah / (totalSkorMax * jmlPeserta)) * 100).toFixed(0) + '%' },
    { no: 4, ket: '% Kegagalan', vals: statistikPerSoal.map(s => s.pctKegagalan + '%'), total: (100 - (totalJumlah / (totalSkorMax * jmlPeserta)) * 100).toFixed(0) + '%' },
    { no: 5, ket: 'Skor kegagalan', vals: statistikPerSoal.map(s => s.skorKegagalan), total: (totalSkorMax * jmlPeserta) - totalJumlah },
    { no: 6, ket: 'Jumlah peserta ujian', vals: statistikPerSoal.map(s => jmlPeserta), total: '' },
    { no: 7, ket: 'Jumlah peserta yang tidak tuntas', vals: statistikPerSoal.map(s => s.tidakTuntas || 0), total: jmlTidakTuntas },
    { no: 8, ket: 'Jumlah peserta yang tuntas', vals: statistikPerSoal.map(s => s.tuntas || jmlPeserta), total: jmlTuntas }
  ];

  const kesimpulanHtml = `<strong>a. Ketuntasan Klasikal:</strong> ${jmlTuntas} (${ketuntasanKlasikal}%) orang<br><br>
    <strong>b. Ketuntasan Individual yang perlu remedial:</strong> ${jmlTidakTuntas} (${jmlPeserta > 0 ? ((jmlTidakTuntas/jmlPeserta)*100).toFixed(0) : 0}%) orang<br><br>
    <strong>c. Bentuk remedial:</strong> Pemberian tugas individu untuk menjawab soal-soal dan melaporkan hasilnya.`;

  let rowsTabelB = '';
  barisAnalisis.forEach((baris, idx) => {
    rowsTabelB += `<tr>
      <td ${tdCenter}>${baris.no}</td>
      <td ${tdStyle}>${baris.ket}</td>
      ${baris.vals.map(v => `<td ${tdCenter}>${v}</td>`).join('')}
      <td ${tdBold}>${baris.total}</td>
      ${idx === 0 ? `<td rowspan="8" style="${b} vertical-align:top;">${kesimpulanHtml}</td>` : ''}
    </tr>`;
  });

  // ===== KOP SURAT =====
  const logoKop = CONFIG_MADRASAH.logo || (location.origin + '/assets/images/kemenag-app.png');
  const kopHtml = `<div style="border-bottom:3px double #000; padding-bottom:8px; margin-bottom:16px;">
    <table style="width:100%; border-collapse:collapse;">
      <tr>
        <td style="width:75px; text-align:center; vertical-align:middle; border:none;">
          <img src="${logoKop}" style="width:62px; height:auto;" onerror="this.style.visibility='hidden'">
        </td>
        <td style="text-align:center; border:none;">
          <div style="font-size:14pt; font-weight:bold;">${CONFIG_MADRASAH.kop1 || 'KEMENTERIAN AGAMA KABUPATEN BANTAENG'}</div>
          <div style="font-size:14pt; font-weight:bold;">${CONFIG_MADRASAH.kop2 || 'MAN BANTAENG'}</div>
          <div style="font-size:12pt; font-style:italic;">${CONFIG_MADRASAH.alamat || 'Jl. Pendidikan No. 1, Bantaeng'}</div>
        </td>
        <td style="width:75px; border:none;"></td>
      </tr>
    </table>
  </div>`;

  // ===== TANDA TANGAN (ADOPSI DARI sipenav2-analisis.js) =====
  const OFFSET_KOTA = 22;
  const SPASI_TTD = 60;
  const GESER_KANAN = 100;
  const tglSurat = `${new Date().getDate()} ${NAMA_BULAN[new Date().getMonth()]} ${new Date().getFullYear()}`;
  const rawNipGuru = currentUserData?.nip || '';
  const nipGuru = rawNipGuru ? (rawNipGuru.startsWith('NIP.') ? rawNipGuru : 'NIP. ' + rawNipGuru) : 'NIP. ............................................';
  const namaGuruCetak = formatKapital(currentUserData?.namaResmi || currentUserData?.nama || currentUser?.email || '', FORMAT_NAMA.guru);
  const namaKepala = formatKapital(CONFIG_MADRASAH.kepalaMadrasah || 'MUHAMMAD ARIF PITHER, S.Ag.,MM', FORMAT_NAMA.kepala);
  const nipKepala = CONFIG_MADRASAH.nipKepala || 'NIP. ............................................';

      const ttdHtml = `<table style="width:100%; margin-top:28px; font-size:12pt; border-collapse:collapse;">
    <tr>
      <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:24px; padding-top:${OFFSET_KOTA}px;">
        Mengetahui,<br>Kepala Madrasah
        <div style="height:${SPASI_TTD}px;"></div>
        <b><u><span style="font-size:10pt;">${namaKepala}</span></u></b><br><b style="font-size:11pt;">${nipKepala}</b>
      </td>
      <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:200px;">
        ${CONFIG_MADRASAH.kota || 'Bantaeng'}, ${tglSurat}
        <div style="height:${OFFSET_KOTA}px;"></div>
        Guru Mata Pelajaran
        <div style="height:${SPASI_TTD}px;"></div>
        <b><u><span style="font-size:10pt;">${namaGuruCetak}</span></u></b><br><b style="font-size:11pt;">${nipGuru}</b>
      </td>
    </tr>
  </table>`;

  // ===== GABUNGKAN SEMUA =====
  document.getElementById('hasilAnalisisContent').innerHTML = `
    <div id="analisisPrintArea" style="background:white; padding:20px; font-family:'Times New Roman', serif;">
      ${kopHtml}
      
      <div style="text-align:center; margin:12px 0;">
        <div style="font-size:12pt; font-weight:bold; text-decoration:underline; text-transform:uppercase;">ANALISIS HASIL SUMATIF AKHIR SEMESTER</div>
      </div>

           <table style="width:100%; margin-bottom:12px; font-size:12pt; border:none; border-collapse:collapse;">
        <tr>
          <td style="border:none; width:140px; padding:1px 0; text-align:left;">Mata Pelajaran</td>
          <td style="border:none; width:10px; padding:1px 0; text-align:left;">:</td>
          <td style="border:none; padding:1px 0; text-align:left;"><strong>${mapel}</strong></td>
          <td style="border:none; width:140px; padding:1px 0; text-align:left;"></td>
          <td style="border:none; width:120px; padding:1px 0; text-align:left;">Jumlah Soal</td>
          <td style="border:none; width:10px; padding:1px 0; text-align:left;">:</td>
          <td style="border:none; padding:1px 0; text-align:left;"><strong>${jumlahSoal}</strong></td>
        </tr>
        <tr>
          <td style="border:none; padding:1px 0; text-align:left;">Kelas</td>
          <td style="border:none; padding:1px 0; text-align:left;">:</td>
          <td style="border:none; padding:1px 0; text-align:left;"><strong>${kelasNama}</strong></td>
          <td style="border:none; padding:1px 0; text-align:left;"></td>
          <td style="border:none; padding:1px 0; text-align:left;">KKM</td>
          <td style="border:none; padding:1px 0; text-align:left;">:</td>
          <td style="border:none; padding:1px 0; text-align:left;"><strong>${kkm}</strong></td>
        </tr>
        <tr>
          <td style="border:none; padding:1px 0; text-align:left;">Semester</td>
          <td style="border:none; padding:1px 0; text-align:left;">:</td>
          <td style="border:none; padding:1px 0; text-align:left;"><strong>${semester}</strong></td>
          <td style="border:none; padding:1px 0; text-align:left;"></td>
          <td style="border:none; padding:1px 0; text-align:left;">Tahun Ajaran</td>
          <td style="border:none; padding:1px 0; text-align:left;">:</td>
          <td style="border:none; padding:1px 0; text-align:left;"><strong>${tahunAjaran}</strong></td>
        </tr>
      </table>

      <h3 style="font-size:11pt; margin:16px 0 8px 0; font-weight:bold;">A. Rincian Nilai Peserta</h3>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:10pt;">
          <thead>${headerBaris1}</thead>
          <tbody>
            ${rowsSiswa}
            ${makeStatRow('Jumlah', 'skorDiperoleh')}
            ${makeStatRow('Rata-rata', 'rataRata')}
            ${makeStatRow('Nilai tertinggi', 'max')}
            ${makeStatRow('Nilai terendah', 'min')}
          </tbody>
        </table>
      </div>

      <h3 style="font-size:11pt; margin:20px 0 8px 0; font-weight:bold;">B. Hasil Analisis Per Butir Soal</h3>
      <table style="width:100%; border-collapse:collapse; font-size:10pt;">
        <thead>${headerTabelB}</thead>
        <tbody>${rowsTabelB}</tbody>
      </table>

      ${ttdHtml}
    </div>
  `;

  butirCache = { kelasNama, mapel, kkm, semester, tahunAjaran, jumlahSoal, analisisData, statistikPerSoal, soalButir, butirKeys, jmlPeserta, jmlTuntas, jmlTidakTuntas, ketuntasanKlasikal, totalJumlah, totalSkorMax, namaGuru: namaGuruCetak, nipGuru, namaKepala, nipKepala, namaMadrasah: CONFIG_MADRASAH.kop2 };
  console.log('✅✅✅ HASIL ANALISIS DIRENDER ✅✅✅');
}

// ═══════════════════════════════════════════════════════════
// 7. EXPORT EXCEL
// ═══════════════════════════════════════════════════════════
function exportAnalisisButirExcel() {
  if (!butirCache) { alert('Jalankan analisis dulu!'); return; }
  const c = butirCache;
  const dataSiswa = c.analisisData.map((d, i) => ({
    'No': i + 1, 'Nama Peserta Didik': d.siswa.student_name, 'L/P': d.siswa.l_p || '-',
    ...Object.fromEntries(Object.entries(d.nilaiPerSoal).map(([k, v]) => [`Soal ${k.replace('soal_', '')}`, v])),
    'Jml Skor': d.total, '% Ketercapaian': d.pctKetercapaian + '%', 'Tuntas': d.isTuntas ? 'Tuntas' : 'Tidak Tuntas'
  }));
  const wsSiswa = XLSX.utils.json_to_sheet(dataSiswa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSiswa, "Rincian Nilai");
  XLSX.writeFile(wb, `Analisis_Butir_Soal_${c.kelasNama}_${c.mapel}.xlsx`);
  alert('File Excel berhasil diunduh!');
}

// ═══════════════════════════════════════════════════════════
// 8. PREVIEW & CETAK PDF
// ═══════════════════════════════════════════════════════════
function previewAnalisisButirPDF() {
  const content = document.getElementById('analisisPrintArea');
  if (!content) return;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html><head><title>Cetak Analisis Butir Soal</title>
    <style>
      body { font-family: 'Times New Roman', serif; padding: 20px; margin: 0; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      th, td { border: 1px solid #000; padding: 4px; font-size: 10pt; text-align: center; }
      td.left-align { text-align: left; }
      @media print { .no-print { display: none; } }
    </style>
    </head><body>
    ${content.innerHTML}
    <div class="no-print" style="margin-top:20px; text-align:center;">
      <button onclick="window.print()" style="padding:10px 20px; font-size:12pt; cursor:pointer;">️ Cetak Sekarang</button>
      <button onclick="window.close()" style="padding:10px 20px; font-size:12pt; cursor:pointer;">Tutup</button>
    </div>
    </body></html>
  `);
  printWindow.document.close();
}

// Expose ke global
window.renderAnalisisButir = renderAnalisisButir;
window.initAnalisisButirPage = initAnalisisButirPage;
window.tampilkanHasilAnalisis = tampilkanHasilAnalisis;