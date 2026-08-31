// ══════════════════════════════════════════════
// SIPENA 2.0 - MODUL PENILAIAN (KURIKULUM MERDEKA)
// File terpisah agar sipenav2.js tidak terlalu panjang
// ══════════════════════════════════════════════

// State khusus Penilaian
let currentPenilaianData = {};
let currentDeskripsiData = {};

// ══════════════════════════════════════════════
// RENDER HALAMAN PENILAIAN
// ══════════════════════════════════════════════
function renderPenilaian() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700;">⭐ Input Penilaian (Kurikulum Merdeka)</h3>
      </div>

      <div style="background: #f0f9ff; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #0ea5e9;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">📚 Kategori Penilaian</label>
            <select id="nilaiKategoriSelect" onchange="updateJenisPenilaian()" class="form-control" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
              <option value="formatif">Penilaian Formatif</option>
              <option value="sumatif">Penilaian Sumatif</option>
              <option value="sikap">Penilaian Sikap</option>
            </select>
          </div>
          
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">📝 Jenis Penilaian</label>
            <select id="nilaiJenisSelect" class="form-control" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
              <!-- Akan diisi otomatis -->
            </select>
          </div>
          
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">🏫 Kelas</label>
            <select id="nilaiKelasSelect" class="form-control" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
              <option value="">-- Pilih Kelas --</option>
            </select>
          </div>
          
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">📋 Keterangan</label>
            <input type="text" id="nilaiNamaInput" placeholder="Contoh: PH Bab 1" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
          </div>
        </div>
        
        <button class="btn btn-primary" onclick="loadPenilaianSiswa()" style="margin-top: 1rem; width: 100%;">
          <i class="fas fa-search"></i> Muat Data Siswa
        </button>
      </div>

      <div id="nilaiActionArea" style="display: none; margin-bottom: 1.5rem; padding: 1rem; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="font-weight: 600; color: #1e40af;">
            📝 <span id="nilaiInfoKategori"></span>: <span id="nilaiInfoKelas" style="font-weight: 800;"></span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="simpanPenilaian()" id="btnSimpanNilai"><i class="fas fa-save"></i> Simpan Nilai</button>
        </div>
      </div>

      <div class="table-container">
        <table id="tabelNilai" style="width: 100%;">
          <thead>
            <tr>
              <th width="50">No</th>
              <th width="60">Foto</th>
              <th>Nama Siswa</th>
              <th width="150">Nilai / Predikat</th>
            </tr>
          </thead>
          <tbody id="bodyNilai">
            <tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Pilih kategori, jenis, dan kelas, lalu klik "Muat Data Siswa".</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════
// UPDATE JENIS BERDASARKAN KATEGORI
// ══════════════════════════════════════════════
function updateJenisPenilaian() {
  const kategori = document.getElementById('nilaiKategoriSelect').value;
  const jenisSelect = document.getElementById('nilaiJenisSelect');
  const namaInput = document.getElementById('nilaiNamaInput');
  
  let options = [];
  
  if (kategori === 'formatif') {
    options = [
      { value: 'PH', label: 'Penilaian Harian (PH)' },
      { value: 'Tugas', label: 'Tugas' },
      { value: 'Kuis', label: 'Kuis' }
    ];
    namaInput.placeholder = 'Contoh: PH Bab 1 / Tugas Kelompok';
  } else if (kategori === 'sumatif') {
    options = [
      { value: 'PTS', label: 'Penilaian Tengah Semester (PTS)' },
      { value: 'PAS', label: 'Penilaian Akhir Semester (PAS)' },
      { value: 'Proyek', label: 'Projek Penguatan Profil Pelajar Pancasila (P5)' }
    ];
    namaInput.placeholder = 'Contoh: PTS Ganjil / Proyek P5';
  } else if (kategori === 'sikap') {
    options = [
      { value: 'Beriman', label: 'Beriman dan Bertakwa kepada Tuhan YME' },
      { value: 'Berkebinekaan', label: 'Berkebinekaan Global' },
      { value: 'GotongRoyong', label: 'Bergotong Royong' },
      { value: 'Mandiri', label: 'Mandiri' },
      { value: 'BernalarKritis', label: 'Bernalar Kritis' },
      { value: 'Kreatif', label: 'Kreatif' }
    ];
    namaInput.placeholder = 'Contoh: Sikap Semester Ganjil';
  }
  
  jenisSelect.innerHTML = options.map(opt => 
    `<option value="${opt.value}">${opt.label}</option>`
  ).join('');
}

