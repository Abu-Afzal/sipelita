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
const db = firebase.firestore();

// ══════════════════════════════════════════════
// STATE GLOBALS
// ═════════════════════════════════════════════
let currentUser = null;
let uploadedPhotos = [];
let daftarJurnal = [];
let activityCounter = 0;

// State untuk Edit Jurnal
let editUploadedPhotos = [];
let editActivityCounter = 0;

// ══════════════════════════════════════════════
// INIT & DOM READY
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    setupFormSubmit();
    setupPhotoUpload();
    setDefaultDate();
    addActivity();
    
    // Setup listener untuk form edit jurnal
    const formEdit = document.getElementById('formEditJurnal');
    if (formEdit) {
        formEdit.onsubmit = async (e) => {
            e.preventDefault();
            await updateJurnal();
        };
    }
});

// ══════════════════════════════════════════════
// LOAD USER INFO
// ══════════════════════════════════════════════
async function loadUserInfo() {
    const nipElement = document.getElementById('userNip');
    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    
    try {
        const userStr = localStorage.getItem('sipelita_user');
        if (!userStr) {
            alert('⛔ Anda harus login terlebih dahulu!');
            window.location.href = '../index.html';
            return;
        }
        
        currentUser = JSON.parse(userStr);
        
        if (nameEl) nameEl.textContent = currentUser.nama || 'User';
        if (roleEl) roleEl.textContent = currentUser.role || 'Guru';
        
        if (nipElement) {
            nipElement.textContent = 'NIP: Memuat...';
            nipElement.style.color = '#f59e0b';
        }
        
        if (currentUser.email) {
            try {
                const snapshot = await db.collection('users')
                    .where('email', '==', currentUser.email)
                    .limit(1)
                    .get();
                
                if (!snapshot.empty) {
                    const freshUserData = snapshot.docs[0].data();
                    currentUser.nip = freshUserData.nip || '';
                    currentUser.nama = freshUserData.nama || currentUser.nama;
                    currentUser.role = freshUserData.role || currentUser.role;
                    currentUser.mataPelajaran = freshUserData.mataPelajaran || '';
                    
                    localStorage.setItem('sipelita_user', JSON.stringify(currentUser));
                    
                    if (nameEl) nameEl.textContent = currentUser.nama;
                    if (roleEl) roleEl.textContent = currentUser.role;
                    
                    if (nipElement) {
                        if (currentUser.nip) {
                            nipElement.textContent = 'NIP: ' + currentUser.nip;
                            nipElement.style.color = '#64748b';
                        } else {
                            nipElement.textContent = 'NIP: Belum diisi (hubungi Admin)';
                            nipElement.style.color = '#ef4444';
                        }
                    }
                } else {
                    if (nipElement) {
                        nipElement.textContent = 'NIP: ' + (currentUser.nip || '-');
                        nipElement.style.color = '#64748b';
                    }
                }
            } catch (firestoreError) {
                console.error('❌ Error mengambil dari Firestore:', firestoreError);
                if (nipElement) {
                    nipElement.textContent = 'NIP: ' + (currentUser.nip || 'Mode offline');
                    nipElement.style.color = '#f59e0b';
                }
            }
        }
    } catch (e) {
        console.error('❌ Error di loadUserInfo:', e);
        window.location.href = '../index.html';
    }
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const tglEl = document.getElementById('jurnalTanggal');
    if (tglEl) tglEl.value = today;
    
    const thnEl = document.getElementById('filterTahun');
    if (thnEl) thnEl.value = new Date().getFullYear();
    
    const blnEl = document.getElementById('filterBulan');
    if (blnEl) blnEl.value = new Date().getMonth() + 1;
}

// ══════════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════════
function switchTab(tabName, element) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    if (element && element.classList) {
        element.classList.add('active');
    } else {
        const evt = window.event;
        if (evt && evt.target) {
            const closestTab = evt.target.closest('.tab');
            if (closestTab) closestTab.classList.add('active');
        }
    }
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    const targetContent = document.getElementById('tab-' + tabName);
    if (targetContent) targetContent.style.display = 'block';
    if (tabName === 'daftar') loadDaftarJurnal();
}
window.switchTab = switchTab;

