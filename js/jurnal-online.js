// ══════════════════════════════════════════════
// FIREBASE CONFIG
// ═════════════════════════════════════════════
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

// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
let currentUser = null;
let daftarKelas = [];

// ═════════════════════════════════════════════
// UTILITIES
// ═════════════════════════════════════════════
function toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.style.opacity = '0', 3000);
    setTimeout(() => t.remove(), 3400);
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
        1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
        6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI'
    };
    
    return roman[num] || num;
}

// ══════════════════════════════════════════════
// INIT - Tunggu Firebase Auth siap
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const formJurnal = document.getElementById('formJurnal');
    if (!formJurnal) return;
    
    // ✅ TUNGGU FIREBASE AUTH SIAP (ini yang sebelumnya hilang!)
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            alert('Anda harus login terlebih dahulu!');
            window.location.href = '../home.html';
            return;
        }
        
        // Ambil data user dari Auth + localStorage
        let localUser = null;
        try {
            localUser = JSON.parse(localStorage.getItem('sipelita_user') || 'null');
        } catch (e) {}
        
        currentUser = {
            uid: user.uid,
            email: user.email,
            nama: localUser?.nama || user.email || 'Guru',
            role: localUser?.role || 'guru',
            nip: localUser?.nip || ''
        };
        
        console.log('✅ Auth siap:', currentUser.email);
        
        // Auto-fill nama guru
        document.getElementById('namaGuru').value = currentUser.nama;
        
        // Load NIP dari localStorage jika pernah diisi
        const savedNip = localStorage.getItem('sipelita_nip_' + sanitizeEmail(currentUser.nama));
        if (savedNip) {
            document.getElementById('nipGuru').value = savedNip;
        }
        
        // Set tanggal hari ini
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('tanggal').value = today;
        
        // Setup Live Preview untuk Rentang Jam
        setupJamPreview();
        
        // Load daftar kelas dari Firestore (sipena2 collection)
        await loadDaftarKelas();
        
        // Setup form submit
        formJurnal.addEventListener('submit', simpanJurnal);
    });
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
// LOAD DAFTAR KELAS DARI FIRESTORE (sipena2 collection)
// ══════════════════════════════════════════════
async function loadDaftarKelas() {
    try {
        const email = currentUser.email || '';
        const nama = currentUser.nama || '';
        
        // ✅ Baca dari Firestore collection 'sipena2' (bukan RTDB!)
        const snap = await db.collection('sipena2').get();
        const allDocs = [];
        snap.forEach(doc => {
            allDocs.push({ __key: doc.id, ...doc.data() });
        });
        
        // Filter: hanya kelas milik user ini
        const kelasList = allDocs.filter(d => {
            if (d.type !== 'class') return false;
            const owner = (d.user_name || d.user_email || '').toLowerCase();
            const userEmail = email.toLowerCase();
            const userName = nama.toLowerCase();
            return owner === userEmail || owner === userName;
        });
        
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
        
        console.log('📚 Kelas dimuat:', kelasList.length);
    } catch (error) {
        console.error('Error load kelas:', error);
        // Fallback: input manual jika gagal load
        const kelasSelect = document.getElementById('kelas');
        kelasSelect.innerHTML = '<option value="">-- Ketik Manual --</option>';
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
        // ✅ Cek Auth lagi sebelum simpan
        const authUser = auth.currentUser;
        if (!authUser) {
            throw new Error('Sesi login tidak aktif. Silakan login ulang.');
        }
        
        const namaGuru = document.getElementById('namaGuru').value.trim();
        const nip = document.getElementById('nipGuru').value.trim();
        const tanggal = document.getElementById('tanggal').value;
        const jamMulai = document.getElementById('jamMulai').value;
        const jamSelesai = document.getElementById('jamSelesai').value;
        
        const kelasEl = document.getElementById('kelas');
        const kelas = kelasEl.value ? kelasEl.value.trim() : '';
        
        const muridHadir = parseInt(document.getElementById('muridHadir').value) || 0;
        const muridTidakHadir = parseInt(document.getElementById('muridTidakHadir').value) || 0;
        const materi = document.getElementById('materi').value.trim();
        const keterangan = document.getElementById('keterangan').value.trim();
        
        // Validasi
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
        
        // Simpan NIP ke localStorage
        localStorage.setItem('sipelita_nip_' + sanitizeEmail(namaGuru), nip);
        
        // Format jam
        const jamMulaiInt = parseInt(jamMulai);
        const jamSelesaiInt = parseInt(jamSelesai);
        const jamRange = `${jamMulaiInt}-${jamSelesaiInt}`;
        const jamDisplay = `Jam ${toRoman(jamMulaiInt)}-${toRoman(jamSelesaiInt)}`;
        
        // Data untuk Firestore
        const data = {
            userId: authUser.uid,
            userEmail: authUser.email,
            guruNama: namaGuru,
            nip: nip,
            tanggal: tanggal,
            jamMulai: jamMulaiInt,
            jamSelesai: jamSelesaiInt,
            jamRange: jamRange,
            jamDisplay: jamDisplay,
            kelas: kelas,
            muridHadir: muridHadir,
            muridTidakHadir: muridTidakHadir,
            materi: materi,
            keterangan: keterangan,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // ✅ Simpan ke Firestore (auth.currentUser sudah terisi → rules lolos)
        await db.collection('jurnal_online').add(data);
        
        alertEl.textContent = '✅ Jurnal berhasil disimpan!';
        alertEl.className = 'alert alert-success show';
        toast('✅ Jurnal berhasil disimpan!');
        
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