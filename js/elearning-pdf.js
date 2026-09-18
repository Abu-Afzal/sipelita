/**
 * E-Learning PDF Generator - SIPELITA GURU
 * Format disesuaikan 100% dengan Rekap Presensi/Jurnal SIPENA v2
 * PENTING: Mengambil data KOP & TTD secara dinamis dari variabel global 
 * CONFIG_MADRASAH dan currentUserData yang sudah disiapkan di elearning-hasil.html
 */

(function () {
    'use strict';

    // ✅ 1. Fungsi pembantu format nama dan gelar (Scoped di dalam IIFE)
    function rapikanGelar(token) {
        if (!token) return '';
        let t = token.trim();
        const adaTitikAkhir = t.endsWith('.');
        const clean = t.replace(/\.+$/, '');
        
        const GELAR_BAKU = [
            'S.Pd','M.Pd','S.Ag','M.Ag','S.Pd.I','M.Pd.I','S.S','M.S','S.Sos','M.Sos',
            'S.Kom','M.Kom','S.E','M.M','S.H','M.H','S.Psi','M.Psi','S.T','M.T','S.Farm','A.Md',
            'Dra','Drs','Dr','Prof','H','Hj','Ir','KH'
        ];
        
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

    // ✅ 2. FUNGSI EXPORT PDF UTAMA
    window.exportPDFLaporan = async function(event) {
        const evt = event || window.event;
        
        // Akses variabel global dari elearning-hasil.html
        const globalDaftarJawaban = typeof window.daftarJawaban !== 'undefined' ? window.daftarJawaban : [];
        const globalCurrentSession = typeof window.currentSession !== 'undefined' ? window.currentSession : {};
        const globalCurrentUserData = typeof window.currentUserData !== 'undefined' ? window.currentUserData : {};
        const globalConfigMadrasah = typeof window.CONFIG_MADRASAH !== 'undefined' ? window.CONFIG_MADRASAH : {};

        if (globalDaftarJawaban.length === 0) {
            alert('Tidak ada data untuk dicetak!');
            return;
        }

        const btn = evt?.target?.closest('button');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyiapkan...';
        }

        try {
            const sesi = globalCurrentSession;
            const today = new Date();
            const NAMA_BULAN_GLOBAL = typeof window.NAMA_BULAN !== 'undefined' ? window.NAMA_BULAN : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const tglSurat = `${today.getDate()} ${NAMA_BULAN_GLOBAL[today.getMonth()]} ${today.getFullYear()}`;
            
            // Data Statistik
            const yangSudah = globalDaftarJawaban.filter(d => d.sudahKirim);
            const nilaiList = yangSudah.map(d => d.nilai).filter(n => n !== undefined && n !== null);
            const rata = nilaiList.length > 0 ? Math.round(nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length) : 0;
            const maxNilai = nilaiList.length > 0 ? Math.max(...nilaiList) : 0;
            const minNilai = nilaiList.length > 0 ? Math.min(...nilaiList) : 0;
            const kkm = sesi.kkm || 70;
            const lulus = nilaiList.filter(n => n >= kkm).length;
            const pctLulus = yangSudah.length > 0 ? Math.round(lulus / yangSudah.length * 100) : 0;

            // 1. KOP SURAT (Sesuai Acuan: Dinamis dari CONFIG_MADRASAH)
            const logoKop = globalConfigMadrasah.logo || (location.origin + '/assets/images/kemenag-app.png');
            
            const kopHtml = `
                <div style="border-bottom:3px double #000; padding-bottom:8px; margin-bottom:16px;">
                    <table style="width:100%; border-collapse:collapse;">
                        <tr>
                            <td style="width:75px; text-align:center; vertical-align:middle; border:none;">
                                <img src="${logoKop}" style="width:62px; height:auto;" onerror="this.style.visibility='hidden'">
                            </td>
                            <td style="text-align:center; border:none;">
                                <div style="font-size:14pt; font-weight:bold;">${globalConfigMadrasah.kop1 || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'}</div>
                                <div style="font-size:14pt; font-weight:bold;">${globalConfigMadrasah.kop2 || 'KEMENTERIAN AGAMA KABUPATEN ...'}</div>
                                <div style="font-size:12pt; font-style:italic;">${globalConfigMadrasah.alamat || 'Alamat Madrasah'}</div>
                            </td>
                            <td style="width:75px; border:none;"></td>
                        </tr>
                    </table>
                </div>`;

            // 2. TABEL SISWA
            const sorted = [...globalDaftarJawaban].sort((a, b) => {
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
                    <td style="${cellStyle} text-align:center;">${d.siswaKelas || '-'}</td>
                    <td style="${cellStyle} text-align:center;">${d.sudahKirim ? d.totalBenar : '-'}</td>
                    <td style="${cellStyle} text-align:center;">${d.sudahKirim ? d.totalSalah : '-'}</td>
                    <td style="${cellStyle} text-align:center; font-weight:bold;">${d.sudahKirim ? d.nilai : '-'}</td>
                    <td style="${cellStyle} text-align:center;">${durasi}</td>
                    <td style="${cellStyle} text-align:center;">${status}</td>
                </tr>`;
            }).join('');

            // 3. BLOK TANDA TANGAN (Sesuai Acuan: Dinamis dari currentUserData & CONFIG_MADRASAH)
            // Ambil data Guru (Prioritas: currentUserData -> data sesi)
            let rawGuruNama = globalCurrentUserData.namaResmi || globalCurrentUserData.nama || sesi.guruNama || '................................................';
            let rawGuruNip = globalCurrentUserData.nip || globalCurrentUserData.NIP || sesi.guruNIP || '';
            let guruNip = rawGuruNip ? (rawGuruNip.startsWith('NIP.') ? rawGuruNip : 'NIP. ' + rawGuruNip) : 'NIP. ............................................';

            // Ambil data Kamad (Prioritas: CONFIG_MADRASAH)
            let rawKepalaNama = globalConfigMadrasah.kepalaMadrasah || '................................................';
            let rawKepalaNip = globalConfigMadrasah.nipKepala || '';
            let kepalaNip = rawKepalaNip ? (rawKepalaNip.startsWith('NIP.') ? rawKepalaNip : 'NIP. ' + rawKepalaNip) : 'NIP. ............................................';

            // Format Nama dengan Gelar
            const namaGuruCetak = formatNamaGelar(rawGuruNama);
            const namaKamadCetak = formatNamaGelar(rawKepalaNama);
            const kota = globalConfigMadrasah.kota || 'Bantaeng';

            const ttdHtml = `
                <table style="width:100%; margin-top:28px; font-size:12pt;">
                    <tr>
                        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:24px; padding-top:22px;">
                            Mengetahui,<br>Kepala Madrasah
                            <div style="height:60px;"></div>
                            <b><u><span style="font-size:10pt; white-space:nowrap;">${namaKamadCetak}</span></u></b><br>
                            <b style="font-size:10pt;">${kepalaNip}</b>
                        </td>
                        <td style="width:50%; text-align:left; vertical-align:top; border:none; padding-left:100px;">
                            ${kota}, ${tglSurat}<br>Guru Mata Pelajaran
                            <div style="height:60px;"></div>
                            <b><u><span style="font-size:10pt; white-space:nowrap;">${namaGuruCetak}</span></u></b><br>
                            <b style="font-size:10pt;">${guruNip}</b>
                        </td>
                    </tr>
                </table>`;

            // 4. GABUNGKAN KE HTML PRINT WINDOW
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Laporan E-Learning - ${sesi.kelasTarget || 'Kelas'}</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; font-size: 11pt; padding: 20px; color: #000; }
                        @media print { body { margin: 0; padding: 20px; } }
                    </style>
                </head>
                <body>
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
                    </table>

                    <div style="font-size:11pt; font-weight:bold; margin:12px 0 8px 0;">STATISTIK HASIL</div>
                    <table style="width:100%; border-collapse:collapse; font-size:10pt; margin-bottom:14px;">
                        <tr>
                            <td style="${cellStyle} width:25%;">Total Siswa</td>
                            <td style="${cellStyle} text-align:center; font-weight:bold; width:25%;">${globalDaftarJawaban.length} siswa</td>
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
                        Laporan ini digenerate otomatis oleh Sistem E-Learning SIPELITA
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();

            // Tunggu gambar selesai dimuat sebelum print
            const images = Array.from(printWindow.document.images);
            Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            })).then(() => {
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                }, 300);
            });

        } catch (error) {
            console.error('Error mencetak laporan:', error);
            alert('❌ Gagal menyiapkan dokumen: ' + error.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    };
})();