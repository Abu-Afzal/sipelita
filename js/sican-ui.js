export function tampilkanHasil(data){
    // 1. Ambil seluruh elemen komponen kartu UI
    const elNama = document.getElementById('namaSiswa');
    const elKelas = document.getElementById('kelasSiswa');
    const elKegiatan = document.getElementById('kegiatanAktif');
    const elJam = document.getElementById('jamAbsen');
    const resultCard = document.getElementById('resultContainer');

    // 2. Isi data teks ke elemen masing-masing secara aman
    if (elNama) elNama.innerText = data.nama;
    if (elKelas) elKelas.innerText = data.kelas;
    if (elKegiatan) elKegiatan.innerText = data.kegiatan;
    
    // 3. Tambahkan catatan jam log absensi detik ini secara real-time
    if (elJam) {
        elJam.innerText = new Date().toLocaleTimeString('id-ID');
    }

    // 4. Munculkan kartu hasil scan dengan transisi animasi CSS
    if (resultCard) {
        resultCard.style.display = 'block'; 
        
        // Opsional: Beri efek kilatan hijau penanda data sukses tersimpan di Firestore
        resultCard.style.borderColor = '#2e7d32';
        resultCard.style.boxShadow = '0 10px 30px rgba(46, 125, 50, 0.15)';
        
        // Kembalikan ke bayangan normal setelah 2.5 detik
        setTimeout(() => {
            resultCard.style.borderColor = '#e0e0e0';
            resultCard.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.08)';
        }, 2500);
    }
}
