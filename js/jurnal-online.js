// ══════════════════════════════════════════════
// FIREBASE CONFIG
// ═════════════════════════════════════════════
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
// STATE
// ══════════════════════════════════════════════
let currentUser = null;
let daftarKelas = [];

// ═════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════
function toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.style.opacity = '0', 3000);
    setTimeout(() => t.remove(), 3400);
}

function getCurrentUser() {
    try {
        const userStr = localStorage.getItem('sipelita_user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
}

function sanitizeEmail(email) {
    return email ? email.replace(/[.#$\[\]]/g, '_') : '';
}

// ══════════════════════════════════════════════
//  CONVERT ANGKA KE ROMAWI
// ══════════════════════════════════════════════
function toRoman(num) {
    if (!num || num < 1 || num > 10) return num;
    
    const roman = {
        1: 'I',
        2: 'II',
        3: 'III',
        4: 'IV',
        5: 'V',
        6: 'VI',
        7: 'VII',
        8: 'VIII',
        9: 'IX',
        10: 'X',
        11: 'XI'
    };
    
    return roman[num] || num;
}

// ══════════════════════════════════════════════
// INIT - Form Jurnal Online
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    const formJurnal = document.getElementById('formJurnal');
    if (!formJurnal) return;
    
    currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Anda harus login!');
        window.location.href = '../login.html';
        return;
    }
    
    // Auto-fill nama guru
    const namaGuru = currentUser.nama || currentUser.email || 'Guru';
    document.getElementById('namaGuru').value = namaGuru;
    
    // Load NIP dari localStorage jika pernah diisi
    const savedNip = localStorage.getItem('sipelita_nip_' + sanitizeEmail(namaGuru));
    if (savedNip) {
        document.getElementById('nipGuru').value = savedNip;
    }
    
    // Set tanggal hari ini
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggal').value = today;
    
    // 🆕 Setup Live Preview untuk Rentang Jam (Format Romawi)
    setupJamPreview();
    
    // Load daftar kelas dari SIPENA
    await loadDaftarKelas();
    
    // Setup form submit
    formJurnal.addEventListener('submit', simpanJurnal);
});

// ══════════════════════════════════════════════
// 🆕 FITUR: Live Preview Rentang Jam (Format Romawi)
// ══════════════════════════════════════════════
function setupJamPreview() {
    const jamMulaiEl = document.getElementById('jamMulai');
    const jamSelesaiEl = document.getElementById('jamSelesai');
    const previewEl = document.getElementById('jamPreview');
    
    function updatePreview() {
        const mulai = jamMulaiEl.value;
        const selesai = jamSelesaiEl.value;
        
        if (mulai && selesai) {
            const mulaiInt = parseInt(mulai);
            const selesaiInt = parseInt(selesai);
            
            if (selesaiInt < mulaiInt) {
                previewEl.textContent = '⚠️ Jam selesai tidak boleh kurang dari jam mulai!';
                previewEl.style.background = '#fee2e2';
                previewEl.style.color = '#991b1b';
            } else {
                // 🆕 Format Romawi: "Jam I-III"
                const romanMulai = toRoman(mulaiInt);
                const romanSelesai = toRoman(selesaiInt);
                previewEl.textContent = `Jam ${romanMulai}-${romanSelesai}`;
                previewEl.style.background = '#d1fae5';
                previewEl.style.color = '#047857';
            }
            previewEl.style.display = 'block';
        } else {
            previewEl.style.display = 'none';
        }
    }
    
    jamMulaiEl.addEventListener('change', updatePreview);
    jamSelesaiEl.addEventListener('change', updatePreview);
}

// ══════════════════════════════════════════════
// LOAD DAFTAR KELAS
// ══════════════════════════════════════════════
async function loadDaftarKelas() {
    try {
        const namaGuru = currentUser.nama || currentUser.email || 'guru';
        const rtDb = firebase.database();
        const snap = await rtDb.ref('sipena2').once('value');
        const data = snap.val();
        
        if (data) {
            const kelasList = Object.keys(data)
                .map(k => ({ __key: k, ...data[k] }))
                .filter(d => d.type === 'class' && d.user_name === namaGuru);
            
            daftarKelas = kelasList;
            
            const kelasSelect = document.getElementById('kelas');
            kelasSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>';
            
            kelasList.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k.class_name;
                opt.textContent = k.class_name;
                kelasSelect.appendChild(opt);
            });
            
            if (kelasList.length === 0) {
                kelasSelect.innerHTML = '<option value="">Belum ada kelas di SIPENA</option>';
            }
        }
    } catch (error) {
        console.error('Error load kelas:', error);
        // Fallback: input manual jika gagal load dari database
        const kelasSelect = document.getElementById('kelas');
        kelasSelect.innerHTML = '<option value="">-- Ketik Manual --</option>';
        // Ubah select menjadi input text
        const inputManual = document.createElement('input');
        inputManual.type = 'text';
        inputManual.id = 'kelas';
        inputManual.placeholder = 'Contoh: X.1';
        inputManual.required = true;
        inputManual.style.cssText = 'width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.95rem;';
        kelasSelect.parentNode.replaceChild(inputManual, kelasSelect);
    }
}

