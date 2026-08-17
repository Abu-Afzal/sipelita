// ══════════════════════════════════════════════
// SIPENA: Presensi (Versi Netral & Anti-Rapuh)
// ══════════════════════════════════════════════

// 📌 1. FUNGSI PEMBANTU TANGGAL LOKAL
window.getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
};

window.attendanceData = window.attendanceData || {};
window.presensiDate = window.presensiDate || window.getLocalDate();

// 📌 2. RENDER TAB KELAS & PILIHAN TANGGAL
window.renderPresensi = () => {
  if (typeof allData === 'undefined' || !allData) return;

  const kelas = allData
    .filter(d => d.type === 'class' && d.user_name === currentUser)
    .sort((a, b) => (a.class_name || '').localeCompare(b.class_name || '', 'id-ID', { numeric: true, sensitivity: 'base' }));

  const tabs = document.getElementById('classTabs');
  const dateInput = document.getElementById('inputTanggalPresensi');

  if (!kelas.length) {
    if (tabs) tabs.innerHTML = '<div style="color:#ef4444;padding:10px;">⚠️ Buat kelas dulu di Kelola Kelas.</div>';
    const cont = document.getElementById('studentListContainer');
    if (cont) cont.innerHTML = '';
    return;
  }

  if (!currentClass || !kelas.find(k => k.class_name === currentClass)) currentClass = kelas[0].class_name;

  if (tabs) {
    const tabsHtml = kelas.map(k => {
      const activeClass = currentClass === k.class_name ? 'active' : '';
      return '<button class="tab ' + activeClass + '" data-kelas="' + k.class_name + '">' + k.class_name + '</button>';
    }).join('');
    tabs.innerHTML = tabsHtml;
    tabs.querySelectorAll('.tab').forEach(t => {
      t.onclick = () => { currentClass = t.dataset.kelas; window.renderPresensi(); };
    });
  }

  if (dateInput) {
    if (!dateInput.value) {
      dateInput.value = window.presensiDate;
      dateInput.max = window.getLocalDate();
    }
    dateInput.onchange = (e) => {
      window.presensiDate = e.target.value;
      window.loadPresensiDataForDate(window.presensiDate);
    };
  }

  window.loadPresensiDataForDate(window.presensiDate);
};

// 📌 3. MUAT DATA ABSENSI SESUAI TANGGAL
window.loadPresensiDataForDate = (targetDate) => {
  try {
    if (typeof allData === 'undefined' || !allData) return;

    window.attendanceData = {};

    const existingLog = allData.find(d =>
      d.type === 'attendance_log' &&
      d.class_name === currentClass &&
      d.date === targetDate &&
      d.user_name === currentUser
    );

    if (existingLog && existingLog.records) {
      Object.keys(existingLog.records).forEach(sid => {
        window.attendanceData[sid] = existingLog.records[sid].status;
      });
    }

    window.renderDaftarSiswa();
  } catch (err) {
    console.error("Error loadPresensiDataForDate:", err);
    window.renderDaftarSiswa();
  }
};

// 📌 4. RENDER DAFTAR SISWA (A-Z)
window.renderDaftarSiswa = () => {
  if (typeof allData === 'undefined' || !allData) return;

  const siswa = allData
    .filter(d => d.type === 'student' && d.class_name === currentClass && d.user_name === currentUser)
    .sort((a, b) => (a.student_name || '').localeCompare(b.student_name || '', 'id-ID', { sensitivity: 'base' }));

  const cont = document.getElementById('studentListContainer');
  if (!cont) return;

  if (!siswa.length) {
    cont.innerHTML = '<div class="empty"><div class="ei">👥</div><p>Belum ada siswa di kelas ini.</p></div>';
    return;
  }

  const statuses = ['HADIR', 'IZIN', 'SAKIT', 'ALPA', 'BOLOS'];

  cont.innerHTML = siswa.map((s, idx) => {
    const st = window.attendanceData[s.__key] || '';
    const foto = s.student_photo ? '<img src="' + s.student_photo + '" onerror="this.outerHTML=\'👤\'">' : '👤';

    const buttonsHtml = statuses.map(x => {
      const activeClass = st === x ? 'active' : '';
      return '<button class="status-btn ' + x.toLowerCase() + ' ' + activeClass + '" data-sid="' + s.__key + '" data-st="' + x + '">' + x.charAt(0) + '</button>';
    }).join('');

    return '<div class="student-card">' +
      '<div class="student-photo">' + foto + '</div>' +
      '<div style="flex:1;">' +
      '<div class="student-name">' + (idx + 1) + '. ' + s.student_name + '</div>' +
      '<div class="status-buttons">' + buttonsHtml + '</div>' +
      '</div>' +
      '</div>';
  }).join('');

  cont.querySelectorAll('.status-btn').forEach(btn => {
    btn.onclick = () => {
      window.attendanceData[btn.dataset.sid] = btn.dataset.st;
      btn.parentElement.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });
};

// 📌 5. TANDAI HADIR SEMUA
window.hadirSemua = () => {
  if (typeof allData === 'undefined' || !allData) return;
  allData.filter(d => d.type === 'student' && d.class_name === currentClass && d.user_name === currentUser).forEach(s => {
    window.attendanceData[s.__key] = 'HADIR';
  });
  window.renderDaftarSiswa();
  window.toast('Semua siswa ditandai Hadir.');
};

// 📌 6. SIMPAN ABSENSI KE FOLDER 'attendance_logs'
window.simpanAbsensi = async () => {
  if (typeof allData === 'undefined' || !allData) return;

  const targetDate = window.presensiDate || window.getLocalDate();

  const siswa = allData.filter(d => d.type === 'student' && d.class_name === currentClass && d.user_name === currentUser);
  if (!siswa.length) { window.toast('Tidak ada siswa!', 'err'); return; }

  const belum = siswa.filter(s => !window.attendanceData[s.__key]);
  if (belum.length && !confirm(belum.length + ' siswa belum diisi status → akan dianggap ALPA. Lanjutkan?')) return;

  const btn = document.getElementById('btnKirimAbsen');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  }

  const records = {};
  siswa.forEach(s => {
    records[s.__key] = {
      student_name: s.student_name,
      status: window.attendanceData[s.__key] || 'ALPA'
    };
  });

  const existing = allData.find(d =>
    d.type === 'attendance_log' &&
    d.class_name === currentClass &&
    d.date === targetDate &&
    d.user_name === currentUser
  );

  try {
    const payload = {
      type: 'attendance_log',
      class_name: currentClass,
      date: targetDate,
      user_name: currentUser,
      records: records,
      updated_at: new Date().toISOString()
    };

    const LOG_ROOT = ROOT.child('attendance_logs');

    if (existing) {
      await LOG_ROOT.child(existing.__key).update(payload);
    } else {
      await LOG_ROOT.push().set(Object.assign({}, payload, { created_at: new Date().toISOString() }));
    }

    window.attendanceData = {};
    window.toast('Absensi berhasil disimpan!');
  } catch (e) {
    window.toast('Gagal: ' + e.message, 'err');
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = '💾 Simpan Absensi';
  }
};