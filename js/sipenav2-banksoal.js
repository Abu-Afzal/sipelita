// ══════════════════════════════════════════════
// SIPENA 2.0 - MODUL BANK SOAL (MURNI FIRESTORE - TANPA STORAGE)
// ══════════════════════════════════════════════

let bankSoalList = [];
let fileBase64 = null;
let fileMetadata = null;

function getIconForFile(fileName) {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const map = {
    pdf: 'fas fa-file-pdf', doc: 'fas fa-file-word', docx: 'fas fa-file-word',
    xls: 'fas fa-file-excel', xlsx: 'fas fa-file-excel',
    ppt: 'fas fa-file-powerpoint', pptx: 'fas fa-file-powerpoint',
    jpg: 'fas fa-file-image', jpeg: 'fas fa-file-image', png: 'fas fa-file-image',
    zip: 'fas fa-file-archive', rar: 'fas fa-file-archive', txt: 'fas fa-file-alt'
  };
  const colorMap = {
    pdf: '#ef4444', doc: '#2563eb', docx: '#2563eb', xls: '#10b981', xlsx: '#10b981',
    ppt: '#f97316', pptx: '#f97316', jpg: '#8b5cf6', jpeg: '#8b5cf6', png: '#8b5cf6', zip: '#64748b'
  };
  return { icon: map[ext] || 'fas fa-file', color: colorMap[ext] || '#64748b' };
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

function renderBankSoal() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700;">📚 Bank Soal & Dokumen</h3>
        <button class="btn btn-primary" onclick="openUploadModal()"><i class="fas fa-cloud-upload-alt"></i> Upload Soal</button>
      </div>

      <div style="background: #fffbeb; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #f59e0b; font-size: 0.85rem; color: #92400e;">
        <i class="fas fa-info-circle"></i> <strong>Info:</strong> Maksimal ukuran file <b>700 KB</b> (karena disimpan langsung di database Firestore).
      </div>

      <div style="background: #f0f9ff; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #0ea5e9;">
        <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 1rem;">
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">🏫 Kelas</label>
            <select id="bankSoalKelas" onchange="loadBankSoal()" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;"><option value="semua">Semua Kelas</option></select>
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">📂 Kategori</label>
            <select id="bankSoalKategori" onchange="loadBankSoal()" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
              <option value="semua">Semua</option>
              <option value="ph">PH</option><option value="pts">PTS</option><option value="pas">PAS</option>
              <option value="tugas">Tugas</option><option value="kuis">Kuis</option><option value="proyek">Proyek P5</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">🔍 Cari</label>
            <input type="text" id="bankSoalSearch" placeholder="Cari judul..." oninput="loadBankSoal()" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; width: 100%;">
          </div>
        </div>
      </div>

      <div id="bankSoalStats" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;"></div>
      <div id="bankSoalArea"><div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Memuat data...</div></div>
    </div>

    <!-- Modal Upload -->
    <div class="modal" id="modalUploadSoal">
      <div class="modal-box" style="max-width: 600px;">
        <div class="modal-title">☁️ Upload Soal / Dokumen</div>
        <div class="form-group">
          <label>Judul Dokumen *</label>
          <input type="text" id="uploadJudul" placeholder="Contoh: Soal PTS Sejarah Bab 1">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group"><label>Kelas *</label><select id="uploadKelas"></select></div>
          <div class="form-group"><label>Kategori *</label>
            <select id="uploadKategori">
              <option value="ph">PH</option><option value="pts">PTS</option><option value="pas">PAS</option>
              <option value="tugas">Tugas</option><option value="kuis">Kuis</option><option value="proyek">Proyek P5</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Deskripsi</label><textarea id="uploadDeskripsi" rows="2"></textarea></div>
        
        <div class="form-group">
          <label>File (Maks 700 KB) *</label>
          <input type="file" id="uploadFile" style="display: none;" onchange="handleBankSoalFile(event)">
          <div id="dropZone" onclick="document.getElementById('uploadFile').click()" 
            style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 1.5rem; text-align: center; cursor: pointer; background: #f8fafc;">
            <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: #94a3b8;"></i>
            <div style="color: #64748b; font-weight: 600;">Klik untuk pilih file</div>
          </div>
          <div id="selectedFilePreview" style="display: none; margin-top: 0.75rem; padding: 0.75rem; background: #f0fdf4; border-radius: 8px; border-left: 3px solid #10b981;"></div>
        </div>

        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
          <button class="btn btn-secondary" onclick="closeModal('modalUploadSoal')">Batal</button>
          <button class="btn btn-primary" id="btnUploadSoal" onclick="uploadBankSoal()"><i class="fas fa-upload"></i> Simpan ke Database</button>
        </div>
      </div>
    </div>

    <!-- ✅ MODAL PREVIEW DOKUMEN -->
    <div class="modal" id="modalPreviewSoal">
      <div class="modal-box" style="max-width: 900px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
        <div class="modal-title" id="previewTitle">👁️ Preview Dokumen</div>
        <div id="previewContent" style="flex: 1; overflow-y: auto; background: white; padding: 1.5rem; border: 1px solid var(--border); border-radius: 8px; min-height: 300px;"></div>
        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
          <button class="btn btn-success" onclick="downloadFromPreview()"><i class="fas fa-download"></i> Unduh File Ini</button>
          <button class="btn btn-secondary" onclick="closeModal('modalPreviewSoal')">Tutup</button>
        </div>
      </div>
    </div>
  `;
}

async function initBankSoalPage() {
  if (!currentUser) return;
  const select = document.getElementById('bankSoalKelas');
  const uploadSelect = document.getElementById('uploadKelas');
  if (!select) return;
  
  try {
    const kelasSnap = await db.collection('kelas').where('archived', '==', false).get();
    const kelasList = [];
    kelasSnap.forEach(doc => {
      const data = doc.data();
      const isMyClass = (Array.isArray(data.pengajar_uids) && data.pengajar_uids.includes(currentUser.uid)) ||
        (data.wali_kelas_uid && data.wali_kelas_uid === currentUser.uid) ||
        (data.guru_email && data.guru_email === currentUser.email) ||
        (data.pengajar && data.pengajar[currentUser.uid]);
      if (isMyClass) kelasList.push({ id: doc.id, ...data });
    });
    kelasList.sort((a, b) => a.nama.localeCompare(b.nama));
    
    select.innerHTML = '<option value="semua">Semua Kelas</option>';
    uploadSelect.innerHTML = '';
    kelasList.forEach(k => {
      const mapel = k.pengajar?.[currentUser.uid]?.mapel || k.mapel || '';
      const label = mapel ? `${k.nama} (${mapel})` : k.nama;
      select.innerHTML += `<option value="${k.id}">${label}</option>`;
      uploadSelect.innerHTML += `<option value="${k.id}">${label}</option>`;
    });
    await loadBankSoal();
  } catch (error) { console.error('Error initBankSoalPage:', error); }
}

async function loadBankSoal() {
  const kelasId = document.getElementById('bankSoalKelas')?.value || 'semua';
  const kategori = document.getElementById('bankSoalKategori')?.value || 'semua';
  const search = (document.getElementById('bankSoalSearch')?.value || '').toLowerCase();
  const area = document.getElementById('bankSoalArea');
  
  if (!area) return;
  area.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div> Memuat...</div>';
  
  try {
    // Ambil semua data bank_soal milik user ini
    const snap = await db.collection('bank_soal').where('created_by', '==', currentUser.uid).get();
    let list = [];
    
    // Kita ambil field kecuali file_data agar query cepat dan hemat memori
    snap.forEach(doc => {
      const data = doc.data();
      // Hapus file_data sementara dari list display agar browser tidak berat
      const { file_data, ...meta } = data; 
      list.push({ id: doc.id, ...meta, has_file: !!file_data });
    });
    
    if (kelasId !== 'semua') list = list.filter(s => s.kelas_id === kelasId);
    if (kategori !== 'semua') list = list.filter(s => s.kategori === kategori);
    if (search) list = list.filter(s => (s.judul || '').toLowerCase().includes(search));
    
    list.sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
    bankSoalList = list;
    
    const totalSize = list.reduce((sum, s) => sum + (s.file_size || 0), 0);
    document.getElementById('bankSoalStats').innerHTML = `
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 1rem; border-radius: 8px;">
        <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">${list.length}</div>
        <div style="font-size: 0.85rem;">Total Dokumen</div>
      </div>
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 1rem; border-radius: 8px;">
        <div style="font-size: 1.5rem; font-weight: 800; color: #3b82f6;">${new Set(list.map(s => s.kelas_id)).size}</div>
        <div style="font-size: 0.85rem;">Kelas</div>
      </div>
      <div style="background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 1rem; border-radius: 8px;">
        <div style="font-size: 1.5rem; font-weight: 800; color: #8b5cf6;">${formatSize(totalSize)}</div>
        <div style="font-size: 0.85rem;">Total Ukuran DB</div>
      </div>`;
    
    if (list.length === 0) {
      area.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-secondary);"><i class="fas fa-folder-open" style="font-size: 3rem; color: #cbd5e1;"></i><div style="font-weight: 600; margin-top:1rem;">Belum ada dokumen</div></div>';
      return;
    }
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">';
    list.forEach(s => {
      const fi = getIconForFile(s.file_name || 'file');
      const ext = (s.file_name || '').split('.').pop().toUpperCase();
      html += `
        <div style="background: white; border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
            <div style="width: 45px; height: 45px; border-radius: 10px; background: ${fi.color}15; display: flex; align-items: center; justify-content: center;">
              <i class="${fi.icon}" style="font-size: 1.3rem; color: ${fi.color};"></i>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${s.judul}">${s.judul}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">${s.kelas_nama} • ${ext}</div>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-primary btn-sm" onclick="previewBankSoal('${s.id}')" style="flex: 1;"><i class="fas fa-eye"></i> Lihat</button>
            <button class="btn btn-success btn-sm" onclick="downloadBankSoal('${s.id}')" style="flex: 1;"><i class="fas fa-download"></i> Unduh</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBankSoal('${s.id}', '${(s.judul || '').replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>`;
    });
    html += '</div>';
    area.innerHTML = html;
  } catch (error) {
    console.error('Error loadBankSoal:', error);
    area.innerHTML = `<div style="text-align:center; padding:2rem; color:red;">Error: ${error.message}</div>`;
  }
}