// ══════════════════════════════════════════════
// SIMPAN JURNAL
// ══════════════════════════════════════════════
async function simpanJurnal(e) {
    e.preventDefault();
    
    const btn = document.getElementById('btnSimpan');
    const alertEl = document.getElementById('alertInfo');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    alertEl.classList.remove('show');
    
    try {
        const namaGuru = document.getElementById('namaGuru').value.trim();
        const nip = document.getElementById('nipGuru').value.trim();
        const tanggal = document.getElementById('tanggal').value;
        
        // 🆕 Ambil data jam mulai dan selesai
        const jamMulai = document.getElementById('jamMulai').value;
        const jamSelesai = document.getElementById('jamSelesai').value;
        
        const kelasEl = document.getElementById('kelas');
        const kelas = kelasEl.value ? kelasEl.value.trim() : '';
        
        const muridHadir = parseInt(document.getElementById('muridHadir').value) || 0;
        const muridTidakHadir = parseInt(document.getElementById('muridTidakHadir').value) || 0;
        const materi = document.getElementById('materi').value.trim();
        const keterangan = document.getElementById('keterangan').value.trim();
        
        // Validasi input form
        if (!namaGuru) throw new Error('Nama guru wajib diisi');
        if (!nip) throw new Error('NIP wajib diisi');
        if (!tanggal) throw new Error('Tanggal wajib diisi');
        if (!jamMulai) throw new Error('Jam mulai wajib dipilih');
        if (!jamSelesai) throw new Error('Jam selesai wajib dipilih');
        if (parseInt(jamSelesai) < parseInt(jamMulai)) {
            throw new Error('Jam selesai tidak boleh kurang dari jam mulai!');
        }
        if (!kelas) throw new Error('Kelas wajib diisi');
        if (!materi) throw new Error('Materi/Tugas wajib diisi');
        if (!keterangan) throw new Error('Keterangan wajib diisi');
        
        if (!currentUser || (!currentUser.uid && !currentUser.id)) {
            throw new Error('Sesi login tidak valid. Silakan login ulang.');
        }
        
        const currentUid = currentUser.uid || currentUser.id;
        
        // Simpan NIP ke localStorage untuk auto-fill berikutnya
        localStorage.setItem('sipelita_nip_' + sanitizeEmail(namaGuru), nip);
        
        // 🆕 Format data jam untuk database (dengan angka Romawi)
        const jamMulaiInt = parseInt(jamMulai);
        const jamSelesaiInt = parseInt(jamSelesai);
        const jamRange = `${jamMulaiInt}-${jamSelesaiInt}`; // "1-3" untuk database/sorting
        const jamDisplay = `Jam ${toRoman(jamMulaiInt)}-${toRoman(jamSelesaiInt)}`; // "Jam I-III" untuk tampilan
        
        // Struktur data yang dikirim ke Firestore
        const data = {
            userId: currentUid,
            guruNama: namaGuru,
            nip: nip,
            tanggal: tanggal,
            jamMulai: jamMulaiInt,           // Angka: 1
            jamSelesai: jamSelesaiInt,       // Angka: 3
            jamRange: jamRange,              // String: "1-3"
            jamDisplay: jamDisplay,          // String: "Jam I-III"
            kelas: kelas,
            muridHadir: muridHadir,
            muridTidakHadir: muridTidakHadir,
            materi: materi,
            keterangan: keterangan,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Simpan ke Firestore
        await db.collection('jurnal_online').add(data);
        
        alertEl.textContent = '✅ Jurnal berhasil disimpan!';
        alertEl.className = 'alert alert-success show';
        toast('✅ Jurnal berhasil disimpan!');
        
        // Reset form setelah 1.5 detik
        setTimeout(() => {
            resetForm();
            alertEl.classList.remove('show');
        }, 1500);
        
    } catch (error) {
        console.error('Error:', error);
        alertEl.textContent = '❌ ' + error.message;
        alertEl.className = 'alert alert-error show';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💾 Simpan Jurnal';
    }
}

// ══════════════════════════════════════════════
// RESET FORM
// ══════════════════════════════════════════════
window.resetForm = function() {
    //  Reset dropdown jam dan preview
    document.getElementById('jamMulai').value = '';
    document.getElementById('jamSelesai').value = '';
    document.getElementById('jamPreview').style.display = 'none';
    
    document.getElementById('kelas').value = '';
    document.getElementById('muridHadir').value = '0';
    document.getElementById('muridTidakHadir').value = '0';
    document.getElementById('materi').value = '';
    document.getElementById('keterangan').value = '';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggal').value = today;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
