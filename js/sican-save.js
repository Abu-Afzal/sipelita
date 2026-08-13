import { db } from './firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function simpanAbsensi(data){
    // SINKRONISASI: Mengubah 'absensi' menjadi 'presensi_sican' agar diizinkan oleh Rules Firebase
    const q = query(
        collection(db, 'presensi_sican'),
        where('tanggal', '==', data.tanggal),
        where('siswa_nis', '==', data.siswa_nis),
        where('kegiatan', '==', data.kegiatan)
    );

    const cek = await getDocs(q);

    if(!cek.empty){
        throw new Error(
            'Siswa sudah melakukan absensi kegiatan ini hari ini'
        );
    }

    // SINKRONISASI: Simpan hasil scan ke koleksi 'presensi_sican'
    await addDoc(
        collection(db, 'presensi_sican'),
        data
    );
}