// ══════════════════════════════════════════════
// ACTIVITY MANAGEMENT
// ══════════════════════════════════════════════
function addActivity() {
    activityCounter++;
    const container = document.getElementById('activitiesContainer');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'activity-item';
    div.id = 'activity-' + activityCounter;
    div.innerHTML = '<h4>Kegiatan #' + activityCounter + '</h4>' +
        '<button type="button" class="activity-remove" onclick="removeActivity(' + activityCounter + ')">×</button>' +
        '<div class="form-group" style="margin:0;">' +
            '<label>Uraian Kegiatan *</label>' +
            '<input type="text" class="act-kegiatan" placeholder="Contoh: Mengajar Mapel Kelas X.2" required>' +
        '</div>' +
        '<div class="form-group" style="margin:0; margin-top: 10px;">' +
            '<label>Hasil/Output</label>' +
            '<input type="text" class="act-hasil" placeholder="Contoh: Terlaksananya PBM di kelas X.2">' +
        '</div>';
    container.appendChild(div);
}
window.addActivity = addActivity;

function removeActivity(id) {
    const el = document.getElementById('activity-' + id);
    if (el) el.remove();
    const items = document.querySelectorAll('.activity-item');
    items.forEach((item, index) => {
        const h4 = item.querySelector('h4');
        if (h4) h4.textContent = 'Kegiatan #' + (index + 1);
    });
    if (items.length === 0) addActivity();
}
window.removeActivity = removeActivity;

// ═════════════════════════════════════════════
// PHOTO UPLOAD
// ══════════════════════════════════════════════
function setupPhotoUpload() {
    const uploadArea = document.getElementById('photoUploadArea');
    const photoInput = document.getElementById('photoInput');
    if (!uploadArea || !photoInput) return;
    
    uploadArea.onclick = () => photoInput.click();
    uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); };
    uploadArea.ondragleave = () => { uploadArea.classList.remove('dragover'); };
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    };
    photoInput.onchange = (e) => { handleFiles(e.target.files); };
}

function handleFiles(files) {
    const remaining = 3 - uploadedPhotos.length;
    if (remaining <= 0) { alert('⚠️ Maksimal 3 foto!'); return; }
    
    Array.from(files).slice(0, remaining).forEach(file => {
        if (file.size > 2 * 1024 * 1024) { alert('⚠️ ' + file.name + ' terlalu besar (maks 2 MB)'); return; }
        if (!file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            compressImage(e.target.result, 800, 0.7).then(compressed => {
                uploadedPhotos.push({ name: file.name, base64: compressed });
                renderPhotoPreview();
            });
        };
        reader.readAsDataURL(file);
    });
}

function compressImage(base64, maxWidth, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(base64); return; }
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = base64;
    });
}

function renderPhotoPreview() {
    const preview = document.getElementById('photoPreview');
    if (!preview) return;
    preview.innerHTML = uploadedPhotos.map((p, i) => 
        '<div class="photo-item">' +
            '<img src="' + p.base64 + '" alt="Preview">' +
            '<button type="button" class="photo-remove" onclick="removePhoto(' + i + ')">×</button>' +
        '</div>'
    ).join('');
}

function removePhoto(i) { 
    uploadedPhotos.splice(i, 1); 
    renderPhotoPreview(); 
}
window.removePhoto = removePhoto;

// ══════════════════════════════════════════════
// FORM SUBMIT & DATABASE ENGINE
// ═════════════════════════════════════════════
function setupFormSubmit() {
    const form = document.getElementById('formJurnal');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await simpanJurnal();
        };
    }
}

