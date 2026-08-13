import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function loadKegiatan(){
    const select = document.getElementById('kegiatanSelect');
    
    if (!select) return;
    
    // Set teks awal saat loading data
    select.innerHTML = '<option value="">Pilih Kegiatan</option>';

    try {
        // Membaca dari koleksi 'Kegiatan Absensi' sesuai di Firebase Console
        const snapshot = await getDocs(collection(db, 'Kegiatan Absensi'));

        let adaKegiatan = false;

        snapshot.forEach(doc => {
            const data = doc.data();

            // Pengecekan field 'aktif' (boolean) dan 'nama' (string)
            if (data.aktif === true && data.nama) {
                adaKegiatan = true;
                
                // Membuat teks tampilan di dropdown menjadi huruf kapital di awal (Capital Case)
                // Contoh: "kehadiran" menjadi "Kehadiran"
                const namaBersih = data.nama.trim();
                const namaTampilan = namaBersih.charAt(0).toUpperCase() + namaBersih.slice(1);

                select.innerHTML += `
                    <option value="${namaBersih}">
                        ${namaTampilan}
                    </option>
                `;
            }
        });

        // Jika setelah di-loop ternyata tidak ada kegiatan yang aktif
        if (!adaKegiatan) {
            select.innerHTML = '<option value="">Tidak ada kegiatan aktif</option>';
        }

    } catch(err) {
        console.error("Gagal memuat dokumen kegiatan:", err);
        select.innerHTML = '<option value="">Gagal memuat kegiatan</option>';
    }
}
