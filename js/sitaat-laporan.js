// ══════════════════════════════════════════════
// SITAAT - DASHBOARD & LAPORAN
// ══════════════════════════════════════════════

// ═════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════
async function loadDashboard() {
    try {
        const snapshot = await db.collection('sitaat_pelanggaran').get();
        
        const allPelanggaran = [];
        snapshot.forEach(doc => {
            allPelanggaran.push({ id: doc.id, ...doc.data() });
        });
        
        // Statistik
        const totalPelanggaran = allPelanggaran.length;
        const today = new Date().toISOString().split('T')[0];
        const hariIni = allPelanggaran.filter(p => p.tanggal === today).length;
        
        // Hitung siswa bermasalah (poin > 10)
        const siswaMap = new Map();
        allPelanggaran.forEach(p => {
            const key = `${p.namaSiswa}-${p.kelasSiswa}`.toLowerCase();
            if (!siswaMap.has(key)) {
                siswaMap.set(key, { nama: p.namaSiswa, kelas: p.kelasSiswa, totalPoin: 0 });
            }
            siswaMap.get(key).totalPoin += p.poin || 0;
        });
        
        const siswaBermasalah = Array.from(siswaMap.values()).filter(s => s.totalPoin > 10).length;
        
        // Rata-rata poin
        let totalPoin = 0;
        Array.from(siswaMap.values()).forEach(s => totalPoin += s.totalPoin);
        const rataPoin = siswaMap.size > 0 ? Math.round(totalPoin / siswaMap.size) : 0;
        
        // Update UI
        document.getElementById('statTotalPelanggaran').textContent = totalPelanggaran;
        document.getElementById('statSiswaBermasalah').textContent = siswaBermasalah;
        document.getElementById('statHariIni').textContent = hariIni;
        document.getElementById('statRataPoin').textContent = rataPoin;
        
        // Top 10 siswa
        const topSiswa = Array.from(siswaMap.values())
            .sort((a, b) => b.totalPoin - a.totalPoin)
            .slice(0, 10);
        
        renderTopSiswa(topSiswa);
        
        // Pelanggaran terbaru
        const recent = allPelanggaran
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        renderRecentPelanggaran(recent);
        
    } catch (error) {
        console.error('Error load dashboard:', error);
    }
}