async function simpanJurnal() {
    const btn = document.getElementById('btnSimpan');
    const alertEl = document.getElementById('alertInput');
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    }
    if (alertEl) alertEl.classList.remove('show');
    
    try {
        const tglEl = document.getElementById('jurnalTanggal');
        const ketEl = document.getElementById('jurnalKeterangan');
        const tanggal = tglEl ? tglEl.value : new Date().toISOString().split('T')[0];
        const keterangan = ketEl ? ketEl.value : '';
        
        const activities = [];
        document.querySelectorAll('.activity-item').forEach(item => {
            const kegiatanEl = item.querySelector('.act-kegiatan');
            const hasilEl = item.querySelector('.act-hasil');
            
            const kegiatan = kegiatanEl ? kegiatanEl.value.trim() : '';
            const hasil = hasilEl ? hasilEl.value.trim() : '';
            
            if (kegiatan) {
                activities.push({ kegiatan: kegiatan, hasil: hasil });
            }
        });
        
        if (activities.length === 0) {
            if (alertEl) {
                alertEl.textContent = '❌ Minimal 1 kegiatan harus diisi!';
                alertEl.className = 'alert alert-error show';
            } else {
                alert('❌ Minimal 1 kegiatan harus diisi!');
            }
            if (btn) { btn.disabled = false; btn.innerHTML = '💾 Simpan Jurnal'; }
            return;
        }
        
        const photoBase64Array = uploadedPhotos.map(p => p.base64);
        
        await db.collection('jurnal_mengajar').add({
            userEmail: currentUser.email,
            userName: currentUser.nama,
            userRole: currentUser.role,
            userNip: currentUser.nip || '',
            userMapel: currentUser.mataPelajaran || '',
            tanggal: tanggal,
            keterangan: keterangan,
            activities: activities,
            vol: activities.length,
            fotoBase64: photoBase64Array,
            fotoCount: photoBase64Array.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        if (alertEl) {
            alertEl.textContent = '✅ Jurnal berhasil disimpan!';
            alertEl.className = 'alert alert-success show';
        } else {
            alert('✅ Jurnal berhasil disimpan!');
        }
        resetForm();
        
    } catch (error) {
        console.error('Error saving:', error);
        if (alertEl) {
            alertEl.textContent = '❌ Gagal menyimpan: ' + error.message;
            alertEl.className = 'alert alert-error show';
        } else {
            alert('❌ Gagal menyimpan: ' + error.message);
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '💾 Simpan Jurnal';
        }
    }
}

function resetForm() {
    const form = document.getElementById('formJurnal');
    if (form) form.reset();
    const container = document.getElementById('activitiesContainer');
    if (container) container.innerHTML = '';
    activityCounter = 0;
    uploadedPhotos = [];
    renderPhotoPreview();
    setDefaultDate();
    addActivity();
}

// ══════════════════════════════════════════════
// LOAD DATATABLE (DENGAN TOMBOL EDIT)
// ══════════════════════════════════════════════
async function loadDaftarJurnal() {
    const loading = document.getElementById('loadingDaftar');
    const table = document.getElementById('tableDaftar');
    const tbody = document.getElementById('jurnalTableBody');
    
    if (loading) loading.style.display = 'block';
    if (table) table.style.display = 'none';
    
    try {
        if (!currentUser || !currentUser.email) return;
        
        const snapshot = await db.collection('jurnal_mengajar')
            .where('userEmail', '==', currentUser.email)
            .get();
        
        daftarJurnal = [];
        snapshot.forEach(doc => daftarJurnal.push({ id: doc.id, ...doc.data() }));
        daftarJurnal.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        
        const blnEl = document.getElementById('filterBulan');
        const thnEl = document.getElementById('filterTahun');
        const filterBulan = blnEl ? blnEl.value : '';
        const filterTahun = thnEl ? thnEl.value : '';
        
        let filtered = daftarJurnal.filter(j => {
            const d = new Date(j.tanggal);
            const monthMatch = !filterBulan || (d.getMonth() + 1) === parseInt(filterBulan);
            const yearMatch = !filterTahun || d.getFullYear() === parseInt(filterTahun);
            return monthMatch && yearMatch;
        });
        
        if (tbody) {
            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;"> Tidak ada data jurnal</td></tr>';
            } else {
                tbody.innerHTML = filtered.map((j, index) => {
                    let activities = j.activities || [];
                    if (activities.length === 0 && j.kegiatan) {
                        activities = [{ kegiatan: j.kegiatan, hasil: j.hasil || '' }];
                    }
                    
                    const vol = activities.length || j.vol || 1;
                    const kegiatanText = activities.map((a, i) => (i + 1) + '. ' + a.kegiatan).join('<br>');
                    const outputText = activities.map((a, i) => (i + 1) + '. ' + (a.hasil || '-')).join('<br>');
                    
                    const fotoCount = j.fotoCount || (j.fotoBase64 ? j.fotoBase64.length : 0);
                    let fotoHtml = '-';
                    if (fotoCount > 0 && j.fotoBase64) {
                        fotoHtml = j.fotoBase64.map((foto, fi) => 
                            '<img src="' + foto + '" style="max-width:80px;max-height:60px;border-radius:4px;margin:2px;cursor:pointer;" onclick="viewPhoto(\'' + j.id + '\', ' + fi + ')">'
                        ).join('');
                    }
                    
                    let badgeHtml = '';
                    if (j.keterangan) {
                        const badgeClass = { 'Hadir': 'badge-hadir', 'Izin': 'badge-izin', 'Sakit': 'badge-sakit', 'Alpha': 'badge-alpha' }[j.keterangan] || '';
                        badgeHtml = '<span class="badge ' + badgeClass + '">' + j.keterangan + '</span>';
                    }
                    
                    return '<tr>' +
                        '<td style="text-align:center;font-weight:700;">' + (index + 1) + '</td>' +
                        '<td>' + formatDate(j.tanggal) + (badgeHtml ? '<br>' + badgeHtml : '') + '</td>' +
                        '<td style="font-size:0.82rem;">' + kegiatanText + '</td>' +
                        '<td style="text-align:center;font-weight:700;">' + vol + '</td>' +
                        '<td style="font-size:0.82rem;">' + outputText + '</td>' +
                        '<td style="text-align:center;">' + fotoHtml + '</td>' +
                        '<td style="display:flex;gap:4px;">' +
                            '<button class="btn btn-warning btn-sm" onclick="openModalEdit(\'' + j.id + '\')" style="padding:4px 8px;" title="Edit">✏️</button>' +
                            '<button class="btn btn-danger btn-sm" onclick="hapusJurnal(\'' + j.id + '\')" style="padding:4px 8px;" title="Hapus">🗑️</button>' +
                        '</td>' +
                    '</tr>';
                }).join('');
            }
        }
        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        if (loading) loading.innerHTML = '<div style="color:red;padding:20px;">❌ ' + error.message + '</div>';
    }
}
window.loadDaftarJurnal = loadDaftarJurnal;

