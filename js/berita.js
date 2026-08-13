import { db } from './firebase-config.js'; // Memanggil konfigurasi Firebase Anda
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const beritaContainer = document.getElementById('beritaContainer');

async function muatBeritaBeranda() {
  if (!beritaContainer) return;
  
  // Berikan indikator loading awal di dalam container grid berita
  beritaContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #666; padding: 30px 0;">⏳ Memuat informasi berita terbaru...</div>';

  try {
    // OPTIMASI: Langsung ambil 3 berita terbaru dari Firestore (lebih efisien)
    const q = query(collection(db, "berita"), orderBy("createdAt", "desc"), limit(3));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      beritaContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #666; padding: 30px 0;">📭 Belum ada berita atau pengumuman terbaru.</div>';
      return;
    }

    const listBerita = [];
    querySnapshot.forEach((doc) => {
      listBerita.push({ id: doc.id, ...doc.data() });
    });

    beritaContainer.innerHTML = ''; // Bersihkan loading teks

    listBerita.forEach(b => {
      const tglFormat = new Date(b.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      });

      // Validasi Media Foto: Jika data field fotoUrl ada, pasang tag img. Jika kosong, pakai ikon cadangan
      const mediaHtml = b.fotoUrl && b.fotoUrl.trim() !== ""
        ? `<img src="${b.fotoUrl}" alt="Foto ${b.judul}">`
        : `<div class="no-image-placeholder" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); color: #2e7d32; font-size: 3rem;">📰</div>`;

      // Potong ringkasan teks berita agar seragam (maksimal 120 karakter)
      const ringkasanIsi = b.isi ? (b.isi.length > 120 ? b.isi.substring(0, 120) + '...' : b.isi) : 'Klik untuk membaca selengkapnya...';

      // Susun elemen kartu berita (news-card)
      beritaContainer.innerHTML += `
        <div class="news-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: transform 0.3s ease, box-shadow 0.3s ease;">
          
          <div class="news-card-image" style="width: 100%; height: 180px; position: relative; background: #f1f5f9; overflow: hidden;">
            ${mediaHtml}
            <span class="badge-kat" style="position: absolute; top: 12px; left: 12px; background: rgba(46, 125, 50, 0.9); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; backdrop-filter: blur(4px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-transform: uppercase;">
              ${b.kategori || 'Umum'}
            </span>
          </div>
          
          <div class="news-card-content" style="padding: 20px; display: flex; flex-direction: column; flex-grow: 1;">
            <small style="color: #64748b; font-size: 0.8rem; font-weight: 500; display: block; margin-bottom: 8px;">📅 ${tglFormat}</small>
            <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 1.2rem; font-weight: 700; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${b.judul}
            </h3>
            <p style="color: #475569; font-size: 0.9rem; line-height: 1.6; margin-bottom: 20px; flex-grow: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
              ${ringkasanIsi}
            </p>
            <a href="pages/baca-berita.html?id=${b.id}" class="btn-more" style="background: #2e7d32; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; text-align: center; text-decoration: none; transition: background 0.2s; width: 100%; box-sizing: border-box; display: inline-block;">
              Lihat Selengkapnya →
            </a>
          </div>

        </div>
      `;
    });

    // ✅ PERBAIKAN: Biarkan tombol "Lihat Semua Berita" di home.html mengarah ke daftar-berita.html
    // Kita HAPUS kode yang mengubah href tombol tersebut secara paksa ke berita terakhir.
    
    // Menambahkan efek hover transisi gambar card menggunakan penanganan CSS dinamis
    tambahkanStyleEfekHover();

  } catch (error) {
    beritaContainer.innerHTML = `<div style="grid-column: 1/-1; color:red; text-align:center; padding: 20px;">❌ Gagal memuat kontainer berita: ${error.message}</div>`;
    console.error("Firestore Error:", error);
  }
}

// Fungsi pembantu menyuntikkan efek hover interaktif pada elemen card gambar
function tambahkanStyleEfekHover() {
  if (document.getElementById('css-berita-hover')) return;
  const style = document.createElement('style');
  style.id = 'css-berita-hover';
  style.innerHTML = `
    .news-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1) !important; }
    .news-card-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
    .news-card:hover .news-card-image img { transform: scale(1.05); }
  `;
  document.head.appendChild(style);
}

// Jalankan sistem pembacaan data berita saat skrip dipanggil oleh web
muatBeritaBeranda();