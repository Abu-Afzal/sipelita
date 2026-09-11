// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAlVg1QKRP-1sDJmlA-YFEfHLKqhT5OzBY",
  authDomain: "sipelita-guru.firebaseapp.com",
  projectId: "sipelita-guru",
  storageBucket: "sipelita-guru.firebasestorage.app",
  messagingSenderId: "595996765157",
  appId: "1:595996765157:web:88f7f03489e1d1248e9d0c"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let daftarSoal = [];

// Auth State
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    loadSoal();
  } else {
    window.location.href = 'home.html'; // Sesuaikan dengan halaman login Anda
  }
});

// Load Soal
async function loadSoal() {
  try {
    const query = db.collection('bank_soal').where('guru_uid', '==', currentUser.uid);
    const snapshot = await query.get();
    daftarSoal = [];
    snapshot.forEach(doc => {
      daftarSoal.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by created_at (client-side)
    daftarSoal.sort((a, b) => {
      const timeA = a.created_at?.toDate ? a.created_at.toDate().getTime() : 0;
      const timeB = b.created_at?.toDate ? b.created_at.toDate().getTime() : 0;
      return timeB - timeA;
    });
    
    renderSoal();
    updateStats();
    updateFilterMapel();
  } catch (error) {
    console.error('Error load soal:', error);
    alert('Gagal memuat soal: ' + error.message);
  }
}

// Render Daftar Soal
function renderSoal() {
  const container = document.getElementById('soalList');
  const filterMapel = document.getElementById('filterMapel').value;
  const filterKelas = document.getElementById('filterKelas').value;
  const filterTipe = document.getElementById('filterTipe').value;
  
  let filtered = daftarSoal.filter(s => {
    if (filterMapel && s.mata_pelajaran !== filterMapel) return false;
    if (filterKelas && s.kelas !== filterKelas) return false;
    if (filterTipe && s.tipe !== filterTipe) return false;
    return true;
  });
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-book"></i>
        <h3>Tidak ada soal yang sesuai filter</h3>
        <p>Coba ubah filter atau tambah soal baru</p>
      </div>`;
    return;
  }
  
  container.innerHTML = filtered.map(soal => {
    const badgeSulit = soal.tingkat_kesulitan === 'sulit' ? 'badge-sulit' : 
                       soal.tingkat_kesulitan === 'sedang' ? 'badge-sedang' : 'badge-mudah';
    const tipeLabel = soal.tipe === 'pilihan_ganda' ? 'PG' : 'Essay';
    
    return `
      <div class="soal-item">
        <div class="soal-header">
          <div class="badges">
            <span class="badge badge-mapel">${soal.mata_pelajaran}</span>
            <span class="badge badge-kelas">Kelas ${soal.kelas}</span>
            <span class="badge badge-tipe">${tipeLabel}</span>
            <span class="badge ${badgeSulit}">${soal.tingkat_kesulitan}</span>
            ${soal.sumber === 'import_word' ? '<span class="badge" style="background:#e0e7ff; color:#3730a3;">Import</span>' : ''}
          </div>
        </div>
        <div class="soal-text">${soal.pertanyaan.substring(0, 200)}${soal.pertanyaan.length > 200 ? '...' : ''}</div>
        <div class="soal-actions">
          <button class="btn btn-sm btn-secondary" onclick="previewSoal('${soal.id}')"><i class="fas fa-eye"></i> Preview</button>
          <button class="btn btn-sm btn-secondary" onclick="editSoal('${soal.id}')"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-sm btn-danger" onclick="hapusSoal('${soal.id}')"><i class="fas fa-trash"></i> Hapus</button>
        </div>
      </div>`;
  }).join('');
}

// Update Stats
function updateStats() {
  document.getElementById('totalSoal').textContent = daftarSoal.length;
  document.getElementById('totalPG').textContent = daftarSoal.filter(s => s.tipe === 'pilihan_ganda').length;
  document.getElementById('totalEssay').textContent = daftarSoal.filter(s => s.tipe === 'essay').length;
  const mapelUnik = [...new Set(daftarSoal.map(s => s.mata_pelajaran))];
  document.getElementById('totalMapel').textContent = mapelUnik.length;
}

// Update Filter Mapel
function updateFilterMapel() {
  const mapelUnik = [...new Set(daftarSoal.map(s => s.mata_pelajaran))].sort();
  const select = document.getElementById('filterMapel');
  const currentValue = select.value;
  select.innerHTML = '<option value="">Semua Mapel</option>' + 
    mapelUnik.map(m => `<option value="${m}" ${m === currentValue ? 'selected' : ''}>${m}</option>`).join('');
}

// Modal Functions
function openModalSoal() {
  document.getElementById('modalSoal').classList.add('active');
  document.getElementById('formSoal').reset();
  document.getElementById('soalId').value = '';
  document.getElementById('modalTitle').textContent = '✏️ Tambah Soal';
  document.getElementById('pilihanContainer').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeModalSoal() {
  document.getElementById('modalSoal').classList.remove('active');
  document.body.style.overflow = '';
}

// Toggle Pilihan (PG/Essay)
function togglePilihan() {
  const tipe = document.getElementById('tipeSoal').value;
  document.getElementById('pilihanContainer').style.display = tipe === 'pilihan_ganda' ? 'block' : 'none';
}

// Tambah Pilihan
function tambahPilihan() {
  const list = document.getElementById('pilihanList');
  const labels = ['E', 'F', 'G', 'H'];
  const count = list.children.length;
  if (count < 8) {
    const div = document.createElement('div');
    div.className = 'pilihan-item';
    div.innerHTML = `
      <input type="text" placeholder="${labels[count-4]}" disabled style="width: 50px;">
      <input type="text" class="pilihan-teks" placeholder="Tulis pilihan ${labels[count-4]}">
      <input type="checkbox" class="pilihan-benar" title="Jawaban benar">`;
    list.appendChild(div);
  }
}

// Submit Form
document.getElementById('formSoal').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const tipe = document.getElementById('tipeSoal').value;
  const soalData = {
    guru_uid: currentUser.uid,
    guru_nama: currentUser.email,
    mata_pelajaran: document.getElementById('mapel').value,
    kelas: document.getElementById('kelas').value,
    bab: document.getElementById('bab').value,
    tingkat_kesulitan: document.getElementById('kesulitan').value,
    pertanyaan: document.getElementById('pertanyaan').value,
    pembahasan: document.getElementById('pembahasan').value,
    tipe: tipe,
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  if (tipe === 'pilihan_ganda') {
    const pilihanElements = document.querySelectorAll('.pilihan-item');
    const pilihan = [];
    let jawabanBenar = '';
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    
    pilihanElements.forEach((el, idx) => {
      const teks = el.querySelector('.pilihan-teks').value;
      const benar = el.querySelector('.pilihan-benar').checked;
      if (teks) {
        pilihan.push({ label: labels[idx], teks: teks, benar: benar });
        if (benar) jawabanBenar = labels[idx];
      }
    });
    
    if (pilihan.length < 2) { alert('Minimal 2 pilihan jawaban!'); return; }
    if (!jawabanBenar) { alert('Pilih jawaban yang benar!'); return; }
    
    soalData.pilihan = pilihan;
    soalData.jawaban_benar = jawabanBenar;
  }
  
  try {
    const soalId = document.getElementById('soalId').value;
    if (soalId) {
      await db.collection('bank_soal').doc(soalId).update(soalData);
      alert('Soal berhasil diperbarui!');
    } else {
      soalData.created_at = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('bank_soal').add(soalData);
      alert('Soal berhasil ditambahkan!');
    }
    closeModalSoal();
    loadSoal();
  } catch (error) {
    console.error('Error save soal:', error);
    alert('Gagal menyimpan soal: ' + error.message);
  }
});

// Edit Soal
async function editSoal(id) {
  const soal = daftarSoal.find(s => s.id === id);
  if (!soal) return;
  
  document.getElementById('soalId').value = id;
  document.getElementById('tipeSoal').value = soal.tipe;
  document.getElementById('mapel').value = soal.mata_pelajaran;
  document.getElementById('kelas').value = soal.kelas;
  document.getElementById('bab').value = soal.bab || '';
  document.getElementById('kesulitan').value = soal.tingkat_kesulitan;
  document.getElementById('pertanyaan').value = soal.pertanyaan;
  document.getElementById('pembahasan').value = soal.pembahasan || '';
  
  if (soal.tipe === 'pilihan_ganda' && soal.pilihan) {
    const list = document.getElementById('pilihanList');
    list.innerHTML = '';
    soal.pilihan.forEach((p, idx) => {
      const div = document.createElement('div');
      div.className = 'pilihan-item';
      div.innerHTML = `
        <input type="text" placeholder="${p.label}" disabled style="width: 50px;">
        <input type="text" class="pilihan-teks" value="${p.teks}" placeholder="Tulis pilihan ${p.label}">
        <input type="checkbox" class="pilihan-benar" ${p.benar ? 'checked' : ''} title="Jawaban benar">`;
      list.appendChild(div);
    });
  }
  
  togglePilihan();
  document.getElementById('modalTitle').textContent = '✏️ Edit Soal';
  openModalSoal();
}

// Hapus Soal
async function hapusSoal(id) {
  if (!confirm('Yakin ingin menghapus soal ini?')) return;
  try {
    await db.collection('bank_soal').doc(id).delete();
    alert('Soal berhasil dihapus!');
    loadSoal();
  } catch (error) {
    alert('Gagal menghapus: ' + error.message);
  }
}

// Export Soal
function exportSoal() {
  if (daftarSoal.length === 0) { alert('Tidak ada soal untuk diexport!'); return; }
  
  let csv = 'No,Mapel,Kelas,Tipe,Pertanyaan,Jawaban\n';
  daftarSoal.forEach((s, idx) => {
    const jawaban = s.tipe === 'pilihan_ganda' ? s.jawaban_benar : 'Essay';
    csv += `${idx+1},"${s.mata_pelajaran}","${s.kelas}","${s.tipe}","${s.pertanyaan.replace(/"/g, '""')}","${jawaban}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bank_Soal_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

// ═══════════════════════════════════════════════════════════════════
// FITUR IMPORT SOAL DARI WORD (.docx)
// ═══════════════════════════════════════════════════════════════════

function openModalImport() {
  document.getElementById('modalImport').classList.add('active');
  document.getElementById('importProgress').style.display = 'none';
  document.getElementById('importFileWord').value = '';
  document.getElementById('importLog').innerHTML = '';
}

function closeModalImport() {
  document.getElementById('modalImport').classList.remove('active');
}

function importSoalDariWord(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.name.endsWith('.docx')) {
    alert('Harap pilih file Word (.docx)!');
    return;
  }
  
  openModalImport();
  document.getElementById('importFileWord').files = event.target.files;
}