function viewPhoto(jurnalId, photoIndex) {
    const jurnal = daftarJurnal.find(j => j.id === jurnalId);
    if (!jurnal || !jurnal.fotoBase64[photoIndex]) return;
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
    const img = document.createElement('img');
    img.src = jurnal.fotoBase64[photoIndex];
    img.style.cssText = 'max-width:90%;max-height:90%;object-fit:contain;border-radius:8px;';
    modal.appendChild(img);
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}
window.viewPhoto = viewPhoto;

async function hapusJurnal(id) {
    if (!confirm('⚠️ Hapus jurnal ini?')) return;
    try {
        await db.collection('jurnal_mengajar').doc(id).delete();
        loadDaftarJurnal();
    } catch (error) { alert('❌ ' + error.message); }
}
window.hapusJurnal = hapusJurnal;

async function hapusSemuaJurnal() {
    const blnEl = document.getElementById('filterBulan');
    const thnEl = document.getElementById('filterTahun');
    if (!blnEl || !thnEl) return;
    const filterBulan = blnEl.value;
    const filterTahun = thnEl.value;
    const monthNames = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    if (!confirm('⚠️ Hapus SEMUA jurnal bulan ' + monthNames[filterBulan] + ' ' + filterTahun + '?\n\nTindakan ini TIDAK bisa dibatalkan!')) return;
    try {
        const filtered = daftarJurnal.filter(j => {
            const d = new Date(j.tanggal);
            return (d.getMonth() + 1) === parseInt(filterBulan) && d.getFullYear() === parseInt(filterTahun);
        });
        for (const j of filtered) {
            await db.collection('jurnal_mengajar').doc(j.id).delete();
        }
        alert('✅ ' + filtered.length + ' jurnal berhasil dihapus!');
        loadDaftarJurnal();
    } catch (error) { alert('❌ ' + error.message); }
}
window.hapusSemuaJurnal = hapusSemuaJurnal;

// ══════════════════════════════════════════════
// EDIT JURNAL FUNCTIONS
// ══════════════════════════════════════════════

