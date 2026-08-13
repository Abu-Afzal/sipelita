// ==========================================================================
// KODE UTUH REVISI: pkkm-core.js (Tata Letak Daftar Ramping & Fokus View)
// ==========================================================================
import { uploadDokumenPKKM, ambilSemuaBerkasPKKM, hapusDokumenPKKM, ambilMasterKomponen } from './pkkm-db.js';

// Sekarang MASTER_KOMPONEN diubah menjadi let (Array Kosong) yang akan diisi otomatis dari Firestore
let MASTER_KOMPONEN = [];

document.addEventListener("DOMContentLoaded", () => {
    deteksiRoleDanMuatAplikasi();
    
    const form = document.getElementById("formUploadPkkm");
    if(form) {
        form.addEventListener("submit", tanganiProsesSimpan);
    }
});

/**
 * 1. DETEKSI ROLE & AKUN GURU (Sesuai Konsep Otomatisasi)
 */
async function deteksiRoleDanMuatAplikasi() {
    try {
        console.log("Mendeteksi hak akses pengguna...");
        
        // Ambil data Master Komponen dari Firestore terlebih dahulu
        MASTER_KOMPONEN = await ambilMasterKomponen();
        
        // JIKA FIRESTORE MASIH KOSONG: Beri data cadangan (Seeding) agar aplikasi tidak blank saat pertama kali jalan
        if (MASTER_KOMPONEN.length === 0) {
            MASTER_KOMPONEN = [
                { id: "1", nama: "Usaha Pengembangan Madrasah", target: 4, warna: "#2e7d32", indikator: ["1.1.1", "1.1.2", "1.1.3", "1.1.4"] },
                { id: "2", nama: "Pelaksanaan Tugas Manajerial", target: 4, warna: "#1565c0", indikator: ["2.1.1", "2.1.2", "2.1.3", "2.1.4"] },
                { id: "3", nama: "Pengembangan Kewirausahaan", target: 2, warna: "#ef6c00", indikator: ["3.1.1", "3.1.2"] },
                { id: "4", nama: "Supervisi GTK", target: 2, warna: "#c62828", indikator: ["4.1.1", "4.1.2"] }
            ];
        }

        // Jalankan pengisian dropdown secara otomatis berdasarkan master data terupdate
        isiDropdownIndikatorOtomatis();

        // Muat data berkas dan render halaman utama
        await muatAplikasiPKKM();

    } catch (error) {
        console.error("Gagal mendeteksi role/master data PKKM:", error);
    }
}

/**
 * 2. PINTU UTAMA: Memuat Dashboard Atas & Grid Kartu Bawah
 */
async function muatAplikasiPKKM() {
    try {
        const masterBerkas = await ambilSemuaBerkasPKKM();
        hitungDanRenderDashboard(masterBerkas);
        muatKartuMonitoring(masterBerkas); 
    } catch (err) {
        console.error("Gagal memuat aplikasi PKKM:", err);
    }
}

/**
 * 3. OTOMATISASI DROPDOWN FORM: Guru tidak perlu mengetik nama komponen lagi
 */
function isiDropdownIndikatorOtomatis() {
    const elIndikator = document.getElementById("selectIndikator");
    const elKomponen = document.getElementById("inputKomponen");
    if (!elIndikator) return;

    elIndikator.innerHTML = '<option value="">-- Pilih Kode Indikator --</option>';
    
    // Looping memasukkan semua indikator dari seluruh komponen ke dalam dropdown select
    MASTER_KOMPONEN.forEach(komp => {
        if (komp.indikator && Array.isArray(komp.indikator)) {
            komp.indikator.forEach(ind => {
                const opt = document.createElement("option");
                opt.value = ind;
                opt.innerText = `${ind} - (Komponen ${komp.id})`;
                elIndikator.appendChild(opt);
            });
        }
    });

    // Otomatisasi Efek: Ketika guru memilih indikator (misal 1.1.1), input nama komponen otomatis terisi sendiri
    elIndikator.addEventListener("change", (e) => {
        const nilaiTerpilih = e.target.value;
        if (!nilaiTerpilih) {
            if (elKomponen) elKomponen.value = "";
            return;
        }
        const awalanId = nilaiTerpilih.split('.')[0];
        const cocokKomp = MASTER_KOMPONEN.find(k => k.id === awalanId);
        if (cocokKomp && elKomponen) {
            elKomponen.value = cocokKomp.nama; // Mengisi otomatis teks komponen
        }
    });
}

/**
 * 4. RENDER DASHBOARD PROGRESS BAR ATAS
 */