async function prosesImportWord() {
  const fileInput = document.getElementById('importFileWord');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('Pilih file Word terlebih dahulu!');
    return;
  }
  
  const progressDiv = document.getElementById('importProgress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const importLog = document.getElementById('importLog');
  
  progressDiv.style.display = 'block';
  importLog.innerHTML = '<div style="color: var(--primary);">📖 Membaca file Word...</div>';
  
  try {
    // Gunakan convertToHtml agar format <b> atau <strong> tetap terbaca
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
    const htmlText = result.value;
    
    importLog.innerHTML += '<div>✅ File berhasil dibaca. Memproses soal...</div>';
    
    // Parse soal dari HTML
    const soalList = parseSoalDariHTML(htmlText);
    
    if (soalList.length === 0) {
      importLog.innerHTML += '<div style="color: var(--danger);">❌ Tidak ada soal yang ditemukan. Periksa format dokumen.</div>';
      return;
    }
    
    importLog.innerHTML += `<div style="color: var(--success);">✅ Ditemukan ${soalList.length} soal. Menyimpan ke database...</div>`;
    
    // Simpan ke database
    let berhasil = 0;
    let gagal = 0;
    const total = soalList.length;
    
    for (let i = 0; i < soalList.length; i++) {
      const soal = soalList[i];
      try {
        await db.collection('bank_soal').add({
          ...soal,
          guru_uid: currentUser.uid,
          guru_nama: currentUser.email,
          created_at: firebase.firestore.FieldValue.serverTimestamp(),
          updated_at: firebase.firestore.FieldValue.serverTimestamp(),
          sumber: 'import_word'
        });
        berhasil++;
        importLog.innerHTML += `<div style="color: var(--success);">✓ Soal #${i+1} berhasil disimpan</div>`;
      } catch (error) {
        gagal++;
        importLog.innerHTML += `<div style="color: var(--danger);">✗ Soal #${i+1} gagal: ${error.message}</div>`;
      }
      
      // Update progress bar
      const progress = ((i + 1) / total) * 100;
      progressBar.style.width = progress + '%';
      progressText.textContent = `${i+1}/${total}`;
    }
    
    importLog.innerHTML += `
      <div style="margin-top: 16px; padding: 12px; background: var(--success); color: white; border-radius: 8px; text-align: center; font-weight: 600;">
        🎉 Import Selesai!<br>
        Berhasil: ${berhasil} | Gagal: ${gagal}
      </div>
    `;
    
    // Reload soal setelah 2 detik
    setTimeout(() => {
      loadSoal();
      closeModalImport();
      alert(`Import berhasil! ${berhasil} soal ditambahkan.`);
    }, 2000);
    
  } catch (error) {
    console.error('Error import:', error);
    importLog.innerHTML += `<div style="color: var(--danger);">❌ Error: ${error.message}</div>`;
  }
}