async function openModalEdit(jurnalId) {
    const jurnal = daftarJurnal.find(j => j.id === jurnalId);
    if (!jurnal) return;
    
    document.getElementById('editJurnalId').value = jurnalId;
    document.getElementById('editTanggal').value = jurnal.tanggal;
    document.getElementById('editKeterangan').value = jurnal.keterangan || '';
    
    const container = document.getElementById('editActivitiesContainer');
    container.innerHTML = '';
    editActivityCounter = 0;
    
    const activities = jurnal.activities || [];
    if (activities.length > 0) {
        activities.forEach((act) => {
            editActivityCounter++;
            const div = document.createElement('div');
            div.className = 'activity-item';
            div.id = 'edit-activity-' + editActivityCounter;
            div.innerHTML = '<h4>Kegiatan #' + editActivityCounter + '</h4>' +
                '<button type="button" class="activity-remove" onclick="removeEditActivity(' + editActivityCounter + ')">×</button>' +
                '<div class="form-group" style="margin:0;">' +
                    '<label>Uraian Kegiatan *</label>' +
                    '<input type="text" class="edit-act-kegiatan" value="' + (act.kegiatan || '') + '" placeholder="Contoh: Mengajar Mapel Kelas X.2" required>' +
                '</div>' +
                '<div class="form-group" style="margin:0; margin-top: 10px;">' +
                    '<label>Hasil/Output</label>' +
                    '<input type="text" class="edit-act-hasil" value="' + (act.hasil || '') + '" placeholder="Contoh: Terlaksananya PBM di kelas X.2">' +
                '</div>';
            container.appendChild(div);
        });
    } else {
        addEditActivity();
    }
    
    editUploadedPhotos = jurnal.fotoBase64 || [];
    renderEditPhotoPreview();
    setupEditPhotoUpload();
    
    document.getElementById('modalEditJurnal').classList.add('show');
}
window.openModalEdit = openModalEdit;

function addEditActivity() {
    editActivityCounter++;
    const container = document.getElementById('editActivitiesContainer');
    const div = document.createElement('div');
    div.className = 'activity-item';
    div.id = 'edit-activity-' + editActivityCounter;
    div.innerHTML = '<h4>Kegiatan #' + editActivityCounter + '</h4>' +
        '<button type="button" class="activity-remove" onclick="removeEditActivity(' + editActivityCounter + ')">×</button>' +
        '<div class="form-group" style="margin:0;">' +
            '<label>Uraian Kegiatan *</label>' +
            '<input type="text" class="edit-act-kegiatan" placeholder="Contoh: Mengajar Mapel Kelas X.2" required>' +
        '</div>' +
        '<div class="form-group" style="margin:0; margin-top: 10px;">' +
            '<label>Hasil/Output</label>' +
            '<input type="text" class="edit-act-hasil" placeholder="Contoh: Terlaksananya PBM di kelas X.2">' +
        '</div>';
    container.appendChild(div);
}
window.addEditActivity = addEditActivity;

function removeEditActivity(id) {
    const el = document.getElementById('edit-activity-' + id);
    if (el) el.remove();
    const items = document.querySelectorAll('#editActivitiesContainer .activity-item');
    items.forEach((item, index) => {
        const h4 = item.querySelector('h4');
        if (h4) h4.textContent = 'Kegiatan #' + (index + 1);
    });
    if (items.length === 0) addEditActivity();
}
window.removeEditActivity = removeEditActivity;

function setupEditPhotoUpload() {
    const uploadArea = document.getElementById('editPhotoUploadArea');
    const photoInput = document.getElementById('editPhotoInput');
    if (!uploadArea || !photoInput) return;
    
    uploadArea.onclick = () => photoInput.click();
    uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); };
    uploadArea.ondragleave = () => { uploadArea.classList.remove('dragover'); };
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleEditFiles(e.dataTransfer.files);
    };
    photoInput.onchange = (e) => { handleEditFiles(e.target.files); };
}

function handleEditFiles(files) {
    const remaining = 3 - editUploadedPhotos.length;
    if (remaining <= 0) { alert('⚠️ Maksimal 3 foto!'); return; }
    
    Array.from(files).slice(0, remaining).forEach(file => {
        if (file.size > 2 * 1024 * 1024) { alert('⚠️ ' + file.name + ' terlalu besar (maks 2 MB)'); return; }
        if (!file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            compressImage(e.target.result, 800, 0.7).then(compressed => {
                editUploadedPhotos.push(compressed);
                renderEditPhotoPreview();
            });
        };
        reader.readAsDataURL(file);
    });
}

function renderEditPhotoPreview() {
    const preview = document.getElementById('editPhotoPreview');
    if (!preview) return;
    preview.innerHTML = editUploadedPhotos.map((p, i) => 
        '<div class="photo-item">' +
            '<img src="' + p + '" alt="Preview">' +
            '<button type="button" class="photo-remove" onclick="removeEditPhoto(' + i + ')">×</button>' +
        '</div>'
    ).join('');
}