// ══════════════════════════════════════════════
// INIT HALAMAN PENILAIAN
// ══════════════════════════════════════════════
async function initPenilaianPage() {
  if (!currentUser) return;
  
  updateJenisPenilaian();
  
  const select = document.getElementById('nilaiKelasSelect');
  if (!select) return;

  try {
    const kelasSnap = await db.collection('kelas').where('archived', '==', false).get();
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    
    const kelasList = [];
    kelasSnap.forEach(doc => {
      const data = doc.data();
      const isMyClass = 
        (data.pengajar_uids && data.pengajar_uids.includes(currentUser.uid)) ||
        (data.wali_kelas_uid && data.wali_kelas_uid === currentUser.uid) ||
        (data.guru_email && data.guru_email === currentUser.email);
      if (isMyClass) kelasList.push({ id: doc.id, ...data });
    });
    
    kelasList.sort((a, b) => a.nama.localeCompare(b.nama));
    
    kelasList.forEach(kelas => {
      const mapel = kelas.pengajar?.[currentUser.uid]?.mapel || kelas.mapel || '';
      const option = document.createElement('option');
      option.value = kelas.id;
      option.textContent = `${kelas.nama} (${mapel})`;
      option.dataset.nama = kelas.nama;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error initPenilaianPage:', error);
  }
}

// ══════════════════════════════════════════════
// MUAT DATA SISWA UNTUK PENILAIAN
// ══════════════════════════════════════════════
async function loadPenilaianSiswa() {
  const kategori = document.getElementById('nilaiKategoriSelect').value;
  const jenis = document.getElementById('nilaiJenisSelect').value;
  const kelasId = document.getElementById('nilaiKelasSelect').value;
  const namaPenilaian = document.getElementById('nilaiNamaInput').value.trim() || jenis;
  const actionArea = document.getElementById('nilaiActionArea');
  const tbody = document.getElementById('bodyNilai');

  if (!kelasId) {
    showToast('Pilih kelas terlebih dahulu!', 'error');
    return;
  }

  tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;"><div class="spinner"></div> Memuat data...</td></tr>';
  actionArea.style.display = 'block';
  
  const kelasNama = document.getElementById('nilaiKelasSelect').options[document.getElementById('nilaiKelasSelect').selectedIndex].dataset.nama;
  document.getElementById('nilaiInfoKategori').textContent = `${kategori.toUpperCase()} - ${jenis}`;
  document.getElementById('nilaiInfoKelas').textContent = `${kelasNama} | ${namaPenilaian}`;

  try {
    const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
    const siswaList = [];
    siswaSnap.forEach(doc => siswaList.push({ id: doc.id, ...doc.data() }));
    siswaList.sort((a, b) => a.student_name.localeCompare(b.student_name));

    const nilaiSnap = await db.collection('penilaian')
      .where('kelas_id', '==', kelasId)
      .where('kategori', '==', kategori)
      .where('jenis', '==', jenis)
      .where('nama_penilaian', '==', namaPenilaian)
      .get();
    
    currentPenilaianData = {};
    if (!nilaiSnap.empty) {
      currentPenilaianData = nilaiSnap.docs[0].data().nilai || {};
    }

    if (siswaList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Tidak ada siswa di kelas ini.</td></tr>';
      return;
    }

    let html = '';
    siswaList.forEach((s, index) => {
      const nilai = currentPenilaianData[s.id] !== undefined ? currentPenilaianData[s.id] : '';
      const foto = s.student_photo 
        ? `<img src="${s.student_photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` 
        : '<div style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">👤</div>';
      
      const inputNilai = kategori === 'sikap' 
        ? `<select class="input-nilai" data-siswa="${s.id}" 
            style="width: 120px; padding: 6px; border: 1.5px solid var(--border); border-radius: 6px; text-align: center;"
            onchange="updateNilaiSiswa('${s.id}', this.value)">
            <option value="">-- Pilih --</option>
            <option value="SB" ${nilai === 'SB' ? 'selected' : ''}>Sangat Baik</option>
            <option value="B" ${nilai === 'B' ? 'selected' : ''}>Baik</option>
            <option value="C" ${nilai === 'C' ? 'selected' : ''}>Cukup</option>
            <option value="K" ${nilai === 'K' ? 'selected' : ''}>Kurang</option>
          </select>`
        : `<input type="number" min="0" max="100" class="input-nilai" 
            data-siswa="${s.id}" value="${nilai}" 
            style="width: 100px; padding: 6px; border: 1.5px solid var(--border); border-radius: 6px; text-align: center; font-weight: 600;"
            onchange="updateNilaiSiswa('${s.id}', this.value)">`;
      
      html += `
        <tr class="nilai-row">
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${foto}</td>
          <td style="font-weight: 600;">${s.student_name}</td>
          <td style="text-align: center;">${inputNilai}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;

  } catch (error) {
    console.error('Error load penilaian:', error);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: red;">Gagal memuat data: ${error.message}</td></tr>`;
  }
}

function updateNilaiSiswa(siswaId, nilai) {
  if (nilai === '' || nilai === null || nilai === undefined) {
    delete currentPenilaianData[siswaId];
  } else {
    currentPenilaianData[siswaId] = nilai;
  }
}

function updateDeskripsiSiswa(siswaId, deskripsi) {
  if (!currentDeskripsiData) {
    currentDeskripsiData = {};
  }
  if (deskripsi === '' || deskripsi === null || deskripsi === undefined) {
    delete currentDeskripsiData[siswaId];
  } else {
    currentDeskripsiData[siswaId] = deskripsi;
  }
}

// ══════════════════════════════════════════════
// SIMPAN PENILAIAN
// ══════════════════════════════════════════════
async function simpanPenilaian() {
  const kategori = document.getElementById('nilaiKategoriSelect').value;
  const jenis = document.getElementById('nilaiJenisSelect').value;
  const kelasId = document.getElementById('nilaiKelasSelect').value;
  const namaPenilaian = document.getElementById('nilaiNamaInput').value.trim() || jenis;
  const kelasNama = document.getElementById('nilaiKelasSelect').options[document.getElementById('nilaiKelasSelect').selectedIndex].dataset.nama;
  const btn = document.getElementById('btnSimpanNilai');

  if (!kelasId) {
    showToast('Pilih kelas terlebih dahulu!', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

  try {
    const dataNilai = {
      kelas_id: kelasId,
      kelas_nama: kelasNama,
      kategori: kategori,
      jenis: jenis,
      nama_penilaian: namaPenilaian,
      guru_uid: currentUser.uid,
      guru_nama: currentUserData.nama || currentUser.email,
      nilai: currentPenilaianData,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    };

    const existingSnap = await db.collection('penilaian')
      .where('kelas_id', '==', kelasId)
      .where('kategori', '==', kategori)
      .where('jenis', '==', jenis)
      .where('nama_penilaian', '==', namaPenilaian)
      .get();

    if (!existingSnap.empty) {
      const docId = existingSnap.docs[0].id;
      await db.collection('penilaian').doc(docId).update(dataNilai);
      showToast('✅ Data penilaian berhasil diperbarui!', 'success');
    } else {
      dataNilai.created_at = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('penilaian').add(dataNilai);
      showToast('✅ Data penilaian berhasil disimpan!', 'success');
    }
  } catch (error) {
    console.error('Error simpan penilaian:', error);
    showToast('❌ Gagal menyimpan: ' + error.message, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save"></i> Simpan Nilai';
}