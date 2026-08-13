// ══════════════════════════════════════════════
// SITAAT - CRUD JENIS PELANGGARAN & INPUT
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════
// SEED DATA - Jenis Pelanggaran dari Dokumen
// ═════════════════════════════════════════════
const SEED_JENIS_PELANGGARAN = [
    // A. KETERTIBAN
    { kategori: 'A. KETERTIBAN', no: 1, jenis: 'Makan/minum dalam kelas saat belajar (tanpa seizin guru)', poin: 5 },
    { kategori: 'A. KETERTIBAN', no: 2, jenis: 'Membuat keributan di dalam kelas ketika waktu belajar', poin: 10 },
    { kategori: 'A. KETERTIBAN', no: 3, jenis: 'Mengaktifkan HP selama KBM berlangsung', poin: 10 },
    { kategori: 'A. KETERTIBAN', no: 4, jenis: 'Bertentangan dengan teman di dalam atau di luar kelas', poin: 15 },
    { kategori: 'A. KETERTIBAN', no: 5, jenis: 'Mengotori/mencorat-coret/membuang permen karet sembarangan di lingkungan madrasah', poin: 50 },
    { kategori: 'A. KETERTIBAN', no: 6, jenis: 'Merusak/menghilangkan barang milik madrasah, guru atau teman', poin: 50 },
    { kategori: 'A. KETERTIBAN', no: 7, jenis: 'Mengambil hak milik orang lain tanpa izin (mencuri, malak, ngompas)', poin: 100 },
    { kategori: 'A. KETERTIBAN', no: 8, jenis: 'Membawa korek api', poin: 25 },
    { kategori: 'A. KETERTIBAN', no: 9, jenis: 'Membawa rokok', poin: 50 },
    { kategori: 'A. KETERTIBAN', no: 10, jenis: 'Mengisap rokok di lingkungan madrasah', poin: 75 },
    { kategori: 'A. KETERTIBAN', no: 11, jenis: 'Membawa buku, majalah, gambar kaset/vcd terlarang', poin: 50 },
    { kategori: 'A. KETERTIBAN', no: 12, jenis: 'Memperjual belikan buku, majalah, gambar kaset/vcd terlarang', poin: 75 },
    { kategori: 'A. KETERTIBAN', no: 13, jenis: 'Membawa senjata tajam', poin: 50 },
    { kategori: 'A. KETERTIBAN', no: 14, jenis: 'Memperjual belikan senjata tajam', poin: 50 },
    { kategori: 'A. KETERTIBAN', no: 15, jenis: 'Menggunakan senjata tajam untuk mengancam', poin: 75 },
    { kategori: 'A. KETERTIBAN', no: 16, jenis: 'Menggunakan senjata tajam untuk melukai', poin: 100 },
    { kategori: 'A. KETERTIBAN', no: 17, jenis: 'Membawa obat/minuman terlarang', poin: 100 },
    { kategori: 'A. KETERTIBAN', no: 18, jenis: 'Menggunakan obat/minuman terlarang di dalam atau di luar madrasah', poin: 100 },
    { kategori: 'A. KETERTIBAN', no: 19, jenis: 'Perkelahian disebabkan oleh madrasah lain', poin: 25 },
    { kategori: 'A. KETERTIBAN', no: 20, jenis: 'Perkelahian disebabkan oleh peserta didik di madrasah', poin: 25 },
    { kategori: 'A. KETERTIBAN', no: 21, jenis: 'Perkelahian disebabkan peserta didik dengan madrasah lain', poin: 50 },
    { kategori: 'A. KETERTIBAN', no: 22, jenis: 'Menghina kepala, guru dan pegawai tata usaha', poin: 50 },
    { kategori: 'A. KETERTIBAN', no: 23, jenis: 'Disertai ancaman', poin: 75 },
    { kategori: 'A. KETERTIBAN', no: 24, jenis: 'Disertai pemukulan', poin: 100 },
    { kategori: 'A. KETERTIBAN', no: 25, jenis: 'Berpacaran', poin: 25 },
    { kategori: 'A. KETERTIBAN', no: 26, jenis: 'Perbuatan asusila/pergaulan bebas', poin: 100 },
    
    // B. KERAJINAN
    { kategori: 'B. KERAJINAN', no: 1, jenis: 'Terlambat masuk madrasah kurang dari 10 menit', poin: 2 },
    { kategori: 'B. KERAJINAN', no: 2, jenis: 'Terlambat lebih dari 10 menit', poin: 5 },
    { kategori: 'B. KERAJINAN', no: 3, jenis: 'Terlambat yang kedua kalinya', poin: 7 },
    { kategori: 'B. KERAJINAN', no: 4, jenis: 'Terlambat yang ke 3 kali atau lebih', poin: 10 },
    { kategori: 'B. KERAJINAN', no: 5, jenis: 'Terlambat masuk kelas pada pergantian jam pelajaran tanpa izin', poin: 3 },
    { kategori: 'B. KERAJINAN', no: 6, jenis: 'Terlambat masuk karena izin keluar', poin: 5 },
    { kategori: 'B. KERAJINAN', no: 7, jenis: 'Izin keluar ketika KBM berlangsung dan tidak kembali', poin: 20 },
    { kategori: 'B. KERAJINAN', no: 8, jenis: 'Peserta didik tidak mengikuti kegiatan sholat dhuha', poin: 25 },
    { kategori: 'B. KERAJINAN', no: 9, jenis: 'Peserta didik tidak mengikuti kegiatan ekstrakurikuler tanpa keterangan', poin: 2 },
    { kategori: 'B. KERAJINAN', no: 10, jenis: 'Peserta didik tidak masuk tanpa keterangan atau alpa', poin: 10 },
    { kategori: 'B. KERAJINAN', no: 11, jenis: 'Peserta didik tidak hadir pada acara PHBI/PHB nasional tanpa keterangan', poin: 10 },
    { kategori: 'B. KERAJINAN', no: 12, jenis: 'Tidak membawa buku mata pelajaran pada hari itu', poin: 10 },
    { kategori: 'B. KERAJINAN', no: 13, jenis: 'Peserta didik tidak masuk dengan membuat keterangan palsu', poin: 15 },
    { kategori: 'B. KERAJINAN', no: 14, jenis: 'Peserta didik meninggalkan kelas pada waktu jam pelajaran tanpa izin', poin: 25 },
    
    // C. KERAPIAN
    { kategori: 'C. KERAPIAN', no: 1, jenis: 'Tidak memakai kaos kaki', poin: 2 },
    { kategori: 'C. KERAPIAN', no: 2, jenis: 'Memakai pakaian seragam tidak rapi', poin: 5 },
    { kategori: 'C. KERAPIAN', no: 3, jenis: 'Tidak memakai baju seragam sesuai ketentuan', poin: 5 },
    { kategori: 'C. KERAPIAN', no: 4, jenis: 'Tidak memakai ikat pinggang warna gelap', poin: 5 },
    { kategori: 'C. KERAPIAN', no: 5, jenis: 'Tidak memakai sepatu warna gelap', poin: 5 },
    { kategori: 'C. KERAPIAN', no: 6, jenis: 'Memakai switer/topi di lingkungan madrasah tanpa izin', poin: 5 },
    { kategori: 'C. KERAPIAN', no: 7, jenis: 'Memakai kontak lensa berwarna', poin: 5 },
    { kategori: 'C. KERAPIAN', no: 8, jenis: 'Tidak memakai bad Osim/Lokasi Madrasah/Logo/Nama', poin: 7 },
    { kategori: 'C. KERAPIAN', no: 9, jenis: 'Peserta didik putri berhias/memakai perhiasan secara berlebihan', poin: 10 },
    { kategori: 'C. KERAPIAN', no: 10, jenis: 'Peserta didik putra memakai perhiasan', poin: 15 },
    { kategori: 'C. KERAPIAN', no: 11, jenis: 'Bagi peserta didik putra, rambut gondrong', poin: 15 }
];