function removeEditPhoto(i) { 
    editUploadedPhotos.splice(i, 1); 
    renderEditPhotoPreview(); 
}
window.removeEditPhoto = removeEditPhoto;

function closeModalEdit() {
    document.getElementById('modalEditJurnal').classList.remove('show');
    editUploadedPhotos = [];
    editActivityCounter = 0;
}
window.closeModalEdit = closeModalEdit;

async function updateJurnal() {
    const btn = document.getElementById('btnUpdateJurnal');
    const jurnalId = document.getElementById('editJurnalId').value;
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    }
    
    try {
        const tanggal = document.getElementById('editTanggal').value;
        const keterangan = document.getElementById('editKeterangan').value;
        
        const activities = [];
        document.querySelectorAll('#editActivitiesContainer .activity-item').forEach(item => {
            const kegiatanEl = item.querySelector('.edit-act-kegiatan');
            const hasilEl = item.querySelector('.edit-act-hasil');
            
            const kegiatan = kegiatanEl ? kegiatanEl.value.trim() : '';
            const hasil = hasilEl ? hasilEl.value.trim() : '';
            
            if (kegiatan) {
                activities.push({ kegiatan: kegiatan, hasil: hasil });
            }
        });
        
        if (activities.length === 0) {
            alert('❌ Minimal 1 kegiatan harus diisi!');
            if (btn) { btn.disabled = false; btn.innerHTML = '💾 Update Jurnal'; }
            return;
        }
        
        await db.collection('jurnal_mengajar').doc(jurnalId).update({
            tanggal: tanggal,
            keterangan: keterangan,
            activities: activities,
            vol: activities.length,
            fotoBase64: editUploadedPhotos,
            fotoCount: editUploadedPhotos.length,
            updatedAt: new Date().toISOString()
        });
        
        alert('✅ Jurnal berhasil diupdate!');
        closeModalEdit();
        loadDaftarJurnal();
        
    } catch (error) {
        console.error('Error updating:', error);
        alert('❌ Gagal update jurnal: ' + error.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '💾 Update Jurnal';
        }
    }
}
window.updateJurnal = updateJurnal;

// ══════════════════════════════════════════════
// EXPORT SYSTEM & REPORT GENERATOR
// ══════════════════════════════════════════════
async function previewPDF(e) {
    const evt = e || window.event;
    const btn = (evt && evt.target) ? evt.target.closest('button') : null;
    let originalText = "Preview";
    if (btn) {
        originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Loading...';
    }
    try { await generatePDF(true); } 
    catch (error) { console.error('Error preview:', error); alert('⚠️ Gagal preview PDF: ' + error.message); } 
    finally {
        if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
    }
}
window.previewPDF = previewPDF;

async function exportPDF(e) {
    const evt = e || window.event;
    const btn = (evt && evt.target) ? evt.target.closest('button') : null;
    let originalText = "Export";
    if (btn) {
        originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Membuat PDF...';
    }
    try { await generatePDF(false); } 
    catch (error) { console.error('Error export:', error); alert('❌ Gagal export PDF: ' + error.message); } 
    finally {
        if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
    }
}
window.exportPDF = exportPDF;

