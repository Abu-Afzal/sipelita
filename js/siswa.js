// ══════════════════════════════════════════════
// CONFIG & INITIALIZATION FIREBASE
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

let dataSesiAktif = null;
let base64TugasSiswa = ""; // Menyimpan string tugas siswa jika ada upload

// ══════════════════════════════════════════════
// AUTO FILL PIN DARI LINK URL SHARE
// ══════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pinDariUrl = urlParams.get('pin');
    if (pinDariUrl) {
        document.getElementById('studentPin').value = pinDariUrl;
        console.log("PIN berhasil dimuat otomatis dari tautan: " + pinDariUrl);
    }
});

// ══════════════════════════════════════════════
// VALIDASI GERBANG MASUK KELAS
// ══════════════════════════════════════════════
window.validationDanMasukKelas = async function() {
    const pin = document.getElementById('studentPin').value.trim();
    const nama = document.getElementById('studentName').value.trim();
    const absen = document.getElementById('studentId').value.trim();
    const btn = document.getElementById('btnMasukKelas');

    btn.disabled = true;
    btn.textContent = "⏳ Memeriksa Ruangan...";

    try {
        // 1. Ambil data sesi berdasarkan PIN
        const docSesi = await db.collection('learning_sessions').doc(pin).get();
        if (!docSesi.exists) {
            alert("❌ PIN Sesi tidak ditemukan! Sesi mungkin belum dibuat atau salah ketik.");
            return;
        }

        dataSesiAktif = docSesi.data();

        // Periksa apakah sesi ditutup oleh guru
        if (dataSesiAktif.status !== "active") {
            alert("🔒 Sesi pembelajaran ini sudah ditutup oleh Guru.");
            return;
        }

        // 2. Proteksi Anti-Double Submit (Siswa tidak boleh ujian/absen 2 kali)
        const checkDouble = await db.collection('student_responses')
            .where('sessionId', '==', pin)
            .where('studentId', '==', absen)
            .get();

        if (!checkDouble.empty) {
            alert(`⚠️ Nomor Absen/NISN [${absen}] sudah mengirimkan jawaban untuk sesi ini sebelumnya!`);
            return;
        }

        // 3. Jika Lolos Validasi, Tampilkan Modul Belajar
        bukaModulPembelajaran();

    } catch (error) {
        alert("❌ Terjadi kesalahan koneksi: " + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "🚀 Masuk Kelas Belajar";
    }
};

// ══════════════════════════════════════════════
// MEMUAT & MENAMPILKAN MATERI / KUIS / TUGAS
// ══════════════════════════════════════════════
function bukaModulPembelajaran() {
    document.getElementById('gerbangMasuk').style.display = 'none';
    document.getElementById('areaBelajar').style.display = 'block';

    document.getElementById('viewJudulMateri').textContent = dataSesiAktif.title;
    if (dataSesiAktif.namaGuru) {
        document.getElementById('badgeGuru').textContent = `👨‍🏫 Guru: ${dataSesiAktif.namaGuru}`;
    }

    // Tampilkan materi teks jika ada
    if (dataSesiAktif.material.text) {
        document.getElementById('viewMateriTeks').textContent = dataSesiAktif.material.text;
        document.getElementById('sectionMateriTeks').style.display = 'block';
    }

    // Tampilkan gambar materi jika ada (Base64)
    if (dataSesiAktif.material.imageUrl) {
        document.getElementById('viewMateriGambar').src = dataSesiAktif.material.imageUrl;
        document.getElementById('sectionMateriGambar').style.display = 'block';
    }

    // Tampilkan video youtube jika ada
    if (dataSesiAktif.material.youtubeUrl) {
        let videoId = extractYouTubeId(dataSesiAktif.material.youtubeUrl);
        if (videoId) {
            document.getElementById('viewMateriVideo').src = `https://www.youtube.com/embed/${videoId}`;
            document.getElementById('sectionMateriVideo').style.display = 'block';
        }
    }

    // Tampilkan Kuis jika ada soalnya
    if (dataSesiAktif.questions && dataSesiAktif.questions.length > 0) {
        renderSoalKuis(dataSesiAktif.questions);
        document.getElementById('sectionKuis').style.display = 'block';
    }

    // Tampilkan form upload tugas jika dikonfigurasi wajib oleh guru
    if (dataSesiAktif.config && dataSesiAktif.config.requiresAssignment) {
        document.getElementById('sectionTugas').style.display = 'block';
    }
}

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function renderSoalKuis(listSoal) {
    const container = document.getElementById('tempatSoalSiswa');
    container.innerHTML = '';

    listSoal.forEach((soal, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'soal-card';
        itemDiv.style.background = '#ffffff';
        itemDiv.style.border = '1px solid #cbd5e1';

        itemDiv.innerHTML = `
            <p style="font-weight:600; margin-top:0;">${index + 1}. ${soal.question}</p>
            <div style="display:flex; flex-direction:column; gap:8px;">
                <label><input type="radio" name="jawaban_${soal.id}" value="A" required> A. ${soal.options.A}</label>
                <label><input type="radio" name="jawaban_${soal.id}" value="B"> B. ${soal.options.B}</label>
                <label><input type="radio" name="jawaban_${soal.id}" value="C"> C. ${soal.options.C}</label>
                <label><input type="radio" name="jawaban_${soal.id}" value="D"> D. ${soal.options.D}</label>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

// ══════════════════════════════════════════════
// PROSES OPTIMASI UPLOAD FILE TUGAS SISWA
// ══════════════════════════════════════════════
window.prosesFileTugas = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert("❌ File terlalu besar! Maksimal 5MB.");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        base64TugasSiswa = e.target.result; // Data Base64 siap dikirim
        const info = document.getElementById('infoFileTugas');
        info.style.display = 'block';
        info.textContent = `✅ File "${file.nama || 'Tugas'}" siap dikirim.`;
    };
    reader.readAsDataURL(file);
};

// ══════════════════════════════════════════════
// PROSES KIRIM JAWABAN AKHIR KE FIRESTORE
// ══════════════════════════════════════════════
window.submitJawabanSiswa = async function() {
    const btn = document.getElementById('btnSubmitFinal');
    btn.disabled = true;
    btn.textContent = "⏳ Mengirimkan Pekerjaan...";

    const pin = document.getElementById('studentPin').value.trim();
    const nama = document.getElementById('studentName').value.trim();
    const absen = document.getElementById('studentId').value.trim();

    // 1. Hitung Nilai Kuis Otomatis secara internal
    let jumlahBenar = 0;
    let totalSoal = dataSesiAktif.questions.length;
    const detailJawabanSiswa = {};

    dataSesiAktif.questions.forEach(soal => {
        const terpilih = document.querySelector(`input[name="jawaban_${soal.id}"]:checked`);
        const nilaiJawaban = terpilih ? terpilih.value : "";
        
        detailJawabanSiswa[soal.id] = nilaiJawaban;
        if (nilaiJawaban === soal.correct) {
            jumlahBenar++;
        }
    });

    let nilaiAkhirKuis = totalSoal > 0 ? Math.round((jumlahBenar / totalSoal) * 100) : 0;

    // 2. Susun Objek Respons Dokumen Tunggal
    const responsSiswa = {
        sessionId: pin,
        studentName: nama,
        studentId: absen,
        quizScore: nilaiAkhirKuis,
        answers: detailJawabanSiswa,
        fileAssignmentUrl: base64TugasSiswa, // Menyimpan gambar tugas terkompresi
        submittedAt: new Date().toISOString()
    };

    try {
        // 3. Simpan Jawaban ke Koleksi 'student_responses'
        // Custom ID Dokumen gabungan: PIN_ABSEN agar mempermudah indexing rekap guru
        await db.collection('student_responses').doc(`${pin}_${absen}`).set(responsSiswa);

        alert(`🎉 TERKIRIM!\n\nTugas dan Kuis Anda berhasil disimpan oleh sistem.\nNilai Kuis otomatis Anda: ${nilaiAkhirKuis}`);
        window.location.reload(); // Refresh halaman setelah sukses kirim data

    } catch (error) {
        alert("❌ Gagal mengirimkan tugas: " + error.message);
        btn.disabled = false;
        btn.textContent = "💾 Kirim Semua Jawaban & Tugas";
    }
};
