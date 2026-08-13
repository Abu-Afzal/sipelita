// ==========================================================================
// KODE UTUH TERBARU: js/pkkm-db.js (Versi CDN 10.12.0)
// ==========================================================================
import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    setDoc, 
    getDocs, 
    deleteDoc, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/** ==========================================================================
 * A. SUB-SISTEM MASTER INSTRUMEN (ADMIN)
 * ========================================================================== */

// 1. Ambil data master komponen untuk konfigurasi kartu & indikator
export async function ambilMasterKomponen() {
    try {
        const q = query(collection(db, "pkkm_master"), orderBy("id", "asc"));
        const querySnapshot = await getDocs(q);
        let data = [];
        querySnapshot.forEach((doc) => {
            // PERBAIKAN: Menggunakan id: doc.id agar sinkron 100% dengan master-pkkm.html
            data.push({ id: doc.id, ...doc.data() });
        });
        return data;
    } catch (error) {
        console.error("Gagal mengambil master komponen:", error);
        return [];
    }
}

// 2. Simpan atau perbarui master komponen baru dari panel admin
export async function simpanMasterKomponenBaru(id, payload) {
    try {
        await setDoc(doc(db, "pkkm_master", id), payload);
        return { success: true };
    } catch (error) {
        console.error("Gagal menyimpan master komponen:", error);
        throw error;
    }
}

// 3. Menghapus data master komponen dari Firestore
export async function hapusMasterKomponen(id) {
    try {
        await deleteDoc(doc(db, "pkkm_master", id));
        return { success: true };
    } catch (error) {
        console.error("Gagal menghapus master komponen:", error);
        throw error;
    }
}


/** ==========================================================================
 * B. SUB-SISTEM BERKAS BUKTI FISIK (GURU)
 * ========================================================================== */

// 4. Upload atau simpan dokumen e-file berbasis Base64
export async function uploadDokumenPKKM(idIndikator, payload) {
    try {
        await setDoc(doc(db, "pkkm_berkas", idIndikator), payload);
        return { success: true };
    } catch (error) {
        console.error("Gagal upload dokumen PKKM:", error);
        throw error;
    }
}

// 5. Ambil semua berkas bukti fisik yang sudah berhasil dikumpulkan guru
export async function ambilSemuaBerkasPKKM() {
    try {
        const querySnapshot = await getDocs(collection(db, "pkkm_berkas"));
        let data = [];
        querySnapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
        });
        return data;
    } catch (error) {
        console.error("Gagal mengambil semua berkas PKKM:", error);
        return [];
    }
}

// 6. Menghapus data berkas dari Firestore
export async function hapusDokumenPKKM(idIndikator) {
    try {
        await deleteDoc(doc(db, "pkkm_berkas", idIndikator));
        return { success: true };
    } catch (error) {
        console.error("Gagal menghapus dokumen PKKM:", error);
        throw error;
    }
}