async function generatePDF(isPreview) {
    const blnEl = document.getElementById('filterBulan');
    const thnEl = document.getElementById('filterTahun');
    const filterBulan = blnEl ? blnEl.value : (new Date().getMonth() + 1);
    const filterTahun = thnEl ? thnEl.value : new Date().getFullYear();
    const monthNames = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    
    let filtered = daftarJurnal.filter(j => {
        const d = new Date(j.tanggal);
        return (d.getMonth() + 1) === parseInt(filterBulan) && d.getFullYear() === parseInt(filterTahun);
    });
    
    if (filtered.length === 0) {
        alert('⚠️ Tidak ada data untuk diekspor!');
        return;
    }
    
    const pdfArea = document.getElementById('pdfExportArea');
    if (!pdfArea) return;
    
    let mapelText = '-';
    if (currentUser.mataPelajaran) {
        if (Array.isArray(currentUser.mataPelajaran)) {
            mapelText = currentUser.mataPelajaran.join(', ');
        } else {
            mapelText = currentUser.mataPelajaran;
        }
    }

    pdfArea.innerHTML = '<div style="font-family:Arial,sans-serif;padding:20px 30px;width:1050px;background:white;box-sizing:border-box;">' +
        '<h2 style="text-align:center;font-size:16px;margin-bottom:5px;font-weight:bold;">LAPORAN CAPAIAN KINERJA HARIAN (LCKH)</h2>' +
        '<h3 style="text-align:center;font-size:13px;margin-bottom:3px;">BULAN ' + monthNames[filterBulan].toUpperCase() + ' TP. ' + filterTahun + '/' + (parseInt(filterTahun)+1) + '</h3>' +
        '<h3 style="text-align:center;font-size:13px;margin-bottom:20px;font-weight:bold;">MAN BANTAENG</h3>' +
        
        '<div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 20px; font-size: 11px;">' +
            '<div style="width: 45%;">' +
                '<table style="width: 100%; border-collapse: collapse; border: none;">' +
                    '<tr>' +
                        '<td style="width: 60px; padding: 3px 0; font-weight: bold; border: none;">NAMA</td>' +
                        '<td style="width: 15px; padding: 3px 0; border: none;">:</td>' +
                        '<td style="padding: 3px 0; border: none;">' + (currentUser.nama || '') + '</td>' +
                    '</tr>' +
                    '<tr>' +
                        '<td style="padding: 3px 0; font-weight: bold; border: none;">NIP</td>' +
                        '<td style="padding: 3px 0; border: none;">:</td>' +
                        '<td style="padding: 3px 0; border: none;">' + (currentUser.nip || '-') + '</td>' +
                    '</tr>' +
                '</table>' +
            '</div>' +
            '<div style="width: 45%; margin-left: auto; padding-left: 460px;">' +
                '<table style="width: 100%; border-collapse: collapse; border: none;">' +
                    '<tr>' +
                        '<td style="width: 130px; padding: 3px 0; font-weight: bold; border: none;">MATA PELAJARAN</td>' +
                        '<td style="width: 15px; padding: 3px 0; border: none;">:</td>' +
                        '<td style="padding: 3px 0; border: none;">' + mapelText + '</td>' +
                    '</tr>' +
                    '<tr>' +
                        '<td style="padding: 3px 0; font-weight: bold; border: none;">JABATAN</td>' +
                        '<td style="padding: 3px 0; border: none;">:</td>' +
                        '<td style="padding: 3px 0; border: none;">Guru</td>' +
                    '</tr>' +
                '</table>' +
            '</div>' +
        '</div>' +
        
        '<table style="width:100%;border-collapse:collapse;font-size:10px;">' +
            '<thead><tr style="background:#1e40af;color:white;">' +
                '<th style="border:1px solid #333;padding:8px;width:30px;text-align:center;">NO</th>' +
                '<th style="border:1px solid #333;padding:8px;width:150px;">HARI, TANGGAL</th>' +
                '<th style="border:1px solid #333;padding:8px;">URAIAN KEGIATAN</th>' +
                '<th style="border:1px solid #333;padding:8px;width:40px;text-align:center;">VOL</th>' +
                '<th style="border:1px solid #333;padding:8px;">OUTPUT</th>' +
                '<th style="border:1px solid #333;padding:8px;width:120px;text-align:center;">KETERANGAN/<br>GAMBAR</th>' +
            '</tr></thead><tbody>' +
            filtered.map((j, index) => {
                let activities = j.activities || [];
                if (activities.length === 0 && j.kegiatan) {
                    activities = [{ kegiatan: j.kegiatan, hasil: j.hasil || '' }];
                }
                const vol = activities.length || 1;
                const kegiatanText = activities.map((a, i) => (i+1) + '. ' + a.kegiatan).join('<br>');
                const outputText = activities.map((a, i) => (i+1) + '. ' + (a.hasil || '-')).join('<br>');
                let fotoHtml = '';
                if (j.fotoBase64 && j.fotoBase64.length > 0) {
                    fotoHtml = j.fotoBase64.map(f => '<img src="' + f + '" style="max-width:100px;max-height:70px;margin:2px;display:block;border:1px solid #ddd;">').join('');
                } else {
                    fotoHtml = '-';
                }
                return '<tr>' +
                    '<td style="border:1px solid #333;padding:6px;text-align:center;vertical-align:top;">' + (index + 1) + '</td>' +
                    '<td style="border:1px solid #333;padding:6px;vertical-align:top;">' + formatDate(j.tanggal) + '</td>' +
                    '<td style="border:1px solid #333;padding:6px;font-size:9px;vertical-align:top;">' + kegiatanText + '</td>' +
                    '<td style="border:1px solid #333;padding:6px;text-align:center;vertical-align:top;font-weight:bold;">' + vol + '</td>' +
                    '<td style="border:1px solid #333;padding:6px;font-size:9px;vertical-align:top;">' + outputText + '</td>' +
                    '<td style="border:1px solid #333;padding:6px;text-align:center;vertical-align:top;">' + fotoHtml + '</td>' +
                '</tr>';
            }).join('') +
        '</tbody></table>' +
        
        '<div style="margin-top:40px; display:flex; justify-content:space-between; font-size:11px; width:100%; line-height: 1.5;">' +
            '<div style="width: 350px; text-align:left;">' +
                '<div style="height: 18px;"></div>' +
                '<p style="margin: 0 0 4px 0; padding: 0;">Mengetahui,</p>' +
                '<p style="margin: 0; padding: 0; font-weight:bold;">Kepala Madrasah</p>' +
                '<div style="height: 75px;"></div>' +
                '<p style="font-weight:bold; margin: 0 0 4px 0; padding: 0; text-decoration: underline;">Muhammad Arif Pither, S.Ag.,M.M.,M.Pd</p>' +
                '<p style="margin: 0; padding: 0;">NIP. 19710930 200710 1 001</p>' +
            '</div>' +
            '<div style="width: 350px; text-align:left; margin-left: auto; padding-left: 460px;">' +
                '<p style="margin: 0 0 4px 0; padding: 0;">Bantaeng, ' + new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) + '</p>' +
                '<div style="height: 18px;"></div>' +
                '<p style="margin: 0; padding: 0; font-weight:bold;">Guru Mata Pelajaran</p>' +
                '<div style="height: 75px;"></div>' +
                '<p style="font-weight:bold; margin: 0 0 4px 0; padding: 0; text-decoration: underline;">' + (currentUser.nama || '') + '</p>' +
                '<p style="margin: 0; padding: 0;">NIP. ' + (currentUser.nip || '-') + '</p>' +
            '</div>' +
        '</div>' +
    '</div>';
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (isPreview) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const pdfContent = pdfArea.innerHTML;
            printWindow.document.write('<!DOCTYPE html><html><head><title>Preview LCKH - ' + monthNames[filterBulan] + ' ' + filterTahun + '</title><style>body{margin:0;padding:20px;font-family:Arial,sans-serif;background:#f5f5f5;}.preview-container{background:white;box-shadow:0 0 20px rgba(0,0,0,0.1);}.print-btn{position:fixed;top:20px;right:20px;padding:12px 24px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);}.print-btn:hover{background:#059669;}@media print{body{background:white;}.preview-container{box-shadow:none;}.print-btn{display:none;}}</style></head><body><button class="print-btn" onclick="window.print()">🖨️ Cetak / Simpan PDF</button><div class="preview-container">' + pdfContent + '</div></body></html>');
            printWindow.document.close();
        }
    } else {
        const canvas = await html2canvas(pdfArea.firstElementChild, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        const imgW = canvas.width;
        const imgH = canvas.height;
        const ratio = pdfW / imgW;
        const scaledH = imgH * ratio;
        
        if (scaledH <= pdfH) {
            pdf.addImage(imgData, 'JPEG', 0, 5, pdfW, scaledH);
        } else {
            const pageH = pdfH - 10;
            const totalPages = Math.ceil(scaledH / pageH);
            for (let p = 0; p < totalPages; p++) {
                if (p > 0) pdf.addPage();
                const yOffset = -(p * pageH) + 5;
                pdf.addImage(imgData, 'JPEG', 0, yOffset, pdfW, scaledH);
            }
        }
        pdf.save('LCKH_' + monthNames[filterBulan] + '_' + filterTahun + '_' + (currentUser.nama || '').replace(/\s+/g, '_') + '.pdf');
    }
}

// ══════════════════════════════════════════════
// SYSTEM HELPERS
// ══════════════════════════════════════════════
function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
