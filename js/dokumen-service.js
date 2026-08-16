import { db, storage } from './firebase-config.js';
import { ref, push, set, get, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

export const DokumenService = {
  
  // Upload file ke Storage + simpan metadata ke Realtime Database
  async uploadDokumen(file, kategori, namaDokumen) {
    if (!file || !kategori || !namaDokumen) {
      throw new Error("Data tidak lengkap");
    }
    
    try {
      // 1. Upload file ke Firebase Storage
      const fileRef = storageRef(storage, `dokumen/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);
      
      const downloadURL = await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            // Bisa tambahkan progress bar di sini
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload progress: ${progress.toFixed(2)}%`);
          },
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });
      
      // 2. Simpan metadata ke Realtime Database
      const newDocRef = push(ref(db, 'dokumen'));
      await set(newDocRef, {
        nama: namaDokumen.trim(),
        kategori: kategori,
        url: downloadURL,
        fileName: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        storagePath: `dokumen/${file.name}`
      });
      
      return { success: true, id: newDocRef.key, url: downloadURL };
      
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },

  // Ambil semua dokumen (urut dari terbaru)
  async getDokumen() {
    try {
      const snapshot = await get(ref(db, 'dokumen'));
      if (!snapshot.exists()) return [];
      
      const data = snapshot.val();
      // Convert object to array + sort by uploadedAt (newest first)
      return Object.entries(data)
        .map(([id, doc]) => ({ id, ...doc }))
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    } catch (error) {
      console.error('Get dokumen error:', error);
      throw error;
    }
  },

  // Hapus dokumen + file di storage
  async hapusDokumen(dokId, storagePath) {
    try {
      // Hapus dari database
      await remove(ref(db, `dokumen/${dokId}`));
      
      // Hapus file dari storage (opsional)
      if (storagePath) {
        const fileRef = storageRef(storage, storagePath);
        await deleteObject(fileRef);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }
};