function parseSoalDariHTML(htmlText) {
  const soalList = [];
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlText;
  
  // Ambil semua paragraf atau div yang berisi teks
  const elements = Array.from(tempDiv.querySelectorAll('p, div'));
  let currentSoal = null;
  
  elements.forEach(el => {
    const text = el.innerText.trim();
    if (!text) return;
    
    // 1. Deteksi awal soal baru (contoh: "1. ", "2) ")
    const matchNomor = text.match(/^(\d+)[\.)]\s+/);
    if (matchNomor) {
      if (currentSoal) {
        soalList.push(currentSoal);
      }
      currentSoal = {
        pertanyaan: text.substring(matchNomor[0].length).trim(),
        pilihan: [],
        jawabanBenar: '',
        tipe: 'essay'
      };
    } else if (currentSoal) {
      // 2. Deteksi pilihan jawaban (contoh: "A. ", "B) ")
      const matchPilihan = text.match(/^([A-Ea-e])[\.)]\s+(.+)/s);
      if (matchPilihan) {
        currentSoal.tipe = 'pilihan_ganda';
        const label = matchPilihan[1].toUpperCase();
        const teksPilihan = matchPilihan[2];
        
        // 3. Deteksi jawaban benar (apakah ada tag <b> atau <strong> di elemen HTML ini?)
        const isBold = el.innerHTML.includes('<b>') || el.innerHTML.includes('<strong>');
        
        currentSoal.pilihan.push({
          label: label,
          teks: teksPilihan,
          benar: isBold
        });
        
        if (isBold) {
          currentSoal.jawabanBenar = label;
        }
      } else {
        // Jika bukan pilihan, anggap sebagai lanjutan pertanyaan
        currentSoal.pertanyaan += ' ' + text;
      }
    }
  });
  
  // Push soal terakhir
  if (currentSoal) {
    soalList.push(currentSoal);
  }
  
  // Format ke struktur yang sesuai database
  return soalList.map(s => {
    // Bersihkan teks dari spasi atau newline berlebih
    const pertanyaanBersih = s.pertanyaan.replace(/\s+/g, ' ').trim();
    
    return {
      mata_pelajaran: document.getElementById('mapel')?.value || 'Umum',
      kelas: document.getElementById('kelas')?.value || 'X',
      bab: `Import ${new Date().toLocaleDateString('id-ID')}`,
      tingkat_kesulitan: 'sedang',
      pertanyaan: pertanyaanBersih,
      tipe: s.tipe,
      pilihan: s.pilihan,
      jawaban_benar: s.jawabanBenar,
      pembahasan: ''
    };
  }).filter(s => s.pertanyaan.length > 5); // Filter soal yang valid
}

// Filter Events
document.getElementById('filterMapel').addEventListener('change', renderSoal);
document.getElementById('filterKelas').addEventListener('change', renderSoal);
document.getElementById('filterTipe').addEventListener('change', renderSoal);

// Close modal on outside click
document.getElementById('modalSoal').addEventListener('click', (e) => {
  if (e.target.id === 'modalSoal') closeModalSoal();
});

// Preview Soal (coming soon)
function previewSoal(id) {
  alert('Fitur preview akan segera hadir!');
}