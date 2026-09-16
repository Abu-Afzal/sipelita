/**
 * E-Learning PDF Generator - MAN Bantaeng
 * Format disesuaikan 100% dengan Rekap Presensi SIPENA v2
 */

// Fungsi untuk merapikan gelar (S.Pd, M.Pd, S.Ag, dll)
function rapikanGelar(token) {
    if (!token) return '';
    let t = token.trim();
    const adaTitikAkhir = t.endsWith('.');
    const clean = t.replace(/\.+$/, '');
    
    const GELAR_BAKU = ['S.Pd','M.Pd','S.Ag','M.Ag','S.Pd.I','M.Pd.I','S.S','M.S','S.Sos','M.Sos',
        'S.Kom','M.Kom','S.E','M.M','S.H','M.H','S.Psi','M.Psi','S.T','M.T','S.Farm','A.Md',
        'Dra','Drs','Dr','Prof','H','Hj','Ir','KH'];
    
    const found = GELAR_BAKU.find(g => g.toLowerCase() === clean.toLowerCase());
    if (found) return found + (adaTitikAkhir ? '.' : '');
    
    if (clean.includes('.')) {
        return clean.split('.').map(seg =>
            seg.length <= 1 ? seg.toUpperCase() : seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase()
        ).join('.');
    }
    return clean.length <= 2 ? clean.toUpperCase() : clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function formatNamaGelar(text) {
    if (!text) return '';
    const parts = text.split(',');
    const GELAR_DEPAN = ['Drs','Dra','Dr','Prof','H','Hj','Ir','KH'];
    let tokens = parts[0].trim().split(/\s+/);
    const depan = [];
    while (tokens.length) {
        const t = tokens[0].replace(/\.+$/, '');
        const m = GELAR_DEPAN.find(g => g.toLowerCase() === t.toLowerCase());
        if (m) { depan.push(m + '.'); tokens.shift(); } else break;
    }
    const namaInti = tokens.join(' ').toUpperCase();
    const belakang = parts.slice(1).map(rapikanGelar).filter(Boolean).join(',');
    let hasil = (depan.length ? depan.join(' ') + ' ' : '') + namaInti;
    if (belakang) hasil += ', ' + belakang;
    return hasil;
}

/**
 * Cache Manager (inline jika file terpisah tidak tersedia)
 */
const CacheManager = {
    memory: new Map(),
    storage: {
        get(key) {
            try {
                const item = localStorage.getItem(`sipelita_cache_${key}`);
                if (!item) return null;
                const parsed = JSON.parse(item);
                if (parsed.expiry && Date.now() > parsed.expiry) {
                    localStorage.removeItem(`sipelita_cache_${key}`);
                    return null;
                }
                return parsed.data;
            } catch (e) { return null; }
        },
        set(key, data, ttlMinutes = 10) {
            try {
                const item = { data: data, expiry: Date.now() + (ttlMinutes * 60 * 1000) };
                localStorage.setItem(`sipelita_cache_${key}`, JSON.stringify(item));
            } catch (e) { console.warn('Cache penuh:', e); }
        }
    },
    get(key) {
        if (this.memory.has(key)) return this.memory.get(key);
        const fromStorage = this.storage.get(key);
        if (fromStorage) this.memory.set(key, fromStorage);
        return fromStorage;
    },
    set(key, data, ttlMinutes = 10) {
        this.memory.set(key, data);
        this.storage.set(key, data, ttlMinutes);
    }
};

// Fungsi format nama dengan gelar
function rapikanGelar(token) {
    if (!token) return '';
    let t = token.trim();
    const adaTitikAkhir = t.endsWith('.');
    const clean = t.replace(/\.+$/, '');
    const GELAR_BAKU = ['S.Pd','M.Pd','S.Ag','M.Ag','S.Pd.I','M.Pd.I','S.S','M.S','S.Sos','M.Sos',
        'S.Kom','M.Kom','S.E','M.M','S.H','M.H','S.Psi','M.Psi','S.T','M.T','S.Farm','A.Md',
        'Dra','Drs','Dr','Prof','H','Hj','Ir','KH'];
    const found = GELAR_BAKU.find(g => g.toLowerCase() === clean.toLowerCase());
    if (found) return found + (adaTitikAkhir ? '.' : '');
    if (clean.includes('.')) {
        return clean.split('.').map(seg =>
            seg.length <= 1 ? seg.toUpperCase() : seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase()
        ).join('.');
    }
    return clean.length <= 2 ? clean.toUpperCase() : clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function formatNamaGelar(text) {
    if (!text) return '';
    const parts = text.split(',');
    const GELAR_DEPAN = ['Drs','Dra','Dr','Prof','H','Hj','Ir','KH'];
    let tokens = parts[0].trim().split(/\s+/);
    const depan = [];
    while (tokens.length) {
        const t = tokens[0].replace(/\.+$/, '');
        const m = GELAR_DEPAN.find(g => g.toLowerCase() === t.toLowerCase());
        if (m) { depan.push(m + '.'); tokens.shift(); } else break;
    }
    const namaInti = tokens.join(' ').toUpperCase();
    const belakang = parts.slice(1).map(rapikanGelar).filter(Boolean).join(',');
    let hasil = (depan.length ? depan.join(' ') + ' ' : '') + namaInti;
    if (belakang) hasil += ', ' + belakang;
    return hasil;
}

window.exportPDFLaporan = async function() {
    if (typeof daftarJawaban === 'undefined' || daftarJawaban.length === 0) {
        alert('Tidak ada data untuk dicetak!');
        return;
    }

    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyiapkan Dokumen...';

    try {
        const sesi = typeof currentSession !== 'undefined' ? currentSession : {};
        const today = new Date();
        const tglSurat = `${today.getDate()} ${typeof NAMA_BULAN !== 'undefined' ? NAMA_BULAN[today.getMonth()] : today.toLocaleDateString('id-ID', {month:'long'})} ${today.getFullYear()}`;
        
        // Data Statistik
        const yangSudah = daftarJawaban.filter(d => d.sudahKirim);
        const nilaiList = yangSudah.map(d => d.nilai).filter(n => n !== undefined && n !== null);
        const rata = nilaiList.length > 0 ? Math.round(nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length) : 0;
        const maxNilai = nilaiList.length > 0 ? Math.max(...nilaiList) : 0;
        const minNilai = nilaiList.length > 0 ? Math.min(...nilaiList) : 0;
        const kkm = sesi.kkm || 70;
        const lulus = nilaiList.filter(n => n >= kkm).length;
        const pctLulus = yangSudah.length > 0 ? Math.round(lulus / yangSudah.length * 100) : 0;

        // 1. KOP SURAT
        const logoKop = (typeof CONFIG_MADRASAH !== 'undefined' && CONFIG_MADRASAH.logoData) 
            ? CONFIG_MADRASAH.logoData 
            : (location.origin + '/assets/images/kemenag-app.png');
            
        const logoKananUrl = (typeof CONFIG_MADRASAH !== 'undefined' && CONFIG_MADRASAH.logoKananData) 
            ? CONFIG_MADRASAH.logoKananData 
            : (location.hostname.includes('manbantaeng') ? location.origin + '/assets/images/manbtg-app.png' : '');

        const kopHtml = `
            <div style="border-bottom:3px double #000; padding-bottom:8px; margin-bottom:16px;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="width:75px; text-align:center; vertical-align:middle; border:none;">
                            <img src="${logoKop}" style="width:62px; height:auto;" onerror="this.style.visibility='hidden'">
                        </td>
                        <td style="text-align:center; border:none;">
                            <div style="font-size:14pt; font-weight:bold;">${typeof CONFIG_MADRASAH !== 'undefined' ? CONFIG_MADRASAH.kop1 : 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'}</div>
                            <div style="font-size:12pt; font-weight:bold;">${typeof CONFIG_MADRASAH !== 'undefined' ? CONFIG_MADRASAH.kop2 : 'KEMENTERIAN AGAMA KABUPATEN BANTAENG'}</div>
                            <div style="font-size:11pt; font-weight:bold;">${typeof CONFIG_MADRASAH !== 'undefined' ? CONFIG_MADRASAH.kop3 : 'MADRASAH ALIYAH NEGERI BANTAENG'}</div>
                            <div style="font-size:9pt; font-style:italic;">${typeof CONFIG_MADRASAH !== 'undefined' ? CONFIG_MADRASAH.alamat : 'Jl. Poros Dampang Kel. Gantarangkeke Kab. Bantaeng'}</div>
                        </td>
                        <td style="width:90px; text-align:center; vertical-align:middle; border:none;">
                            ${logoKananUrl ? `<img src="${logoKananUrl}" style="width:85px; height:auto; max-height:75px;" onerror="this.style.visibility='hidden'">` : ''}
                        </td>
                    </tr>
                </table>
            </div>`;

        // 2. TABEL SISWA
        const sorted = [...daftarJawaban].sort((a, b) => {
            if (a.sudahKirim && !b.sudahKirim) return -1;
            if (!a.sudahKirim && b.sudahKirim) return 1;
            if (a.sudahKirim && b.sudahKirim) return (b.nilai || 0) - (a.nilai || 0);
            return 0;
        });

        const cellStyle = "border:1px solid #000; padding:4px; font-size:11pt;";
        const headerStyle = "border:1px solid #000; padding:4px; font-size:11pt; background:#f0f0f0; font-weight:bold; text-align:center;";

        const siswaRows = sorted.map((d, i) => {
            const durasi = d.sudahKirim && d.waktuSelesai && d.waktuMulai 
                ? Math.round((d.waktuSelesai - d.waktuMulai) / 60000) + ' mnt' 
                : '-';
            const status = d.sudahKirim ? (d.tipe === 'catatan' ? 'Catatan' : 'Selesai') : 'Belum';
            
            return `<tr>
                <td style="${cellStyle} text-align:center;">${i + 1}</td>
                <td style="${cellStyle}">${d.siswaNama}</td>
                <td style="${cellStyle} text-align:center;">${d.siswaKelas}</td>
                <td style="${cellStyle} text-align:center;">${d.sudahKirim ? d.totalBenar : '-'}</td>
                <td style="${cellStyle} text-align:center;">${d.sudahKirim ? d.totalSalah : '-'}</td>
                <td style="${cellStyle} text-align:center; font-weight:bold;">${d.sudahKirim ? d.nilai : '-'}</td>
                <td style="${cellStyle} text-align:center;">${durasi}</td>
                <td style="${cellStyle} text-align:center;">${status}</td>
            </tr>`;
        }).join('');

                // ==========================================
        // 3. BLOK TANDA TANGAN (Dengan Cache)
        // ==========================================
        
        let kepalaNama = '................................................';
        let kepalaNip = 'NIP. ............................................';
        let guruNama = '................................................';
        let guruNip = 'NIP. ............................................';

        // ✅ OPTIMASI: Cache data users (hanya fetch 1x per 10 menit)
        const cacheKeyUsers = 'users_all';
        let allUsers = CacheManager.get(cacheKeyUsers);
        
        if (!allUsers) {
            console.log('📚 Fetch semua users dari Firestore...');
            try {
                if (typeof db !== 'undefined') {
                    const usersSnap = await db.collection('users').get();
                    allUsers = [];
                    usersSnap.forEach(doc => {
                        allUsers.push({ id: doc.id, data: doc.data() });
                    });
                    CacheManager.set(cacheKeyUsers, allUsers, 10); // Cache 10 menit
                    console.log('✅ Cache users disimpan');
                }
            } catch (e) {
                console.warn('Gagal fetch users:', e);
            }
        } else {
            console.log('✅ Menggunakan cache users (hemat 41 reads!)');
        }
        
        // Proses data dari cache
        if (allUsers) {
            const currentUserEmail = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.email : '';
            const currentUserId = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : '';
            const sesiEmail = sesi.guruEmail || '';
            
            allUsers.forEach(item => {
                const data = item.data;
                const role = (data.role || '').toString().toLowerCase();
                
                // Cari Kepala Madrasah
                if (role.includes('kepala') || role.includes('head') || role.includes('kamad')) {
                    const namaKamad = data.namaResmi || data.nama || data.name || data.displayName || '';
                    if (namaKamad) kepalaNama = namaKamad;
                    
                    const rawNip = data.nip || data.NIP || '';
                    if (rawNip) {
                        kepalaNip = rawNip.startsWith('NIP.') ? rawNip : 'NIP. ' + rawNip;
                    }
                }
                
                // Cari Guru yang login
                const isGuruLogin = 
                    (data.email && data.email.toLowerCase() === currentUserEmail.toLowerCase()) ||
                    (item.id === currentUserId) ||
                    (data.email && data.email.toLowerCase() === sesiEmail.toLowerCase());
                
                if (isGuruLogin) {
                    const namaGuruDb = data.namaResmi || data.nama || data.name || data.displayName || '';
                    if (namaGuruDb) guruNama = namaGuruDb;
                    
                    const rawGuruNip = data.nip || data.NIP || '';
                    if (rawGuruNip) {
                        guruNip = rawGuruNip.startsWith('NIP.') ? rawGuruNip : 'NIP. ' + rawGuruNip;
                    }
                }
            });
        }

        // Fallback ke currentUserData
        if (guruNama === '................................................') {
            if (typeof currentUserData !== 'undefined' && currentUserData) {
                guruNama = currentUserData.namaResmi || currentUserData.nama || currentUserData.name || guruNama;
                const rawNip = currentUserData.nip || currentUserData.NIP || '';
                if (rawNip) {
                    guruNip = rawNip.startsWith('NIP.') ? rawNip : 'NIP. ' + rawNip;
                }
            }
        }

        // Fallback ke data sesi
        if (guruNama === '................................................') {
            if (sesi.guruNama) guruNama = sesi.guruNama;
            if (sesi.guruNIP) {
                guruNip = sesi.guruNIP.startsWith('NIP.') ? sesi.guruNIP : 'NIP. ' + sesi.guruNIP;
            }
        }

        // Fallback ke CONFIG_MADRASAH untuk Kepala
        if (kepalaNama === '................................................' && typeof CONFIG_MADRASAH !== 'undefined') {
            kepalaNama = CONFIG_MADRASAH.kepalaMadrasah || kepalaNama;
            kepalaNip = CONFIG_MADRASAH.nipKepala || kepalaNip;
            if (kepalaNip && !kepalaNip.startsWith('NIP.')) {
                kepalaNip = 'NIP. ' + kepalaNip;
            }
        }

        // Format nama dengan gelar
        kepalaNama = formatNamaGelar(kepalaNama);
        guruNama = formatNamaGelar(guruNama);
        
        const kota = (typeof CONFIG_MADRASAH !== 'undefined' && CONFIG_MADRASAH.kota) ? CONFIG_MADRASAH.kota : 'Bantaeng';

        const ttdHtml = `
            <table style="width:100%; margin-top:28px; font-size:10pt;">
                <tr>
                    <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:24px;">
                        Mengetahui,<br>Kepala Madrasah
                        <div style="height:60px;"></div>
                        <b><u><span style="font-size:9pt; white-space:nowrap;">${kepalaNama}</span></u></b><br>
                        <b style="font-size:9pt;">${kepalaNip}</b>
                    </td>
                    <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:100px;">
                        ${kota}, ${tglSurat}<br>Guru Mata Pelajaran
                        <div style="height:60px;"></div>
                        <b><u><span style="font-size:9pt; white-space:nowrap;">${guruNama}</span></u></b><br>
                        <b style="font-size:9pt;">${guruNip}</b>
                    </td>
                </tr>
            </table>`;

        // 4. GABUNGKAN KE HTML PRINT WINDOW
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Laporan E-Learning - ${sesi.kelasTarget || 'Kelas'}</title>
            </head>
            <body style="font-family: 'Times New Roman', serif; font-size: 11pt; padding: 20px; color: #000;">
                ${kopHtml}
                
                <div style="text-align:center; margin:12px 0;">
                    <div style="font-size:12pt; font-weight:bold; text-decoration:underline;">LAPORAN HASIL PEMBELAJARAN DARING</div>
                    <div style="font-size:11pt; font-weight:bold;">E-LEARNING SIPELITA</div>
                </div>
                
                <table style="width:100%; margin-bottom:12px; font-size:10pt; border:none;">
                    <tr><td style="width:120px; border:none;">Judul Sesi</td><td style="border:none;">: <b>${sesi.judul || '-'}</b></td></tr>
                    <tr><td style="border:none;">Mata Pelajaran</td><td style="border:none;">: <b>${sesi.mataPelajaran || '-'}</b></td></tr>
                    <tr><td style="border:none;">Kelas</td><td style="border:none;">: <b>${sesi.kelasTarget || '-'}</b></td></tr>
                    <tr><td style="border:none;">Tanggal Dibuat</td><td style="border:none;">: <b>${new Date(sesi.createdAt || Date.now()).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</b></td></tr>
                    <tr><td style="border:none;">Durasi</td><td style="border:none;">: <b>${sesi.durasiMenit > 0 ? sesi.durasiMenit + ' menit' : 'Tanpa batas'}</b></td></tr>
                    <tr><td style="border:none;">Total Soal</td><td style="border:none;">: <b>${sesi.totalSoal || 0} soal</b></td></tr>
                </table>

                <div style="font-size:11pt; font-weight:bold; margin:12px 0 8px 0;">STATISTIK HASIL</div>
                <table style="width:100%; border-collapse:collapse; font-size:10pt; margin-bottom:14px;">
                    <tr>
                        <td style="${cellStyle} width:25%;">Total Siswa</td>
                        <td style="${cellStyle} text-align:center; font-weight:bold; width:25%;">${daftarJawaban.length} siswa</td>
                        <td style="${cellStyle} width:25%;">Sudah Mengerjakan</td>
                        <td style="${cellStyle} text-align:center; font-weight:bold; width:25%;">${yangSudah.length} siswa</td>
                    </tr>
                    <tr>
                        <td style="${cellStyle}">Rata-rata Nilai</td>
                        <td style="${cellStyle} text-align:center; font-weight:bold;">${rata}</td>
                        <td style="${cellStyle}">Nilai Tertinggi</td>
                        <td style="${cellStyle} text-align:center; font-weight:bold;">${maxNilai}</td>
                    </tr>
                    <tr>
                        <td style="${cellStyle}">Nilai Terendah</td>
                        <td style="${cellStyle} text-align:center; font-weight:bold;">${minNilai}</td>
                        <td style="${cellStyle}">Lulus (≥${kkm})</td>
                        <td style="${cellStyle} text-align:center; font-weight:bold;">${lulus} siswa (${pctLulus}%)</td>
                    </tr>
                </table>

                <div style="font-size:11pt; font-weight:bold; margin:12px 0 8px 0;">DAFTAR NILAI SISWA</div>
                <table style="width:100%; border-collapse:collapse; font-size:10pt;">
                    <thead>
                        <tr>
                            <th style="${headerStyle}" width="30">No</th>
                            <th style="${headerStyle}">Nama Siswa</th>
                            <th style="${headerStyle}" width="50">Kelas</th>
                            <th style="${headerStyle}" width="40">Benar</th>
                            <th style="${headerStyle}" width="40">Salah</th>
                            <th style="${headerStyle}" width="40">Nilai</th>
                            <th style="${headerStyle}" width="60">Waktu</th>
                            <th style="${headerStyle}" width="70">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${siswaRows}
                    </tbody>
                </table>

                ${ttdHtml}

                <div style="margin-top:20px; font-size:8pt; text-align:center; color:#666;">
                    Laporan ini digenerate otomatis oleh Sistem E-Learning SIPELITA - MAN Bantaeng
                </div>

                <script>
                    window.onload = function() {
                        let attempts = 0;
                        const check = setInterval(() => {
                            const imgs = document.querySelectorAll('img');
                            const allLoaded = Array.from(imgs).every(img => img.complete && img.naturalHeight > 0);
                            attempts++;
                            if (allLoaded || attempts > 20) {
                                clearInterval(check);
                                setTimeout(() => window.print(), 300);
                            }
                        }, 100);
                    };
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();

    } catch (error) {
        console.error('Error mencetak laporan:', error);
        alert('❌ Gagal menyiapkan dokumen: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};
