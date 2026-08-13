import { db } from "./firebase-config.js";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =====================================
// SIMPAN KEGIATAN BARU
// =====================================
const btnSimpan = document.getElementById('btnSimpan');

if(btnSimpan){
    btnSimpan.addEventListener('click', async ()=>{
        const nama = document.getElementById('namaKegiatan').value.trim();
        const statusValue = document.getElementById('statusKegiatan').value;

        if(!nama){
            alert('Nama kegiatan wajib diisi');
            return;
        }

        // KONVERSI: Mengubah string select menjadi boolean murni true/false untuk pembacaan SICAN
        const isAktif = (statusValue === 'aktif' || statusValue === 'true');

        try {
            // SINKRONISASI KOLEKSI: Disamakan menjadi 'Kegiatan Absensi'
            await addDoc(collection(db, 'Kegiatan Absensi'), {
                nama: nama,
                aktif: isAktif,        // Sesuai dengan aturan filter data.aktif === true di sican-kegiatan.js
                status: statusValue,   // Menyimpan string untuk cadangan tampilan UI badge
                createdAt: new Date().toISOString()
            });

            alert('Kegiatan berhasil disimpan');
            document.getElementById('namaKegiatan').value = '';
            loadKegiatan();

        } catch(err) {
            console.error(err);
            alert("Gagal menyimpan: " + err.message);
        }
    });
}

// =====================================
// LOAD DAFTAR KEGIATAN
// =====================================
async function loadKegiatan(){
    const tbody = document.getElementById('tbodyKegiatan');
    if(!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Memuat data...</td></tr>`;

    try {
        // SINKRONISASI KOLEKSI: Membaca dari 'Kegiatan Absensi'
        const snapshot = await getDocs(collection(db, 'Kegiatan Absensi'));
        tbody.innerHTML = '';

        if(snapshot.empty){
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Belum ada kegiatan</td></tr>`;
            return;
        }

        const listKegiatan = [];
        snapshot.forEach(docSnap => {
            listKegiatan.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Urutkan berdasarkan waktu buat (kegiatan baru berada di atas)
        listKegiatan.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        listKegiatan.forEach(data => {
            const badgeStyle = data.aktif ? 'background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:4px; font-weight:600;' : 'background:#ffebee; color:#c62828; padding:4px 8px; border-radius:4px; font-weight:600;';
            const statusTeks = data.aktif ? 'Aktif' : 'Tidak Aktif';

            tbody.innerHTML += `
                <tr>
                    <td><b>${data.nama}</b></td>
                    <td><span style="${badgeStyle}">${statusTeks}</span></td>
                    <td>
                        <button class="btn-hapus" onclick="hapusKegiatan('${data.id}')" style="background:#d32f2f; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">
                            Hapus
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch(err) {
        console.error("Gagal memuat:", err);
        tbody.innerHTML = `<tr><td colspan="3" style="color:red; text-align:center;">Gagal memuat data kegiatan</td></tr>`;
    }
}

loadKegiatan();

// =====================================
// HAPUS KEGIATAN
// =====================================
window.hapusKegiatan = async(id)=>{
    if(!confirm('Apakah Anda yakin ingin menghapus kegiatan ini?')) return;

    try {
        await deleteDoc(doc(db, 'Kegiatan Absensi', id));
        loadKegiatan();
    } catch(err) {
        console.error(err);
        alert("Gagal menghapus kegiatan: " + err.message);
    }
}
