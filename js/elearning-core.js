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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth(); // ✅ PASTIKAN INI ADA

// ═════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
let currentUser = null;
let daftarSesi = [];

// ══════════════════════════════════════════════
// UTILITIES
// ═════════════════════════════════════════════
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
    const sessionList = document.getElementById('sessionList');
    
    if (!loading || !empty || !sessionList) {
        console.error('Element DOM tidak ditemukan!');
        return;
    }
    
    try {
        const snapshot = await db.collection('learning_sessions')
            .where('guruEmail', '==', currentUser.email)
            .orderBy('createdAt', 'desc')
            .get();
        
        daftarSesi = [];
        
        // ✅ HITUNG REAL-TIME DARI student_responses
        for (const doc of snapshot.docs) {
            const sesiData = doc.data();
            
            // Hitung jumlah siswa yang sudah submit untuk sesi ini
            const responsesSnap = await db.collection('student_responses')
                .where('sessionId', '==', doc.id)
                .get();
            
            const totalSiswaJoin = responsesSnap.size;
            
            // Hitung rata-rata nilai dari jawaban yang ada
            let sumNilai = 0;
            let countNilai = 0;
            responsesSnap.forEach(respDoc => {
                const nilai = respDoc.data().nilai || 0;
                sumNilai += nilai;
                countNilai++;
            });
            const rataRataNilai = countNilai > 0 ? sumNilai / countNilai : 0;
            
            // Update data sesi dengan nilai real-time
            daftarSesi.push({
                id: doc.id,
                ...sesiData,
                totalSiswaJoin: totalSiswaJoin, // ✅ Override dengan nilai real-time
                totalSiswaSelesai: totalSiswaJoin,
                rataRataNilai: rataRataNilai // ✅ Override dengan nilai real-time
            });
        }
        
        loading.style.display = 'none';
        
        if (daftarSesi.length === 0) {
            empty.style.display = 'block';
            sessionList.style.display = 'none';
            return;
        }
        
        empty.style.display = 'none';
        sessionList.style.display = 'flex';
        renderSesiList();
        updateStatistik();
        
    } catch (error) {
        console.error('Error:', error);
        if (loading) {
            loading.innerHTML = `<div style="color: red; padding: 20px;">❌ ${error.message}</div>`;
            loading.style.display = 'block';
        }
    }
};

