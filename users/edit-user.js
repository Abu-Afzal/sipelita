import { db } from '../js/firebase-config.js';
import { 
    doc, 
    getDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { renderCheckboxFitur, getSelectedFitur, SEMUA_FITUR } from './fitur.js';

const modal = document.getElementById('modalEdit');
const formEdit = document.getElementById('formEditUser');
const btnBatal = document.getElementById('btnBatalEdit');

/**
 * 1. FUNGSI MENUTUP MODAL (Internal & Global)
 */
function aksiTutupModal() {
    if (modal) {
        modal.style.display = 'none';
        console.log("Modal edit berhasil ditutup.");
    }
}
// Daftarkan ke window sebagai cadangan
window.tutupModalEdit = aksiTutupModal;

/**
 * 2. EVENT LISTENER TOMBOL BATAL (Dipasang langsung lewat JavaScript)
 */
btnBatal?.addEventListener('click', (e) => {
    e.preventDefault();
    aksiTutupModal();
});

/**
 * 3. FUNGSI GLOBAL: Membuka Modal & Memuat Data User Lama
 */
window.bukaModalEdit = async function(docId) {
    console.log("Membuka data edit untuk ID:", docId);
    
    if(modal) modal.style.display = 'flex';

    const alertEdit = document.getElementById('alertEdit');
    if (alertEdit) alertEdit.style.display = 'none';

    try {
        if (typeof renderCheckboxFitur === 'function') {
            renderCheckboxFitur('editCheckboxFitur');
        }

        const docRef = doc(db, 'users', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            document.getElementById('editDocId').value = docId;
            document.getElementById('editNama').value = data.nama || '';
            document.getElementById('editRole').value = data.role || 'guru';
            
            if (data.fitur && Array.isArray(data.fitur)) {
                data.fitur.forEach(fiturId => {
                    const cb = document.getElementById(`editCheckboxFitur_${fiturId}`);
                    if (cb) cb.checked = true;
                });
            }
        }
    } catch (err) {
        console.error("Gagal mengambil detail user:", err);
    }
};

/**
 * 4. EVENT LISTENER: Menangani Submit Form Perubahan Data
 */
formEdit?.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const docId = document.getElementById('editDocId').value;
    const nama  = document.getElementById('editNama').value.trim();
    const role  = document.getElementById('editRole').value;
    
    let fitur = [];
    if (typeof getSelectedFitur === 'function') {
        fitur = getSelectedFitur('editCheckboxFitur');
    }

    try {
        const docRef = doc(db, 'users', docId);

        // Kirim pembaruan ke Firestore
        await updateDoc(docRef, {
            nama: nama,
            role: role,
            fitur: fitur,
            updatedAt: new Date().toISOString()
        });

        // MASALAH SELESAI DI SINI: Tutup modal secara instan di sisi client terlebih dahulu
        aksiTutupModal();
        
        // Berikan notifikasi di luar modal menggunakan alert browser default agar tidak mengganggu layout
        alert('✅ Perubahan user berhasil disimpan!');

        // Refresh tabel daftar user terdaftar di latar belakang
        if (typeof window.loadUsers === 'function') {
            window.loadUsers();
        }

    } catch (err) {
        console.error("Gagal mengupdate data user:", err);
        const alertEdit = document.getElementById('alertEdit');
        if (alertEdit) {
            alertEdit.style.display = 'block';
            alertEdit.style.background = '#fee2e2';
            alertEdit.style.color = '#991b1b';
            alertEdit.innerText = '❌ Gagal menyimpan: ' + err.message;
        }
    }
});

/**
 * AUTOMATISASI: Centang semua jika role diubah ke admin saat edit
 */
document.getElementById('editRole')?.addEventListener('change', e => {
    if (e.target.value === 'admin' && Array.isArray(SEMUA_FITUR)) {
        SEMUA_FITUR.forEach(f => {
            const el = document.getElementById(`editCheckboxFitur_${f.id}`);
            if (el) el.checked = true;
        });
    }
});