function hitungDanRenderDashboard(masterBerkas) {
    const gridKontainer = document.getElementById("gridKomponenUtama");
    if (!gridKontainer) return;
    gridKontainer.innerHTML = "";

    const counterKoleksi = {};
    MASTER_KOMPONEN.forEach(komp => {
        counterKoleksi[komp.id] = 0;
    });

    for (const key in masterBerkas) {
        const data = masterBerkas[key];
        const awalan = data.id_indikator ? data.id_indikator.split('.')[0] : "";
        if (counterKoleksi[awalan] !== undefined) {
            counterKoleksi[awalan]++;
        }
    }

    MASTER_KOMPONEN.forEach(komp => {
        const jumlahTerisi = counterKoleksi[komp.id] || 0;
        const persentase = Math.min(Math.round((jumlahTerisi / komp.target) * 100), 100);

        const cardKomp = document.createElement("div");
        cardKomp.className = "galeri-card"; 
        cardKomp.style.cssText = `
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 12px;
            padding: 18px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: transform 0.3s ease;
        `;

        cardKomp.innerHTML = `
            <div>
                <strong style="color: ${komp.warna}; font-size: 0.95rem; display: block; margin-bottom: 4px;">Komponen ${komp.id}</strong>
                <p style="margin: 0; font-size: 0.85rem; color: #334155; font-weight: 500; line-height: 1.4;">${komp.nama}</p>
            </div>
            
            <div style="margin-top: 14px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; margin-bottom: 4px;">
                    <span>Progress: ${jumlahTerisi}/${komp.target} Berkas</span>
                    <strong>${persentase}%</strong>
                </div>
                <div style="width: 100%; background: #e2e8f0; height: 6px; border-radius: 10px; overflow: hidden;">
                    <div style="width: ${persentase}%; background: ${komp.warna}; height: 100%; transition: width 0.5s ease;"></div>
                </div>
            </div>
        `;
        gridKontainer.appendChild(cardKomp);
    });
}

/**
 * 5. PROSES SIMPAN AMAN
 */
async function tanganiProsesSimpan(e) {
    e.preventDefault();
    const btn = document.getElementById("btnSimpanPkkm");
    
    const idIndikator = document.getElementById("selectIndikator").value;
    const komponen = document.getElementById("inputKomponen").value;
    const namaDokumen = document.getElementById("inputNamaDokumen").value;
    const fileFisik = document.getElementById("inputFilePkkm").files[0];

    if (!idIndikator || !namaDokumen || !fileFisik) {
        alert("Mohon lengkapi semua form terlebih dahulu!");
        return;
    }

    if (fileFisik.size > 1.0 * 1024 * 1024) {
        alert("Ukuran berkas melebihi batas maksimal 1 MB! Mohon kompres file Anda terlebih dahulu.");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerText = "⏳ Memproses Penyimpanan...";

        const reader = new FileReader();
        reader.readAsDataURL(fileFisik);
        
        reader.onload = async function () {
            const base64String = reader.result;

            const payloadData = {
                id_indikator: idIndikator,
                komponen: komponen,
                nama_dokumen: namaDokumen,
                nama_file_asli: fileFisik.name,
                tipe_file: fileFisik.type,
                file_base64: base64String,
                uploader_email: "Guru/Staf Madrasah",
                waktu_upload: new Date().toISOString()
            };

            try {
                await uploadDokumenPKKM(idIndikator, payloadData);

                alert("Alhamdulillah, Dokumen PKKM Berhasil Disimpan!");
                document.getElementById("formUploadPkkm").reset();
                await muatAplikasiPKKM();

            } catch (err) {
                alert("Gagal menyimpan ke database: " + err.message);
            } finally {
                btn.disabled = false;
                btn.innerText = "Simpan Dokumen PKKM";
            }
        };

        reader.onerror = function() {
            alert("Gagal membaca enkripsi file fisik komputer.");
            btn.disabled = false;
            btn.innerText = "Simpan Dokumen PKKM";
        };

    } catch (err) {
        alert("Gagal memproses dokumen: " + err.message);
        btn.disabled = false;
        btn.innerText = "Simpan Dokumen PKKM";
    }
}

/**
 * 6. REVISI UTAMA: MODUL MONITORING DENGAN ALIH TAMPILAN (VIEW SWITCHING LAYOUT)
 */
function muatKartuMonitoring(masterBerkas) {
    const container = document.getElementById("containerKartuPkkm");
    if (!container) return;

    // Panggil sub-fungsi untuk menggambar daftar folder awal
    tampilkanDaftarFolderUtama(container, masterBerkas);
}

