// ═══════════════════════════════════════════════════════════
// SIPENA 2.0 - MODUL ANALISIS BUTIR SOAL (FORMAT EXCEL FINAL)
// ══════════════════════════════════════════════════════════

let butirCache = null;
let currentButirSetup = null;

// ═══════════════════════════════════════════════════════════
// 1. RENDER HALAMAN UTAMA
// ═══════════════════════════════════════════════════════════
function renderAnalisisButir() {
  return `
    <div class="content-card">
      <div class="section-title">📝 Analisis Hasil Asesmen Per Butir Soal</div>
      
      <!-- STEP 1: PILIH KELAS & PENILAIAN -->
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

      <!-- STEP 2: SETUP BUTIR SOAL -->
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

      <!-- STEP 3: TABEL INPUT NILAI PER BUTIR -->
      <div id="step3" style="display:none;">
        <div style="background:#f0fdf4; padding:16px; border-radius:10px; margin-bottom:18px; border-left:4px solid #10b981; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="margin:0; color:#065f46;" id="asesmenTitle">Asesmen: -</h3>
            <p style="margin:4px 0 0 0; color:#047857; font-size:0.9rem;" id="asesmenInfo">Kelas: - | KKM: - | Total Skor Max: -</p>
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

      <!-- STEP 4: HASIL ANALISIS -->
      <div id="step4" style="display:none;">
        <div style="margin-bottom:18px; display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
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
// 3. CEK DATA & TENTUKAN STEP
// ══════════════════════════════════════════════════════════
async function checkButirData() {
  const kelasId = document.getElementById('butirKelasSelect').value;
  const penilaianId = document.getElementById('butirPenilaianSelect').value;
  const kkm = Number(document.getElementById('butirKKM').value) || 75;

  if (!kelasId || !penilaianId) {
    window.toast ? window.toast('Pilih kelas dan penilaian terlebih dahulu!', 'err') : alert('Pilih kelas dan penilaian!');
    return;
  }

  try {
    const docSnap = await db.collection('penilaian').doc(penilaianId).get();
    if (!docSnap.exists) {
      window.toast ? window.toast('Data penilaian tidak ditemukan!', 'err') : alert('Data penilaian tidak ditemukan!');
      return;
    }

    const penilaian = { id: docSnap.id, ...docSnap.data() };
    const soalButir = penilaian.soal_butir || {};

    if (penilaian.kkm !== kkm) {
      await db.collection('penilaian').doc(penilaianId).update({ kkm: kkm });
    }

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
  } catch (error) {
    console.error('Error checkButirData:', error);
    window.toast ? window.toast('Gagal memuat data: ' + error.message, 'err') : alert('Gagal memuat data!');
  }
}

// ═══════════════════════════════════════════════════════════
// 4. SETUP WIZARD (STEP 2)
// ═══════════════════════════════════════════════════════════
function generateSkorMaxInputs() {
  const jumlah = Number(document.getElementById('setupJumlahSoal').value) || 10;
  const container = document.getElementById('skorMaxContainer');
  container.innerHTML = '';

  for (let i = 1; i <= jumlah; i++) {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
    div.innerHTML = `
      <label style="font-size:0.8rem; font-weight:600;">Soal ${i}</label>
      <input type="number" class="input-skor-max" data-nomor="${i}" min="1" max="100" value="10" 
             onchange="hitungTotalSkor()" 
             style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:4px; text-align:center;">
    `;
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
  if (totalSkor === 0) {
    window.toast ? window.toast('Total skor maksimal tidak boleh 0!', 'err') : alert('Total skor maksimal tidak boleh 0!');
    return;
  }

  if (!confirm(`Simpan konfigurasi dengan total skor ${totalSkor}?`)) return;

  try {
    const soalButir = {};
    const inputs = document.querySelectorAll('.input-skor-max');
    inputs.forEach(input => {
      const nomor = input.dataset.nomor;
      const max = Number(input.value) || 0;
      soalButir[`soal_${nomor}`] = { max: max };
    });

    await db.collection('penilaian').doc(currentButirSetup.penilaianId).update({
      soal_butir: soalButir,
      total_skor_max: totalSkor,
      updated_at: new Date().toISOString()
    });

    currentButirSetup.soalButir = soalButir;
    window.toast ? window.toast('✅ Setup butir soal berhasil disimpan!', 'success') : alert('Setup berhasil!');
    renderTabelInputNilai();
  } catch (error) {
    console.error('Error simpanSetupButir:', error);
    window.toast ? window.toast('Gagal menyimpan setup: ' + error.message, 'err') : alert('Gagal menyimpan!');
  }
}

function batalSetup() {
  document.getElementById('step1').style.display = 'block';
  document.getElementById('step2').style.display = 'none';
  currentButirSetup = null;
}

async function resetSetup() {
  if (!confirm('⚠️ Yakin ingin mereset setup? Semua data nilai per butir soal akan hilang!')) return;

  try {
    await db.collection('penilaian').doc(currentButirSetup.penilaianId).update({
      soal_butir: {},
      nilai: {},
      total_skor_max: 0,
      updated_at: new Date().toISOString()
    });

    window.toast ? window.toast('Setup berhasil direset!', 'success') : alert('Setup direset!');
    currentButirSetup.soalButir = {};
    renderTabelInputNilai();
  } catch (error) {
    console.error('Error resetSetup:', error);
    window.toast ? window.toast('Gagal mereset: ' + error.message, 'err') : alert('Gagal mereset!');
  }
}

// ═══════════════════════════════════════════════════════════
// 5. RENDER TABEL INPUT NILAI (STEP 3)
// ══════════════════════════════════════════════════════════
async function renderTabelInputNilai() {
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step3').style.display = 'block';
  document.getElementById('step4').style.display = 'none';

  const { penilaianId, kelasId, kkm, penilaian, soalButir } = currentButirSetup;
  const butirKeys = Object.keys(soalButir).sort();
  const totalSkorMax = Object.values(soalButir).reduce((sum, s) => sum + Number(s.max || 0), 0);

  document.getElementById('asesmenTitle').textContent = `Asesmen: ${penilaian.nama_penilaian}`;
  document.getElementById('asesmenInfo').textContent = 
    `Kelas: ${penilaian.kelas_nama || '-'} | KKM: ${kkm} | Total Skor Max: ${totalSkorMax}`;

  const headerRow = document.getElementById('headerTabelInput');
  headerRow.innerHTML = `
    <th style="border:1px solid #000; padding:8px; background:#f0f0f0; width:40px;">No</th>
    <th style="border:1px solid #000; padding:8px; background:#f0f0f0; width:80px;">Induk</th>
    <th style="border:1px solid #000; padding:8px; background:#f0f0f0;">Nama Peserta</th>
    <th style="border:1px solid #000; padding:8px; background:#f0f0f0; width:50px;">L/P</th>
    ${butirKeys.map(k => `<th style="border:1px solid #000; padding:8px; background:#f0f0f0; width:60px;">Soal ${k.replace('soal_', '')}<br><small>(${soalButir[k].max})</small></th>`).join('')}
    <th style="border:1px solid #000; padding:8px; background:#f0f0f0; width:70px;">Jml Skor</th>
    <th style="border:1px solid #000; padding:8px; background:#f0f0f0; width:80px;">% Ketercapaian</th>
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
      <td style="border:1px solid #000; padding:6px; text-align:center;">${s.induk || '-'}</td>
      <td style="border:1px solid #000; padding:6px;">${s.student_name}</td>
      <td style="border:1px solid #000; padding:6px; text-align:center;">${s.l_p || '-'}</td>
      ${butirKeys.map(k => `
        <td style="border:1px solid #000; padding:4px; text-align:center;">
          <input type="number" class="input-nilai-butir" 
                 data-siswa="${s.id}" data-soal="${k}" 
                 min="0" max="${soalButir[k].max}" 
                 value="${studentRecord[k] || 0}"
                 onchange="hitungTotalSiswa('${s.id}')"
                 style="width:100%; padding:4px; border:1px solid #e2e8f0; border-radius:4px; text-align:center;">
        </td>
      `).join('')}
      <td style="border:1px solid #000; padding:6px; text-align:center; font-weight:bold;" id="total-${s.id}">${studentRecord.total || 0}</td>
      <td style="border:1px solid #000; padding:6px; text-align:center; font-weight:bold;" id="pct-${s.id}">${studentRecord.total ? ((studentRecord.total / totalSkorMax) * 100).toFixed(1) : 0}%</td>
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
  const pct = totalSkorMax > 0 ? ((total / totalSkorMax) * 100).toFixed(1) : 0;

  document.getElementById(`total-${siswaId}`).textContent = total;
  document.getElementById(`pct-${siswaId}`).textContent = pct + '%';
}