function renderTopSiswa(topSiswa) {
    const container = document.getElementById('topSiswaContainer');
    if (!container) return;
    
    if (topSiswa.length === 0) {
        container.innerHTML = '<div class="empty-state">Belum ada data pelanggaran</div>';
        return;
    }
    
    let html = '';
    topSiswa.forEach((s, idx) => {
        const sanksi = getLevelSanksi(s.totalPoin);
        html += `
            <div class="siswa-item" onclick="showDetailSiswa('${s.nama}', '${s.kelas}')">
                <div class="siswa-info">
                    <h4>#${idx + 1} ${s.nama}</h4>
                    <p>Kelas: ${s.kelas} • <span class="level-badge ${sanksi.class}">${sanksi.label}</span></p>
                </div>
                <div class="siswa-poin">
                    <div class="total" style="color: #dc2626;">${s.totalPoin}</div>
                    <div class="lbl">poin</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderRecentPelanggaran(recent) {
    const container = document.getElementById('recentPelanggaranContainer');
    if (!container) return;
    
    if (recent.length === 0) {
        container.innerHTML = '<div class="empty-state">Belum ada pelanggaran</div>';
        return;
    }
    
    let html = '';
    recent.forEach(p => {
        html += `
            <div class="pelanggaran-item">
                <div class="header">
                    <span class="siswa-nama">${p.namaSiswa} (${p.kelasSiswa})</span>
                    <span class="tanggal">${formatDate(p.tanggal)}</span>
                </div>
                <div class="jenis">${p.jenisPelanggaran}</div>
                <div class="poin">+${p.poin} poin</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ══════════════════════════════════════════════
// LAPORAN
// ══════════════════════════════════════════════
window.generateLaporan = function() {
    const filterBulan = document.getElementById('filterBulanLaporan')?.value || '';
    const filterKelas = document.getElementById('filterKelasLaporan')?.value || '';
    const container = document.getElementById('laporanContainer');
    
    if (!container) return;
    
    let filtered = [...daftarPelanggaran];
    
    if (filterBulan) {
        filtered = filtered.filter(p => p.tanggal && p.tanggal.startsWith(filterBulan));
    }
    
    if (filterKelas) {
        filtered = filtered.filter(p => p.kelasSiswa === filterKelas);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">Tidak ada data untuk periode ini</div>';
        return;
    }
    
    // Group by siswa
    const siswaMap = new Map();
    filtered.forEach(p => {
        const key = `${p.namaSiswa}-${p.kelasSiswa}`.toLowerCase();
        if (!siswaMap.has(key)) {
            siswaMap.set(key, { nama: p.namaSiswa, kelas: p.kelasSiswa, totalPoin: 0, count: 0 });
        }
        const s = siswaMap.get(key);
        s.totalPoin += p.poin || 0;
        s.count++;
    });
    
    const siswaList = Array.from(siswaMap.values()).sort((a, b) => b.totalPoin - a.totalPoin);
    
    let html = `
        <h3 style="margin-bottom: 16px; color: #1e40af;"> Rekapitulasi Pelanggaran</h3>
        <p style="margin-bottom: 16px; color: #64748b;">
            Periode: ${filterBulan || 'Semua'} • Kelas: ${filterKelas || 'Semua'} • Total: ${filtered.length} pelanggaran
        </p>
        <table class="laporan-table">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Nama Siswa</th>
                    <th>Kelas</th>
                    <th>Jumlah Pelanggaran</th>
                    <th>Total Poin</th>
                    <th>Status Sanksi</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    siswaList.forEach((s, idx) => {
        const sanksi = getLevelSanksi(s.totalPoin);
        html += `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${s.nama}</strong></td>
                <td>${s.kelas}</td>
                <td>${s.count} kali</td>
                <td style="font-weight: 700; color: #dc2626;">${s.totalPoin}</td>
                <td><span class="level-badge ${sanksi.class}">${sanksi.label}</span></td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    
    container.innerHTML = html;
};

// ══════════════════════════════════════════════
// EXPORT EXCEL
// ═════════════════════════════════════════════
window.exportLaporanExcel = function() {
    const filterBulan = document.getElementById('filterBulanLaporan')?.value || '';
    const filterKelas = document.getElementById('filterKelasLaporan')?.value || '';
    
    let filtered = [...daftarPelanggaran];
    if (filterBulan) filtered = filtered.filter(p => p.tanggal && p.tanggal.startsWith(filterBulan));
    if (filterKelas) filtered = filtered.filter(p => p.kelasSiswa === filterKelas);
    
    if (filtered.length === 0) {
        alert('Tidak ada data untuk diexport!');
        return;
    }
    
    // Buat data Excel
    const data = [
        ['LAPORAN PELANGGARAN TATA TERTIB - MAN BANTAENG'],
        [`Periode: ${filterBulan || 'Semua'} | Kelas: ${filterKelas || 'Semua'}`],
        [`Tanggal Export: ${new Date().toLocaleString('id-ID')}`],
        [],
        ['No', 'Tanggal', 'Nama Siswa', 'Kelas', 'Jenis Pelanggaran', 'Kategori', 'Poin', 'Keterangan', 'Pelapor']
    ];
    
    filtered.forEach((p, idx) => {
        data.push([
            idx + 1,
            formatDate(p.tanggal),
            p.namaSiswa,
            p.kelasSiswa,
            p.jenisPelanggaran,
            p.kategori,
            p.poin,
            p.keterangan || '-',
            p.pelapor || '-'
        ]);
    });
    
    // Download sebagai CSV
    const csvContent = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_Pelanggaran_${filterBulan || 'Semua'}_${Date.now()}.csv`;
    link.click();
    
    alert('✅ Laporan berhasil diexport!');
};

// ══════════════════════════════════════════════
// PRINT LAPORAN
// ══════════════════════════════════════════════
window.printLaporan = function() {
    // Update info periode untuk print header
    const filterBulan = document.getElementById('filterBulanLaporan')?.value || 'Semua';
    const filterKelas = document.getElementById('filterKelasLaporan')?.value || 'Semua';
    
    const printInfo = document.getElementById('printPeriodeInfo');
    if (printInfo) {
        printInfo.textContent = `Periode: ${filterBulan} | Kelas: ${filterKelas} | Dicetak: ${new Date().toLocaleString('id-ID')}`;
    }
    
    // Tampilkan header print
    const printHeader = document.querySelector('.print-header');
    if (printHeader) {
        printHeader.style.display = 'block';
    }
    
    // Panggil print browser
    window.print();
    
    // Sembunyikan kembali header print setelah selesai
    setTimeout(() => {
        if (printHeader) {
            printHeader.style.display = 'none';
        }
    }, 1000);
};