// Fungsi internal A: Menggambar list folder induk komparatif
function tampilkanDaftarFolderUtama(container, masterBerkas) {
    container.innerHTML = "";

    if (!masterBerkas || Object.keys(masterBerkas).length === 0) {
        container.innerHTML = '<div class="status-empty-box" style="color: #64748b; text-align: center; padding: 30px; font-style: italic; background: rgba(255,255,255,0.8); border-radius:12px;">Belum ada dokumen bukti fisik yang disimpan untuk instrumen PKKM ini.</div>';
        return;
    }

    const arrayBerkas = [];
    for (const key in masterBerkas) {
        arrayBerkas.push({ id_firebase: key, ...masterBerkas[key] });
    }

    MASTER_KOMPONEN.forEach(komp => {
        const berkasMilikKomponen = arrayBerkas.filter(berkas => {
            const awalan = berkas.id_indikator ? berkas.id_indikator.split('.')[0] : "";
            return awalan === komp.id;
        });

        const jumlahTerisi = berkasMilikKomponen.length;
        const persentase = Math.min(Math.round((jumlahTerisi / komp.target) * 100), 100);

        // Baris Folder Elegan
        const folderBaris = document.createElement("div");
        folderBaris.style.cssText = `
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-left: 6px solid ${komp.warna};
            border-radius: 10px;
            margin-bottom: 12px;
            padding: 14px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            user-select: none;
            box-shadow: 0 2px 6px rgba(0,0,0,0.01);
            transition: all 0.2s ease;
        `;

        folderBaris.innerHTML = `
            <div style="display: flex; align-items: center; gap: 14px;">
                <span style="font-size: 1.4rem;">📁</span>
                <div>
                    <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #1e293b;">
                        Komponen ${komp.id} — ${komp.nama}
                    </h4>
                    <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: #64748b;">
                        Terisi <span style="font-weight: bold; color: ${komp.warna};">${jumlahTerisi}</span> berkas dari target ${komp.target} indikator
                    </p>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="background: ${komp.warna}12; color: ${komp.warna}; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">
                    ${persentase}% Selesai
                </span>
                <span style="font-size: 0.8rem; color: ${komp.warna}; font-weight: bold; opacity: 0.8;">
            </div>
        `;

        // Efek Hover Ramping
        folderBaris.addEventListener("mouseover", () => {
            folderBaris.style.background = "#f8fafc";
            folderBaris.style.transform = "translateX(4px)";
        });
        folderBaris.addEventListener("mouseout", () => {
            folderBaris.style.background = "#ffffff";
            folderBaris.style.transform = "translateX(0)";
        });

        // KETIKA DIKLIK: Nama folder hilang, langsung beralih tampilan fokus ke file horizontal
        folderBaris.addEventListener("click", () => {
            tampilkanFokusDaftarFile(container, komp, berkasMilikKomponen, masterBerkas);
        });

        container.appendChild(folderBaris);
    });
}

