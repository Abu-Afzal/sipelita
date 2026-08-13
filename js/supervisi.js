// ══════════════════════════════════════════════
// FIREBASE CONFIG
// ══════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyB24GCKSTPGlN9HG9E6uhCECVa4ibCpKEA",
  authDomain: "sipelita-digital.firebaseapp.com",
  databaseURL: "https://sipelita-digital-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sipelita-digital",
  storageBucket: "sipelita-digital.firebasestorage.app",
  messagingSenderId: "787840817745",
  appId: "1:787840817745:web:e6b5237cfbb5e51be93670"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentSupervision = null;
let selectedScheduleId = null;
let currentInstrument = null;
let editingInstrumentId = null;
let componentCounter = 0;

// Folder variables
let editingFolderId = null;
let userFolders = [];
let currentOpenFolderId = null;

// ══════════════════════════════════════════════
// SESSION & DASHBOARD
// ══════════════════════════════════════════════
function showLoading() {
  document.getElementById('loadingPage').style.display = 'block';
  document.getElementById('accessDeniedPage').style.display = 'none';
  document.getElementById('dashboardPage').style.display = 'none';
}

function showAccessDenied(message) {
  document.getElementById('loadingPage').style.display = 'none';
  document.getElementById('accessDeniedPage').style.display = 'block';
  document.getElementById('dashboardPage').style.display = 'none';
  document.getElementById('accessDeniedMessage').innerHTML = message;
}

async function checkSipelitaSession() {
  try {
    console.log("🔍 Memulai verifikasi session...");
    let sipelitaUser = sessionStorage.getItem('sipelita_user') || localStorage.getItem('sipelita_user');
    
    if (!sipelitaUser) { 
      console.warn("⛔ Session tidak ditemukan");
      showAccessDenied(`<strong>⛔ Session SIPELITA tidak ditemukan!</strong><br><br>Anda belum login ke portal SIPELITA.`); 
      return false; 
    }
    
    let userData;
    try { 
      userData = JSON.parse(sipelitaUser); 
      console.log("✅ Session berhasil di-parse:", userData);
    } catch(e) { 
      console.error("⚠️ Gagal parse session:", e);
      showAccessDenied('<strong>⚠️ Session SIPELITA tidak valid!</strong>'); 
      return false; 
    }
    
    if (!userData.email || !userData.nama) { 
      console.error("️ Data user tidak lengkap:", userData);
      showAccessDenied('<strong>️ Data user tidak lengkap!</strong>'); 
      return false; 
    }
    
    try {
      console.log("🔄 Mengambil data user dari Firestore...");
      const userDoc = await db.collection('users').doc(userData.email).get();
      if (!userDoc.exists) { 
        console.warn("️ Akun tidak ditemukan di Firestore");
        showAccessDenied(`<strong>️ Akun tidak ditemukan!</strong><br>Email: ${userData.email}`); 
        return false; 
      }
      const firestoreData = userDoc.data();
      currentUser = { 
        uid: userData.uid || userDoc.id, 
        email: firestoreData.email || userData.email, 
        nama: firestoreData.nama || userData.nama, 
        role: firestoreData.role || userData.role || 'guru', 
        fitur: firestoreData.fitur || userData.fitur 
      };
      console.log("✅ Data user dari Firestore:", currentUser);
    } catch(e) { 
      console.error("❌ Gagal mengambil data dari Firestore (Fallback ke session):", e);
      currentUser = { 
        uid: userData.uid || userData.email, 
        email: userData.email, 
        nama: userData.nama, 
        role: userData.role || 'guru', 
        fitur: userData.fitur 
      }; 
    }
    
    let fiturList = [];
    if (Array.isArray(currentUser.fitur)) {
      fiturList = currentUser.fitur;
    } else if (typeof currentUser.fitur === 'string') {
      fiturList = currentUser.fitur.split(',').map(f => f.trim());
    }

    const hasSupervisiAccess = fiturList.includes('supervisi');
    const isAllowedByRole = ['admin', 'kepala', 'wakil'].includes(currentUser.role);

    console.log("🔑 Akses Supervisi:", hasSupervisiAccess, "| Role:", currentUser.role, "| Allowed by Role:", isAllowedByRole);

    if (!hasSupervisiAccess && !isAllowedByRole) {
      showAccessDenied(`<strong>⛔ Akun Anda tidak memiliki akses ke fitur Supervisi!</strong><br><br>Login sebagai: <strong>${currentUser.nama}</strong> (${currentUser.email})`);
      return false;
    }
    
    sessionStorage.setItem('sipelita_user', JSON.stringify(currentUser));
    localStorage.setItem('sipelita_user', JSON.stringify(currentUser));
    
    console.log("✅ Verifikasi berhasil! Mengalihkan ke dashboard...");
    return true;
    
  } catch (error) {
    console.error("💥 FATAL ERROR di checkSipelitaSession:", error);
    showAccessDenied(`<strong>❌ Terjadi kesalahan sistem!</strong><br><br>${error.message}<br><br>Silakan refresh halaman atau login ulang.`);
    return false;
  }
}

window.switchTab = function(tabId) {
  const parent = document.getElementById(tabId).closest('.card');
  parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(tabId).classList.add('active');
  if (tabId === 'tabJadwal') loadScheduleList();
  if (tabId === 'tabBuatJadwal') loadAvailableTeachers();
  if (tabId === 'tabSupervisi') { loadPendingSchedules(); loadInstruments(); }
  if (tabId === 'tabRiwayat') loadSupervisionList();
  if (tabId === 'tabJadwalSaya') loadMySchedule();
  if (tabId === 'tabUpload') loadFolders();
  if (tabId === 'tabHasil') loadMySupervisionList();
  if (tabId === 'tabKelolaInstrumen') loadInstrumentsList();
};

function showDashboard(){
  document.getElementById('loadingPage').style.display = 'none';
  document.getElementById('accessDeniedPage').style.display = 'none';
  document.getElementById('dashboardPage').style.display = 'block';
  document.getElementById('userNameDisplay').textContent = currentUser.nama;
  document.getElementById('userRoleDisplay').textContent = getRoleLabel(currentUser.role);
  if (currentUser.role === 'admin') { document.getElementById('adminBadge').style.display = 'block'; document.getElementById('tabInstruments').style.display = 'block'; }
  if (currentUser.role === 'kepala') { document.getElementById('supervisorTabs').style.display = 'block'; document.getElementById('teacherTabs').style.display = 'none'; loadScheduleList(); }
  else if (currentUser.role === 'wakil') { document.getElementById('supervisorTabs').style.display = 'block'; document.getElementById('teacherTabs').style.display = 'block'; loadScheduleList(); loadMySchedule(); loadFolders(); loadMySupervisionList(); }
  else { document.getElementById('supervisorTabs').style.display = 'none'; document.getElementById('teacherTabs').style.display = 'block'; loadMySchedule(); loadFolders(); loadMySupervisionList(); }
}

function getRoleLabel(role){ return {kepala:'👑 Kepala Madrasah', wakil:'⭐ Wakil Kepala Madrasah', guru:'👨‍🏫 Guru', admin:'👑 Administrator'}[role] || role; }

window.doLogout = function(){ 
  if(confirm('Apakah Anda yakin ingin keluar?')){ 
    sessionStorage.removeItem('sipelita_user'); 
    currentUser = null; 
    window.location.href = '../index.html'; 
  } 
};

// ══════════════════════════════════════════════
// JADWAL SUPERVISI
// ══════════════════════════════════════════════
async function loadAvailableTeachers() {
  const select = document.getElementById('scheduleTeacher');
  select.innerHTML = '<option value="">-- Memuat data... --</option>';
  try {
    let roleFilter = ['guru'];
    if (currentUser.role === 'kepala') roleFilter = ['guru', 'wakil'];
    const allUsersSnap = await db.collection('users').get();
    const allUsers = allUsersSnap.docs.map(d => ({id: d.id, ...d.data()}));
    const eligibleUsers = allUsers.filter(u => roleFilter.includes(u.role));
    const schedulesSnap = await db.collection('supervision_schedule').where('status', 'in', ['scheduled', 'in-progress']).get();
    const scheduledTeacherIds = schedulesSnap.docs.map(d => d.data().teacherId);
    const availableUsers = eligibleUsers.filter(u => !scheduledTeacherIds.includes(u.id));
    if (availableUsers.length === 0) { select.innerHTML = '<option value="">-- Tidak ada yang tersedia --</option>'; return; }
    select.innerHTML = '<option value="">-- Pilih --</option>';
    availableUsers.forEach(u => {
      const roleLabel = u.role === 'wakil' ? '⭐ Wakil Kepala' : '👨‍🏫 Guru';
      select.innerHTML += `<option value="${u.id}" data-nama="${u.nama}" data-email="${u.email}">${u.nama} (${roleLabel})</option>`;
    });
  } catch(e) { select.innerHTML = '<option value="">-- Error --</option>'; }
}