function openUploadModal() {
  document.getElementById('uploadJudul').value = '';
  document.getElementById('uploadDeskripsi').value = '';
  document.getElementById('uploadFile').value = '';
  document.getElementById('selectedFilePreview').style.display = 'none';
  fileBase64 = null; fileMetadata = null;
  openModal('modalUploadSoal');
}

function handleBankSoalFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Batasi 700 KB agar aman dari limit 1MB Firestore (karena Base64 menambah size ~33%)
  if (file.size > 700 * 1024) {
    showToast('❌ Maksimal ukuran file 700 KB untuk database Firestore!', 'error');
    event.target.value = ''; return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    fileBase64 = e.target.result; // Format: data:application/pdf;base64,JVBER...
    fileMetadata = { name: file.name, type: file.type, size: file.size };
    
    const preview = document.getElementById('selectedFilePreview');
    const fi = getIconForFile(file.name);
    preview.innerHTML = `<div style="display: flex; align-items: center; gap: 0.75rem;">
      <i class="${fi.icon}" style="color: ${fi.color}; font-size: 1.3rem;"></i>
      <div style="flex: 1;"><div style="font-weight: 600;">${file.name}</div><div style="font-size: 0.75rem; color: #64748b;">${formatSize(file.size)}</div></div>
    </div>`;
    preview.style.display = 'block';
    
    if (!document.getElementById('uploadJudul').value) {
      document.getElementById('uploadJudul').value = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    }
  };
  reader.readAsDataURL(file);
}