// ══════════════════════════════════════════════
// LOAD JENIS PELANGGARAN
// ══════════════════════════════════════════════
async function loadJenisPelanggaran() {
    try {
        const snapshot = await db.collection('sitaat_jenis_pelanggaran').orderBy('kategori').orderBy('no').get();
        
        if (snapshot.empty) {
            // Seed data pertama kali
            console.log('🌱 Seeding data jenis pelanggaran...');
            for (const item of SEED_JENIS_PELANGGARAN) {
                await db.collection('sitaat_jenis_pelanggaran').add({
                    ...item,
                    createdAt: new Date().toISOString()
                });
            }
            // Reload
            return loadJenisPelanggaran();
        }
        
        daftarJenisPelanggaran = [];
        snapshot.forEach(doc => {
            daftarJenisPelanggaran.push({ id: doc.id, ...doc.data() });
        });
        
        renderJenisPelanggaran();
        populateDropdownJenis();
        populateFilterKelas();
        
    } catch (error) {
        console.error('Error load jenis pelanggaran:', error);
    }
}

function renderJenisPelanggaran() {
    const container = document.getElementById('jenisPelanggaranContainer');
    if (!container) return;
    
    const kategoriList = ['A. KETERTIBAN', 'B. KERAJINAN', 'C. KERAPIAN'];
    
    let html = '';
    kategoriList.forEach(kat => {
        const items = daftarJenisPelanggaran.filter(j => j.kategori === kat);
        if (items.length === 0) return;
        
        html += `<div class="kategori-section">
            <div class="kategori-title">${kat}</div>
            <div class="kategori-list">`;
        
        items.forEach(item => {
            html += `
                <div class="jenis-item">
                    <div class="no">${item.no}.</div>
                    <div class="deskripsi">${item.jenis}</div>
                    <div class="poin">${item.poin} Point</div>
                    <div class="aksi">
                        <button class="btn btn-danger btn-sm" onclick="hapusJenisPelanggaran('${item.id}')">🗑️</button>
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    });
    
    container.innerHTML = html;
}

function populateDropdownJenis() {
    const select = document.getElementById('jenisPelanggaran');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Pilih Jenis Pelanggaran --</option>';
    
    const kategoriList = ['A. KETERTIBAN', 'B. KERAJINAN', 'C. KERAPIAN'];
    kategoriList.forEach(kat => {
        const items = daftarJenisPelanggaran.filter(j => j.kategori === kat);
        if (items.length === 0) return;
        
        const optgroup = document.createElement('optgroup');
        optgroup.label = kat;
        
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = `${item.no}. ${item.jenis} (${item.poin} poin)`;
            opt.dataset.poin = item.poin;
            optgroup.appendChild(opt);
        });
        
        select.appendChild(optgroup);
    });
    
    // Auto-update poin saat pilih jenis
    select.addEventListener('change', function() {
        const selected = this.options[this.selectedIndex];
        const poinEl = document.getElementById('poinPelanggaran');
        if (poinEl && selected.dataset.poin) {
            poinEl.value = selected.dataset.poin;
        }
    });
}

function populateFilterKelas() {
    const selects = [
        document.getElementById('filterKelasSiswa'),
        document.getElementById('filterKelasLaporan')
    ];
    
    const kelasSet = new Set();
    daftarSiswa.forEach(s => {
        if (s.kelas) kelasSet.add(s.kelas);
    });
    
    selects.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">Semua Kelas</option>';
        Array.from(kelasSet).sort().forEach(k => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = k;
            select.appendChild(opt);
        });
        select.value = currentVal;
    });
}

// ══════════════════════════════════════════════
// TAMBAH JENIS PELANGGARAN
// ══════════════════════════════════════════════
window.showFormTambahPelanggaran = function() {
    document.getElementById('formTambahPelanggaran').style.display = 'block';
};

window.hideFormTambahPelanggaran = function() {
    document.getElementById('formTambahPelanggaran').style.display = 'none';
};

window.simpanJenisPelanggaran = async function() {
    const kategori = document.getElementById('newKategori').value;
    const poin = parseInt(document.getElementById('newPoin').value);
    const jenis = document.getElementById('newJenis').value.trim();
    
    if (!poin || !jenis) {
        alert('⚠️ Poin dan jenis pelanggaran wajib diisi!');
        return;
    }
    
    try {
        // Hitung nomor urut
        const itemsInKategori = daftarJenisPelanggaran.filter(j => j.kategori === kategori);
        const no = itemsInKategori.length + 1;
        
        await db.collection('sitaat_jenis_pelanggaran').add({
            kategori,
            no,
            jenis,
            poin,
            createdAt: new Date().toISOString()
        });
        
        alert('✅ Jenis pelanggaran berhasil ditambahkan!');
        hideFormTambahPelanggaran();
        document.getElementById('newPoin').value = '';
        document.getElementById('newJenis').value = '';
        
        await loadJenisPelanggaran();
        
    } catch (error) {
        alert('❌ Gagal: ' + error.message);
    }
};

window.hapusJenisPelanggaran = async function(id) {
    if (!confirm('⚠️ Yakin ingin menghapus jenis pelanggaran ini?')) return;
    
    try {
        await db.collection('sitaat_jenis_pelanggaran').doc(id).delete();
        await loadJenisPelanggaran();
    } catch (error) {
        alert('❌ Gagal: ' + error.message);
    }
};

// ══════════════════════════════════════════════
// INPUT PELANGGARAN SISWA
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formPelanggaran');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await simpanPelanggaran();
        });
    }
});

async function simpanPelanggaran() {
    const btn = document.getElementById('btnSimpanPelanggaran');
    const alertEl = document.getElementById('alertInput');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    if (alertEl) alertEl.classList.remove('show');
    
    try {
        const namaSiswa = document.getElementById('namaSiswa').value.trim();
        const kelasSiswa = document.getElementById('kelasSiswa').value.trim();
        const tanggal = document.getElementById('tanggalPelanggaran').value;
        const jenisId = document.getElementById('jenisPelanggaran').value;
        const poin = parseInt(document.getElementById('poinPelanggaran').value);
        const keterangan = document.getElementById('keteranganPelanggaran').value.trim();
        const pelapor = document.getElementById('pelapor').value;
        
        if (!namaSiswa || !kelasSiswa || !tanggal || !jenisId || !poin) {
            throw new Error('Mohon lengkapi semua field yang wajib diisi!');
        }
        
        // Validasi: cek apakah siswa ada di master data SICAN
        const siswaData = masterDataSiswa.find(s => 
            s.nama.toLowerCase() === namaSiswa.toLowerCase() &&
            s.kelas.toLowerCase() === kelasSiswa.toLowerCase()
        );
        
        let siswaId = null;
        let nisSiswa = null;
        
        if (siswaData) {
            siswaId = siswaData.id;
            nisSiswa = siswaData.nis;
        } else if (masterDataSiswa.length > 0) {
            // Warning jika siswa tidak ada di master data
            const confirmInput = confirm(
                `⚠️ Siswa "${namaSiswa}" dari kelas ${kelasSiswa} tidak ditemukan di database SICAN.\n\n` +
                `Apakah Anda yakin ingin melanjutkan?\n\n` +
                `Klik OK untuk lanjut (input manual), Cancel untuk membatalkan.`
            );
            
            if (!confirmInput) {
                btn.disabled = false;
                btn.innerHTML = '💾 Simpan Pelanggaran';
                return;
            }
        }
        
        // Ambil data jenis pelanggaran
        const jenisData = daftarJenisPelanggaran.find(j => j.id === jenisId);
        
        // Simpan pelanggaran
        await db.collection('sitaat_pelanggaran').add({
            namaSiswa: namaSiswa,
            kelasSiswa: kelasSiswa,
            nisSiswa: nisSiswa || '-',  // Simpan NIS jika ada
            siswaId: siswaId || null,    // Link ke master data SICAN jika ada
            tanggal: tanggal,
            jenisPelanggaranId: jenisId,
            jenisPelanggaran: jenisData ? jenisData.jenis : '',
            kategori: jenisData ? jenisData.kategori : '',
            poin: poin,
            keterangan: keterangan,
            pelapor: pelapor,
            pelaporEmail: currentUser.email || '',
            createdAt: new Date().toISOString()
        });
        
        if (alertEl) {
            alertEl.textContent = '✅ Pelanggaran berhasil disimpan!';
            alertEl.className = 'alert alert-success show';
        }
        
        resetFormPelanggaran();
        
        // Refresh data
        await loadDashboard();
        await loadSiswa();
        
    } catch (error) {
        console.error('Error:', error);
        if (alertEl) {
            alertEl.textContent = '❌ ' + error.message;
            alertEl.className = 'alert alert-error show';
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💾 Simpan Pelanggaran';
    }
}

window.resetFormPelanggaran = function() {
    document.getElementById('formPelanggaran').reset();
    document.getElementById('tanggalPelanggaran').value = new Date().toISOString().split('T')[0];
    document.getElementById('pelapor').value = currentUser.nama || 'Guru';
    document.getElementById('poinPelanggaran').value = '';
};
