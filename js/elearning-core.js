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
// STATE
// ══════════════════════════════════════════════
let currentUser = null;
let daftarSesi = [];

// ══════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════
function generatePIN() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function generateSlug(judul) {
    return judul.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 30) + '-' + Math.random().toString(36).substring(2, 6);
}

function getCurrentUser() {
    try {
        const userStr = localStorage.getItem('sipelita_user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
}

// ══════════════════════════════════════════════
// DASHBOARD GURU: Load Daftar Sesi
// ══════════════════════════════════════════════
window.loadDaftarSesi = async function() {
    currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Anda harus login!');
        window.location.href = '../index.html';
        return;
    }
    
    const loading = document.getElementById('loadingState');
    const empty = document.getElementById('emptyState');
    const grid = document.getElementById('sessionGrid');
    
    try {
        const snapshot = await db.collection('learning_sessions')
            .where('guruEmail', '==', currentUser.email)
            .orderBy('createdAt', 'desc')
            .get();
        
        daftarSesi = [];
        snapshot.forEach(doc => {
            daftarSesi.push({ id: doc.id, ...doc.data() });
        });
        
        loading.style.display = 'none';
        
        if (daftarSesi.length === 0) {
            empty.style.display = 'block';
            return;
        }
        
        grid.style.display = 'grid';
        renderSesiGrid();
        updateStatistik();
        
    } catch (error) {
        console.error('Error:', error);
        loading.innerHTML = `<div style="color: red;">❌ ${error.message}</div>`;
    }
};

function renderSesiGrid() {
    const grid = document.getElementById('sessionGrid');
    
    grid.innerHTML = daftarSesi.map(sesi => {
        const statusBadge = sesi.status === 'aktif' 
            ? '<span class="badge badge-aktif">● Aktif</span>'
            : sesi.status === 'draft'
            ? '<span class="badge badge-draft">○ Draft</span>'
            : '<span class="badge badge-selesai">✓ Selesai</span>';
        
        const joinLink = `${window.location.origin}/pages/join.html?pin=${sesi.pin}`;
        
        return `
            <div class="session-card ${sesi.status}">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div class="session-title">${sesi.judul}</div>
                    ${statusBadge}
                </div>
                
                <div class="session-meta">
                    <span>📚 ${sesi.mataPelajaran}</span>
                    <span>👥 ${sesi.kelasTarget}</span>
                    <span>❓ ${sesi.totalSoal || 0} soal</span>
                </div>
                
                ${sesi.status === 'aktif' ? `
                    <div class="pin-display">
                        <div class="label">PIN SESI</div>
                        <div class="pin">${sesi.pin}</div>
                    </div>
                ` : ''}
                
                <div class="session-stats">
                    <div class="session-stat">
                        <div class="num">${sesi.totalSiswaJoin || 0}</div>
                        <div class="lbl">Siswa Join</div>
                    </div>
                    <div class="session-stat">
                        <div class="num">${sesi.totalSiswaSelesai || 0}</div>
                        <div class="lbl">Selesai</div>
                    </div>
                    <div class="session-stat">
                        <div class="num">${sesi.rataRataNilai ? Math.round(sesi.rataRataNilai) : '-'}</div>
                        <div class="lbl">Rata-rata</div>
                    </div>
                </div>
                
                <div class="session-actions">
                    <a href="elearning-hasil.html?id=${sesi.id}" class="btn btn-primary btn-sm">📊 Hasil</a>
                    ${sesi.status === 'aktif' ? `
                        <button class="btn btn-warning btn-sm" onclick="copyLink('${joinLink}', '${sesi.pin}')">📋 Copy Link</button>
                        <button class="btn btn-success btn-sm" onclick="shareWA('${sesi.judul.replace(/'/g, "\\'")}', '${joinLink}', '${sesi.pin}')">📱 WA</button>
                        <button class="btn btn-danger btn-sm" onclick="tutupSesi('${sesi.id}')">🔒 Tutup</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function updateStatistik() {
    const total = daftarSesi.length;
    const aktif = daftarSesi.filter(s => s.status === 'aktif').length;
    const totalSiswa = daftarSesi.reduce((sum, s) => sum + (s.totalSiswaJoin || 0), 0);
    const nilaiList = daftarSesi.filter(s => s.rataRataNilai).map(s => s.rataRataNilai);
    const rataNilai = nilaiList.length > 0 
        ? Math.round(nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length)
        : '-';
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statAktif').textContent = aktif;
    document.getElementById('statSiswa').textContent = totalSiswa;
    document.getElementById('statNilai').textContent = rataNilai;
}

window.copyLink = async function(link, pin) {
    try {
        await navigator.clipboard.writeText(link);
        alert(`✅ Link berhasil disalin!\n\nPIN: ${pin}\nLink: ${link}`);
    } catch (e) {
        prompt('Copy link ini:', link);
    }
};

window.shareWA = function(judul, link, pin) {
    const pesan = `📚 *${judul}*\n\n` +
                  `Silakan kerjakan quiz berikut:\n\n` +
                  `🔑 PIN: *${pin}*\n` +
                  `🔗 Link: ${link}\n\n` +
                  `Selamat belajar! 🎓`;
    window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`);
};

window.tutupSesi = async function(id) {
    if (!confirm('Yakin ingin menutup sesi ini? Siswa tidak bisa mengerjakan lagi.')) return;
    
    try {
        await db.collection('learning_sessions').doc(id).update({
            status: 'selesai',
            updatedAt: new Date().toISOString()
        });
        loadDaftarSesi();
    } catch (error) {
        alert('❌ Gagal: ' + error.message);
    }
};

// ══════════════════════════════════════════════
// FORM SESI: Publish Sesi Baru
// ══════════════════════════════════════════════
window.publishSesiBaru = async function(data) {
    currentUser = getCurrentUser();
    if (!currentUser) throw new Error('Anda harus login');
    
    const pin = generatePIN();
    const slug = generateSlug(data.judul);
    
    // Tambahkan ID ke setiap soal
    const soalDenganId = data.soal.map((soal, idx) => ({
        ...soal,
        id: `soal_${Date.now()}_${idx}`
    }));
    
    const sesiData = {
        guruEmail: currentUser.email,
        guruNama: currentUser.nama,
        judul: data.judul,
        mataPelajaran: data.mapel,
        kelasTarget: data.kelas,
        
        pin: pin,
        slug: slug,
        
        materi: data.materi,
        soal: soalDenganId,
        
        status: 'aktif',
        durasiMenit: data.durasi,
        maxPercobaan: data.maxPercobaan,
        acakSoal: data.acakSoal,
        
        totalSoal: soalDenganId.length,
        totalSiswaJoin: 0,
        totalSiswaSelesai: 0,
        rataRataNilai: 0,
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('learning_sessions').add(sesiData);
    
    const link = `${window.location.origin}/pages/join.html?pin=${pin}`;
    
    return {
        id: docRef.id,
        pin: pin,
        link: link
    };
};

// ══════════════════════════════════════════════
// HALAMAN JOIN: Ambil Sesi by PIN/Slug
// ══════════════════════════════════════════════
window.getSesiByPin = async function(pin) {
    const snapshot = await db.collection('learning_sessions')
        .where('pin', '==', pin)
        .where('status', '==', 'aktif')
        .limit(1)
        .get();
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
};

window.getSesiBySlug = async function(slug) {
    const snapshot = await db.collection('learning_sessions')
        .where('slug', '==', slug)
        .where('status', '==', 'aktif')
        .limit(1)
        .get();
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
};

// ══════════════════════════════════════════════
// HALAMAN JOIN: Submit Jawaban Siswa
// ══════════════════════════════════════════════
window.submitJawabanSiswa = async function(data) {
    // Cek duplikasi
    const siswaId = `${data.siswaNama}-${data.siswaKelas}-${data.sessionId}`.toLowerCase().replace(/\s+/g, '-');
    
    const existing = await db.collection('student_responses')
        .where('siswaId', '==', siswaId)
        .limit(1)
        .get();
    
    if (!existing.empty) {
        throw new Error('Anda sudah mengerjakan sesi ini!');
    }
    
    // Simpan jawaban
    await db.collection('student_responses').add({
        sessionId: data.sessionId,
        siswaId: siswaId,
        siswaNama: data.siswaNama,
        siswaKelas: data.siswaKelas,
        jawaban: data.jawaban,
        totalBenar: data.totalBenar,
        totalSalah: data.totalSalah,
        nilai: data.nilai,
        waktuMulai: data.waktuMulai,
        waktuSelesai: data.waktuSelesai,
        createdAt: new Date().toISOString()
    });
    
    // Update statistik sesi
    await updateStatistikSesi(data.sessionId);
};

async function updateStatistikSesi(sessionId) {
    const responses = await db.collection('student_responses')
        .where('sessionId', '==', sessionId)
        .get();
    
    const total = responses.size;
    let sumNilai = 0;
    responses.forEach(doc => {
        sumNilai += doc.data().nilai || 0;
    });
    
    const rataRata = total > 0 ? sumNilai / total : 0;
    
    await db.collection('learning_sessions').doc(sessionId).update({
        totalSiswaJoin: total,
        totalSiswaSelesai: total,
        rataRataNilai: rataRata,
        updatedAt: new Date().toISOString()
    });
}