async function simpanNilaiButir() {
  if (!confirm('Simpan semua nilai per butir soal?')) return;

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
        const max = Number(soalButir[soal].max || 0);
        
        if (nilai > max) {
          window.toast ? window.toast(`Nilai soal ${soal.replace('soal_', '')} untuk ${s.student_name} melebihi skor maksimal!`, 'err') : alert('Nilai melebihi skor maksimal!');
          throw new Error('Validasi gagal');
        }

        nilaiPerSoal[soal] = nilai;
        total += nilai;
      });

      nilaiPerSoal.total = total;
      nilaiBaru[s.id] = nilaiPerSoal;
    });

    await db.collection('penilaian').doc(penilaianId).update({
      nilai: nilaiBaru,
      updated_at: new Date().toISOString()
    });

    window.toast ? window.toast('✅ Nilai berhasil disimpan!', 'success') : alert('Nilai berhasil disimpan!');
  } catch (error) {
    if (error.message !== 'Validasi gagal') {
      console.error('Error simpanNilaiButir:', error);
      window.toast ? window.toast('Gagal menyimpan: ' + error.message, 'err') : alert('Gagal menyimpan!');
    }
  }
}

function kembaliKeInput() {
  document.getElementById('step3').style.display = 'block';
  document.getElementById('step4').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
// 6. TAMPILKAN HASIL ANALISIS (FORMAT EXCEL FINAL)
// ══════════════════════════════════════════════════════════
async function tampilkanHasilAnalisis() {
  await simpanNilaiButir();

  document.getElementById('step3').style.display = 'none';
  document.getElementById('step4').style.display = 'block';

  const { penilaianId, kelasId, kkm, penilaian, soalButir, siswaList, butirKeys, totalSkorMax } = currentButirSetup;
  const records = penilaian.nilai || {};

  // Proses data per siswa
  const analisisData = [];
  let totalSkorPerSoal = {};
  butirKeys.forEach(k => totalSkorPerSoal[k] = 0);

  siswaList.forEach(s => {
    const studentRecord = records[s.id] || {};
    let totalNilaiSiswa = studentRecord.total || 0;
    const nilaiPerSoal = {};
    
    butirKeys.forEach(k => {
      const skor = studentRecord[k] !== undefined ? Number(studentRecord[k]) : 0;
      nilaiPerSoal[k] = skor;
      totalSkorPerSoal[k] += skor;
    });

    const pctKetercapaianSiswa = totalSkorMax > 0 ? ((totalNilaiSiswa / totalSkorMax) * 100).toFixed(0) : 0;
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
  const ketuntasanIndividualPct = jmlPeserta > 0 ? ((jmlTidakTuntas / jmlPeserta) * 100).toFixed(1) : 0;

  // Proses data per butir soal
  const analisisPerSoal = butirKeys.map(key => {
    const skorMax = Number(soalButir[key].max || 0);
    const skorDiperoleh = totalSkorPerSoal[key];
    const skorIdeal = skorMax * jmlPeserta;
    const pctKetercapaian = skorIdeal > 0 ? ((skorDiperoleh / skorIdeal) * 100).toFixed(2) : 0;
    const pctKegagalan = (100 - pctKetercapaian).toFixed(2);
    const skorKegagalan = skorIdeal - skorDiperoleh; // BARU: Skor kegagalan
    const tidakTuntas = analisisData.filter(d => skorMax > 0 && (d.nilaiPerSoal[key] / skorMax) < 0.75).length;
    const tuntas = jmlPeserta - tidakTuntas;

    return {
      noSoal: key.replace('soal_', ''),
      skorMax,
      skorDiperoleh,
      skorIdeal,
      pctKetercapaian,
      pctKegagalan,
      skorKegagalan,
      tidakTuntas,
      tuntas
    };
  });

  // Hitung summary per soal
  const summaryPerSoal = butirKeys.map(key => {
    const nilaiSoal = analisisData.map(d => d.nilaiPerSoal[key] || 0);
    const jumlah = nilaiSoal.reduce((a, b) => a + b, 0);
    const rata = nilaiSoal.length > 0 ? (jumlah / nilaiSoal.length) : 0;
    const tertinggi = nilaiSoal.length > 0 ? Math.max(...nilaiSoal) : 0;
    const terendah = nilaiSoal.length > 0 ? Math.min(...nilaiSoal) : 0;
    return { jumlah, rata, tertinggi, terendah };
  });

  const totalJumlah = summaryPerSoal.reduce((sum, s) => sum + s.jumlah, 0);
  const totalRata = summaryPerSoal.reduce((sum, s) => sum + s.rata, 0);
  const totalTertinggi = Math.max(...summaryPerSoal.map(s => s.tertinggi));
  const totalTerendah = Math.min(...summaryPerSoal.map(s => s.terendah));

  // Ambil info dari select
  const selectKelas = document.getElementById('butirKelasSelect');
  const kelasNama = selectKelas.options[selectKelas.selectedIndex]?.dataset.nama || '-';
  const mapel = selectKelas.options[selectKelas.selectedIndex]?.dataset.mapel || penilaian.mapel || '-';
  const semester = penilaian.semester || '-';
  const tahunAjaran = penilaian.tahun_ajaran || '-';
  const jumlahSoal = butirKeys.length;

  // ═══════════════════════════════════════════════════════════
  // RENDER TABEL UTAMA (3 BARIS HEADER + DATA SISWA + SUMMARY)
  // ═══════════════════════════════════════════════════════════
  const b = 'border:1px solid #000; padding:4px; font-size:10pt;';
  const thStyle = `style="${b} background:#f0f0f0; font-weight:bold; text-align:center;"`;

  // Header 3 baris
  const headerRow1 = `
    <th ${thStyle} rowspan="3" style="width:30px;">No.</th>
    <th ${thStyle} rowspan="3">NAMA PESERTA DIDIK</th>
    <th ${thStyle} rowspan="3" style="width:40px;">L/P</th>
    <th ${thStyle} colspan="${jumlahSoal}">NO. SOAL / SKOR MAKSIMUM</th>
    <th ${thStyle} rowspan="3" style="width:70px;">Jmlh<br>Skor</th>
    <th ${thStyle} rowspan="3" style="width:80px;">%<br>Ketercapaian</th>
    <th ${thStyle} rowspan="3" style="width:70px;">Tuntas</th>
  `;
  const headerRow2 = butirKeys.map((k, i) => `<th ${thStyle}>${i + 1}</th>`).join('');
  const headerRow3 = butirKeys.map(k => `<th ${thStyle}>${soalButir[k].max}</th>`).join('');

  // Data siswa
  const rowsSiswa = analisisData.map((d, i) => `
    <tr>
      <td style="${b} text-align:center;">${i + 1}</td>
      <td style="${b}">${d.siswa.student_name}</td>
      <td style="${b} text-align:center;">${d.siswa.l_p || '-'}</td>
      ${butirKeys.map(k => `<td style="${b} text-align:center;">${d.nilaiPerSoal[k] || 0}</td>`).join('')}
      <td style="${b} text-align:center; font-weight:bold;">${d.total}</td>
      <td style="${b} text-align:center;">${d.pctKetercapaian}</td>
      <td style="${b} text-align:center; font-weight:bold;">${d.isTuntas ? 'Tuntas' : 'Tidak Tuntas'}</td>
    </tr>
  `).join('');

  // Summary rows
  const summaryRows = `
    <tr>
      <td ${thStyle} colspan="3">Jumlah</td>
      ${summaryPerSoal.map(s => `<td style="${b} text-align:center; font-weight:bold;">${s.jumlah}</td>`).join('')}
      <td style="${b} text-align:center; font-weight:bold;">${totalJumlah}</td>
      <td ${thStyle}></td>
      <td ${thStyle}></td>
    </tr>
    <tr>
      <td ${thStyle} colspan="3">Rata-rata</td>
      ${summaryPerSoal.map(s => `<td style="${b} text-align:center;">${s.rata.toFixed(2)}</td>`).join('')}
      <td style="${b} text-align:center; font-weight:bold;">${totalRata.toFixed(2)}</td>
      <td ${thStyle}></td>
      <td ${thStyle}></td>
    </tr>
    <tr>
      <td ${thStyle} colspan="3">Nilai tertinggi</td>
      ${summaryPerSoal.map(s => `<td style="${b} text-align:center;">${s.tertinggi}</td>`).join('')}
      <td style="${b} text-align:center; font-weight:bold;">${totalTertinggi}</td>
      <td ${thStyle}></td>
      <td ${thStyle}></td>
    </tr>
    <tr>
      <td ${thStyle} colspan="3">Nilai terendah</td>
      ${summaryPerSoal.map(s => `<td style="${b} text-align:center;">${s.terendah}</td>`).join('')}
      <td style="${b} text-align:center; font-weight:bold;">${totalTerendah}</td>
      <td ${thStyle}></td>
      <td ${thStyle}></td>
    </tr>
  `;

  // ═══════════════════════════════════════════════════════════
  // RENDER TABEL HASIL ANALISIS (8 BARIS)
  // ═══════════════════════════════════════════════════════════
  const rowsAnalisis = [
    { ket: 'Jumlah skor yang diperoleh', vals: analisisPerSoal.map(s => s.skorDiperoleh), total: totalJumlah },
    { ket: 'Juml. skor Ideal (seharusnya)', vals: analisisPerSoal.map(s => s.skorIdeal), total: totalSkorMax * jmlPeserta },
    { ket: '% Ketercapaian', vals: analisisPerSoal.map(s => s.pctKetercapaian + '%'), total: ((totalJumlah / (totalSkorMax * jmlPeserta)) * 100).toFixed(2) + '%' },
    { ket: '% Kegagalan', vals: analisisPerSoal.map(s => s.pctKegagalan + '%'), total: (100 - (totalJumlah / (totalSkorMax * jmlPeserta)) * 100).toFixed(2) + '%' },
    { ket: 'Skor kegagalan', vals: analisisPerSoal.map(s => s.skorKegagalan), total: (totalSkorMax * jmlPeserta) - totalJumlah },
    { ket: 'Jumlah peserta ujian', vals: analisisPerSoal.map(() => jmlPeserta), total: jmlPeserta },
    { ket: 'Jumlah peserta yang tidak tuntas', vals: analisisPerSoal.map(s => s.tidakTuntas), total: jmlTidakTuntas },
    { ket: 'Jumlah peserta yang tuntas', vals: analisisPerSoal.map(s => s.tuntas), total: jmlTuntas }
  ].map((row, idx) => `
    <tr>
      <td style="${b} text-align:center;">${idx + 1}</td>
      <td style="${b}" colspan="2">${row.ket}</td>
      ${row.vals.map(v => `<td style="${b} text-align:center;">${v}</td>`).join('')}
      <td style="${b} text-align:center; font-weight:bold;">${row.total}</td>
    </tr>
  `).join('');

  // ═══════════════════════════════════════════════════════════
  // TANDA TANGAN (SIG - FORMAT EXCEL)
  // ═══════════════════════════════════════════════════════════
  const tglSurat = `${new Date().getDate()} ${NAMA_BULAN[new Date().getMonth()]} ${new Date().getFullYear()}`;
  const rawNipGuru = currentUserData?.nip || '';
  const nipGuru = rawNipGuru ? (rawNipGuru.startsWith('NIP.') ? rawNipGuru : 'NIP. ' + rawNipGuru) : 'NIP. ............................................';
  const namaGuruCetak = formatKapital(currentUserData?.namaResmi || currentUserData?.nama || currentUser.email || '', FORMAT_NAMA.guru);

  const namaKepala = CONFIG_MADRASAH.kepalaMadrasah || '...............................';
  const nipKepala = CONFIG_MADRASAH.nipKepala || '...............................';
  const namaMadrasah = CONFIG_MADRASAH.namaMadrasah || CONFIG_MADRASAH.kop2 || 'MAN BANTAENG';

  const logoKop = CONFIG_MADRASAH.logo || (location.origin + '/assets/images/kemenag-app.png');
  const kopHtml = `
    <div style="border-bottom:3px double #000; padding-bottom:8px; margin-bottom:16px;">
      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="width:75px; text-align:center; vertical-align:middle; border:none;">
            <img src="${logoKop}" style="width:62px; height:auto;" onerror="this.style.visibility='hidden'">
          </td>
          <td style="text-align:center; border:none;">
            <div style="font-size:14pt; font-weight:bold;">${CONFIG_MADRASAH.kop1 || ''}</div>
            <div style="font-size:14pt; font-weight:bold;">${CONFIG_MADRASAH.kop2 || namaMadrasah}</div>
            <div style="font-size:12pt; font-style:italic;">${CONFIG_MADRASAH.alamat || ''}</div>
          </td>
          <td style="width:75px; border:none;"></td>
        </tr>
      </table>
    </div>`;

  const ttdHtml = `
    <table style="width:100%; margin-top:40px; font-size:11pt;">
      <tr>
        <td style="width:50%; text-align:left; vertical-align:top; border:none;">
          <div style="font-weight:bold; margin-bottom:60px;">Mengetahui:<br>KEPALA ${namaMadrasah.toUpperCase()}</div>
          <div style="font-weight:bold; text-decoration:underline;">${formatKapital(namaKepala, FORMAT_NAMA.kepala)}</div>
          <div>${nipKepala}</div>
        </td>
        <td style="width:50%; text-align:left; vertical-align:top; border:none;">
          <div style="text-align:right; margin-bottom:60px;">${CONFIG_MADRASAH.kota || 'Bantaeng'}, ${tglSurat}<br>GURU BIDANG STUDY</div>
          <div style="font-weight:bold; text-decoration:underline;">${namaGuruCetak}</div>
          <div>${nipGuru}</div>
        </td>
      </tr>
    </table>`;

  // ═══════════════════════════════════════════════════════════
  // GABUNGKAN SEMUA KE DALAM AREA
  // ══════════════════════════════════════════════════════════
  document.getElementById('hasilAnalisisContent').innerHTML = `
    <div id="analisisPrintArea" style="background:white; padding:20px; font-family:'Times New Roman', serif;">
      ${kopHtml}
      
      <div style="text-align:center; margin-bottom:16px;">
        <div style="font-size:14pt; font-weight:bold; text-decoration:underline;">ANALISIS HASIL SUMATIF AKHIR SEMESTER</div>
        <div style="font-size:12pt; font-weight:bold;">${namaMadrasah.toUpperCase()}</div>
      </div>

      <table style="width:100%; margin-bottom:16px; font-size:11pt;">
        <tr><td style="width:120px; border:none;">Mata Pelajaran</td><td style="border:none;">: <b>${mapel}</b></td><td style="width:120px; border:none;">Jumlah Soal</td><td style="border:none;">: <b>${jumlahSoal}</b></td></tr>
        <tr><td style="border:none;">Kelas</td><td style="border:none;">: <b>${kelasNama}</b></td><td style="border:none;">KKM</td><td style="border:none;">: <b>${kkm}</b></td></tr>
        <tr><td style="border:none;">Semester</td><td style="border:none;">: <b>${semester}</b></td><td style="border:none;">Tahun Ajaran</td><td style="border:none;">: <b>${tahunAjaran}</b></td></tr>
      </table>

      <table style="width:100%; border-collapse:collapse; font-size:10pt; margin-bottom:20px;">
        <thead>
          <tr>${headerRow1}</tr>
          <tr>${headerRow2}</tr>
          <tr>${headerRow3}</tr>
        </thead>
        <tbody>
          ${rowsSiswa}
          ${summaryRows}
        </tbody>
      </table>

      <div style="display:flex; gap:20px; margin-bottom:20px;">
        <div style="flex:2;">
          <div style="font-weight:bold; margin-bottom:8px; font-size:11pt;">Hasil Analisis :</div>
          <table style="width:100%; border-collapse:collapse; font-size:10pt;">
            <thead>
              <tr>
                <th ${thStyle} style="width:30px;">No</th>
                <th ${thStyle} colspan="2">Keterangan</th>
                ${butirKeys.map((k, i) => `<th ${thStyle} style="width:50px;">${i + 1}</th>`).join('')}
                <th ${thStyle} style="width:70px;">Total</th>
              </tr>
            </thead>
            <tbody>${rowsAnalisis}</tbody>
          </table>
        </div>
        <div style="flex:1; border:1px solid #000; padding:12px; font-size:10pt;">
          <div style="font-weight:bold; margin-bottom:10px; text-align:center; border-bottom:1px solid #000; padding-bottom:6px;">Kesimpulan</div>
          <div style="line-height:1.8;">
            <div><strong>a. Ketuntasan Klasikal:</strong></div>
            <div style="padding-left:12px;">${jmlTuntas} (${ketuntasanKlasikal}%) orang</div>
            <div style="margin-top:8px;"><strong>b. Ketuntasan Individual yang perlu remedial:</strong></div>
            <div style="padding-left:12px;">${jmlTidakTuntas} (${ketuntasanIndividualPct}%) orang</div>
            <div style="margin-top:8px;"><strong>c. Bentuk remedial:</strong></div>
            <div style="padding-left:12px;">Pemberian tugas individu untuk menjawab soal-soal dan melaporkan hasilnya.</div>
          </div>
        </div>
      </div>

      ${ttdHtml}
    </div>
  `;

  butirCache = {
    kelasNama, mapel, kkm, semester, tahunAjaran, jumlahSoal,
    analisisData, analisisPerSoal, summaryPerSoal,
    jmlPeserta, jmlTuntas, jmlTidakTuntas, ketuntasanKlasikal,
    namaGuru: namaGuruCetak,
    nipGuru: nipGuru,
    namaKepala: formatKapital(namaKepala, FORMAT_NAMA.kepala),
    nipKepala: nipKepala,
    namaMadrasah: namaMadrasah,
    totalSkorMax
  };
}

// ═══════════════════════════════════════════════════════════
// 7. EXPORT EXCEL (FORMAT SESUAI EXCEL USER)
// ══════════════════════════════════════════════════════════
function exportAnalisisButirExcel() {
  if (!butirCache) {
    window.toast ? window.toast('Jalankan analisis terlebih dahulu!', 'err') : alert('Jalankan analisis terlebih dahulu!');
    return;
  }
  const c = butirCache;
  
  const wb = XLSX.utils.book_new();
  const data = [];

  // Header
  data.push(['ANALISIS HASIL SUMATIF AKHIR SEMESTER']);
  data.push([c.namaMadrasah.toUpperCase()]);
  data.push([]);
  data.push(['Mata Pelajaran', ':', c.mapel, '', '', '', '', '', '', '', '', '', '', 'Jumlah Soal', ':', c.jumlahSoal]);
  data.push(['Kelas', ':', c.kelasNama, '', '', '', '', '', '', '', '', '', '', 'KKM', ':', c.kkm]);
  data.push(['Semester', ':', c.semester, '', '', '', '', '', '', '', '', '', '', 'Tahun Ajaran', ':', c.tahunAjaran]);
  data.push([]);

  // Header tabel (3 baris)
  const header1 = ['No.', 'NAMA PESERTA DIDIK', 'L/P'];
  c.analisisPerSoal.forEach(() => header1.push('NO. SOAL/SKOR MAKSIMUM'));
  header1.push('Jmlh Skor', '% Ketercapaian', 'Tuntas');
  data.push(header1);

  const header2 = ['No.', 'NAMA PESERTA DIDIK', 'L/P'];
  c.butirKeys.forEach((k, i) => header2.push(i + 1));
  header2.push('Jmlh Skor', '% Ketercapaian', 'Ya/Tidak');
  data.push(header2);

  const header3 = ['No.', 'NAMA PESERTA DIDIK', 'L/P'];
  c.analisisPerSoal.forEach(s => header3.push(s.skorMax));
  header3.push('Jmlh Skor', '% Ketercapaian', 'Ya/Tidak');
  data.push(header3);

  // Data siswa
  c.analisisData.forEach((d, i) => {
    const row = [i + 1, d.siswa.student_name, d.siswa.l_p || '-'];
    c.butirKeys.forEach(k => row.push(d.nilaiPerSoal[k] || 0));
    row.push(d.total, d.pctKetercapaian, d.isTuntas ? 'Tuntas' : 'Tidak Tuntas');
    data.push(row);
  });

  data.push([]);
  data.push([]);
  data.push([]);

  // Summary
  const summaryLabels = ['Jumlah', 'Rata-rata', 'Nilai tertinggi', 'Nilai terendah'];
  const summaryValues = [
    c.summaryPerSoal.map(s => s.jumlah),
    c.summaryPerSoal.map(s => parseFloat(s.rata.toFixed(2))),
    c.summaryPerSoal.map(s => s.tertinggi),
    c.summaryPerSoal.map(s => s.terendah)
  ];

  summaryLabels.forEach((label, idx) => {
    const row = ['', label, ''];
    summaryValues[idx].forEach(v => row.push(v));
    row.push('', '', '');
    data.push(row);
  });

  data.push([]);
  data.push([]);

  // Hasil Analisis + Kesimpulan
  const analisisLabels = [
    'Jumlah skor yang diperoleh',
    'Juml. skor Ideal (seharusnya)',
    '% Ketercapaian',
    '% Kegagalan',
    'Skor kegagalan',
    'Jumlah peserta ujian',
    'Jumlah peserta yang tidak tuntas',
    'Jumlah peserta yang tuntas'
  ];

  data.push(['Hasil Analisis :', '', '', '', '', '', '', '', '', '', '', '', '', 'Kesimpulan', '', '', '', '']);

  analisisLabels.forEach((label, idx) => {
    const row = [idx + 1, label, ''];
    c.analisisPerSoal.forEach(s => {
      const vals = [s.skorDiperoleh, s.skorIdeal, s.pctKetercapaian + '%', s.pctKegagalan + '%', s.skorKegagalan, c.jmlPeserta, s.tidakTuntas, s.tuntas];
      row.push(vals[idx]);
    });
    
    // Kesimpulan di kolom terakhir
    if (idx === 0) row.push(`a. Ketuntasan Klasikal: ${c.jmlTuntas} (${c.ketuntasanKlasikal}%) orang`);
    else if (idx === 2) row.push(`b. Ketuntasan Individual yang perlu remedial: ${c.jmlTidakTuntas} (${((c.jmlTidakTuntas/c.jmlPeserta)*100).toFixed(1)}%) orang`);
    else if (idx === 4) row.push('c. Bentuk remedial: Pemberian tugas individu untuk menjawab soal-soal dan melaporkan hasilnya.');
    else row.push('');
    
    data.push(row);
  });

  data.push([]);
  data.push([]);
  data.push(['Mengetahui:', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  data.push([`KEPALA ${c.namaMadrasah.toUpperCase()}`, '', '', '', '', '', '', '', '', '', '', '', '', 'GURU BIDANG STUDY', '', '', '', '']);
  data.push([]);
  data.push([]);
  data.push([]);
  data.push([c.namaKepala, '', '', '', '', '', '', '', '', '', '', '', '', c.namaGuru, '', '', '', '']);
  data.push([c.nipKepala, '', '', '', '', '', '', '', '', '', '', '', '', c.nipGuru, '', '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 5 }, { wch: 30 }, { wch: 5 },
    ...c.analisisPerSoal.map(() => ({ wch: 8 })),
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 40 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Analisis Butir Soal");
  XLSX.writeFile(wb, `Analisis_Butir_Soal_${c.kelasNama}_${c.mapel}.xlsx`);
  window.toast ? window.toast('✅ File Excel berhasil diunduh!', 'success') : alert('File Excel berhasil diunduh!');
}

// ═══════════════════════════════════════════════════════════
// 8. PREVIEW & CETAK PDF
// ═══════════════════════════════════════════════════════════
function previewAnalisisButirPDF() {
  const content = document.getElementById('analisisPrintArea');
  if (!content) return;
  
  const modalContent = document.getElementById('pdfPreviewContent');
  if (modalContent) {
    modalContent.innerHTML = content.innerHTML;
    window.openModal('modalPreviewPDF');
  } else {
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
    if (document.getElementById('modalPreviewPDF') && document.getElementById('modalPreviewPDF').classList.contains('active')) {
      window.print();
    }
  }, 500);
}