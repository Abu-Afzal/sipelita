// ══════════════════════════════════════════════
// FIREBASE CONFIG & INITIALIZATION
// ══════════════════════════════════════════════
const firebaseConfig = {
    apiKey: "AIzaSyAlVg1QKRP-1sDJmlA-YFEfHLKqhT5OzBY",
    authDomain: "sipelita-guru.firebaseapp.com",
    databaseURL: "https://sipelita-guru-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sipelita-guru",
    storageBucket: "sipelita-guru.firebasestorage.app",
    messagingSenderId: "595996765157",
    appId: "1:595996765157:web:88f7f03489e1d1248e9d0c"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
let currentUser = null;
let daftarKelas = [];

// ══════════════════════════════════════════════
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

function sanitizeEmail(email) {
    return email ? email.replace(/[.#$\[\]]/g, '_') : '';
}

function toRoman(num) {
    if (!num || num < 1 || num > 11) return num;
    const roman = {
        1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
        6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI'
    };
    return roman[num] || num;
}

// ══════════════════════════════════════════════
// AUTENTIKASI HYBRID (LocalStorage + Firebase Auth)
// ══════════════════════════════════════════════
function checkAuthAndInit(callback) {
    // 1. Cek LocalStorage dahulu
    try {
        const userStr = localStorage.getItem('sipelita_user');
        if (userStr) {
            currentUser = JSON.parse(userStr);
        }
    } catch (e) {
        currentUser = null;
    }

    if (currentUser && (currentUser.nama || currentUser.email)) {
        updateUserUI(currentUser);
        if (callback) callback();
        return;
    }

    // 2. Jika LocalStorage belum ada, cek Firebase Auth State
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                const displayName = user.displayName || user.email.split('@')[0];
                currentUser = {
                    uid: user.uid,
                    nama: displayName,
                    email: user.email
                };
                updateUserUI(currentUser);
                if (callback) callback();
            } else {
                alert('Sesi login tidak ditemukan. Silakan login terlebih dahulu.');
                window.location.href = '../login.html';
            }
        });
    } else {
        alert('Sesi login tidak ditemukan. Silakan login terlebih dahulu.');
        window.location.href = '../login.html';
    }
}

function updateUserUI(user) {
    const elDisplay = document.getElementById('userDisplay');
    const elNamaGuru = document.getElementById('namaGuru');
    const namaUser = user.nama || user.email || 'Guru';

    if (elDisplay) elDisplay.textContent = '👨‍🏫 Hi, ' + namaUser;
    if (elNamaGuru) elNamaGuru.value = namaUser;

    // Load NIP jika sudah pernah disimpan sebelumnya
    const savedNip = localStorage.getItem('sipelita_nip_' + sanitizeEmail(namaUser));
    if (savedNip && document.getElementById('nipGuru')) {
        document.getElementById('nipGuru').value = savedNip;
    }
}

// ══════════════════════════════════════════════
// INIT - Form Jurnal Online
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const formJurnal = document.getElementById('formJurnal');
    if (!formJurnal) return;

    // Jalankan otentikasi hybrid dan inisialisasi form
    checkAuthAndInit(async () => {
        // Set tanggal hari ini secara otomatis
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('tanggal').value = today;

        // Setup Live Preview untuk Rentang Jam (Format Romawi)
        setupJamPreview();

        // Load daftar kelas dari Realtime Database (SIPENA)
        await loadDaftarKelas();

        // Bind event handler submit form
        formJurnal.addEventListener('submit', simpanJurnal);
    });
});

// ══════════════════════════════════════════════
// LIVE PREVIEW RENTANG JAM
// ══════════════════════════════════════════════
function setupJamPreview() {
    const jamMulaiEl = document.getElementById('jamMulai');
    const jamSelesaiEl = document.getElementById('jamSelesai');
    const previewEl = document.getElementById('jamPreview');

    if (!jamMulaiEl || !jamSelesaiEl || !previewEl) return;

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
// LOAD DAFTAR KELAS (SIPENA)
// ══════════════════════════════════════════════
async function loadDaftarKelas() {
    const kelasSelect = document.getElementById('kelas');
    if (!kelasSelect) return;

    try {
        const namaGuru = currentUser ? (currentUser.nama || currentUser.email || 'guru') : '';
        const rtDb = firebase.database();
        const snap = await rtDb.ref('sipena2').once('value');
        const data = snap.val();

        if (data) {
            const kelasList = Object.keys(data)
                .map(k => ({ __key: k, ...data[k] }))
                .filter(d => d.type === 'class' && d.user_name === namaGuru);

            daftarKelas = kelasList;

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
        
        // Fallback: Mengganti dropdown menjadi input manual jika koneksi/data bermasalah
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
// SIMPAN JURNAL (FIRESTORE)
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
        const jamMulai = document.getElementById('jamMulai').value;
        const jamSelesai = document.getElementById('jamSelesai').value;

        const kelasEl = document.getElementById('kelas');
        const kelas = kelasEl ? kelasEl.value.trim() : '';

        const muridHadir = parseInt(document.getElementById('muridHadir').value) || 0;
        const muridTidakHadir = parseInt(document.getElementById('muridTidakHadir').value) || 0;
        const materi = document.getElementById('materi').value.trim();
        const keterangan = document.getElementById('keterangan').value.trim();

        // Validasi input
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

        if (!currentUser) {
            throw new Error('Sesi login tidak valid. Silakan login ulang.');
        }

        const currentUid = currentUser.uid || currentUser.id || 'ANONYMOUS';

        // Simpan NIP ke localStorage untuk auto-fill di sesi berikutnya
        localStorage.setItem('sipelita_nip_' + sanitizeEmail(namaGuru), nip);

        // Format jam
        const jamMulaiInt = parseInt(jamMulai);
        const jamSelesaiInt = parseInt(jamSelesai);
        const jamRange = `${jamMulaiInt}-${jamSelesaiInt}`;
        const jamDisplay = `Jam ${toRoman(jamMulaiInt)}-${toRoman(jamSelesaiInt)}`;

        // Obyek data yang disimpan ke Firestore
        const data = {
            userId: currentUid,
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

        // Simpan dokumen ke Firestore
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
    if (document.getElementById('jamMulai')) document.getElementById('jamMulai').value = '';
    if (document.getElementById('jamSelesai')) document.getElementById('jamSelesai').value = '';
    if (document.getElementById('jamPreview')) document.getElementById('jamPreview').style.display = 'none';

    if (document.getElementById('kelas')) document.getElementById('kelas').value = '';
    if (document.getElementById('muridHadir')) document.getElementById('muridHadir').value = '0';
    if (document.getElementById('muridTidakHadir')) document.getElementById('muridTidakHadir').value = '0';
    if (document.getElementById('materi')) document.getElementById('materi').value = '';
    if (document.getElementById('keterangan')) document.getElementById('keterangan').value = '';

    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('tanggal')) document.getElementById('tanggal').value = today;

    window.scrollTo({ top: 0, behavior: 'smooth' });
};