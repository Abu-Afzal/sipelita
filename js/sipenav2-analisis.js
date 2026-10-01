// ═══════════════════════════════════════════════════════════
// SIPENA 2.0 - MODUL ANALISIS BUTIR SOAL (OPSI B: WIZARD + SIG PDF)
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

      <!-- STEP 2: SETUP BUTIR SOAL (jika belum ada) -->
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
          <button class="btn btn-primary" onclick="simpanSetupButir()">
            <i class="fas fa-save"></i> Simpan Setup
          </button>
          <button class="btn btn-secondary" onclick="batalSetup()">
            <i class="fas fa-times"></i> Batal
          </button>
        </div>
      </div>

      <!-- STEP 3: TABEL INPUT NILAI PER BUTIR -->
      <div id="step3" style="display:none;">
        <div style="background:#f0fdf4; padding:16px; border-radius:10px; margin-bottom:18px; border-left:4px solid #10b981; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="margin:0; color:#065f46;" id="asesmenTitle">Asesmen: -</h3>
            <p style="margin:4px 0 0 0; color:#047857; font-size:0.9rem;" id="asesmenInfo">Kelas: - | Semester: - | KKM: - | Total Skor Max: -</p>
          </div>
          <button class="btn btn-danger" onclick="resetSetup()" style="padding:8px 16px;">
            <i class="fas fa-redo"></i> Reset Setup
          </button>
        </div>

        <div style="overflow-x:auto;">
          <table id="tabelInputNilai" style="width:100%; border-collapse:collapse; font-size:0.9rem;">
            <thead>
              <tr id="headerTabelInput"></tr>
            </thead>
            <tbody id="bodyTabelInput"></tbody>
          </table>
        </div>

        <div style="margin-top:18px; display:flex; gap:10px; justify-content:flex-end;">
          <button class="btn btn-success" onclick="simpanNilaiButir()">
            <i class="fas fa-save"></i> Simpan Nilai
          </button>
          <button class="btn btn-primary" onclick="tampilkanHasilAnalisis()">
            <i class="fas fa-chart-bar"></i> Tampilkan Analisis
          </button>
        </div>
      </div>

      <!-- STEP 4: HASIL ANALISIS (FORMAT SOS EKA + SIG) -->
      <div id="step4" style="display:none;">
        <div style="margin-bottom:18px; display:flex; gap:10px; justify-content:flex-end;">
          <button class="btn btn-secondary" onclick="kembaliKeInput()">
            <i class="fas fa-arrow-left"></i> Kembali ke Input
          </button>
          <button class="btn btn-success" onclick="exportAnalisisButirExcel()">
            <i class="fas fa-file-excel"></i> Export Excel
          </button>
          <button class="btn btn-info" onclick="previewAnalisisButirPDF()">
            <i class="fas fa-eye"></i> Preview PDF
          </button>
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
// ═══════════════════════════════════════════════════════════
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

  const jumlahSoal = Number(document.getElementById('setupJumlahSoal').value) || 10;
  const totalSkor = Number(document.getElementById('setupTotalSkor').value) || 0;

  if (totalSkor === 0) {
    window.toast ? window.toast('Total skor maksimal tidak boleh 0!', 'err') : alert('Total skor maksimal tidak boleh 0!');
    return;
  }

  if (!confirm(`Simpan konfigurasi ${jumlahSoal} soal dengan total skor ${totalSkor}?`)) return;

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
// ═══════════════════════════════════════════════════════════
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
    `Kelas: ${penilaian.kelas_nama || '-'} | Semester: ${penilaian.semester || '-'} | KKM: ${kkm} | Total Skor Max: ${totalSkorMax}`;

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
      <td style="border:1px solid #000; padding:6px; text-align:center; font-weight:bold;" id="total-${s.id}">
        ${studentRecord.total || 0}
      </td>
      <td style="border:1px solid #000; padding:6px; text-align:center; font-weight:bold;" id="pct-${s.id}">
        ${studentRecord.total ? ((studentRecord.total / totalSkorMax) * 100).toFixed(1) : 0}%
      </td>
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
// 6. TAMPILKAN HASIL ANALISIS (STEP 4 - DENGAN FORMAT SIG)
// ═══════════════════════════════════════════════════════════
async function tampilkanHasilAnalisis() {
  await simpanNilaiButir();

  document.getElementById('step3').style.display = 'none';
  document.getElementById('step4').style.display = 'block';

  const { penilaianId, kelasId, kkm, penilaian, soalButir, siswaList, butirKeys, totalSkorMax } = currentButirSetup;
  const records = penilaian.nilai || {};

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

  const analisisPerSoal = butirKeys.map(key => {
    const skorMax = Number(soalButir[key].max || 0);
    const skorDiperoleh = totalSkorPerSoal[key];
    const skorIdeal = skorMax * jmlPeserta;
    const pctKetercapaian = skorIdeal > 0 ? ((skorDiperoleh / skorIdeal) * 100).toFixed(2) : 0;
    const pctKegagalan = (100 - pctKetercapaian).toFixed(2);
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

  // Render Tabel A
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

  // Render Tabel B (Format SOS EKA)
  let rowsAnalisis = '';
  const kesimpulanRows = [
    '',
    '',
    `<strong>a. Ketuntasan klasikal:</strong><br>${ketuntasanKlasikal}%<br><span style="font-size:8pt;color:#666;">(Jml tuntas × 100 / Jml peserta)</span>`,
    `<strong>b. Ketuntasan individual:</strong><br>Perlu remedial: <strong>${jmlTidakTuntas}</strong> orang`,
    `<strong>c. Bentuk remedial:</strong><br>Pemberian tugas individu untuk menjawab soal-soal dan melaporkan hasilnya.`,
    ``, ``, ``
  ];

  analisisPerSoal.forEach((soal, idx) => {
    const ket = ['Jumlah skor yang diperoleh', 'Juml. skor Ideal (seharusnya)', '% Ketercapaian', '% Kegagalan', 'Skor maksimal tiap nomor', 'Jumlah peserta ujian', 'Jumlah peserta yang tidak tuntas', 'Jumlah peserta yang tuntas'][idx];
    const val = [soal.skorDiperoleh, soal.skorIdeal, soal.pctKetercapaian+'%', soal.pctKegagalan+'%', soal.skorMax, jmlPeserta, soal.tidakTuntas, soal.tuntas][idx];

    rowsAnalisis += `<tr>
      <td style="border:1px solid #000; padding:6px; font-size:10pt; text-align:center;">${idx + 1}</td>
      <td style="border:1px solid #000; padding:6px; font-size:10pt;">${ket}</td>
      <td style="border:1px solid #000; padding:6px; font-size:10pt; text-align:center; font-weight:bold;">${val}</td>
      <td style="border:1px solid #000; padding:6px; font-size:10pt; vertical-align:top;">${kesimpulanRows[idx]}</td>
    </tr>`;
  });

  const mapel = penilaian.mapel || document.getElementById('butirKelasSelect').options[document.getElementById('butirKelasSelect').selectedIndex].dataset.mapel || '-';
  const kelasNama = document.getElementById('butirKelasSelect').options[document.getElementById('butirKelasSelect').selectedIndex].dataset.nama;
  const tglSurat = `${new Date().getDate()} ${NAMA_BULAN[new Date().getMonth()]} ${new Date().getFullYear()}`;

  // ✅ PENERAPAN SIG (SAMA PERSIS DENGAN ANALISIS SUMATIF)
  const rawNipGuru = currentUserData?.nip || '';
  const nipGuru = rawNipGuru ? (rawNipGuru.startsWith('NIP.') ? rawNipGuru : 'NIP. ' + rawNipGuru) : 'NIP. ............................................';
  const namaGuruCetak = formatKapital(currentUserData?.namaResmi || currentUserData?.nama || currentUser.email || '', FORMAT_NAMA.guru);

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

  document.getElementById('hasilAnalisisContent').innerHTML = `
    <div id="analisisPrintArea" style="background:white; padding:20px; font-family:'Times New Roman', serif;">
      ${kopHtml}
      <div style="text-align:center; margin-bottom:20px;">
        <h2 style="margin:0; font-size:16pt; font-weight:bold;">ANALISIS HASIL ASESMEN PER BUTIR SOAL</h2>
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

      ${ttdHtml}
    </div>
  `;

  butirCache = {
    kelasNama, mapel, kkm, analisisData, analisisPerSoal,
    jmlPeserta, jmlTuntas, jmlTidakTuntas, ketuntasanKlasikal,
    namaGuru: namaGuruCetak,
    nipGuru: nipGuru
  };
}

// ═══════════════════════════════════════════════════════════
// 7. EXPORT EXCEL
// ═══════════════════════════════════════════════════════════
function exportAnalisisButirExcel() {
  if (!butirCache) {
    window.toast ? window.toast('Jalankan analisis terlebih dahulu!', 'err') : alert('Jalankan analisis terlebih dahulu!');
    return;
  }
  const c = butirCache;
  
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

  const dataAnalisis = c.analisisPerSoal.map((soal, i) => ({
    'No': i + 1,
    'Keterangan': ['Jml skor diperoleh', 'Skor Ideal', '% Ketercapaian', '% Kegagalan', 'Skor Max', 'Jml Peserta', 'Jml Tidak Tuntas', 'Jml Tuntas'][i],
    'Nilai': [soal.skorDiperoleh, soal.skorIdeal, soal.pctKetercapaian+'%', soal.pctKegagalan+'%', soal.skorMax, c.jmlPeserta, soal.tidakTuntas, soal.tuntas][i]
  }));
  
  dataAnalisis.push({ 'No': '', 'Keterangan': 'Ketuntasan Klasikal', 'Nilai': c.ketuntasanKlasikal + '%' });
  dataAnalisis.push({ 'No': '', 'Keterangan': 'Perlu Remedial', 'Nilai': c.jmlTidakTuntas + ' orang' });

  const wsAnalisis = XLSX.utils.json_to_sheet(dataAnalisis);
  XLSX.utils.book_append_sheet(wb, wsAnalisis, "Hasil Analisis");

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