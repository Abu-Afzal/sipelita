import { db } from './firebase-config.js';
import { simpanAbsensi } from './sican-save.js';
import { tampilkanHasil } from './sican-ui.js';

// Satu Pintu Impor Firebase untuk Keperluan Dropdown & Validasi Dual-Database
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Variabel pengunci global agar kamera tidak melakukan scan bertubi-tubi (efek gema)
let sedangMemprosesScan = false;

// Inisialisasi Aplikasi saat file dimuat
init();

async function init(){
    try {
        await AmbilDaftarKegiatanPusat(); // Menggunakan fungsi internal yang bebas konflik
        startScanner();
    } catch (error) {
        console.error("Gagal menginisialisasi aplikasi:", error);
    }
}

const successAudio = new Audio('assets/audio/success.mp3');
const failedAudio = new Audio('assets/audio/failed.mp3');

function tanggalHariIni(){
    return new Date().toISOString().split('T')[0];
}

function jamSekarang(){
    return new Date().toLocaleTimeString('id-ID');
}

// =========================================================================
// FUNGSI PRODUSEN DROPDOWN - DIKUNCI SESUAI DATA PEMBIASAAN.JS
// =========================================================================
async function AmbilDaftarKegiatanPusat() {
    const kegiatanSelect = document.getElementById('kegiatanSelect');
    if (!kegiatanSelect) return;

    try {
        const snapshot = await getDocs(collection(db, "Kegiatan Absensi"));
        kegiatanSelect.innerHTML = '<option value="">-- Pilih Kegiatan --</option>';
        
        if (snapshot.empty) {
            kegiatanSelect.innerHTML = '<option value="">Belum ada kegiatan aktif</option>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            // Mengunci prioritas pada data.nama sesuai dengan pembiasaan.js
            const namaKegiatan = data.nama || data.kegiatan || doc.id; 
            
            const opt = document.createElement('option');
            opt.value = namaKegiatan;
            opt.textContent = namaKegiatan;
            kegiatanSelect.appendChild(opt);
        });
    } catch (err) {
        console.error("Gagal memuat komponen kegiatan:", err);
        kegiatanSelect.innerHTML = '<option value="">Gagal memuat data kegiatan</option>';
    }
}

// =========================================================================
// LOGIKA SCANNER UTAMA DENGAN FILTER URL & PROTEKSI JEDA KAMERA (COOLDOWN)
// =========================================================================
async function onScanSuccess(decodedText){
    // JALUR PENGAMAN: Jika kamera dalam masa jeda pemrosesan, abaikan scan frame ini!
    if (sedangMemprosesScan) return;

    try {
        const kegiatan = document.getElementById('kegiatanSelect').value;

        if (!kegiatan || kegiatan.trim() === "") {
            throw new Error("Silakan pilih kegiatan terlebih dahulu!");
        }

        // KUNCI SCANNER: Amankan status agar frame video selanjutnya tidak menerobos masuk
        sedangMemprosesScan = true;

        let teksScan = decodedText.trim(); 
        let nisSiswa = "";

        // =========================================================================
        // ANTISIPASI OTOMATIS: JIKA QR CODE TERNYATA BERISI LINK/URL (ME-QR, DLL)
        // =========================================================================
        if (teksScan.includes('http://') || teksScan.includes('https://')) {
            const bagianUrl = teksScan.split('/');
            const bagianUjung = bagianUrl[bagianUrl.length - 1].trim();
            
            if (bagianUjung.includes('#')) {
                nisSiswa = bagianUjung.split('#')[0].trim();
            } else {
                nisSiswa = bagianUjung;
            }
        }
        // JALUR 1: Jika QR berisi format hashtag biasa (Tanpa Link bawaan generator)
        else if (teksScan.includes('#')) {
            const bagianData = teksScan.split('#');
            nisSiswa = bagianData[0].trim(); 
        } 
        // JALUR 2: Jika QR berbentuk JSON
        else if (teksScan.startsWith('{') && teksScan.endsWith('}')) {
            try {
                const dataQR = JSON.parse(teksScan);
                nisSiswa = String(dataQR.nis || dataQR.nisn || "").trim();
            } catch (e) {
                throw new Error("Isi Barcode berupa JSON rusak!");
            }
        }
        // JALUR 3: Jika QR murni berisi teks biasa / angka NIS saja (Rekomendasi)
        else {
            nisSiswa = teksScan;
        }

        if (!nisSiswa) {
            throw new Error("Nomor NIS gagal diekstrak dari kode QR ini!");
        }

        // =========================================================================
        // TAHAP 2: VALIDASI NIS KE MASTER DATA (sican_siswa)
        // =========================================================================
        let qMaster = query(collection(db, "sican_siswa"), where("nis", "==", nisSiswa));
        let snapMaster = await getDocs(qMaster);

        if (snapMaster.empty && !isNaN(nisSiswa)) {
            qMaster = query(collection(db, "sican_siswa"), where("nis", "==", Number(nisSiswa)));
            snapMaster = await getDocs(qMaster);
        }

        if (snapMaster.empty) {
            throw new Error(`NIS [${nisSiswa}] tidak terdaftar di Database Master Admin!`);
        }

        // Ambil data dokumen pertama secara sinkron (Bebas Delay asinkronus)
        const dataSiswaAsli = snapMaster.docs[0].data();

        // Susun payload presensi resmi
        let payload = {
            siswa_nis: String(dataSiswaAsli.nis).trim(), 
            siswa_nama: dataSiswaAsli.nama,
            siswa_kelas: dataSiswaAsli.kelas,
            kegiatan: kegiatan,
            tanggal: tanggalHariIni(),
            jam: jamSekarang()
        };

        // =========================================================================
        // TAHAP 3: VALIDASI DOUBLE ABSEN HARI INI
        // =========================================================================
        const qCekAbsen = query(
            collection(db, "presensi_sican"),
            where("nis", "==", payload.siswa_nis),
            where("tanggal", "==", payload.tanggal),
            where("kegiatan", "==", payload.kegiatan)
        );
        const snapAbsen = await getDocs(qCekAbsen);

        if (!snapAbsen.empty) {
            throw new Error(`${payload.siswa_nama} sudah melakukan absensi ${payload.kegiatan} hari ini!`);
        }

        // =========================================================================
        // TAHAP 4: EKSEKUSI PENYIMPANAN DAN TAMPILAN UI
        // =========================================================================
        
        // Munculkan hasil ke UI terlebih dahulu agar terasa instan bagi user
        tampilkanHasil({
            nama: payload.siswa_nama,
            kelas: payload.siswa_kelas,
            kegiatan: payload.kegiatan
        });

        // Simpan data log logis ke Firestore
        await simpanAbsensi(payload);
        
        // Bunyikan suara sukses
        successAudio.play().catch(e => console.log("Audio diblokir browser"));

        // ════════════════════════════════════════════════════════════════════
        // TAMPILKAN NOTIFIKASI SUKSES (OVERLAY FULLSCREEN)
        // ════════════════════════════════════════════════════════════════════
        if (typeof window.showSuccessNotification === 'function') {
            showSuccessNotification(payload.siswa_nama, kegiatan);
        }
        
        // JEDA SUKSES: Beri waktu 3 detik bagi siswa untuk menarik kartunya dari kamera
        setTimeout(() => {
            sedangMemprosesScan = false; // Buka kembali kunci kamera untuk siswa selanjutnya
        }, 3000);

    } catch(err) {
        failedAudio.play().catch(e => console.log("Audio diblokir browser"));
        alert("Gagal Memproses Scan:\n" + err.message);
        console.error(err);

        // JEDA ERROR: Jika gagal/salah kartu, beri jeda 2 detik sebelum bisa scan kartu lain
        setTimeout(() => {
            sedangMemprosesScan = false;
        }, 2000);
    }
}

