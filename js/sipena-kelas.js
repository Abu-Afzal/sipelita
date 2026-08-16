// ══════════════════════════════════════════════
// SIPENA: Kelola Kelas & Integrasi SICAN (UPDATED)
// ══════════════════════════════════════════════

window.renderKelolaKelas = () => {
  const kelas = allData.filter(d => d.type === 'class' && d.user_name === currentUser);
  const tbody = document.getElementById('classTableBody');
  if (!kelas.length) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty"><div class="ei">🏫</div><p>Belum ada kelas. Klik "+ Tambah Kelas Baru".</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = kelas.map(k => {
    const cnt = allData.filter(d => d.type === 'student' && d.class_name === k.class_name && d.user_name === currentUser).length;
    return `<tr>
      <td style="font-weight:700;">${k.class_name}<br><small style="color:#94a3b8;font-weight:400;">${new Date(k.created_at).toLocaleDateString('id-ID')}</small></td>
      <td><span class="badge badge-green">👥 ${cnt} Siswa</span></td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" data-action="kelola" data-class="${k.class_name}"> Kelola Siswa</button>
          <button class="btn btn-danger btn-sm" data-action="hapuskelas" data-key="${k.__key}" data-class="${k.class_name}">🗑 Hapus</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    if (btn.dataset.action === 'kelola') btn.onclick = () => window.bukaKelolaSwiswa(btn.dataset.class);
    if (btn.dataset.action === 'hapuskelas') btn.onclick = () => window.hapusKelas(btn.dataset.key, btn.dataset.class);
  });
};

window.simpanKelas = async () => {
  const nama = document.getElementById('inputNamaKelas').value.trim();
  if (!nama) { window.toast('Nama kelas tidak boleh kosong!', 'err'); return; }
  const duplikat = allData.some(d => d.type === 'class' && d.user_name === currentUser && d.class_name.toLowerCase() === nama.toLowerCase());
  if (duplikat) { window.toast('Nama kelas sudah ada!', 'err'); return; }

  const btn = document.getElementById('btnSimpanKelas');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  try {
    await ROOT.push().set({ type: 'class', class_name: nama, user_name: currentUser, created_at: window.nowISO() });
    window.closeModal('modalTambahKelas');
    window.toast(`Kelas "${nama}" berhasil ditambahkan!`);
  } catch (e) { window.toast('Gagal menyimpan: ' + e.message, 'err'); }
  btn.disabled = false; btn.textContent = 'Simpan';
};

window.hapusKelas = async (key, className) => {
  const cnt = allData.filter(d => d.type === 'student' && d.class_name === className && d.user_name === currentUser).length;
  if (!confirm(`Hapus kelas "${className}"${cnt > 0 ? ` dan ${cnt} siswanya` : ''}? Tindakan ini tidak bisa dibatalkan.`)) return;

  const batch = [];
  batch.push(ROOT.child(key).remove());
  allData.filter(d => (d.type === 'student' || d.type === 'attendance_log' || d.type === 'nilai_pengetahuan' || d.type === 'nilai_sikap' || d.type === 'nilai_kolom' || d.type === 'nilai_kolom_ket' || d.type === 'nilai_keterampilan') && d.class_name === className && d.user_name === currentUser)
    .forEach(d => batch.push(ROOT.child(d.__key).remove()));
  try {
    await Promise.all(batch);
    if (currentClass === className) currentClass = '';
    window.toast(`Kelas "${className}" dihapus!`);
  } catch (e) { window.toast('Gagal hapus: ' + e.message, 'err'); }
};

// ── KELOLA SISWA & INTEGRASI SICAN ──
window.bukaKelolaSwiswa = (className) => {
  currentManajeKelas = className;
  document.getElementById('titleKelolaSwiswa').textContent = `👥 Kelola Siswa — ${className}`;
  document.getElementById('inputNamaSiswa').value = '';
  document.getElementById('inputFotoSiswa').value = '';
  window.openModal('modalKelolaSwiswa');
  window.renderSiswaModal(className);
};

// Track siswa yang sudah ada di kelas (untuk mencegah duplikasi)
window.renderSiswaModal = async (className) => {
  const tbody = document.getElementById('siswaTableBody');
  tbody.innerHTML = '<tr><td colspan="3" class="text-center"><div class="spinner"></div> Memuat data...</td></tr>';

  try {
    // 1. Ambil siswa yang SUDAH ADA di kelas ini dari SIPENA (RTDB)
    const siswaDiKelas = allData.filter(d => 
      d.type === 'student' && 
      d.class_name === className && 
      d.user_name === currentUser
    );

    // Buat Set untuk tracking NIS dan nama yang sudah ada (case-insensitive)
    const nisSudahAda = new Set(siswaDiKelas.map(s => (s.nis || '').toLowerCase().trim()).filter(n => n));
    const namaSudahAda = new Set(siswaDiKelas.map(s => s.student_name.toLowerCase().trim()));

    // 2. Ambil dari SICAN (Firestore)
    const sicanSnap = await firestore.collection('sican_siswa').where('kelas', '==', className).get();
    const sicanSiswa = [];
    sicanSnap.forEach(doc => {
      const data = doc.data();
      // Filter: Hanya tampilkan yang BELUM ada di kelas
      const nisLower = (data.nis || '').toLowerCase().trim();
      const namaLower = data.nama.toLowerCase().trim();
      
      if (!nisSudahAda.has(nisLower) && !namaSudahAda.has(namaLower)) {
        sicanSiswa.push({ 
          id: doc.id, 
          ...data, 
          source: 'sican' 
        });
      }
    });

    // 3. Gabungkan dengan siswa manual yang sudah ada di kelas
    const combined = [
      ...sicanSiswa,
      ...siswaDiKelas.map(s => ({ ...s, source: 'sipena' }))
    ];

    if (!combined.length) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="empty"><div class="ei">👥</div><p>Belum ada siswa di kelas ini.</p><button class="btn btn-secondary btn-sm" onclick="window.resetSiswaDitambahkan()" style="margin-top:10px;">🔄 Refresh</button></div></td></tr>`;
      return;
    }

    // 4. Pisahkan: siswa SICAN (belum ditambahkan) dan siswa SIPENA (sudah di kelas)
    const siswaSican = combined.filter(s => s.source === 'sican');
    const siswaSipena = combined.filter(s => s.source === 'sipena');

    // 5. Render dengan informasi yang jelas
    let html = `
      <tr style="background:#f0f9ff;">
        <td colspan="3" style="padding:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="font-weight:600;color:#0369a1;">
              📊 Total di Kelas: ${siswaDiKelas.length} | Tersedia dari SICAN: ${siswaSican.length}
            </div>
            ${siswaSican.length > 0 ? `
              <button class="btn btn-success" onclick="window.tambahkanSemua()" style="padding:8px 16px;font-size:0.85rem;">
                 Tambahkan Semua (${siswaSican.length})
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;

    // Render siswa yang SUDAH ada di kelas (dengan tombol HAPUS)
    if (siswaSipena.length > 0) {
      html += `<tr style="background:#fef3c7;"><td colspan="3" style="padding:8px;font-weight:600;color:#92400e;"> Siswa di Kelas (${siswaSipena.length})</td></tr>`;
      siswaSipena.forEach((s, i) => {
        const foto = s.student_photo ? `<img src="${s.student_photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.outerHTML='👤'">` : '👤';
        html += `<tr id="row-${s.__key}">
          <td>${foto}</td>
          <td style="font-weight:600;">${i + 1}. ${s.student_name}</td>
          <td style="display:flex;gap:6px;">
  <button class="btn btn-warning btn-sm" onclick="window.bukaEditSiswa('${s.__key}', '${s.student_name.replace(/'/g, "\\'")}', '${s.student_photo || ''}')" style="flex:1;">✏️ Edit</button>
  <button class="btn btn-danger btn-sm" onclick="window.hapusSiswa('${s.__key}', '${s.student_name.replace(/'/g, "\\'")}')">🗑 Hapus</button>
</td>
        </tr>`;
      });
    }

    // Render siswa dari SICAN yang BELUM ditambahkan (dengan tombol TAMBAH)
    if (siswaSican.length > 0) {
      html += `<tr style="background:#dcfce7;"><td colspan="3" style="padding:8px;font-weight:600;color:#166534;"> Dari Master SICAN (${siswaSican.length})</td></tr>`;
      siswaSican.forEach((s, i) => {
        const foto = s.foto ? `<img src="${s.foto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.outerHTML=''">` : '👤';
        html += `<tr id="row-${s.id}">
          <td>${foto}</td>
          <td style="font-weight:600;">${siswaSipena.length + i + 1}. ${s.nama} <span class="badge badge-green" style="font-size:0.65rem;">SICAN</span></td>
          <td><button class="btn btn-success btn-sm" onclick="window.syncSicanToSipena('${s.id}', '${s.nama.replace(/'/g, "\\'")}', '${s.nis || ''}', '${s.foto || ''}')">+ Tambah ke SIPENA</button></td>
        </tr>`;
      });
    }

    tbody.innerHTML = html;

  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="3" style="color:red;text-align:center;">Gagal memuat data SICAN. Pastikan koneksi internet baik.<br><small>${e.message}</small></td></tr>`;
  }
};

// Fungsi untuk menambahkan semua siswa SICAN sekaligus
window.tambahkanSemua = async () => {
  const className = currentManajeKelas;
  if (!className) {
    window.toast('Kelas belum dipilih!', 'err');
    return;
  }

  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menambahkan...';

  try {
    // 1. Ambil semua siswa SICAN untuk kelas ini
    const sicanSnap = await firestore.collection('sican_siswa').where('kelas', '==', className).get();
    
    // 2. Ambil siswa yang sudah ada di SIPENA
    const siswaDiKelas = allData.filter(d => 
      d.type === 'student' && 
      d.class_name === className && 
      d.user_name === currentUser
    );
    
    const nisSudahAda = new Set(siswaDiKelas.map(s => (s.nis || '').toLowerCase().trim()).filter(n => n));
    const namaSudahAda = new Set(siswaDiKelas.map(s => s.student_name.toLowerCase().trim()));

    // 3. Filter yang belum ditambahkan
    const belumDitambahkan = [];
    sicanSnap.forEach(doc => {
      const s = { id: doc.id, ...doc.data() };
      const nisLower = (s.nis || '').toLowerCase().trim();
      const namaLower = s.nama.toLowerCase().trim();
      
      if (!nisSudahAda.has(nisLower) && !namaSudahAda.has(namaLower)) {
        belumDitambahkan.push(s);
      }
    });

    if (belumDitambahkan.length === 0) {
      window.toast('Tidak ada siswa baru untuk ditambahkan!', 'err');
      btn.disabled = false;
      btn.innerHTML = originalText;
      return;
    }

    // 4. Tambahkan semua ke SIPENA
    const batch = [];
    belumDitambahkan.forEach(s => {
      batch.push(ROOT.push().set({
        type: 'student',
        class_name: className,
        student_name: s.nama,
        nis: s.nis || '',
        student_photo: s.foto || '',
        user_name: currentUser,
        created_at: window.nowISO()
      }));
    });

    await Promise.all(batch);
    
    window.toast(`✅ Berhasil menambahkan ${belumDitambahkan.length} siswa!`);
    
    // 5. Re-render untuk update daftar
    await window.renderSiswaModal(className);
    
  } catch (e) {
    window.toast('Gagal menambahkan semua: ' + e.message, 'err');
  }
  
  btn.disabled = false;
  btn.innerHTML = originalText;
};

// Fungsi untuk reset tracking (refresh data)
window.resetSiswaDitambahkan = () => {
  window.renderSiswaModal(currentManajeKelas);
  window.toast('🔄 Daftar siswa di-refresh');
};

// Fungsi untuk menyalin siswa dari SICAN ke SIPENA
window.syncSicanToSipena = async (sicanId, nama, nis, foto) => {
  try {
    await ROOT.push().set({ 
      type: 'student', 
      class_name: currentManajeKelas, 
      student_name: nama, 
      nis: nis, 
      student_photo: foto || '', 
      user_name: currentUser, 
      created_at: window.nowISO() 
    });
    
    window.toast(`Siswa "${nama}" berhasil ditambahkan!`);
    
    // Re-render untuk menghilangkan dari daftar SICAN dan muncul di daftar kelas
    await window.renderSiswaModal(currentManajeKelas);
    
  } catch (e) { 
    window.toast('Gagal: ' + e.message, 'err'); 
  }
};

window.importDariSICAN = async (className) => {
  const btn = event.target;
  btn.disabled = true; btn.textContent = '⏳ Mengimpor...';
  try {
    const sicanSnap = await firestore.collection('sican_siswa').where('kelas', '==', className).get();
    
    // Ambil yang sudah ada
    const siswaDiKelas = allData.filter(d => 
      d.type === 'student' && 
      d.class_name === className && 
      d.user_name === currentUser
    );
    const nisSudahAda = new Set(siswaDiKelas.map(s => (s.nis || '').toLowerCase().trim()).filter(n => n));
    const namaSudahAda = new Set(siswaDiKelas.map(s => s.student_name.toLowerCase().trim()));
    
    const batch = [];
    let count = 0;
    sicanSnap.forEach(doc => {
      const d = doc.data();
      const nisLower = (d.nis || '').toLowerCase().trim();
      const namaLower = d.nama.toLowerCase().trim();
      
      // Hanya tambahkan yang belum ada
      if (!nisSudahAda.has(nisLower) && !namaSudahAda.has(namaLower)) {
        batch.push(ROOT.push().set({
          type: 'student', class_name: className,
          student_name: d.nama, nis: d.nis || '', student_photo: d.foto || '',
          user_name: currentUser, created_at: window.nowISO()
        }));
        count++;
      }
    });
    
    await Promise.all(batch);
    window.toast(`Berhasil mengimpor ${count} siswa dari SICAN!`);
    window.renderSiswaModal(className);
  } catch (e) {
    window.toast('Gagal import: ' + e.message, 'err');
  }
  btn.disabled = false; btn.textContent = '🔄 Import dari Master SICAN';
};

window.simpanSiswa = async () => {
  const nama = document.getElementById('inputNamaSiswa').value.trim();
  const foto = document.getElementById('inputFotoSiswa').value.trim();
  if (!nama) { window.toast('Nama siswa tidak boleh kosong!', 'err'); return; }
  if (!currentManajeKelas) { window.toast('Pilih kelas terlebih dahulu!', 'err'); return; }

  const btn = document.getElementById('btnSimpanSiswa');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    await ROOT.push().set({ 
      type: 'student', 
      class_name: currentManajeKelas, 
      student_name: nama, 
      student_photo: foto || '', 
      user_name: currentUser, 
      created_at: window.nowISO() 
    });
    document.getElementById('inputNamaSiswa').value = '';
    document.getElementById('inputFotoSiswa').value = '';
    window.toast(`Siswa "${nama}" ditambahkan!`);
    setTimeout(() => document.getElementById('inputNamaSiswa').focus(), 100);
    window.renderSiswaModal(currentManajeKelas);
  } catch (e) { window.toast('Gagal: ' + e.message, 'err'); }
  btn.disabled = false; btn.textContent = '+ Tambah Siswa';
};

window.hapusSiswa = async (key, nama) => {
  if (!confirm(`Hapus siswa "${nama}" dari kelas ini?`)) return;
  try {
    await ROOT.child(key).remove();
    window.toast(`Siswa "${nama}" dihapus dari kelas.`);
    window.renderSiswaModal(currentManajeKelas);
  } catch (e) { window.toast('Gagal: ' + e.message, 'err'); }
};

// Buka modal edit siswa
window.bukaEditSiswa = (key, nama, foto) => {
  document.getElementById('editSiswaKey').value = key;
  document.getElementById('editNamaSiswa').value = nama;
  document.getElementById('editFotoSiswa').value = foto || '';
  window.openModal('modalEditSiswa');
};

// Simpan perubahan edit siswa
window.simpanEditSiswa = async () => {
  const key = document.getElementById('editSiswaKey').value;
  const nama = document.getElementById('editNamaSiswa').value.trim();
  const foto = document.getElementById('editFotoSiswa').value.trim();
  
  if (!nama) {
    window.toast('Nama siswa tidak boleh kosong!', 'err');
    return;
  }
  
  try {
    await ROOT.child(key).update({
      student_name: nama,
      student_photo: foto || '',
      updated_at: window.nowISO()
    });
    
    window.closeModal('modalEditSiswa');
    window.toast('✅ Data siswa berhasil diperbarui!', 'success');
    window.renderSiswaModal(currentManajeKelas);
  } catch (e) {
    window.toast('❌ Gagal mengedit: ' + e.message, 'err');
  }
};

// Event listener untuk tombol batal dan simpan edit
document.addEventListener('DOMContentLoaded', () => {
  const btnBatalEdit = document.getElementById('btnBatalEdit');
  const btnSimpanEdit = document.getElementById('btnSimpanEdit');
  
  if (btnBatalEdit) {
    btnBatalEdit.onclick = () => window.closeModal('modalEditSiswa');
  }
  
  if (btnSimpanEdit) {
    btnSimpanEdit.onclick = window.simpanEditSiswa;
  }
});