async function uploadBankSoal() {
  const judul = document.getElementById('uploadJudul').value.trim();
  const kelasId = document.getElementById('uploadKelas').value;
  const kategori = document.getElementById('uploadKategori').value;
  const btn = document.getElementById('btnUploadSoal');
  
  if (!judul || !kelasId || !fileBase64) { showToast('Lengkapi data dan pilih file!', 'error'); return; }
  
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan ke DB...';
  
  try {
    const kelasSnap = await db.collection('kelas').doc(kelasId).get();
    const kelasData = kelasSnap.data();
    
    // Simpan langsung ke Firestore (termasuk Base64 file)
    await db.collection('bank_soal').add({
      judul: judul,
      kelas_id: kelasId,
      kelas_nama: kelasData.nama,
      mapel: kelasData.pengajar?.[currentUser.uid]?.mapel || kelasData.mapel || '',
      kategori: kategori,
      deskripsi: document.getElementById('uploadDeskripsi').value.trim(),
      file_name: fileMetadata.name,
      file_type: fileMetadata.type,
      file_size: fileMetadata.size,
      file_data: fileBase64, // 🔥 FILE DISIMPAN SEBAGAI TEKS BASE64 DI FIRESTORE
      created_by: currentUser.uid,
      guru_email: currentUser.email,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showToast('✅ Dokumen berhasil disimpan ke database!', 'success');
    closeModal('modalUploadSoal');
    await loadBankSoal();
  } catch (error) {
    console.error('Error upload:', error);
    showToast('❌ Gagal: ' + error.message, 'error');
  }
  btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> Simpan ke Database';
}

async function downloadBankSoal(id) {
  showToast('⬇️ Mengambil file dari database...', 'success');
  try {
    // Ambil khusus dokumen ini (termasuk file_data)
    const docSnap = await db.collection('bank_soal').doc(id).get();
    if (!docSnap.exists) return;
    const data = docSnap.data();
    
    // Konversi Base64 kembali menjadi Blob/File
    const base64Response = await fetch(data.file_data);
    const blob = await base64Response.blob();
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error download:', error);
    showToast('❌ Gagal mengunduh file', 'error');
  }
}

// ══════════════════════════════════════════════
// PREVIEW DOKUMEN (DOCX via mammoth.js, PDF, Gambar)
// ══════════════════════════════════════════════
async function previewBankSoal(id) {
  previewCurrentId = id;
  try {
    const docSnap = await db.collection('bank_soal').doc(id).get();
    if (!docSnap.exists) return;
    const data = docSnap.data();
    const ext = (data.file_name || '').split('.').pop().toLowerCase();

    document.getElementById('previewTitle').textContent = '👁️ Preview: ' + data.judul;
    const content = document.getElementById('previewContent');
    content.innerHTML = '<div style="text-align:center; padding:2rem;"><div class="spinner"></div> Menyiapkan preview...</div>';
    openModal('modalPreviewSoal');

    if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
      content.innerHTML = `<img src="${data.file_data}" style="max-width:100%; border-radius:8px;">`;

    } else if (ext === 'pdf') {
      const res = await fetch(data.file_data);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      content.innerHTML = `<iframe src="${url}" style="width:100%; height:65vh; border:none; border-radius:8px;"></iframe>`;

    } else if (ext === 'docx') {
      const res = await fetch(data.file_data);
      const arrayBuffer = await res.arrayBuffer();
      mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
        .then(result => {
          content.innerHTML = `
            <style>
              #previewContent table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
              #previewContent td, #previewContent th { border: 1px solid #cbd5e1; padding: 6px 10px; }
              #previewContent img { max-width: 100%; }
            </style>
            <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.7;">${result.value}</div>`;
        })
        .catch(err => {
          content.innerHTML = `<div style="text-align:center; padding:2rem; color:#ef4444;">Gagal membaca DOCX: ${err.message}</div>`;
        });

    } else if (ext === 'doc') {
      content.innerHTML = `<div style="text-align:center; padding:3rem; color: var(--text-secondary);">
        <i class="fas fa-file-word" style="font-size:3rem; color:#2563eb;"></i>
        <p style="margin-top:1rem; font-weight:600;">Format .doc (Word 97-2003) tidak dapat di-preview di browser.</p>
        <p style="font-size:0.85rem;">Silakan klik "Unduh File Ini" untuk membuka dengan Microsoft Word.</p>
      </div>`;

    } else {
      content.innerHTML = `<div style="text-align:center; padding:3rem; color: var(--text-secondary);">
        <i class="fas fa-file" style="font-size:3rem; color:#64748b;"></i>
        <p style="margin-top:1rem; font-weight:600;">Preview tidak tersedia untuk format .${ext}</p>
        <p style="font-size:0.85rem;">Silakan klik "Unduh File Ini" untuk membuka file.</p>
      </div>`;
    }
  } catch (error) {
    console.error('Error preview:', error);
    showToast('❌ Gagal memuat preview', 'error');
  }
}

function downloadFromPreview() {
  if (previewCurrentId) downloadBankSoal(previewCurrentId);
}

async function deleteBankSoal(id, judul) {
  if (!confirm(`Hapus "${judul}" dari database?`)) return;
  try {
    await db.collection('bank_soal').doc(id).delete();
    showToast('🗑️ Dokumen dihapus!', 'success');
    await loadBankSoal();
  } catch (error) { showToast('❌ Gagal hapus', 'error'); }
}