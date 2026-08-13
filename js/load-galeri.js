import { DRIVE_CONFIG } from './drive-config.js';

async function loadGaleriOtomatis() {
    const container = document.getElementById('galeriKegiatanContainer');
    const loading   = document.getElementById('loadingGaleri');
    const filterSelect = document.getElementById('filterKegiatan');
    
    if (!container) return;

    try {
        if (loading) loading.style.display = 'block';
        container.innerHTML = '';

        // 1. Ambil daftar sub-folder kegiatan dari Google Drive
        const queryDrive = `'${DRIVE_CONFIG.FOLDER_ID_UTAMA}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryDrive)}&orderBy=createdTime%20desc&fields=files(id,name)&key=${DRIVE_CONFIG.API_KEY}`;

        const response = await fetch(url);
        const result = await response.json();

        if (result.error) throw new Error(result.error.message);

        const listFolder = result.files || [];
        if (loading) loading.style.display = 'none';

        if (listFolder.length === 0) {
            container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px; font-style: italic;">Belum ada sub-folder dokumentasi kegiatan.</p>`;
            return;
        }

        // 2. Loop setiap folder dan cari file cover.jpg di dalamnya
        for (const folder of listFolder) {
            const linkDriveFolder = `https://drive.google.com/drive/folders/${folder.id}?usp=sharing`;
            const namaKegiatan    = folder.name;
            
            // 🔍 EKSTRAK TAHUN dari nama folder untuk filtering
            const tahunKegiatan = extractTahunDariNama(namaKegiatan);
            
            // Default placeholder berupa folder gradasi jika file 'cover.jpg' absen
            let gambarSampul = `background: linear-gradient(135deg, #4f46e5, #9333ea); display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem;`;
            let elemenGambar = `<div class="card-image-placeholder" style="${gambarSampul}"></div>`;

            try {
                // Query pencarian file 'cover.jpg' di dalam sub-folder terkait
                const queryCover = `'${folder.id}' in parents and name = 'cover.jpg' and trashed = false`;
                const urlCover = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryCover)}&fields=files(id)&key=${DRIVE_CONFIG.API_KEY}`;
                
                const resCover = await fetch(urlCover);
                const dataCover = await resCover.json();
                
                // Jika file 'cover.jpg' terdeteksi, tembak langsung ke sistem render thumbnail Google Drive
                if (dataCover.files && dataCover.files.length > 0) {
                    const idCover = dataCover.files[0].id;
                    
                    // 👑 SOLUSI UTAMA: Menggunakan URL resmi Thumbnail Google Drive dengan resolusi lebar (sz=w800)
                    const srcGambar = `https://drive.google.com/thumbnail?sz=w800&id=${idCover}`;
                    elemenGambar = `<img src="${srcGambar}" alt="${namaKegiatan}" class="card-img" onerror="this.src='https://placehold.co/600x400?text=Foto+Eror'">`;
                }
            } catch (errCover) {
                console.error("Gagal memuat cover untuk folder " + namaKegiatan, errCover);
            }

            // Suntikkan kartu dengan susunan DOM terstruktur
            // ✅ TAMBAHKAN data-year attribute untuk filtering yang akurat
            container.innerHTML += `
                <a href="${linkDriveFolder}" target="_blank" class="galeri-card" data-year="${tahunKegiatan}">
                    <div class="card-image-wrapper">
                        ${elemenGambar}
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${namaKegiatan.toUpperCase()}</h3>
                    </div>
                </a>
            `;
        }

        // Jalankan sinkronisasi filter saat data beres dimuat
        if (filterSelect) {
            terapkanFilterGaleri(filterSelect.value);
        }

    } catch (error) {
        console.error("Gagal membaca Google Drive API:", error);
        if (loading) loading.style.display = 'none';
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#ef4444; padding:20px; font-weight:bold;">❌ Gagal memuat galeri: ${error.message}</p>`;
    }
}

// ==========================================
// 🎯 FUNGSI EKSTRAK TAHUN DARI NAMA KEGIATAN
// ==========================================
function extractTahunDariNama(namaKegiatan) {
    // Cari pola tahun (4 digit) dalam nama folder
    const match = namaKegiatan.match(/\b(20\d{2}|19\d{2})\b/);
    return match ? match[1] : 'unknown';
}

// ==========================================
// 🛠️ FUNGSI FILTERING KARTU ALBUM (DIPERBAIKI)
// ==========================================
function terapkanFilterGaleri(tahunTerpilih) {
    const semuaKartu = document.querySelectorAll('.galeri-card');
    let jumlahTerlihat = 0;
    
    // Hapus pesan "tidak ada hasil" yang lama jika ada
    const container = document.getElementById('galeriKegiatanContainer');
    const existingMessage = container.querySelector('.no-result-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    semuaKartu.forEach(kartu => {
        const tahunKegiatan = kartu.getAttribute('data-year');
        
        // Debug: lihat tahun yang terdeteksi
        console.log(`Kegiatan: ${kartu.textContent.trim()}, Tahun terdeteksi: ${tahunKegiatan}, Filter: ${tahunTerpilih}`);

        if (tahunTerpilih === 'semua') {
            // Tampilkan semua kartu
            kartu.classList.remove('album-tersembunyi');
            kartu.style.display = ''; // Reset ke CSS default
            jumlahTerlihat++;
        } else if (tahunKegiatan === tahunTerpilih) {
            // Tampilkan kartu yang sesuai tahun
            kartu.classList.remove('album-tersembunyi');
            kartu.style.display = ''; // Reset ke CSS default
            jumlahTerlihat++;
        } else {
            // Sembunyikan kartu yang tidak sesuai
            kartu.classList.add('album-tersembunyi');
            kartu.style.display = 'none';
        }
    });

    // Tampilkan pesan jika tidak ada hasil
    if (jumlahTerlihat === 0 && semuaKartu.length > 0) {
        const message = document.createElement('div');
        message.className = 'no-result-message';
        message.style.cssText = `
            grid-column: 1/-1; 
            text-align: center; 
            color: #64748b; 
            padding: 60px 20px; 
            font-style: italic;
            font-size: 1.2rem;
            background: #f8fafc;
            border-radius: 12px;
            margin: 20px 0;
        `;
        message.innerHTML = `📭 Tidak ada kegiatan untuk tahun <strong>${tahunTerpilih}</strong>`;
        container.insertBefore(message, container.firstChild);
    }
}

// ==========================================
// 🔌 EVENT LISTENER DROPDOWN FILTER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const filterSelect = document.getElementById('filterKegiatan');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            terapkanFilterGaleri(e.target.value);
        });
    }
});

// Export fungsi agar bisa dipanggil dari HTML
window.loadGaleriOtomatis = loadGaleriOtomatis;
window.terapkanFilterGaleri = terapkanFilterGaleri;

// Jalankan saat DOM ready
document.addEventListener('DOMContentLoaded', loadGaleriOtomatis);

// Debug: Tampilkan tahun yang terdeteksi di console
function debugTahunKegiatan() {
    const semuaKartu = document.querySelectorAll('.galeri-card');
    console.log('=== DEBUG TAHUN KEGIATAN ===');
    semuaKartu.forEach((kartu, index) => {
        const tahun = kartu.getAttribute('data-year');
        const judul = kartu.querySelector('.card-title')?.textContent || 'Unknown';
        console.log(`Kartu ${index + 1}: "${judul}" → data-year="${tahun}"`);
    });
    console.log('===========================');
}

// Jalankan debug setelah load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(debugTahunKegiatan, 2000); // Tunggu 2 detik setelah load
});