window.createSchedule = async function() {
  const teacherSelect = document.getElementById('scheduleTeacher');
  const teacherId = teacherSelect.value;
  const teacherName = teacherSelect.options[teacherSelect.selectedIndex]?.dataset.nama;
  const teacherEmail = teacherSelect.options[teacherSelect.selectedIndex]?.dataset.email;
  const scheduledDate = document.getElementById('scheduleDate').value;
  const notes = document.getElementById('scheduleNotes').value.trim();
  const alert = document.getElementById('alertSchedule');
  const btn = document.getElementById('btnCreateSchedule');
  alert.classList.remove('show');
  if (!teacherId || !scheduledDate) { alert.textContent = '❌ Pilih guru/wakil dan tanggal supervisi!'; alert.className = 'alert alert-error show'; return; }
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  try {
    const teacherDoc = await db.collection('users').doc(teacherEmail).get();
    const teacherRole = teacherDoc.exists ? teacherDoc.data().role : 'guru';
    await db.collection('supervision_schedule').add({ supervisorId: currentUser.uid, supervisorName: currentUser.nama, supervisorEmail: currentUser.email, supervisorRole: currentUser.role, teacherId: teacherId, teacherName: teacherName, teacherEmail: teacherEmail, teacherRole: teacherRole, scheduledDate: scheduledDate, notes: notes, status: 'scheduled', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    alert.textContent = `✅ Jadwal berhasil dibuat! ${teacherName} akan disupervisi pada ${formatDate(scheduledDate)}`;
    alert.className = 'alert alert-success show';
    teacherSelect.value = ''; document.getElementById('scheduleDate').value = ''; document.getElementById('scheduleNotes').value = '';
    loadAvailableTeachers();
  } catch(e) { alert.textContent = '❌ ' + e.message; alert.className = 'alert alert-error show'; }
  btn.disabled = false; btn.textContent = '💾 Simpan Jadwal';
};

async function loadScheduleList() {
  const container = document.getElementById('scheduleList');
  container.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner"></span> Memuat...</div>';
  try {
    const snap = await db.collection('supervision_schedule').where('supervisorEmail', '==', currentUser.email).get();
    if (snap.empty) { container.innerHTML = '<div class="empty-state"><div class="icon">📅</div><p>Belum ada jadwal supervisi</p></div>'; return; }
    const schedules = snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    container.innerHTML = schedules.map(s => {
      const statusBadge = {'scheduled': '<span class="badge badge-scheduled">📅 Dijadwalkan</span>', 'in-progress': '<span class="badge badge-progress">🔄 Berlangsung</span>', 'completed': '<span class="badge badge-done">✅ Selesai</span>'}[s.status] || s.status;
      const roleIcon = s.teacherRole === 'wakil' ? '⭐' : '👨‍🏫';
      return `<div class="schedule-card"><div class="schedule-info"><div class="schedule-title">${roleIcon} ${s.teacherName}</div><div class="schedule-detail">📅 ${formatDate(s.scheduledDate)} | 👤 Supervisor: ${s.supervisorName} | ${statusBadge}</div>${s.notes ? `<div class="schedule-detail">📝 ${s.notes}</div>` : ''}</div><div class="schedule-actions">${s.status !== 'completed' ? `<button class="btn btn-warning btn-sm" onclick="updateScheduleStatus('${s.id}','in-progress')">▶️ Mulai</button>` : ''}<button class="btn btn-danger btn-sm" onclick="deleteSchedule('${s.id}')">🗑️ Hapus</button></div></div>`;
    }).join('');
  } catch(e) { container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><p>Gagal memuat jadwal</p></div>'; }
}

async function loadPendingSchedules() {
  const select = document.getElementById('supervisionSchedule');
  select.innerHTML = '<option value="">-- Memuat... --</option>';
  try {
    const snap = await db.collection('supervision_schedule').where('supervisorEmail', '==', currentUser.email).where('status', 'in', ['scheduled', 'in-progress']).get();
    if (snap.empty) { select.innerHTML = '<option value="">-- Tidak ada jadwal aktif --</option>'; document.getElementById('scheduleDetailArea').style.display = 'none'; return; }
    const schedules = snap.docs.map(d => ({id: d.id, ...d.data()}));
    select.innerHTML = '<option value="">-- Pilih Jadwal --</option>';
    schedules.forEach(s => { select.innerHTML += `<option value="${s.id}" data-teacher="${s.teacherName}" data-email="${s.teacherEmail}" data-date="${s.scheduledDate}">${s.teacherName} - ${formatDate(s.scheduledDate)}</option>`; });
  } catch(e) { select.innerHTML = '<option value="">-- Error --</option>'; }
}

window.loadScheduleDetail = async function() {
  const select = document.getElementById('supervisionSchedule');
  const scheduleId = select.value;
  const detailArea = document.getElementById('scheduleDetailArea');
  if (!scheduleId) { detailArea.style.display = 'none'; return; }
  selectedScheduleId = scheduleId; detailArea.style.display = 'block';
  const teacherEmail = select.options[select.selectedIndex].dataset.email;
  const docContainer = document.getElementById('teacherDocuments');
  docContainer.innerHTML = '<div style="text-align:center;padding:10px;"><span class="spinner"></span> Memuat dokumen...</div>';
  try {
    const snap = await db.collection('supervision_documents').where('userEmail', '==', teacherEmail).get();
    if (snap.empty) { docContainer.innerHTML = '<div class="empty-state" style="padding:20px;"><div class="icon">📭</div><p>Belum ada dokumen yang diupload</p></div>'; return; }
    const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
    docContainer.innerHTML = docs.map(d => {
      const icon = d.type==='link' ? '🔗' : (d.fileExt==='pdf'?'📕':['doc','docx'].includes(d.fileExt)?'📘':['xls','xlsx'].includes(d.fileExt)?'📗':'📄');
      let btnLihat = d.type === 'link' ? `<a href="${d.link}" target="_blank" class="btn btn-warning btn-sm">👁️ Lihat</a>` : (d.fileExt === 'pdf' ? `<button class="btn btn-warning btn-sm" onclick="previewDoc('${d.id}')">👁️ Lihat</button>` : `<button class="btn btn-warning btn-sm" onclick="previewDocOffice('${d.id}','${d.fileExt}')">👁️ Lihat</button>`);
      let btnUnduh = d.type !== 'link' ? `<button class="btn btn-primary btn-sm" onclick="downloadDoc('${d.id}','${d.nama.replace(/'/g,"\\'")}','${d.fileExt}')">⬇️ Unduh</button>` : '';
      const roleBadge = d.userRole === 'wakil' ? '<span class="badge" style="background:#ede9fe;color:#5b21b6;margin-left:5px;">⭐ Wakamad</span>' : '';
      return `<div class="doc-item"><div class="doc-icon">${icon}</div><div class="doc-info"><div class="doc-name">${d.nama} ${roleBadge}</div><div class="doc-meta">${d.kategori} • ${new Date(d.createdAt).toLocaleDateString('id-ID')}</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;">${btnLihat}${btnUnduh}</div></div>`;
    }).join('');
  } catch(e) { docContainer.innerHTML = '<div class="empty-state" style="padding:20px;"><div class="icon">❌</div><p>Gagal memuat dokumen</p></div>'; }
};

window.updateScheduleStatus = async function(scheduleId, status) { 
  if (!confirm(`Ubah status jadwal menjadi "${status}"?`)) return; 
  try { 
    await db.collection('supervision_schedule').doc(scheduleId).update({ status: status, updatedAt: new Date().toISOString() }); 
    loadScheduleList(); 
  } catch(e) { alert('❌ ' + e.message); } 
};

window.deleteSchedule = async function(scheduleId) { 
  if (!confirm('Hapus jadwal ini?')) return; 
  try { 
    await db.collection('supervision_schedule').doc(scheduleId).delete(); 
    loadScheduleList(); 
  } catch(e) { alert('❌ ' + e.message); } 
};

// ══════════════════════════════════════════════
// INSTRUMEN
// ══════════════════════════════════════════════
window.openInstrumentModal = function() { 
  editingInstrumentId = null; 
  document.getElementById('instrumentModalTitle').textContent = '➕ Tambah Instrumen Baru'; 
  document.getElementById('instrumentName').value = ''; 
  document.getElementById('instrumentType').value = ''; 
  document.getElementById('instrumentDesc').value = ''; 
  document.getElementById('componentsContainer').innerHTML = ''; 
  componentCounter = 0; 
  openModal('instrumentModal'); 
};

window.addComponent = function() { 
  componentCounter++; 
  const container = document.getElementById('componentsContainer'); 
  const div = document.createElement('div'); 
  div.className = 'assessment-item'; 
  div.id = `component-${componentCounter}`; 
  div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><strong>Komponen #${componentCounter}</strong><button type="button" class="btn btn-danger btn-sm" onclick="removeComponent(${componentCounter})">🗑️ Hapus</button></div><div class="form-group"><label>Nama Komponen *</label><input type="text" class="component-name" placeholder="Nama komponen"></div><div class="form-row"><div class="form-group"><label>Level 1 (Kurang)</label><textarea class="component-level1"></textarea></div><div class="form-group"><label>Level 2 (Cukup)</label><textarea class="component-level2"></textarea></div></div><div class="form-row"><div class="form-group"><label>Level 3 (Baik)</label><textarea class="component-level3"></textarea></div><div class="form-group"><label>Level 4 (Sangat Baik)</label><textarea class="component-level4"></textarea></div></div>`; 
  container.appendChild(div); 
};

window.removeComponent = function(id) { 
  const el = document.getElementById(`component-${id}`); 
  if (el) el.remove(); 
};

window.saveInstrument = async function() {
  const name = document.getElementById('instrumentName').value.trim(); 
  const type = document.getElementById('instrumentType').value; 
  const desc = document.getElementById('instrumentDesc').value.trim();
  if (!name || !type) { alert('❌ Nama dan jenis instrumen wajib diisi!'); return; }
  const components = [];
  document.querySelectorAll('#componentsContainer .assessment-item').forEach((item, index) => { 
    const compName = item.querySelector('.component-name').value.trim(); 
    if (compName) { 
      components.push({ id: `comp_${index + 1}`, name: compName, level1: item.querySelector('.component-level1').value.trim(), level2: item.querySelector('.component-level2').value.trim(), level3: item.querySelector('.component-level3').value.trim(), level4: item.querySelector('.component-level4').value.trim() }); 
    } 
  });
  if (components.length === 0) { alert('❌ Minimal tambahkan 1 komponen!'); return; }
  const instrumentData = { name, type, description: desc, components, isActive: true, createdBy: currentUser.email, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  try { 
    if (editingInstrumentId) { 
      await db.collection('supervision_instruments').doc(editingInstrumentId).update(instrumentData); 
      alert('✅ Instrumen berhasil diupdate!'); 
    } else { 
      await db.collection('supervision_instruments').add(instrumentData); 
      alert('✅ Instrumen berhasil ditambahkan!'); 
    } 
    closeModal('instrumentModal'); 
    loadInstrumentsList(); 
  } catch(e) { alert('❌ ' + e.message); }
};

async function loadInstrumentsList() {
  const container = document.getElementById('instrumentsList'); 
  container.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner"></span> Memuat...</div>';
  try {
    const snap = await db.collection('supervision_instruments').orderBy('createdAt', 'desc').get();
    if (snap.empty) { container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>Belum ada instrumen.</p></div>'; return; }
    const typeLabels = {'administrasi': 'Administrasi', 'perencanaan': 'Perencanaan', 'pelaksanaan': 'Pelaksanaan', 'asesmen': 'Asesmen', 'bk': 'Bimbingan Konseling'};
    container.innerHTML = snap.docs.map(doc => { 
      const data = doc.data(); 
      return `<div class="instrument-card"><div class="instrument-header"><div><div class="instrument-name">${data.name}</div><div class="instrument-type">${typeLabels[data.type] || data.type} • ${data.components.length} Komponen</div></div><div style="display:flex;gap:8px;"><button class="btn btn-warning btn-sm" onclick="editInstrument('${doc.id}')">✏️ Edit</button><button class="btn btn-danger btn-sm" onclick="deleteInstrument('${doc.id}')">🗑️ Hapus</button></div></div>${data.description ? `<div style="margin-top:10px;color:#6b7280;font-size:0.9rem;">${data.description}</div>` : ''}</div>`; 
    }).join('');
  } catch(e) { container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><p>Gagal memuat instrumen</p></div>'; }
}

window.editInstrument = async function(docId) { 
  const snap = await db.collection('supervision_instruments').doc(docId).get(); 
  if (!snap.exists) return; 
  const data = snap.data(); 
  editingInstrumentId = docId; 
  document.getElementById('instrumentModalTitle').textContent = '✏️ Edit Instrumen'; 
  document.getElementById('instrumentName').value = data.name; 
  document.getElementById('instrumentType').value = data.type; 
  document.getElementById('instrumentDesc').value = data.description || ''; 
  document.getElementById('componentsContainer').innerHTML = ''; 
  componentCounter = 0; 
  data.components.forEach(comp => { 
    componentCounter++; 
    const container = document.getElementById('componentsContainer'); 
    const div = document.createElement('div'); 
    div.className = 'assessment-item'; 
    div.id = `component-${componentCounter}`; 
    div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><strong>Komponen #${componentCounter}</strong><button type="button" class="btn btn-danger btn-sm" onclick="removeComponent(${componentCounter})">🗑️ Hapus</button></div><div class="form-group"><label>Nama Komponen *</label><input type="text" class="component-name" value="${comp.name}"></div><div class="form-row"><div class="form-group"><label>Level 1</label><textarea class="component-level1">${comp.level1 || ''}</textarea></div><div class="form-group"><label>Level 2</label><textarea class="component-level2">${comp.level2 || ''}</textarea></div></div><div class="form-row"><div class="form-group"><label>Level 3</label><textarea class="component-level3">${comp.level3 || ''}</textarea></div><div class="form-group"><label>Level 4</label><textarea class="component-level4">${comp.level4 || ''}</textarea></div></div>`; 
    container.appendChild(div); 
  }); 
  openModal('instrumentModal'); 
};

window.deleteInstrument = async function(docId) { 
  if (!confirm('Hapus instrumen ini?')) return; 
  try { 
    await db.collection('supervision_instruments').doc(docId).delete(); 
    loadInstrumentsList(); 
  } catch(e) { alert('❌ ' + e.message); } 
};

window.importDefaultInstruments = async function() {
  if (!confirm('Import instrumen default dari Kurikulum Berbasis Cinta (KBC)? Ini akan menambahkan 5 instrumen standar dengan rubrik lengkap.')) return;
  const defaultInstruments = [
    { name: "Supervisi Administrasi Pembelajaran", type: "administrasi", description: "Instrumen supervisi untuk menilai kelengkapan administrasi pembelajaran guru", components: [ { name: "Kalender pendidikan dan analisisnya", level1: "Tidak tersedia", level2: "Tersedia namun belum lengkap", level3: "Tersedia dan lengkap", level4: "Tersedia, lengkap, dan berkualitas tinggi" }, { name: "Program Tahunan/ Program Semester", level1: "Tidak tersedia", level2: "Tersedia namun belum lengkap", level3: "Tersedia dan lengkap", level4: "Tersedia, lengkap, dan berkualitas tinggi" }, { name: "Capaian Pembelajaran (CP) - TP dan ATP", level1: "Tidak tersedia", level2: "Tersedia namun belum lengkap", level3: "Tersedia dan lengkap", level4: "Tersedia, lengkap, dan berkualitas tinggi" }, { name: "Modul Ajar/ Perencanaan Pembelajaran", level1: "Tidak tersedia", level2: "Tersedia namun belum lengkap", level3: "Tersedia dan lengkap", level4: "Tersedia, lengkap, dan berkualitas tinggi" }, { name: "Daftar Penilaian/ Asesmen", level1: "Tidak tersedia", level2: "Tersedia namun belum lengkap", level3: "Tersedia dan lengkap", level4: "Tersedia, lengkap, dan berkualitas tinggi" }, { name: "Data Analisis Hasil Penilaian/ Asesmen", level1: "Tidak tersedia", level2: "Tersedia namun belum lengkap", level3: "Tersedia dan lengkap", level4: "Tersedia, lengkap, dan berkualitas tinggi" }, { name: "Program Remedial dan Pengayaan", level1: "Tidak tersedia", level2: "Tersedia namun belum lengkap", level3: "Tersedia dan lengkap", level4: "Tersedia, lengkap, dan berkualitas tinggi" }, { name: "Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)", level1: "Tidak tersedia", level2: "Tersedia namun belum lengkap", level3: "Tersedia dan lengkap", level4: "Tersedia, lengkap, dan berkualitas tinggi" }, { name: "Absensi Siswa", level1: "Tidak tersedia", level2: "Tersedia namun belum lengkap", level3: "Tersedia dan lengkap", level4: "Tersedia, lengkap, dan berkualitas tinggi" }, { name: "Buku Teks Pelajaran", level1: "Tidak tersedia", level2: "Tersedia namun belum lengkap", level3: "Tersedia dan lengkap", level4: "Tersedia, lengkap, dan berkualitas tinggi" } ] },
    { name: "Supervisi Perencanaan Pembelajaran", type: "perencanaan", description: "Instrumen supervisi untuk menilai perencanaan pembelajaran berbasis Kurikulum Berbasis Cinta (KBC)", components: [ { name: "Identifikasi Murid: Sesuai kondisi objektif, menunjukkan kesiapan belajar, serta membangun empati dan kasih sayang terhadap keberagaman siswa berdasarkan nilai cinta kepada sesama.", level1: "Identifikasi murid tidak sesuai kondisi objektif, tidak menunjukkan kesiapan belajar, dan tidak ada elemen empati atau kasih sayang.", level2: "Identifikasi murid sebagian sesuai kondisi objektif, menunjukkan kesiapan belajar secara minimal, dengan sedikit elemen empati.", level3: "Identifikasi murid sesuai kondisi objektif, menunjukkan kesiapan belajar dengan baik, dan membangun empati serta kasih sayang secara moderat.", level4: "Identifikasi murid sangat sesuai kondisi objektif, menunjukkan kesiapan belajar yang optimal, dan secara kuat membangun empati serta kasih sayang terhadap keberagaman siswa berdasarkan nilai cinta." }, { name: "Dimensi Profil Lulusan yang dipilih sesuai dengan materi pelajaran, dengan penekanan pada pembentukan karakter humanis dan berbudaya melalui nilai-nilai cinta sebagai fondasi pendidikan.", level1: "Dimensi profil lulusan tidak sesuai dengan materi pelajaran, tanpa penekanan pada karakter humanis atau nilai cinta.", level2: "Dimensi profil lulusan sebagian sesuai dengan materi pelajaran, dengan penekanan minimal pada karakter humanis melalui nilai cinta.", level3: "Dimensi profil lulusan sesuai dengan materi pelajaran, dengan penekanan baik pada pembentukan karakter humanis dan berbudaya melalui nilai cinta.", level4: "Dimensi profil lulusan sangat sesuai dengan materi pelajaran, dengan penekanan kuat dan terintegrasi pada pembentukan karakter humanis dan berbudaya berbasis nilai cinta sebagai fondasi pendidikan." }, { name: "Mengintegrasikan Topik Panca Cinta dalam pembelajaran, yang selaras dengan ruh Kurikulum Berbasis Cinta untuk menumbuhkan kasih sayang dan empati di antara siswa.", level1: "Tidak ada integrasi Topik Panca Cinta dalam pembelajaran, tidak selaras dengan KBC.", level2: "Integrasi Topik Panca Cinta minimal, dengan sedikit keselarasan dengan ruh KBC untuk menumbuhkan kasih sayang.", level3: "Integrasi Topik Panca Cinta baik, selaras dengan ruh KBC, dan menumbuhkan kasih sayang serta empati secara efektif.", level4: "Integrasi Topik Panca Cinta sangat baik, sepenuhnya selaras dengan ruh KBC, dan secara mendalam menumbuhkan kasih sayang serta empati di antara siswa." }, { name: "Tujuan Pembelajaran dikembangkan dari analisis Capaian Pembelajaran, dengan mengintegrasikan nilai-nilai cinta kepada Tuhan, Rasul, dan sesama untuk menciptakan pendidikan bermakna dan humanis.", level1: "Tujuan pembelajaran tidak dikembangkan dari analisis Capaian Pembelajaran, tanpa integrasi nilai cinta.", level2: "Tujuan pembelajaran sebagian dikembangkan dari analisis Capaian Pembelajaran, dengan integrasi nilai cinta yang minimal.", level3: "Tujuan pembelajaran dikembangkan dengan baik dari analisis Capaian Pembelajaran, mengintegrasikan nilai cinta secara relevan untuk pendidikan bermakna.", level4: "Tujuan pembelajaran sangat baik dikembangkan dari analisis Capaian Pembelajaran, sepenuhnya mengintegrasikan nilai cinta kepada Tuhan, Rasul, dan sesama untuk pendidikan humanis yang mendalam." }, { name: "Tujuan Pembelajaran jelas, terukur, relevan, serta mengandung komponen minimal yakni kompetensi dan materi, yang dirancang untuk membangun generasi utuh berlandaskan empati dan kemanusiaan.", level1: "Tujuan pembelajaran tidak jelas, tidak terukur, tidak relevan, dan tidak mengandung komponen minimal, tanpa elemen empati.", level2: "Tujuan pembelajaran cukup jelas dan terukur, relevan secara minimal, dengan komponen dasar, dan sedikit elemen empati.", level3: "Tujuan pembelajaran jelas, terukur, relevan, mengandung komponen minimal, dan dirancang untuk membangun empati serta kemanusiaan dengan baik.", level4: "Tujuan pembelajaran sangat jelas, terukur, relevan, mengandung komponen minimal secara lengkap, dan secara kuat dirancang untuk membangun generasi utuh berbasis empati dan kemanusiaan." }, { name: "Praktek Pedagogis sesuai prinsip berkesadaran, bermakna, menggembirakan (mendukung pembelajaran siswa aktif), serta dijiwai oleh nilai-nilai cinta untuk menciptakan proses belajar yang penuh kasih sayang.", level1: "Praktek pedagogis tidak sesuai prinsip, tidak mendukung siswa aktif, dan tidak dijiwai nilai cinta.", level2: "Praktek pedagogis sebagian sesuai prinsip, mendukung siswa aktif secara minimal, dengan nilai cinta yang sedikit.", level3: "Praktek pedagogis sesuai prinsip berkesadaran, bermakna, menggembirakan, mendukung siswa aktif, dan dijiwai nilai cinta dengan baik.", level4: "Praktek pedagogis sangat sesuai prinsip, sepenuhnya mendukung pembelajaran aktif, dan dijiwai nilai cinta untuk proses belajar penuh kasih sayang yang optimal." }, { name: "Kemitraan Pembelajaran melibatkan stakeholder yang mendukung tercapainya tujuan pembelajaran, dengan kolaborasi berbasis empati dan cinta sesama untuk memperkuat pendidikan keagamaan yang humanis.", level1: "Tidak ada kemitraan dengan stakeholder, tanpa kolaborasi berbasis empati.", level2: "Kemitraan dengan stakeholder minimal, dengan kolaborasi empati yang sedikit untuk pendidikan humanis.", level3: "Kemitraan melibatkan stakeholder secara baik, dengan kolaborasi berbasis empati dan cinta sesama untuk memperkuat pendidikan keagamaan.", level4: "Kemitraan sangat baik melibatkan stakeholder, dengan kolaborasi kuat berbasis empati dan cinta sesama untuk pendidikan keagamaan humanis yang optimal." }, { name: "Lingkungan Pembelajaran mendukung suasana aman, inklusif, serta menumbuhkan nilai-nilai cinta dan kemanusiaan guna membentuk siswa yang berkarakter dan berperadaban.", level1: "Lingkungan pembelajaran tidak aman atau inklusif, tidak menumbuhkan nilai cinta.", level2: "Lingkungan pembelajaran cukup aman dan inklusif, dengan penumbuhan nilai cinta yang minimal.", level3: "Lingkungan pembelajaran mendukung suasana aman, inklusif, dan menumbuhkan nilai cinta serta kemanusiaan dengan baik.", level4: "Lingkungan pembelajaran sangat mendukung suasana aman, inklusif, dan secara kuat menumbuhkan nilai cinta serta kemanusiaan untuk siswa berkarakter berperadaban." }, { name: "Pemanfaatan teknologi/digital mendukung pembelajaran interaktif, yang diintegrasikan dengan nilai-nilai Kurikulum Berbasis Cinta untuk memfasilitasi ekspresi empati dan kasih sayang dalam era digital.", level1: "Tidak ada pemanfaatan teknologi, tanpa integrasi nilai KBC.", level2: "Pemanfaatan teknologi minimal untuk pembelajaran interaktif, dengan integrasi nilai KBC yang sedikit.", level3: "Pemanfaatan teknologi mendukung pembelajaran interaktif dengan baik, diintegrasikan dengan nilai KBC untuk ekspresi empati.", level4: "Pemanfaatan teknologi sangat baik mendukung interaktif, sepenuhnya diintegrasikan dengan nilai KBC untuk memfasilitasi empati dan kasih sayang di era digital." }, { name: "Langkah-langkah pembelajaran runtut, sesuai waktu, dan sesuai dengan tahapan pengalaman belajar (Memahami, Mengaplikasi, dan Merefleksi), serta diarahkan pada penguatan nilai cinta sebagai poros utama pendidikan.", level1: "Langkah pembelajaran tidak runtut, tidak sesuai waktu atau tahapan, tanpa penguatan nilai cinta.", level2: "Langkah pembelajaran cukup runtut, sesuai waktu minimal, dengan tahapan dasar dan sedikit penguatan nilai cinta.", level3: "Langkah pembelajaran runtut, sesuai waktu dan tahapan (Memahami, Mengaplikasi, Merefleksi), dengan penguatan nilai cinta yang baik.", level4: "Langkah pembelajaran sangat runtut, sesuai waktu optimal, sepenuhnya sesuai tahapan, dan diarahkan kuat pada penguatan nilai cinta sebagai poros pendidikan." } ] },
    { name: "Supervisi Pelaksanaan Pembelajaran", type: "pelaksanaan", description: "Instrumen supervisi untuk menilai pelaksanaan pembelajaran dengan nilai-nilai KBC", components: [ { name: "Guru menyampaikan tujuan pembelajaran dengan integrasi nilai cinta", level1: "Tanpa integrasi nilai cinta", level2: "Integrasi minimal", level3: "Integrasi baik", level4: "Integrasi optimal, fondasi humanis mendalam" }, { name: "Guru membuka pembelajaran dengan apersepsi dan motivasi dijiwai nilai cinta", level1: "Tanpa apersepsi/motivasi", level2: "Apersepsi minimal", level3: "Apersepsi baik, empati tumbuh", level4: "Apersepsi sangat baik, empati kuat sejak awal" }, { name: "Menyajikan materi runtut, jelas, menarik dengan nilai KBC", level1: "Tidak runtut, tanpa KBC", level2: "Cukup runtut, KBC minimal", level3: "Runtut, jelas, KBC baik", level4: "Sangat runtut, menarik, KBC optimal" }, { name: "Memfasilitasi pertanyaan dan penggalian pengetahuan awal dengan empati", level1: "Tidak ada fasilitasi", level2: "Fasilitasi minimal", level3: "Fasilitasi baik, empati terbangun", level4: "Fasilitasi sangat baik, empati kuat" }, { name: "Mengimplementasikan prinsip pembelajaran (Berkesadaran, Bermakna, Menggembirakan)", level1: "Prinsip tidak diimplementasi", level2: "Implementasi minimal", level3: "Implementasi baik", level4: "Implementasi optimal, selaras KBC" }, { name: "Menggunakan media pembelajaran relevan dan interaktif dengan nilai cinta", level1: "Media tidak relevan", level2: "Media cukup relevan", level3: "Media relevan, interaktif baik", level4: "Media sangat relevan, interaktif optimal" }, { name: "Memberikan pengalaman nyata (kontekstualisasi) dengan nilai KBC", level1: "Tidak ada pengalaman nyata", level2: "Pengalaman minimal", level3: "Pengalaman nyata baik", level4: "Pengalaman nyata sangat baik, karakter humanis" }, { name: "Melibatkan siswa aktif dalam kolaborasi berbasis empati", level1: "Tidak ada keterlibatan", level2: "Keterlibatan minimal", level3: "Keterlibatan aktif baik", level4: "Keterlibatan sangat aktif, empati kuat" }, { name: "Mengarahkan berpikir kritis dan kreatif dijiwai nilai cinta", level1: "Tidak ada pengarahan", level2: "Pengarahan minimal", level3: "Pengarahan baik, nilai cinta", level4: "Pengarahan sangat baik, generasi berkarakter" }, { name: "Mengimplementasikan prinsip pembelajaran dalam aplikasi dengan KBC", level1: "Prinsip tidak diimplementasi", level2: "Implementasi minimal", level3: "Implementasi baik, KBC", level4: "Implementasi optimal, kasih sayang mendalam" }, { name: "Mengajak murid merefleksikan proses dan hasil belajar dengan nilai cinta", level1: "Tidak ada refleksi", level2: "Refleksi minimal", level3: "Refleksi baik, nilai cinta", level4: "Refleksi sangat baik, humanis optimal" }, { name: "Memberikan umpan balik berbasis empati sesuai KBC", level1: "Umpan balik tidak diberikan", level2: "Umpan balik minimal", level3: "Umpan balik baik, empati", level4: "Umpan balik sangat baik, sesuai KBC" }, { name: "Mengintegrasikan topik Panca Cinta dalam refleksi pembelajaran", level1: "Tidak ada integrasi", level2: "Integrasi minimal", level3: "Integrasi baik", level4: "Integrasi sangat baik, holistik" }, { name: "Mengimplementasikan prinsip pembelajaran dalam refleksi untuk penguatan nilai cinta", level1: "Prinsip tidak diimplementasi", level2: "Implementasi minimal", level3: "Implementasi baik", level4: "Implementasi optimal, poros pendidikan" } ] },
    { name: "Supervisi Asesmen Pembelajaran", type: "asesmen", description: "Instrumen supervisi untuk menilai asesmen pembelajaran berbasis KBC", components: [ { name: "Instrumen penilaian sesuai tujuan pembelajaran dengan integrasi nilai cinta", level1: "Tidak selaras, tanpa nilai cinta", level2: "Selaras, integrasi umum", level3: "Selaras, nilai cinta jelas", level4: "Sangat selaras, humanis bermakna" }, { name: "Penilaian mencakup proses dan hasil belajar dijiwai KBC", level1: "Hanya hasil, tanpa empati", level2: "Proses & hasil, empati minimal", level3: "Proses & hasil, empati tampak", level4: "Komprehensif, KBC konsisten" }, { name: "Penilaian berorientasi Profil Lulusan dan Panca Cinta", level1: "Tidak mengacu", level2: "Mulai mengacu, belum utuh", level3: "Berorientasi jelas", level4: "Sangat selaras, ruh humanis" }, { name: "Menggunakan teknik beragam (tes, non-tes, observasi, portofolio) berbasis empati", level1: "Satu teknik, tanpa empati", level2: "Lebih dari satu, belum empati", level3: "Beragam, mulai empati", level4: "Beragam, inklusif sesuai KBC" }, { name: "Memberikan umpan balik membangun penuh kasih sayang", level1: "Minimal, menilai kesalahan", level2: "Diberikan, belum konsisten", level3: "Membangun, bahasa empatik", level4: "Sangat membangun, holistik" }, { name: "Memanfaatkan hasil asesmen untuk perbaikan pembelajaran", level1: "Tidak dimanfaatkan", level2: "Terbatas untuk teknis", level3: "Untuk perbaikan & penguatan nilai", level4: "Sistematis, berkelanjutan, humanis" }, { name: "Penilaian mendukung suasana aman dan inklusif", level1: "Tidak aman/inklusif", level2: "Mulai aman, belum konsisten", level3: "Aman, inklusif, KBC", level4: "Sadar menumbuhkan karakter utuh" }, { name: "Mengintegrasikan refleksi diri siswa dalam penilaian berbasis spiritual", level1: "Tidak ada refleksi", level2: "Ada, belum spiritual", level3: "Terintegrasi, nilai cinta", level4: "Kuat, mendalam, spiritual, bermakna" } ] },
    { name: "Supervisi Guru Bimbingan dan Konseling", type: "bk", description: "Instrumen supervisi untuk menilai layanan BK berbasis deep learning dan KBC", components: [ { name: "Merencanakan layanan berbasis deep learning (bermakna, mendalam, menyenangkan)", level1: "Tidak berbasis deep learning", level2: "Sebagian berbasis", level3: "Berbasis baik", level4: "Sepenuhnya berbasis optimal" }, { name: "Merancang program BK dengan prinsip KBC (kasih sayang, humanis, menghargai martabat)", level1: "Tanpa prinsip KBC", level2: "Prinsip minimal", level3: "Prinsip baik", level4: "Prinsip sangat baik, martabat dihargai" }, { name: "Melakukan asesmen kebutuhan belajar dengan pendekatan humanis", level1: "Tanpa pendekatan humanis", level2: "Humanis minimal", level3: "Humanis baik, empati", level4: "Humanis sangat baik, penuh empati" }, { name: "Kolaborasi dengan guru & orang tua untuk memetakan potensi", level1: "Tidak ada kolaborasi", level2: "Kolaborasi minimal", level3: "Kolaborasi baik", level4: "Kolaborasi sangat baik, komprehensif" }, { name: "Membantu siswa memahami emosi & membangun kepercayaan diri", level1: "Tidak membantu", level2: "Membantu minimal", level3: "Membantu baik", level4: "Membantu sangat baik, percaya diri kuat" }, { name: "Mengembangkan rasa cinta diri (self-love) sesuai KBC", level1: "Tidak ada pengembangan", level2: "Pengembangan minimal", level3: "Pengembangan baik", level4: "Pengembangan sangat baik, self-love kuat" }, { name: "Menstimulasi siswa berpikir kritis & kreatif melalui pemecahan masalah", level1: "Tidak menstimulasi", level2: "Stimulasi minimal", level3: "Stimulasi baik", level4: "Stimulasi sangat baik, kritis kreatif" }, { name: "Menumbuhkan rasa cinta belajar & pengetahuan", level1: "Tidak menumbuhkan", level2: "Menumbuhkan minimal", level3: "Menumbuhkan baik", level4: "Menumbuhkan sangat baik, cinta pengetahuan" }, { name: "Menyediakan ruang konseling yang mendukung rasa aman", level1: "Tidak aman", level2: "Cukup aman", level3: "Aman, nyaman", level4: "Sangat aman, penuh cinta" }, { name: "Membangun iklim penuh cinta, saling menghargai, dan empati", level1: "Tidak ada iklim positif", level2: "Iklim minimal", level3: "Iklim baik, empati", level4: "Iklim sangat baik, cinta & hormat" }, { name: "Kolaborasi dengan guru untuk mengatasi hambatan belajar", level1: "Tidak ada kolaborasi", level2: "Kolaborasi minimal", level3: "Kolaborasi baik", level4: "Kolaborasi sangat baik, holistik" }, { name: "Melibatkan orang tua dengan penuh penghargaan & komunikasi cinta kasih", level1: "Tidak melibatkan", level2: "Melibatkan minimal", level3: "Melibatkan baik", level4: "Melibatkan sangat baik, cinta kasih" }, { name: "Mengevaluasi layanan BK berbasis deep learning & KBC", level1: "Tidak mengevaluasi", level2: "Evaluasi minimal", level3: "Evaluasi baik", level4: "Evaluasi sangat baik, berbasis" }, { name: "Menyusun tindak lanjut untuk peningkatan layanan penuh cinta kasih", level1: "Tidak ada tindak lanjut", level2: "Tindak lanjut minimal", level3: "Tindak lanjut baik", level4: "Tindak lanjut sangat baik, cinta kasih" } ] }
  ];
  try { 
    for (const instrument of defaultInstruments) { 
      await db.collection('supervision_instruments').add({ ...instrument, isActive: true, createdBy: 'system', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); 
    } 
    alert('✅ 5 instrumen default KBC berhasil diimport!'); 
    loadInstrumentsList(); 
  } catch(e) { alert('❌ Gagal import: ' + e.message); }
};

async function loadInstruments() { 
  const select = document.getElementById('instrumentSelect'); 
  select.innerHTML = '<option value="">-- Memuat... --</option>'; 
  try { 
    const snap = await db.collection('supervision_instruments').where('isActive', '==', true).get(); 
    if (snap.empty) { select.innerHTML = '<option value="">-- Belum ada instrumen tersedia --</option>'; return; } 
    const instruments = snap.docs.map(d => ({id: d.id, ...d.data()})); 
    select.innerHTML = '<option value="">-- Pilih Instrumen --</option>'; 
    instruments.forEach(inst => { select.innerHTML += `<option value="${inst.id}" data-name="${inst.name}" data-type="${inst.type}">${inst.name}</option>`; }); 
  } catch(e) { select.innerHTML = '<option value="">-- Error --</option>'; } 
}

window.loadInstrumentForm = function() {
  const select = document.getElementById('instrumentSelect'); 
  const instrumentId = select.value; 
  const formArea = document.getElementById('assessmentFormArea');
  if (!instrumentId) { formArea.style.display = 'none'; currentInstrument = null; return; }
  const instrumentData = select.options[select.selectedIndex]; 
  currentInstrument = { id: instrumentId, name: instrumentData.dataset.name, type: instrumentData.dataset.type };
  formArea.style.display = 'block'; 
  formArea.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner"></span> Memuat form penilaian...</div>';
  db.collection('supervision_instruments').doc(instrumentId).get().then(doc => {
    if (!doc.exists) { formArea.innerHTML = '<div class="alert alert-error">❌ Instrumen tidak ditemukan</div>'; return; }
    const data = doc.data(); 
    currentInstrument = { ...currentInstrument, ...data };
    let html = `<div class="card" style="background:#f9fafb;margin-bottom:20px;"><h3 style="color:#1e40af;margin-bottom:15px;">📋 ${data.name}</h3><div class="form-row"><div class="form-group"><label>Nama Madrasah</label><input type="text" id="schoolName" value="MAN Bantaeng"></div><div class="form-group"><label>Mata Pelajaran</label><input type="text" id="subject" placeholder="Contoh: Matematika"></div></div><div class="form-row"><div class="form-group"><label>Kelas/Semester</label><input type="text" id="classSemester" placeholder="Contoh: VII/1"></div><div class="form-group"><label>Jumlah Jam Tatap Muka</label><input type="number" id="meetingHours" placeholder="Contoh: 4"></div></div></div><div class="table-wrap"><table style="border-collapse:collapse;width:100%;"><thead><tr style="background:#4CAF50;color:white;"><th style="border:1px solid #ddd;padding:10px;text-align:center;width:5%;">No</th><th style="border:1px solid #ddd;padding:10px;text-align:left;width:55%;">Komponen</th><th colspan="4" style="border:1px solid #ddd;padding:10px;text-align:center;background:#81C784;">Skor Nilai</th></tr><tr style="background:#81C784;"><th style="border:1px solid #ddd;"></th><th style="border:1px solid #ddd;"></th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:10%;">1</th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:10%;">2</th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:10%;">3</th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:10%;">4</th></tr></thead><tbody>`;
    data.components.forEach((comp, index) => { 
      html += `<tr style="background:${index % 2 === 0 ? '#E8F5E9' : 'white'};"><td style="border:1px solid #ddd;padding:8px;text-align:center;">${index + 1}</td><td style="border:1px solid #ddd;padding:8px;">${comp.name}</td><td style="border:1px solid #ddd;padding:8px;text-align:center;"><input type="checkbox" name="score_row_${index}" data-row="${index}" value="1" onchange="handleCheckbox(${index}, 1)"></td><td style="border:1px solid #ddd;padding:8px;text-align:center;"><input type="checkbox" name="score_row_${index}" data-row="${index}" value="2" onchange="handleCheckbox(${index}, 2)"></td><td style="border:1px solid #ddd;padding:8px;text-align:center;"><input type="checkbox" name="score_row_${index}" data-row="${index}" value="3" onchange="handleCheckbox(${index}, 3)"></td><td style="border:1px solid #ddd;padding:8px;text-align:center;"><input type="checkbox" name="score_row_${index}" data-row="${index}" value="4" onchange="handleCheckbox(${index}, 4)"></td></tr>`; 
    });
    html += `</tbody><tfoot><tr style="background:#C8E6C9;font-weight:bold;"><td colspan="2" style="border:1px solid #ddd;padding:10px;text-align:right;">Jumlah</td><td style="border:1px solid #ddd;padding:10px;text-align:center;" id="count_1">0</td><td style="border:1px solid #ddd;padding:10px;text-align:center;" id="count_2">0</td><td style="border:1px solid #ddd;padding:10px;text-align:center;" id="count_3">0</td><td style="border:1px solid #ddd;padding:10px;text-align:center;" id="count_4">0</td></tr><tr style="background:#A5D6A7;font-weight:bold;"><td colspan="2" style="border:1px solid #ddd;padding:10px;text-align:right;">Skor Total</td><td colspan="4" style="border:1px solid #ddd;padding:10px;text-align:center;font-size:1.1rem;" id="totalScore">0</td></tr><tr style="background:#81C784;font-weight:bold;"><td colspan="2" style="border:1px solid #ddd;padding:10px;text-align:right;">Persentase Capaian</td><td colspan="4" style="border:1px solid #ddd;padding:10px;text-align:center;font-size:1.1rem;" id="percentage">0%</td></tr><tr style="background:#4CAF50;color:white;font-weight:bold;"><td colspan="2" style="border:1px solid #ddd;padding:10px;text-align:right;">Predikat</td><td colspan="4" style="border:1px solid #ddd;padding:10px;text-align:center;font-size:1.1rem;" id="predicate">-</td></tr></tfoot></table></div><div style="margin-top:15px;background:#FFF3E0;padding:12px;border-radius:8px;border-left:4px solid #FF9800;"><strong>Keterangan:</strong><br>• 91% - 100% = Sangat Baik<br>• 81% - 90% = Baik<br>• 71% - 80% = Cukup<br>• < 70% = Kurang</div>`;
    formArea.innerHTML = html;
  }).catch(e => { formArea.innerHTML = '<div class="alert alert-error">❌ Gagal memuat form: ' + e.message + '</div>'; });
};

window.handleCheckbox = function(rowIndex, value) {
  const rowCheckboxes = document.querySelectorAll(`input[data-row="${rowIndex}"]`);
  rowCheckboxes.forEach(cb => { if (parseInt(cb.value) !== value) cb.checked = false; });
  calculateScores();
};

function calculateScores() {
  const instrument = currentInstrument; 
  if (!instrument) return;
  let count1 = 0, count2 = 0, count3 = 0, count4 = 0, totalScore = 0, scores = {};
  instrument.components.forEach((comp, index) => { 
    const selected = document.querySelector(`input[data-row="${index}"]:checked`); 
    if (selected) { 
      const value = parseInt(selected.value); 
      scores[comp.id] = value; 
      totalScore += value; 
      if (value === 1) count1++; 
      else if (value === 2) count2++; 
      else if (value === 3) count3++; 
      else if (value === 4) count4++; 
    } 
  });
  currentInstrument._scores = scores;
  const count1El = document.getElementById('count_1'), count2El = document.getElementById('count_2'), count3El = document.getElementById('count_3'), count4El = document.getElementById('count_4'), totalScoreEl = document.getElementById('totalScore'), percentageEl = document.getElementById('percentage'), predicateEl = document.getElementById('predicate');
  if (count1El) count1El.textContent = count1; 
  if (count2El) count2El.textContent = count2; 
  if (count3El) count3El.textContent = count3; 
  if (count4El) count4El.textContent = count4; 
  if (totalScoreEl) totalScoreEl.textContent = totalScore;
  const maxScore = instrument.components.length * 4; 
  const percentage = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(0) : 0;
  if (percentageEl) percentageEl.textContent = percentage + '%';
  let predicate = '-'; 
  if (percentage >= 91) predicate = 'Sangat Baik'; 
  else if (percentage >= 81) predicate = 'Baik'; 
  else if (percentage >= 71) predicate = 'Cukup'; 
  else if (percentage > 0) predicate = 'Kurang';
  if (predicateEl) predicateEl.textContent = predicate;
}

window.saveSupervision = async function() {
  if (!selectedScheduleId || !currentInstrument) { alert('❌ Pilih jadwal dan instrumen penilaian!'); return; }
  const notes = document.getElementById('supervisionNotes').value.trim(); 
  const actionPlan = document.getElementById('actionPlan').value.trim(); 
  const alert = document.getElementById('alertSup'); 
  const btn = document.getElementById('btnSaveSup');
  alert.classList.remove('show');
  const scores = {}; 
  let totalScore = 0; 
  let maxScore = currentInstrument.components.length * 4;
  currentInstrument.components.forEach((comp, index) => { 
    const selected = document.querySelector(`input[data-row="${index}"]:checked`); 
    if (!selected) { 
      alert.textContent = `❌ Lengkapi penilaian untuk komponen: ${comp.name}`; 
      alert.className = 'alert alert-error show'; 
      return; 
    } 
    scores[`comp_${index}`] = parseInt(selected.value); 
    totalScore += parseInt(selected.value); 
  });
  const percentage = ((totalScore / maxScore) * 100).toFixed(0); 
  let predicate = '-'; 
  if (percentage >= 91) predicate = 'Sangat Baik'; 
  else if (percentage >= 81) predicate = 'Baik'; 
  else if (percentage >= 71) predicate = 'Cukup'; 
  else predicate = 'Kurang';
  const schoolName = document.getElementById('schoolName').value.trim(); 
  const subject = document.getElementById('subject').value.trim(); 
  const classSemester = document.getElementById('classSemester').value.trim(); 
  const meetingHours = document.getElementById('meetingHours').value.trim();
  btn.disabled = true; 
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  try {
    const select = document.getElementById('supervisionSchedule'); 
    const superviseeName = select.options[select.selectedIndex].dataset.teacher; 
    const superviseeEmail = select.options[select.selectedIndex].dataset.email;
    await db.collection('supervisions').add({ 
      scheduleId: selectedScheduleId, 
      instrumentId: currentInstrument.id, 
      instrumentName: currentInstrument.name, 
      instrumentType: currentInstrument.type, 
      supervisorId: currentUser.uid, 
      supervisorEmail: currentUser.email, 
      supervisorName: currentUser.nama, 
      supervisorRole: currentUser.role, 
      superviseeId: superviseeEmail, 
      superviseeEmail: superviseeEmail, 
      superviseeName: superviseeName, 
      schoolName: schoolName, 
      subject: subject, 
      classSemester: classSemester, 
      meetingHours: meetingHours, 
      scores: scores, 
      totalScore: totalScore, 
      maxScore: maxScore, 
      percentage: percentage, 
      predicate: predicate, 
      notes: notes, 
      actionPlan: actionPlan, 
      status: 'completed', 
      createdAt: new Date().toISOString() 
    });
    await db.collection('supervision_schedule').doc(selectedScheduleId).update({ status: 'completed', updatedAt: new Date().toISOString() });
    alert.textContent = '✅ Supervisi berhasil disimpan!'; 
    alert.className = 'alert alert-success show';
    document.getElementById('supervisionSchedule').value = ''; 
    document.getElementById('instrumentSelect').value = ''; 
    document.getElementById('supervisionNotes').value = ''; 
    document.getElementById('actionPlan').value = ''; 
    document.getElementById('assessmentFormArea').innerHTML = ''; 
    document.getElementById('assessmentFormArea').style.display = 'none'; 
    document.getElementById('scheduleDetailArea').style.display = 'none'; 
    selectedScheduleId = null; 
    currentInstrument = null;
  } catch(e) { 
    alert.textContent = '❌ ' + e.message; 
    alert.className = 'alert alert-error show'; 
  }
  btn.disabled = false; 
  btn.textContent = '💾 Simpan Hasil Supervisi';
};

// ══════════════════════════════════════════════
// DAFTAR SUPERVISI (DENGAN TOMBOL HAPUS FIXED)
// ══════════════════════════════════════════════
async function loadSupervisionList(){ 
  const snap = await db.collection('supervisions').where('supervisorEmail', '==', currentUser.email).get(); 
  const tbody = document.getElementById('supervisionList'); 
  if(snap.empty){ 
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px;">Belum ada supervisi</td></tr>'; 
    return; 
  } 
  const docs = snap.docs.sort((a,b) => new Date(b.data().createdAt) - new Date(a.data().createdAt)); 
  tbody.innerHTML = docs.map(d => { 
    const data = d.data(); 
    return `<tr>
      <td>${new Date(data.createdAt).toLocaleDateString('id-ID')}</td>
      <td>${data.superviseeName}</td>
      <td>${data.instrumentName || '-'}</td>
      <td><strong>${data.totalScore}/${data.maxScore} (${data.percentage}%)</strong></td>
      <td><span class="badge badge-done">Selesai</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="viewDetail('${d.id}')">👁️ Lihat</button>
        <button class="btn btn-success btn-sm" onclick="printSupervision('${d.id}')">🖨️ Print</button>
        <button class="btn btn-danger btn-sm" onclick="deleteHistory('${d.id}')">🗑️ Hapus</button>
      </td>
    </tr>`; 
  }).join(''); 
}
// ══════════════════════════════════════════════
// GURU / WAKAMAD FEATURES
// ══════════════════════════════════════════════
async function loadMySchedule() { 
  const container = document.getElementById('myScheduleArea'); 
  container.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner"></span> Memuat...</div>'; 
  try { 
    const snap = await db.collection('supervision_schedule').where('teacherEmail', '==', currentUser.email).get(); 
    if (snap.empty) { 
      container.innerHTML = '<div class="empty-state"><div class="icon">📅</div><p>Anda belum dijadwalkan untuk supervisi</p></div>'; 
      return; 
    } 
    const schedules = snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)); 
    container.innerHTML = schedules.map(s => { 
      const statusBadge = {'scheduled': '<span class="badge badge-scheduled">📅 Dijadwalkan</span>', 'in-progress': '<span class="badge badge-progress">🔄 Sedang Disupervisi</span>', 'completed': '<span class="badge badge-done">✅ Selesai</span>'}[s.status] || s.status; 
      return `<div class="schedule-card"><div class="schedule-info"><div class="schedule-title">👤 Supervisor: ${s.supervisorName}</div><div class="schedule-detail">📅 Tanggal: ${formatDate(s.scheduledDate)} | ${statusBadge}</div>${s.notes ? `<div class="schedule-detail">📝 Catatan: ${s.notes}</div>` : ''}<div class="schedule-detail" style="margin-top:6px;"><strong>💡 Silakan upload dokumen pendukung Anda di tab "Upload Dokumen"</strong></div></div></div>`; 
    }).join(''); 
  } catch(e) { 
    container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><p>Gagal memuat jadwal</p></div>'; 
  } 
}

window.toggleDocType = function(){ 
  const type = document.querySelector('input[name=docType]:checked').value; 
  document.getElementById('fileInputWrap').style.display = type==='file'?'block':'none'; 
  document.getElementById('linkInputWrap').style.display = type==='link'?'block':'none'; 
};

// ══════════════════════════════════════════════
// FOLDER MANAGEMENT
// ══════════════════════════════════════════════
let currentFolderId = null; // null = root level

window.navigateFolder = function(folderId) {
  currentFolderId = folderId;
  loadFolderContents();
};

window.toggleUploadForm = function() {
  const form = document.getElementById('uploadFormArea');
  if (form.style.display === 'none') {
    form.style.display = 'block';
  } else {
    form.style.display = 'none';
  }
};

async function loadFolderContents() {
  const container = document.getElementById('folderFileList');
  const breadcrumb = document.getElementById('breadcrumbNav');
  const breadcrumbPath = document.getElementById('breadcrumbPath');
  const viewTitle = document.getElementById('folderViewTitle');
  const btnUpload = document.getElementById('btnToggleUpload');
  const uploadForm = document.getElementById('uploadFormArea');

  container.innerHTML = '<div style="text-align:center;padding:30px;color:#6b7280;"><span class="spinner"></span> Memuat...</div>';

  try {
    const foldersSnap = await db.collection('supervision_folders').where('userEmail', '==', currentUser.email).get();
    userFolders = foldersSnap.docs.map(d => ({id: d.id, ...d.data()}));

    let subFolders = userFolders.filter(f => (f.parentId || null) === currentFolderId);
    subFolders.sort((a, b) => a.name.localeCompare(b.name));

    let files = [];
    if (currentFolderId) {
      const docsSnap = await db.collection('supervision_documents').where('userEmail', '==', currentUser.email).where('folderId', '==', currentFolderId).get();
      files = docsSnap.docs.map(d => ({id: d.id, ...d.data()}));
      files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    if (currentFolderId) {
      breadcrumb.style.display = 'block';
      btnUpload.style.display = 'inline-flex';
      uploadForm.style.display = 'none';

      let pathParts = [];
      let current = userFolders.find(f => f.id === currentFolderId);
      while (current) {
        pathParts.unshift(current);
        current = current.parentId ? userFolders.find(f => f.id === current.parentId) : null;
      }

      let pathHTML = '';
      pathParts.forEach((p, i) => {
        if (i > 0) pathHTML += ' <span style="color:#9ca3af;">›</span> ';
        if (i < pathParts.length - 1) {
          pathHTML += `<a href="#" onclick="navigateFolder('${p.id}');return false;" style="color:#3b82f6;text-decoration:none;font-weight:600;">${p.name}</a>`;
        } else {
          pathHTML += `<strong style="color:#1e293b;">${p.name}</strong>`;
        }
      });
      breadcrumbPath.innerHTML = pathHTML;
      viewTitle.textContent = '📂 Isi Folder: ' + pathParts[pathParts.length - 1].name;
    } else {
      breadcrumb.style.display = 'none';
      btnUpload.style.display = 'none';
      uploadForm.style.display = 'none';
      viewTitle.textContent = '📁 Semua Folder';
    }

    const allDocsSnap = await db.collection('supervision_documents').where('userEmail', '==', currentUser.email).get();
    const folderCounts = {};
    allDocsSnap.docs.forEach(d => {
      const fid = d.data().folderId;
      if (fid) folderCounts[fid] = (folderCounts[fid] || 0) + 1;
    });

    let html = '';
    subFolders.forEach(f => {
      const count = folderCounts[f.id] || 0;
      const color = f.color || '#3b82f6';
      html += `<div class="folder-card" style="--fc:${color};" onclick="navigateFolder('${f.id}')"><div class="folder-icon">📁</div><div class="folder-info"><div class="folder-name">${f.name}</div><div class="folder-count">${count} dokumen</div></div><div class="folder-actions"><button class="btn btn-warning" onclick="event.stopPropagation();openFolderModal('${f.id}')" title="Edit">✏️ Edit</button><button class="btn btn-danger" onclick="event.stopPropagation();deleteFolder('${f.id}','${f.name.replace(/'/g,"\\'")}',${count})" title="Hapus">🗑️ Hapus</button></div></div>`;
    });

    if (files.length > 0) {
      html += `<div class="tbl-wrap" style="margin-top:${subFolders.length > 0 ? '16px' : '0'};">${subFolders.length > 0 ? '<div style="font-size:0.78rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding:4px 0 6px;">Dokumen</div>' : ''}<table class="file-list-table"><thead><tr><th style="width:32px;"></th><th>Nama Dokumen</th><th>Kategori</th><th>Tanggal</th><th style="width:160px;">Aksi</th></tr></thead><tbody>`;
      files.forEach(d => {
        const icon = d.type === 'link' ? '🔗' : (d.fileExt === 'pdf' ? '📕' : (['doc','docx'].includes(d.fileExt) ? '📘' : (['xls','xlsx'].includes(d.fileExt) ? '📗' : (['ppt','pptx'].includes(d.fileExt) ? '📙' : '📄'))));
        let btnLihat = '';
        if (d.type === 'link') { btnLihat = `<a href="${d.link}" target="_blank" class="btn btn-warning btn-sm">👁️ Lihat</a>`; } 
        else if (d.fileExt === 'pdf') { btnLihat = `<button class="btn btn-warning btn-sm" onclick="previewDoc('${d.id}')">👁️ Lihat</button>`; } 
        else { btnLihat = `<button class="btn btn-warning btn-sm" onclick="previewDocOffice('${d.id}','${d.fileExt}')">👁️ Lihat</button>`; }
        const btnUnduh = d.type !== 'link' ? `<button class="btn btn-primary btn-sm" onclick="downloadMyDoc('${d.id}','${d.nama.replace(/'/g,"\\'")}','${d.fileExt}')">⬇️</button>` : '';
        html += `<tr><td style="text-align:center;font-size:1.1rem;">${icon}</td><td class="file-list-name">${d.nama}</td><td class="file-list-meta">${d.kategori || '-'}</td><td class="file-list-meta">${new Date(d.createdAt).toLocaleDateString('id-ID')}</td><td><div class="file-list-actions">${btnLihat}${btnUnduh}<button class="btn btn-danger btn-sm" onclick="deleteMyDoc('${d.id}')">🗑️</button></div></td></tr>`;
      });
      html += `</tbody></table></div>`;
    }

    if (subFolders.length === 0 && files.length === 0) {
      html = currentFolderId ? `<div class="empty-state"><div class="icon">📭</div><p>Folder ini kosong.<br>Klik <strong>"Upload File"</strong> untuk menambahkan dokumen.</p></div>` : `<div class="empty-state"><div class="icon">📁</div><p>Belum ada folder.<br>Klik <strong>"Folder Baru"</strong> untuk memulai.</p></div>`;
    }
    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = `<div style="text-align:center;padding:30px;color:#ef4444;">❌ ${e.message}</div>`;
    console.error('Error loading folder contents:', e);
  }
}

async function loadFolders() {
  currentFolderId = null;
  loadFolderContents();
}

window.openFolderModal = function(folderId = null) {
  editingFolderId = folderId;
  const title = document.getElementById('folderModalTitle');
  const nameInput = document.getElementById('folderName');
  if (folderId) {
    title.textContent = '✏️ Edit Folder';
    const folder = userFolders.find(f => f.id === folderId);
    if (folder) {
      nameInput.value = folder.name;
      document.querySelectorAll('input[name=folderColor]').forEach(radio => {
        const div = radio.parentElement.querySelector('div');
        if (radio.value === folder.color) { radio.checked = true; div.style.border = '3px solid #1e40af'; } 
        else { radio.checked = false; div.style.border = '3px solid transparent'; }
      });
    }
  } else {
    title.textContent = '📁 Buat Folder Baru';
    nameInput.value = '';
    document.querySelector('input[name=folderColor][value="#3b82f6"]').checked = true;
    document.querySelectorAll('input[name=folderColor]').forEach(radio => {
      const div = radio.parentElement.querySelector('div');
      div.style.border = radio.value === '#3b82f6' ? '3px solid #1e40af' : '3px solid transparent';
    });
  }
  openModal('folderModal');
};

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('color-option') || e.target.closest('label')?.querySelector('input[name=folderColor]')) {
    const label = e.target.closest('label');
    if (label) {
      const radio = label.querySelector('input[name=folderColor]');
      if (radio) {
        radio.checked = true;
        document.querySelectorAll('input[name=folderColor]').forEach(r => {
          const div = r.parentElement.querySelector('div');
          div.style.border = r.checked ? '3px solid #1e40af' : '3px solid transparent';
        });
      }
    }
  }
});

window.saveFolder = async function() {
  const name = document.getElementById('folderName').value.trim();
  const color = document.querySelector('input[name=folderColor]:checked')?.value || '#3b82f6';
  if (!name) { alert('❌ Nama folder wajib diisi!'); return; }
  try {
    if (editingFolderId) {
      await db.collection('supervision_folders').doc(editingFolderId).update({ name: name, color: color, updatedAt: new Date().toISOString() });
      alert('✅ Folder berhasil diupdate!');
    } else {
      await db.collection('supervision_folders').add({ name: name, color: color, parentId: currentFolderId, userEmail: currentUser.email, userName: currentUser.nama, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      alert('✅ Folder berhasil dibuat!');
    }
    closeModal('folderModal');
    loadFolderContents();
  } catch(e) { alert('❌ Gagal menyimpan folder: ' + e.message); }
};

window.deleteFolder = async function(folderId, folderName, docCount) {
  const subFolders = userFolders.filter(f => f.parentId === folderId);
  let confirmMsg = `Hapus folder "${folderName}"?`;
  if (subFolders.length > 0) { confirmMsg = `⚠️ Folder "${folderName}" memiliki ${subFolders.length} sub-folder.\n\nSemua sub-folder dan dokumen di dalamnya akan ikut terhapus!\n\nApakah Anda yakin?`; } 
  else if (docCount > 0) { confirmMsg = `⚠️ Folder "${folderName}" masih berisi ${docCount} dokumen.\n\nSemua dokumen akan ikut terhapus!\n\nApakah Anda yakin?`; }
  if (!confirm(confirmMsg)) return;
  try {
    await deleteFolderRecursive(folderId);
    await db.collection('supervision_folders').doc(folderId).delete();
    if (currentFolderId === folderId) currentFolderId = null;
    alert('✅ Folder berhasil dihapus!');
    loadFolderContents();
  } catch(e) { alert('❌ Gagal menghapus folder: ' + e.message); }
};

async function deleteFolderRecursive(folderId) {
  let docQuery = db.collection('supervision_documents').where('folderId', '==', folderId);
  if (currentUser.role === 'guru') { docQuery = docQuery.where('userEmail', '==', currentUser.email); }
  const docsSnap = await docQuery.get();
  const batch1 = db.batch();
  docsSnap.docs.forEach(doc => batch1.delete(doc.ref));
  await batch1.commit();
  const subFolders = userFolders.filter(f => f.parentId === folderId);
  for (const sub of subFolders) {
    await deleteFolderRecursive(sub.id);
    await db.collection('supervision_folders').doc(sub.id).delete();
  }
}

window.uploadDokumen = async function() {
  const kategori = document.getElementById('docKategori').value;
  const nama = document.getElementById('docNama').value.trim();
  const type = document.querySelector('input[name=docType]:checked').value;
  const alert = document.getElementById('alertUpload');
  const btn = document.getElementById('btnUploadDoc');
  alert.classList.remove('show');
  if (!currentFolderId) { alert.textContent = '❌ Buka folder terlebih dahulu!'; alert.className = 'alert alert-error show'; return; }
  if (!kategori || !nama) { alert.textContent = '❌ Kategori dan nama dokumen wajib diisi!'; alert.className = 'alert alert-error show'; return; }
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  try {
    let fileData = null, fileExt = '', fileSize = 0, link = '';
    if (type === 'file') {
      const file = document.getElementById('docFile').files[0];
      if (!file) throw new Error('Pilih file terlebih dahulu!');
      if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran file maksimal 5MB!');
      const reader = new FileReader();
      fileData = await new Promise((res, rej) => { reader.onload = e => res(e.target.result); reader.onerror = rej; reader.readAsDataURL(file); });
      fileExt = file.name.split('.').pop();
      fileSize = file.size;
    } else {
      link = document.getElementById('docLink').value.trim();
      if (!link) throw new Error('Masukkan link Google Drive!');
    }
    const folder = userFolders.find(f => f.id === currentFolderId);
    await db.collection('supervision_documents').add({ userId: currentUser.uid, userEmail: currentUser.email, userName: currentUser.nama, userRole: currentUser.role, folderId: currentFolderId, folderName: folder?.name || '', kategori, nama, type, fileData, fileExt, fileSize, link, createdAt: new Date().toISOString() });
    alert.textContent = '✅ Dokumen berhasil disimpan!'; alert.className = 'alert alert-success show';
    document.getElementById('docKategori').value = ''; document.getElementById('docNama').value = ''; document.getElementById('docFile').value = ''; document.getElementById('docLink').value = '';
    loadFolderContents();
  } catch(e) { alert.textContent = '❌ ' + e.message; alert.className = 'alert alert-error show'; }
  btn.disabled = false; btn.textContent = '💾 Simpan Dokumen';
};

async function loadMyDocs(){
  const tbody = document.getElementById('myDocsList'); 
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;"><span class="spinner"></span> Memuat...</td></tr>';
  try {
    const snap = await db.collection('supervision_documents').where('userEmail', '==', currentUser.email).get();
    if(snap.empty){ tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:20px;">Belum ada dokumen</td></tr>'; return; }
    let docs = snap.docs.map(d => ({id: d.id, ...d.data()})); 
    docs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    tbody.innerHTML = docs.map(d => {
      const icon = d.type==='link' ? '🔗' : (d.fileExt==='pdf'?'📕':['doc','docx'].includes(d.fileExt)?'📘':['xls','xlsx'].includes(d.fileExt)?'📗':'📄');
      const folder = userFolders.find(f => f.id === d.folderId); 
      const folderColor = folder?.color || '#6b7280'; 
      const folderName = d.folderName || 'Tanpa Folder';
      let btnLihat = d.type === 'link' ? `<a href="${d.link}" target="_blank" class="btn btn-warning btn-sm">👁️ Lihat</a>` : (d.fileExt === 'pdf' ? `<button class="btn btn-warning btn-sm" onclick="previewDoc('${d.id}')">👁️ Lihat</button>` : `<button class="btn btn-warning btn-sm" onclick="previewDocOffice('${d.id}','${d.fileExt}')">👁️ Lihat</button>`);
      let btnUnduh = d.type !== 'link' ? `<button class="btn btn-primary btn-sm" onclick="downloadMyDoc('${d.id}','${d.nama.replace(/'/g,"\\'")}','${d.fileExt}')">⬇️</button>` : '';
      return `<tr><td><span class="folder-badge" style="background:${folderColor};">📁 ${folderName}</span></td><td>${icon} ${d.nama}</td><td>${d.kategori}</td><td>${new Date(d.createdAt).toLocaleDateString('id-ID')}</td><td><div style="display:flex;gap:4px;flex-wrap:wrap;">${btnLihat}${btnUnduh}<button class="btn btn-danger btn-sm" onclick="deleteMyDoc('${d.id}')">🗑️</button></div></td></tr>`;
    }).join('');
  } catch(e) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#ef4444;padding:20px;">❌ ${e.message}</td></tr>`; }
}

window.downloadMyDoc = async function(docId, nama, ext){ 
  const snap = await db.collection('supervision_documents').doc(docId).get(); 
  const data = snap.data(); 
  const a = document.createElement('a'); 
  a.href = data.fileData; 
  a.download = nama + '.' + ext; 
  a.click(); 
};
window.downloadDoc = window.downloadMyDoc;

window.deleteMyDoc = async function(docId){ 
  if(!confirm('Hapus dokumen ini?')) return; 
  await db.collection('supervision_documents').doc(docId).delete(); 
  loadMyDocs(); 
  loadFolders(); 
};

// ══════════════════════════════════════════════
// HASIL SUPERVISI SAYA (1 TOMBOL DOWNLOAD PDF)
// ══════════════════════════════════════════════
async function loadMySupervisionList(){ 
  const snap = await db.collection('supervisions').where('superviseeEmail', '==', currentUser.email).get(); 
  const tbody = document.getElementById('mySupervisionList'); 
  if(snap.empty){ 
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px;">Belum ada supervisi</td></tr>'; 
    return; 
  } 
  const docs = snap.docs.sort((a,b) => new Date(b.data().createdAt) - new Date(a.data().createdAt)); 
  tbody.innerHTML = docs.map(d => { 
    const data = d.data(); 
    return `<tr>
      <td>${new Date(data.createdAt).toLocaleDateString('id-ID')}</td>
      <td>${data.supervisorName} (${getRoleLabel(data.supervisorRole)})</td>
      <td>${data.instrumentName || '-'}</td>
      <td><strong>${data.totalScore}/${data.maxScore} (${data.percentage}%)</strong></td>
      <td><span class="badge badge-done">${data.predicate || 'Selesai'}</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="viewDetail('${d.id}')">👁️ Lihat</button>
        <button class="btn btn-success btn-sm" onclick="printSupervision('${d.id}')">🖨️ Print</button>
      </td>
    </tr>`; 
  }).join(''); 
}

// ══════════════════════════════════════════════
// DETAIL & PDF
// ══════════════════════════════════════════════
window.viewDetail = async function(docId) { 
  try { 
    const snap = await db.collection('supervisions').doc(docId).get(); 
    if (!snap.exists) { alert('Data tidak ditemukan'); return; } 
    currentSupervision = { id: docId, ...snap.data() }; 
    if (currentSupervision.instrumentId) { 
      const instSnap = await db.collection('supervision_instruments').doc(currentSupervision.instrumentId).get(); 
      if (instSnap.exists) { 
        const instrumentData = instSnap.data(); 
        currentInstrument = { id: instSnap.id, ...instrumentData }; 
      } 
    } 
    showDetailModal(); 
  } catch (error) { 
    console.error('Error loading detail:', error); 
    alert('❌ Gagal memuat detail: ' + error.message); 
  } 
};

function showDetailModal() {
  const data = currentSupervision; 
  const statusText = '✅ Sudah Dinilai'; 
  let tableHTML = '';
  if (currentInstrument && currentInstrument.components && currentInstrument.components.length > 0) {
    tableHTML = `<div class="table-wrap" style="margin:15px 0;"><table style="border-collapse:collapse;width:100%;font-size:0.85rem;"><thead><tr style="background:#4CAF50;color:white;"><th style="border:1px solid #ddd;padding:8px;text-align:center;width:5%;">No</th><th style="border:1px solid #ddd;padding:8px;text-align:left;width:60%;">Komponen</th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:7%;">1</th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:7%;">2</th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:7%;">3</th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:7%;">4</th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:7%;">Skor</th></tr></thead><tbody>`;
    currentInstrument.components.forEach((comp, index) => { 
      const score = data.scores[`comp_${index}`] || 0; 
      tableHTML += `<tr style="background:${index % 2 === 0 ? '#E8F5E9' : 'white'};"><td style="border:1px solid #ddd;padding:6px;text-align:center;">${index + 1}</td><td style="border:1px solid #ddd;padding:6px;">${comp.name}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${score === 1 ? '✓' : ''}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${score === 2 ? '✓' : ''}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${score === 3 ? '✓' : ''}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${score === 4 ? '✓' : ''}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;font-weight:bold;">${score}/4</td></tr>`; 
    });
    tableHTML += `</tbody><tfoot><tr style="background:#C8E6C9;font-weight:bold;"><td colspan="2" style="border:1px solid #ddd;padding:8px;text-align:right;">Jumlah</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${Object.values(data.scores).filter(s => s === 1).length}</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${Object.values(data.scores).filter(s => s === 2).length}</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${Object.values(data.scores).filter(s => s === 3).length}</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${Object.values(data.scores).filter(s => s === 4).length}</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${data.totalScore}/${data.maxScore}</td></tr><tr style="background:#A5D6A7;font-weight:bold;"><td colspan="2" style="border:1px solid #ddd;padding:8px;text-align:right;">Persentase Capaian</td><td colspan="5" style="border:1px solid #ddd;padding:8px;text-align:center;font-size:1.1rem;">${data.percentage}%</td></tr><tr style="background:#81C784;color:white;font-weight:bold;"><td colspan="2" style="border:1px solid #ddd;padding:8px;text-align:right;">Predikat</td><td colspan="5" style="border:1px solid #ddd;padding:8px;text-align:center;font-size:1.1rem;">${data.predicate || '-'}</td></tr></tfoot></table></div><div style="margin-top:15px;background:#FFF3E0;padding:12px;border-radius:8px;border-left:4px solid #FF9800;font-size:0.85rem;"><strong>Keterangan:</strong><br>• 91% - 100% = Sangat Baik<br>• 81% - 90% = Baik<br>• 71% - 80% = Cukup<br>• < 70% = Kurang</div>`;
  } else { 
    tableHTML = '<p style="color:#999;text-align:center;padding:20px;">Detail penilaian tidak tersedia</p>'; 
  }
  const date = new Date(data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt);
  document.getElementById('detailContent').innerHTML = `<div style="margin-bottom:18px;"><div class="detail-row"><span class="detail-label">Tanggal</span><span class="detail-value">${date.toLocaleDateString('id-ID', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</span></div><div class="detail-row"><span class="detail-label">Nama Madrasah</span><span class="detail-value">${data.schoolName || 'MAN BANTAENG'}</span></div><div class="detail-row"><span class="detail-label">Supervisor</span><span class="detail-value">${data.supervisorName} (${getRoleLabel(data.supervisorRole)})</span></div><div class="detail-row"><span class="detail-label">Yang Disupervisi</span><span class="detail-value">${data.superviseeName}</span></div><div class="detail-row"><span class="detail-label">Mata Pelajaran</span><span class="detail-value">${data.subject || '-'}</span></div><div class="detail-row"><span class="detail-label">Kelas/Semester</span><span class="detail-value">${data.classSemester || '-'}</span></div><div class="detail-row"><span class="detail-label">Instrumen</span><span class="detail-value">${data.instrumentName || '-'}</span></div><div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${statusText}</span></div></div><h4 style="color:#1e40af;margin-bottom:10px;">Detail Penilaian</h4>${tableHTML}${data.notes ? `<h4 style="color:#1e40af;margin:16px 0 10px;">Catatan Khusus</h4><div style="background:#eff6ff;padding:14px;border-radius:8px;white-space:pre-wrap;">${data.notes}</div>` : ''}${data.actionPlan ? `<h4 style="color:#1e40af;margin:16px 0 10px;">Rencana Tindak Lanjut</h4><div style="background:#eff6ff;padding:14px;border-radius:8px;white-space:pre-wrap;">${data.actionPlan}</div>` : ''}`;
  document.getElementById('detailModal').classList.add('active');
}

// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
// DOWNLOAD PDF — OPTIMIZED 1 HALAMAN A4 LANDSCAPE + NIP OTOMATIS
// ══════════════════════════════════════════════
window.downloadPDF = async function(docId) {
  try {
    const id = docId || currentSupervision?.id;
    const snap = await db.collection('supervisions').doc(id).get();
    if (!snap.exists) { alert('Data tidak ditemukan'); return; }

    const data = snap.data();

    // 1. AMBIL DATA GURU (SUPERVISEE)
    let superviseeNIP = '-';
    let superviseeNamaLengkap = data.superviseeName || '-';
    if (data.superviseeEmail) {
      try {
        const userSnap = await db.collection('users').doc(data.superviseeEmail).get();
        if (userSnap.exists) {
          superviseeNIP = userSnap.data().nip || '-';
          superviseeNamaLengkap = userSnap.data().nama || data.superviseeName || '-';
        }
      } catch (e) { console.error("Gagal mengambil data guru:", e); }
    }

    // 2. AMBIL DATA SUPERVISOR (NIP + NAMA BERGELAR)
    let supervisorNIP = '-';
    let supervisorNamaLengkap = data.supervisorName || '-';
    if (data.supervisorEmail) {
      try {
        const supSnap = await db.collection('users').doc(data.supervisorEmail).get();
        if (supSnap.exists) {
          const supData = supSnap.data();
          supervisorNIP = supData.nip || '-';

          // Format Gelar Supervisor
          if (supData.namaLengkap) {
            supervisorNamaLengkap = supData.namaLengkap;
          } else {
            const gDepan = supData.gelarDepan ? `${supData.gelarDepan.trim()} ` : '';
            const namaUtama = supData.nama || data.supervisorName || '-';
            const gBelakang = supData.gelarBelakang ? `, ${supData.gelarBelakang.trim()}` : '';

            supervisorNamaLengkap = `${gDepan}${namaUtama}${gBelakang}`;
          }
        }
      } catch (e) { console.error("Gagal mengambil data supervisor:", e); }
    }
    let components = [];
    if (data.instrumentId) {
      const instSnap = await db.collection('supervision_instruments').doc(data.instrumentId).get();
      if (instSnap.exists) components = instSnap.data().components;
    }

    if (!window.jspdf) { alert('Library PDF sedang dimuat. Silakan coba lagi.'); return; }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth  = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    let y = 12;

    pdf.setFontSize(12); pdf.setFont(undefined, 'bold');
    pdf.text('HASIL SUPERVISI PEMBELAJARAN', pageWidth / 2, y, { align: 'center' });
    y += 5;
    pdf.setFontSize(9); pdf.setFont(undefined, 'normal');
    pdf.text('KURIKULUM BERBASIS CINTA (KBC) — MAN BANTAENG', pageWidth / 2, y, { align: 'center' });
    y += 7;

    const date = new Date(data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt);
    const col1 = margin;
    const col2 = pageWidth / 2 + 5;

    pdf.setFontSize(8); pdf.setFont(undefined, 'normal');
    const infoLeft = [
      ['Nama Madrasah', data.schoolName || 'MAN Bantaeng'],
      ['Guru yang Disupervisi', data.superviseeName || '-'],
      ['Mata Pelajaran', data.subject || '-'],
      ['Kelas/Semester', data.classSemester || '-'],
    ];
    const infoRight = [
      ['Tanggal', date.toLocaleDateString('id-ID')],
      ['Supervisor', data.supervisorName || '-'],
      ['Instrumen', data.instrumentName || '-'],
      ['Jml Jam Tatap Muka', data.meetingHours || '-'],
    ];

    const infoStartY = y;
    infoLeft.forEach((row, i) => {
      pdf.setFont(undefined, 'bold');
      pdf.text(row[0], col1, y + i * 4.5);
      pdf.setFont(undefined, 'normal');
      pdf.text(': ' + row[1], col1 + 45, y + i * 4.5);
    });
    infoRight.forEach((row, i) => {
      pdf.setFont(undefined, 'bold');
      pdf.text(row[0], col2, infoStartY + i * 4.5);
      pdf.setFont(undefined, 'normal');
      pdf.text(': ' + row[1], col2 + 40, infoStartY + i * 4.5);
    });
    y += 4 * 4.5 + 4;

    if (components.length > 0) {
      const footerHeight = data.notes ? 24 : 16;
      const signatureHeight = 28;
      const availableHeight = pageHeight - y - footerHeight - signatureHeight - margin;
      const numRows = components.length;
      const headerHeight = 8;
      const footerRowsHeight = 22;
      const rowHeight = Math.min(7, Math.max(5, (availableHeight - headerHeight - footerRowsHeight) / numRows));

      const colNo = 8;
      const colSkor = 12;
      const colCheck = 10;
      const colKomp = pageWidth - 2 * margin - colNo - 4 * colCheck - colSkor;
      const colWidths = [colNo, colKomp, colCheck, colCheck, colCheck, colCheck, colSkor];
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);

      const colX = [];
      let cx = margin;
      colWidths.forEach(w => { colX.push(cx); cx += w; });

      const fontSize = Math.min(7.5, rowHeight * 0.9);
      pdf.setFontSize(fontSize);

      pdf.setFillColor(76, 175, 80); pdf.setTextColor(255, 255, 255);
      pdf.rect(margin, y, tableWidth, headerHeight / 2, 'FD');
      pdf.setFont(undefined, 'bold');
      pdf.text('No', colX[0] + colWidths[0] / 2, y + 3, { align: 'center' });
      pdf.text('Komponen', colX[1] + colWidths[1] / 2, y + 3, { align: 'center' });
      pdf.text('Skor Nilai', colX[2] + (colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5]) / 2, y + 3, { align: 'center' });
      pdf.text('Skor', colX[6] + colWidths[6] / 2, y + 3, { align: 'center' });
      y += headerHeight / 2;

      pdf.setFillColor(129, 199, 132); pdf.setTextColor(0, 0, 0);
      pdf.rect(margin, y, tableWidth, headerHeight / 2, 'FD');
      ['1', '2', '3', '4'].forEach((lbl, i) => {
        pdf.text(lbl, colX[2 + i] + colWidths[2 + i] / 2, y + 3, { align: 'center' });
      });
      y += headerHeight / 2;

      pdf.setFont(undefined, 'normal');
      components.forEach((comp, index) => {
        const score = data.scores[`comp_${index}`] || 0;
        if (index % 2 === 0) {
          pdf.setFillColor(232, 245, 233);
          pdf.rect(margin, y, tableWidth, rowHeight, 'F');
        }
        pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.2);
        pdf.rect(margin, y, tableWidth, rowHeight, 'S');

        const textY = y + rowHeight / 2 + fontSize * 0.35;
        pdf.setTextColor(0, 0, 0);
        pdf.text(String(index + 1), colX[0] + colWidths[0] / 2, textY, { align: 'center' });

        const maxCompWidth = colWidths[1] - 2;
        const compLines = pdf.splitTextToSize(comp.name, maxCompWidth);
        const maxLines = Math.floor(rowHeight / (fontSize * 0.4)) || 1;
        const displayText = compLines.slice(0, maxLines).join(' ');
        pdf.text(displayText, colX[1] + 1, textY);

        const boxSize = Math.min(3.5, rowHeight * 0.55);
        [0, 1, 2, 3].forEach(i => {
          const bx = colX[2 + i] + colWidths[2 + i] / 2 - boxSize / 2;
          const by = y + rowHeight / 2 - boxSize / 2;
          if (score === i + 1) {
            pdf.setFillColor(76, 175, 80);
            pdf.rect(bx, by, boxSize, boxSize, 'FD');
            pdf.setDrawColor(255, 255, 255); pdf.setLineWidth(0.5);
            pdf.line(bx + 0.5, by + boxSize * 0.55, bx + boxSize * 0.4, by + boxSize * 0.85);
            pdf.line(bx + boxSize * 0.4, by + boxSize * 0.85, bx + boxSize - 0.5, by + boxSize * 0.2);
            pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.2);
          } else {
            pdf.setFillColor(255, 255, 255);
            pdf.rect(bx, by, boxSize, boxSize, 'FD');
          }
        });

        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${score}/4`, colX[6] + colWidths[6] / 2, textY, { align: 'center' });
        pdf.setFont(undefined, 'normal');
        y += rowHeight;
      });

      const count1 = Object.values(data.scores).filter(s => s === 1).length;
      const count2 = Object.values(data.scores).filter(s => s === 2).length;
      const count3 = Object.values(data.scores).filter(s => s === 3).length;
      const count4 = Object.values(data.scores).filter(s => s === 4).length;
      const footRowH = 6;

      pdf.setFillColor(200, 230, 201); pdf.setFont(undefined, 'bold');
      pdf.rect(margin, y, tableWidth, footRowH, 'FD');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Jumlah', colX[1] + colWidths[1] - 2, y + 4, { align: 'right' });
      [count1, count2, count3, count4].forEach((c, i) => {
        pdf.text(String(c), colX[2 + i] + colWidths[2 + i] / 2, y + 4, { align: 'center' });
      });
      pdf.text(`${data.totalScore}/${data.maxScore}`, colX[6] + colWidths[6] / 2, y + 4, { align: 'center' });
      y += footRowH;

      pdf.setFillColor(165, 214, 167);
      pdf.rect(margin, y, tableWidth, footRowH, 'FD');
      pdf.text('Persentase Capaian', colX[1] + colWidths[1] - 2, y + 4, { align: 'right' });
      pdf.text(`${data.percentage}%`, colX[2] + 5, y + 4);
      y += footRowH;

      pdf.setFillColor(76, 175, 80); pdf.setTextColor(255, 255, 255);
      pdf.rect(margin, y, tableWidth, footRowH, 'FD');
      pdf.text('Predikat', colX[1] + colWidths[1] - 2, y + 4, { align: 'right' });
      pdf.text(data.predicate || '-', colX[2] + 5, y + 4);
      y += footRowH + 3;

      pdf.setTextColor(0, 0, 0); pdf.setFont(undefined, 'normal'); pdf.setFontSize(7);
      pdf.text('Keterangan: • 91%-100% = Sangat Baik  • 81%-90% = Baik  • 71%-80% = Cukup  • <70% = Kurang', margin, y);
      y += 4;
    }

    if (data.notes) {
      pdf.setFontSize(7.5); pdf.setFont(undefined, 'bold');
      pdf.text('Catatan Khusus Hasil Supervisi:', margin, y); y += 3.5;
      pdf.setFont(undefined, 'normal');
      const noteLines = pdf.splitTextToSize(data.notes, pageWidth - 2 * margin);
      pdf.text(noteLines.slice(0, 2), margin, y);
      y += noteLines.slice(0, 2).length * 3.5 + 2;
    }

    y += 4;
    const signFontSize = 8;
    pdf.setFontSize(signFontSize);
    const rightX = pageWidth - margin - 55;

    pdf.setFont(undefined, 'normal');
    pdf.text(`Bantaeng, ${date.toLocaleDateString('id-ID')}`, rightX, y);
    y += 5;

    pdf.text('Guru yang disupervisi,', margin + 10, y);
    pdf.text('Supervisor,', rightX + 10, y);
    y += 18;

    pdf.line(margin + 5, y, margin + 55, y);
    pdf.line(rightX + 5, y, rightX + 55, y);
    y += 4;

    pdf.setFont(undefined, 'bold');
    pdf.text(data.superviseeName || '-', margin + 10, y);
    pdf.text(data.supervisorName || '-', rightX + 10, y);

    // ✅ TAMPILKAN NIP GURU DI BAWAH NAMA
    if (superviseeNIP && superviseeNIP !== '-') {
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(7); 
      pdf.text(`NIP. ${superviseeNIP}`, margin + 10, y + 4);
    }

      if (supervisorNIP && supervisorNIP !== '-') {
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(7);
      pdf.text(`NIP. ${supervisorNIP}`, rightX + 10, y + 4);
    }

    const fileName = `Supervisi_${(data.superviseeName || 'guru').replace(/\s+/g, '_')}_${date.toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

  } catch (error) {
    console.error('Error download PDF:', error);
    alert('❌ Gagal mendownload PDF: ' + error.message);
  }
};

// ══════════════════════════════════════════════
// PRINT LANGSUNG (TANPA DOWNLOAD) + NIP OTOMATIS
// ══════════════════════════════════════════════
window.printSupervision = async function(docId) {
  try {
    const snap = await db.collection('supervisions').doc(docId).get();
    if (!snap.exists) { alert('Data tidak ditemukan'); return; }
    
    const data = snap.data();
    
        // 🔍 AMBIL NIP GURU DARI FIRESTORE SECARA OTOMATIS
    let superviseeNIP = '-';
    if (data.superviseeEmail) {
      try {
        const userSnap = await db.collection('users').doc(data.superviseeEmail).get();
        if (userSnap.exists) {
          superviseeNIP = userSnap.data().nip || '-';
        }
      } catch (e) {
        console.error("Gagal mengambil NIP guru:", e);
      }
    }

    // 🔍 AMBIL DATA SUPERVISOR (NIP + NAMA BERGELAR) DARI FIRESTORE
let supervisorNIP = '-';
let supervisorNamaLengkap = data.supervisorName || '-'; // Fallback awal

if (data.supervisorEmail) {
  try {
    // Bersihkan email dari spasi & ubah ke huruf kecil agar cocok dengan ID Dokumen Firestore
    const cleanEmail = data.supervisorEmail.trim().toLowerCase();
    const supSnap = await db.collection('users').doc(cleanEmail).get();

    if (supSnap.exists) {
      const supData = supSnap.data();
      supervisorNIP = supData.nip || '-';
      
      // Mengambil langsung field 'nama' yang sudah berisi gelar dari Firestore
      supervisorNamaLengkap = supData.nama || data.supervisorName || '-';
    } else {
      console.warn("Dokumen user supervisor tidak ditemukan untuk email:", cleanEmail);
    }
  } catch (e) { 
    console.error("Gagal mengambil data supervisor:", e); 
  }
}
    
    let components = [];
    if (data.instrumentId) {
      const instSnap = await db.collection('supervision_instruments').doc(data.instrumentId).get();
      if (instSnap.exists) components = instSnap.data().components;
    }
    
    const printWindow = window.open('', '_blank');
    const date = new Date(data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt);
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hasil Supervisi - ${data.superviseeName}</title>
        <style>
          @media print {
            @page { size: A4; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none; }
          }
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 11pt; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
          .header h2 { margin: 5px 0; color: #1e40af; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 10pt; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #4CAF50; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .summary { background-color: #dcfce7; font-weight: bold; }
          .notes-section { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .notes-box { border: 1px solid #ddd; padding: 10px; border-radius: 5px; min-height: 80px; }
          .signature { 
            margin-top: 40px; 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 60px;
            text-align: center;
          }
          .signature-box { 
            padding-top: 10px;
          }
          .signature-line {
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 60px;
            display: inline-block;
            min-width: 180px;
            font-weight: bold;
          }
          .btn-print { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; margin-bottom: 20px; }
          .btn-print:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <button class="no-print btn-print" onclick="window.print(); window.close();">🖨️ Cetak Halaman Ini</button>
        <div class="header">
          <h2>HASIL SUPERVISI PEMBELAJARAN</h2>
          <h3>KURIKULUM BERBASIS CINTA (KBC)</h3>
        </div>
        <div class="info-grid">
          <div><strong>Tanggal:</strong> ${date.toLocaleDateString('id-ID', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</div>
          <div><strong>Yang Disupervisi:</strong> ${data.superviseeName}</div>
          <div><strong>Madrasah:</strong> ${data.schoolName || 'MAN Bantaeng'}</div>
          <div><strong>Kelas/Semester:</strong> ${data.classSemester || '-'}</div>
          <div><strong>Supervisor:</strong> ${supervisorNamaLengkap}</div>
          <div><strong>Mata Pelajaran:</strong> ${data.subject || '-'}</div>
          <div><strong>Instrumen:</strong> ${data.instrumentName || '-'}</div>
          <div><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">${data.predicate || 'Selesai'}</span></div>
        </div>
        <table>
          <thead><tr><th width="5%">No</th><th width="55%">Komponen</th><th width="10%">Skor</th></tr></thead>
          <tbody>
    `;
    
    if (components.length > 0) {
      components.forEach((comp, index) => {
        const score = data.scores[`comp_${index}`] || 0;
        htmlContent += `<tr><td>${index + 1}</td><td>${comp.name}</td><td style="text-align: center; font-weight: bold;">${score}/4</td></tr>`;
      });
    }
    
    htmlContent += `
          </tbody>
          <tfoot>
            <tr class="summary"><td colspan="2" style="text-align: right;">Total Skor</td><td style="text-align: center;"><strong>${data.totalScore}/${data.maxScore}</strong></td></tr>
            <tr class="summary"><td colspan="2" style="text-align: right;">Persentase</td><td style="text-align: center;"><strong>${data.percentage}%</strong></td></tr>
            <tr class="summary"><td colspan="2" style="text-align: right;">Predikat</td><td style="text-align: center;"><strong>${data.predicate || '-'}</strong></td></tr>
          </tfoot>
        </table>
        <div class="notes-section">
          <div class="notes-box"><h4 style="margin-top: 0; color: #1e40af;">Catatan Khusus:</h4><p>${data.notes || '-'}</p></div>
          <div class="notes-box"><h4 style="margin-top: 0; color: #1e40af;">Rencana Tindak Lanjut:</h4><p>${data.actionPlan || '-'}</p></div>
        </div>
        <div class="signature">
          <div class="signature-box">
            <div>Guru yang Disupervisi</div>
            <div class="signature-line">${data.superviseeName}</div>
            ${superviseeNIP && superviseeNIP !== '-' ? `<div style="font-size: 9pt; margin-top: 4px; color: #333;">NIP. ${superviseeNIP}</div>` : ''}
          </div>
          <div class="signature-box">
  <div>Supervisor</div>
  <div class="signature-line">${supervisorNamaLengkap}</div>
  ${supervisorNIP && supervisorNIP !== '-' ? `<div style="font-size: 9pt; margin-top: 4px; color: #333;">NIP. ${supervisorNIP}</div>` : ''}
</div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
  } catch (error) {
    console.error('Error print supervision:', error);
    alert('❌ Gagal mencetak: ' + error.message);
  }
};

window.previewDoc = async function(docId) { 
  try { 
    const snap = await db.collection('supervision_documents').doc(docId).get(); 
    if (!snap.exists) { alert('Dokumen tidak ditemukan'); return; } 
    const data = snap.data(); 
    if (data.type === 'link') { window.open(data.link, '_blank'); } 
    else if (data.fileExt === 'pdf') { 
      const newWindow = window.open('', '_blank'); 
      newWindow.document.write(`<html><head><title>Preview: ${data.nama}</title><style>body{margin:0;background:#f3f4f6;}.header{background:#3b82f6;color:white;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;}.header h3{margin:0;font-size:1rem;}.header a{color:white;text-decoration:none;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:6px;font-size:0.85rem;}iframe{width:100%;height:calc(100vh - 50px);border:none;}</style></head><body><div class="header"><h3>📄 ${data.nama}</h3><a href="${data.fileData}" download="${data.nama}.${data.fileExt}">⬇ Download</a></div><iframe src="${data.fileData}"></iframe></body></html>`); 
    } else { 
      alert(`File ${data.fileExt.toUpperCase()} tidak bisa di-preview langsung.`); 
      window.previewDocOffice(docId, data.fileExt); 
    } 
  } catch(e) { alert('❌ Gagal membuka preview: ' + e.message); } 
};

window.previewDocOffice = async function(docId, fileExt) { 
  try { 
    const snap = await db.collection('supervision_documents').doc(docId).get(); 
    if (!snap.exists) { alert('Dokumen tidak ditemukan'); return; } 
    const data = snap.data(); 
    if (data.type === 'link') { window.open(data.link, '_blank'); return; } 
    const newWindow = window.open('', '_blank'); 
    newWindow.document.write(`<html><head><title>Preview: ${data.nama}</title><style>body{margin:0;background:#f3f4f6;font-family:'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;}.card{background:white;padding:30px;border-radius:14px;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:500px;text-align:center;}.icon{font-size:4rem;margin-bottom:15px;}h3{color:#1e40af;margin-bottom:10px;}p{color:#6b7280;margin-bottom:20px;}.btn{display:inline-block;background:#3b82f6;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin:5px;}.btn:hover{background:#2563eb;}.btn-secondary{background:#6b7280;}.btn-secondary:hover{background:#4b5563;}</style></head><body><div class="card"><div class="icon">${fileExt==='pdf'?'📕':['doc','docx'].includes(fileExt)?'📘':['xls','xlsx'].includes(fileExt)?'📗':'📄'}</div><h3>${data.nama}</h3><p>${data.kategori} • ${data.fileSize?(data.fileSize/1024/1024).toFixed(2)+' MB':''}</p><p style="font-size:0.85rem;">File ${fileExt.toUpperCase()} tidak bisa di-preview langsung.</p><a href="${data.fileData}" download="${data.nama}.${data.fileExt}" class="btn"> Download untuk Melihat</a><br><button onclick="window.close()" class="btn btn-secondary">Tutup</button></div></body></html>`); 
  } catch(e) { alert('❌ Gagal membuka preview: ' + e.message); } 
};

window.closeModal = function(id){ 
  document.getElementById(id).classList.remove('active'); 
};

function openModal(id) { 
  document.getElementById(id).classList.add('active'); 
}

function formatDate(dateStr) { 
  if (!dateStr) return '-'; 
  const date = new Date(dateStr); 
  return date.toLocaleDateString('id-ID', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  }); 
}

// ✅ FIX: deleteMyDoc pakai loadFolderContents bukan loadMyDocs
window.deleteMyDoc = async function(docId){ 
  if(!confirm('Hapus dokumen ini?')) return; 
  try {
    await db.collection('supervision_documents').doc(docId).delete();
    loadFolderContents();
  } catch(e) { 
    alert('❌ Gagal menghapus dokumen: ' + e.message); 
  }
};

// ✅ FIX UTAMA: collection yang benar adalah 'supervisions' bukan 'supervision_results'
window.deleteHistory = async function(historyId) { 
  if (!confirm('Hapus data riwayat supervisi ini? Data hasil penilaian yang dihapus tidak dapat dikembalikan.')) return; 
  try { 
    await db.collection('supervisions').doc(historyId).delete(); // ✅ FIXED
    alert('✅ Riwayat berhasil dihapus');
    loadSupervisionList(); // ✅ refresh tabel setelah hapus
  } catch(e) { 
    alert('❌ ' + e.message); 
  } 
};

window.viewDetail = viewDetail; 
window.downloadPDF = downloadPDF;

window.addEventListener('load', async () => { 
  showLoading(); 
  await new Promise(resolve => setTimeout(resolve, 500)); 
  const isValid = await checkSipelitaSession(); 
  if (isValid) { showDashboard(); } 
});