// Fungsi internal B: Mengganti total tampilan menjadi list file memanjang ke kanan (Ramping)
function tampilkanFokusDaftarFile(container, komp, berkasMilikKomponen, masterBerkas) {
    container.innerHTML = "";

    // 1. Tombol Kembali Minimalis di atas
    const btnKembali = document.createElement("button");
    btnKembali.type = "button";
    btnKembali.innerHTML = "⬅ Kembali ke Daftar Folder Utama";
    btnKembali.style.cssText = `
        background: #ffffff;
        color: #334155;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 8px 14px;
        font-size: 0.78rem;
        font-weight: bold;
        cursor: pointer;
        margin-bottom: 14px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        transition: background 0.2s;
    `;
    btnKembali.addEventListener("mouseover", () => btnKembali.style.background = "#f1f5f9");
    btnKembali.addEventListener("mouseout", () => btnKembali.style.background = "#ffffff");
    btnKembali.addEventListener("click", () => tampilkanDaftarFolderUtama(container, masterBerkas));
    container.appendChild(btnKembali);

    // 2. Panel Utama Berkas (Glassmorphism Transparan Lembut)
    const panelFile = document.createElement("div");
    panelFile.style.cssText = `
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(8px);
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 18px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    `;

    // Label konteks penunjuk mini (Subtle & Tidak makan tempat)
    const labelKonteks = document.createElement("div");
    labelKonteks.style.cssText = `
        font-size: 0.8rem;
        color: #64748b;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px dashed #e2e8f0;
        font-weight: 600;
    `;
    labelKonteks.innerHTML = `📂 Berkas Aktif: <span style="color: ${komp.warna}; font-weight: 700;">Komponen ${komp.id}</span>`;
    panelFile.appendChild(labelKonteks);

    // Jika kosong
    if (berkasMilikKomponen.length === 0) {
        const boxKosong = document.createElement("div");
        boxKosong.style.cssText = `
            text-align: center; padding: 30px; color: #94a3b8; font-size: 0.8rem; font-style: italic;
        `;
        boxKosong.innerText = "Folder ini kosong. Belum ada dokumen bukti fisik yang diunggah.";
        panelFile.appendChild(boxKosong);
    } else {
        // Urutkan file berdasarkan kode indikator (1.1.1, 1.1.2, dst)
        berkasMilikKomponen.sort((a, b) => a.id_indikator.localeCompare(b.id_indikator, undefined, { numeric: true }));

        // Gambar per indikator: Satu Baris Penuh Memanjang ke Kanan (Table-like Row)
        berkasMilikKomponen.forEach(data => {
            const barisItem = document.createElement("div");
            barisItem.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 14px;
                background: #ffffff;
                border: 1px solid #edf2f7;
                border-radius: 6px;
                margin-bottom: 8px;
                gap: 16px;
                transition: background 0.15s;
            `;
            barisItem.addEventListener("mouseover", () => barisItem.style.background = "#f8fafc");
            barisItem.addEventListener("mouseout", () => barisItem.style.background = "#ffffff");

            barisItem.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; min-width: 260px;">
                    <span style="background: #2e7d32; color: white; font-size: 0.7rem; font-weight: bold; padding: 3px 8px; border-radius: 4px; font-family: monospace; white-space: nowrap;">
                        Kode ${data.id_indikator}
                    </span>
                    <span style="font-size: 0.85rem; font-weight: 600; color: #1e293b; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 220px;" title="${data.nama_dokumen}">
                        📌 ${data.nama_dokumen}
                    </span>
                </div>

                <div style="flex: 1; font-size: 0.78rem; color: #475569; background: #f1f5f9; padding: 5px 12px; border-radius: 4px; display: flex; align-items: center; gap: 6px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; min-width: 150px;" title="${data.nama_file_asli}">
                    <span style="font-size: 0.9rem;">📄</span>
                    <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${data.nama_file_asli || 'dokumen.pdf'}</span>
                </div>

                <div style="display: flex; gap: 4px; flex-shrink: 0;">
                    <button type="button" class="btn-row-lihat" style="background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; border-radius: 4px; padding: 5px 10px; font-size: 0.7rem; font-weight: bold; cursor: pointer;">💻 Lihat</button>
                    <button type="button" class="btn-row-unduh" style="background: #e0f2fe; color: #0369a1; border: none; border-radius: 4px; padding: 5px 10px; font-size: 0.7rem; font-weight: bold; cursor: pointer;">📥 Unduh</button>
                    <button type="button" class="btn-row-hapus" style="background: #ffe4e6; color: #9f1239; border: none; border-radius: 4px; padding: 5px 10px; font-size: 0.7rem; font-weight: bold; cursor: pointer;">🗑️ Hapus</button>
                </div>
            `;

            // Hubungkan fungsi tombol bawaan Anda
            barisItem.querySelector(".btn-row-lihat").addEventListener("click", () => window.pratinjauBerkasPDF(data.file_base64, data.tipe_file));
            barisItem.querySelector(".btn-row-unduh").addEventListener("click", () => window.unduhBerkasDariBase64(data.file_base64, data.nama_file_asli));
            barisItem.querySelector(".btn-row-hapus").addEventListener("click", () => window.tanganiHapus(data.id_indikator));

            panelFile.appendChild(barisItem);
        });
    }

    container.appendChild(panelFile);
}

// ==========================================================================
// WINDOW INTERACTION ACTIONS
// ==========================================================================
window.unduhBerkasDariBase64 = function(stringBase64, namaFileAsli) {
    const link = document.createElement("a");
    link.href = stringBase64;
    link.download = namaFileAsli;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.pratinjauBerkasPDF = function(stringBase64, tipeFile) {
    if (!tipeFile || !tipeFile.includes("pdf")) {
        alert("Pratinjau langsung hanya mendukung PDF. File Excel/Word otomatis terunduh saat Anda klik 'Download'.");
        return;
    }
    const win = window.open();
    if (win) {
        win.document.write(`<iframe src="${stringBase64}" frameborder="0" style="border:0; width:100%; height:100%;" allowfullscreen></iframe>`);
    } else {
        alert("Pop-up diblokir browser!");
    }
}

window.tanganiHapus = async function(idIndikator) {
    if (!confirm(`Hapus berkas pada indikator ${idIndikator}?`)) return;
    try {
        await hapusDokumenPKKM(idIndikator);
        alert("Berkas berhasil dihapus!");
        await muatAplikasiPKKM();
    } catch (err) {
        alert("Gagal menghapus: " + err.message);
    }
}