function renderSesiList() {
    const sessionList = document.getElementById('sessionList');
    if (!sessionList) return;
    
    if (daftarSesi.length === 0) {
        sessionList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-light);">Tidak ada sesi</div>';
        return;
    }
    
    sessionList.innerHTML = daftarSesi.map(sesi => {
        const statusClass = sesi.status === 'aktif' ? 'active' : sesi.status === 'selesai' ? 'selesai' : '';
        const statusBadge = sesi.status === 'aktif' 
            ? '<span class="badge badge-aktif">● Aktif</span>'
            : sesi.status === 'draft'
            ? '<span class="badge badge-draft">○ Draft</span>'
            : '<span class="badge badge-selesai">✓ Selesai</span>';
        
        const joinLink = `${window.location.origin}/pages/join.html?pin=${sesi.pin}`;
        const judulEscaped = sesi.judul.replace(/'/g, "\\'");
        
        return `
            <div class="session-card ${statusClass}">
                <div class="session-main">
                    <div class="session-top">
                        <div>
                            <div class="session-title">${sesi.judul}</div>
                            <div class="session-info">
                                <span><i class="fas fa-book"></i> ${sesi.mataPelajaran}</span>
                                <span><i class="fas fa-users"></i> ${sesi.kelasTarget}</span>
                                <span><i class="fas fa-question-circle"></i> ${sesi.totalSoal || 0} soal</span>
                            </div>
                        </div>
                        ${statusBadge}
                    </div>
                    
                    ${sesi.status === 'aktif' ? `
                        <div class="pin-box">
                            <div class="pin-label">PIN SESI</div>
                            <div class="pin-code">${sesi.pin}</div>
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
                </div>
                
                <div class="session-actions">
                    <a href="elearning-hasil.html?id=${sesi.id}" class="btn btn-primary btn-sm"> Hasil</a>
                    ${sesi.status === 'aktif' ? `
                        <button class="btn btn-warning btn-sm" onclick="copyLink('${joinLink}', '${sesi.pin}')">📋 Copy</button>
                        <button class="btn btn-success btn-sm" onclick="shareWA('${judulEscaped}', '${joinLink}', '${sesi.pin}')">📱 WA</button>
                        <button class="btn btn-danger btn-sm" onclick="tutupSesi('${sesi.id}')">🔒 Tutup</button>
                    ` : `
                        <button class="btn btn-warning btn-sm" onclick="shareWA('${judulEscaped}', '${joinLink}', '${sesi.pin}')">📱 Share</button>
                    `}
                    <button class="btn btn-danger btn-sm" style="background: #ef4444; margin-top: 4px;" onclick="hapusSesi('${sesi.id}', '${judulEscaped}')">🗑 Hapus</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateStatistik() {
    const totalEl = document.getElementById('statTotal');
    const aktifEl = document.getElementById('statAktif');
    const siswaEl = document.getElementById('statSiswa');
    const nilaiEl = document.getElementById('statNilai');
    
    if (!totalEl || !aktifEl || !siswaEl || !nilaiEl) return;
    
    const total = daftarSesi.length;
    const aktif = daftarSesi.filter(s => s.status === 'aktif').length;
    const totalSiswa = daftarSesi.reduce((sum, s) => sum + (s.totalSiswaJoin || 0), 0);
    const nilaiList = daftarSesi.filter(s => s.rataRataNilai).map(s => s.rataRataNilai);
    const rataNilai = nilaiList.length > 0 
        ? Math.round(nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length)
        : '-';
    
    totalEl.textContent = total;
    aktifEl.textContent = aktif;
    siswaEl.textContent = totalSiswa;
    nilaiEl.textContent = rataNilai;
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
        alert('✅ Sesi berhasil ditutup!');
        loadDaftarSesi();
    } catch (error) {
        alert('❌ Gagal: ' + error.message);
    }
};

// ══════════════════════════════════════════════
// HAPUS SESI (Permanen)
// ══════════════════════════════════════════════
window.hapusSesi = async function(id, judul) {
    console.log('=== DEBUG HAPUS SESI ===');
    console.log('Session ID:', id);
    console.log('Judul:', judul);
    
    const user = getCurrentUser();
    console.log('Current User:', user);
    
    console.log('Firebase Auth:', firebase.auth);
    console.log('Current User Auth:', firebase.auth().currentUser);
    
    if (!confirm(`⚠️ PERINGATAN!\n\nAnda akan menghapus sesi "${judul}" secara PERMANEN.\n\nSemua data jawaban siswa akan ikut terhapus.`)) return;
    
    try {
        // 1. Cek dokumen sesi terlebih dahulu
        console.log('Mengecek dokumen sesi...');
        const sessionDoc = await db.collection('learning_sessions').doc(id).get();
        
        if (!sessionDoc.exists) {
            throw new Error('Dokumen sesi tidak ditemukan!');
        }
        
        const sessionData = sessionDoc.data();
        console.log('Data sesi:', sessionData);
        console.log('Guru Email di DB:', sessionData.guruEmail);
        
        // 2. Hapus semua jawaban siswa
        console.log('Mencari jawaban siswa...');
        const responsesSnap = await db.collection('student_responses')
            .where('sessionId', '==', id)
            .get();
        
        console.log(`Ditemukan ${responsesSnap.size} jawaban`);
        
        if (!responsesSnap.empty) {
            console.log('Menghapus jawaban secara batch...');
            const batch = db.batch();
            responsesSnap.forEach(doc => {
                console.log('  - Hapus:', doc.id);
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`✅ ${responsesSnap.size} jawaban dihapus`);
        }
        
        // 3. Hapus sesi
        console.log('Menghapus sesi...');
        await db.collection('learning_sessions').doc(id).delete();
        console.log('✅ Sesi berhasil dihapus');
        
        alert('✅ Sesi berhasil dihapus permanen!');
        loadDaftarSesi();
        
    } catch (error) {
        console.error('❌ ERROR DETAIL:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        alert(`❌ Gagal menghapus:\n\nCode: ${error.code}\nMessage: ${error.message}`);
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
        kelasSipenaId: data.kelasSipenaId || '', // ✅ TAMBAHKAN BARIS INI AGAR TERSIMPAN
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
    
    return { id: docRef.id, pin: pin, link: link };
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
    const siswaId = `${data.siswaNama}-${data.siswaKelas}-${data.sessionId}`.toLowerCase().replace(/\s+/g, '-');
    
    const existing = await db.collection('student_responses')
        .where('siswaId', '==', siswaId)
        .limit(1)
        .get();
    
    if (!existing.empty) {
        throw new Error('Anda sudah mengerjakan sesi ini!');
    }
    
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