function startScanner(){
    if (typeof Html5Qrcode === 'undefined') {
        console.error("Library Html5Qrcode belum termuat di HTML.");
        return;
    }

    const html5QrCode = new Html5Qrcode("reader");
    let daftarKamera = [];
    let indeksKameraAktif = 0;

    // Fungsi dinamis pembesar kotak scan (tetap dipertahankan agar tidak mengecil)
    const konfigurasiQrbox = (viewfinderWidth, viewfinderHeight) => {
        const dimensiTerkecil = Math.min(viewfinderWidth, viewfinderHeight);
        const ukuranKotak = Math.floor(dimensiTerkecil * 0.7);
        const ukuranFinal = Math.max(250, Math.min(600, ukuranKotak));
        return { width: ukuranFinal, height: ukuranFinal };
    };

    // Fungsi internal untuk menyalakan/memindahkan kamera
    async function jalankanLensaKamera(cameraId) {
        try {
            // Jika kamera sedang berjalan, hentikan dulu sebelum diganti
            if (html5QrCode.isScanning) {
                await html5QrCode.stop();
            }
            
            await html5QrCode.start(
                cameraId,
                { 
                    fps: 15, 
                    qrbox: konfigurasiQrbox,
                    aspectRatio: 1.777778
                },
                onScanSuccess
            );
        } catch (err) {
            console.error("Gagal memindahkan lensa kamera:", err);
        }
    }

    // Ambil daftar kamera yang tersedia di perangkat
    Html5Qrcode.getCameras().then(devices => {
        daftarKamera = devices;

        if (daftarKamera.length > 0) {
            // Default awal: Pilih kamera belakang jika di HP (biasanya indeks terakhir atau ke-1)
            indeksKameraAktif = daftarKamera.length > 1 ? 1 : 0;
            
            // Jalankan kamera pertama kali saat aplikasi dibuka
            jalankanLensaKamera(daftarKamera[indeksKameraAktif].id);

            // Pasang logika klik pada tombol ganti kamera
            const btnSwitch = document.getElementById('btnSwitchCamera');
            if (btnSwitch) {
                btnSwitch.addEventListener('click', () => {
                    if (daftarKamera.length <= 1) {
                        alert("Perangkat Anda hanya memiliki 1 kamera aktif.");
                        return;
                    }
                    
                    // Putar indeks kamera (jika sudah di ujung, kembali ke 0)
                    indeksKameraAktif = (indeksKameraAktif + 1) % daftarKamera.length;
                    
                    // Alihkan lensa kamera secara instan
                    jalankanLensaKamera(daftarKamera[indeksKameraAktif].id);
                });
            }
        } else {
            console.error("Kamera fisik tidak ditemukan.");
        }
    }).catch(err => {
        console.error("Gagal mendapatkan izin kamera perangkat:", err);
    });
}
