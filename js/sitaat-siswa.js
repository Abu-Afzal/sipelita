// ══════════════════════════════════════════════
// SITAAT - DATA SISWA & RIWAYAT
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════
// LOAD DATA SISWA (dari pelanggaran)
// ═════════════════════════════════════════════
async function loadSiswa() {
    try {
        const snapshot = await db.collection('sitaat_pelanggaran').get();
        
        daftarPelanggaran = [];
        const siswaMap = new Map();
        
        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            daftarPelanggaran.push(data);
            
            // Group by siswa
            const key = `${data.namaSiswa}-${data.kelasSiswa}`.toLowerCase();
            if (!siswaMap.has(key)) {
                siswaMap.set(key, {
                    nama: data.namaSiswa,
                    kelas: data.kelasSiswa,
                    totalPoin: 0,
                    jumlahPelanggaran: 0,
                    pelanggaran: []
                });
            }
            
            const siswa = siswaMap.get(key);
            siswa.totalPoin += data.poin || 0;
            siswa.jumlahPelanggaran++;
            siswa.pelanggaran.push(data);
        });
        
        daftarSiswa = Array.from(siswaMap.values());
        daftarSiswa.sort((a, b) => b.totalPoin - a.totalPoin);
        
        renderSiswa();
        populateFilterKelas();
        
    } catch (error) {
        console.error('Error load siswa:', error);
    }
}

function renderSiswa() {
    const container = document.getElementById('siswaContainer');
    const loading = document.getElementById('loadingSiswa');
    
    if (loading) loading.style.display = 'none';
    if (!container) return;
    
    if (daftarSiswa.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">👥</div><h3>Belum Ada Data Siswa</h3><p>Data siswa akan muncul setelah ada pelanggaran yang diinput</p></div>';
        return;
    }
    
    // Apply filter
    const search = document.getElementById('searchSiswa')?.value.toLowerCase() || '';
    const filterKelas = document.getElementById('filterKelasSiswa')?.value || '';
    const filterLevel = document.getElementById('filterLevelSiswa')?.value || '';
    
    let filtered = daftarSiswa.filter(s => {
        if (search && !s.nama.toLowerCase().includes(search)) return false;
        if (filterKelas && s.kelas !== filterKelas) return false;
        
        if (filterLevel) {
            const level = getLevelSanksi(s.totalPoin).level;
            if (level !== filterLevel) return false;
        }
        
        return true;
    });
    
    let html = '';
    filtered.forEach(siswa => {
        const sanksi = getLevelSanksi(siswa.totalPoin);
        
        html += `
            <div class="siswa-item" onclick="showDetailSiswa('${siswa.nama}', '${siswa.kelas}')">
                <div class="siswa-info">
                    <h4>${siswa.nama}</h4>
                    <p>Kelas: ${siswa.kelas} • ${siswa.jumlahPelanggaran} pelanggaran • 
                       <span class="level-badge ${sanksi.class}">${sanksi.label}</span>
                    </p>
                </div>
                <div class="siswa-poin">
                    <div class="total" style="color: ${sanksi.class === 'level-kritis' ? '#ef4444' : (sanksi.class === 'level-peringatan3' ? '#dc2626' : '#1e40af')}">
                        ${siswa.totalPoin}
                    </div>
                    <div class="lbl">Total Poin</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

window.filterSiswa = function() {
    renderSiswa();
};

// ══════════════════════════════════════════════
// DETAIL SISWA
// ══════════════════════════════════════════════
window.showDetailSiswa = function(nama, kelas) {
    const siswa = daftarSiswa.find(s => s.nama === nama && s.kelas === kelas);
    if (!siswa) return;
    
    const sanksi = getLevelSanksi(siswa.totalPoin);
    
    let html = `
        <div class="detail-row">
            <div class="detail-label">Nama Siswa:</div>
            <div class="detail-value"><strong>${siswa.nama}</strong></div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Kelas:</div>
            <div class="detail-value">${siswa.kelas}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Total Poin:</div>
            <div class="detail-value">
                <span style="font-size: 1.5rem; font-weight: 700; color: #dc2626;">${siswa.totalPoin}</span>
                <span class="level-badge ${sanksi.class}" style="margin-left: 10px;">${sanksi.label}</span>
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Jumlah Pelanggaran:</div>
            <div class="detail-value">${siswa.jumlahPelanggaran} kali</div>
        </div>
        <hr style="margin: 16px 0; border: none; border-top: 1px solid #e2e8f0;">
        <h4 style="margin-bottom: 12px; color: #1e40af;"> Riwayat Pelanggaran</h4>
    `;
    
    // Sort pelanggaran by tanggal desc
    const sortedPelanggaran = [...siswa.pelanggaran].sort((a, b) => 
        new Date(b.tanggal) - new Date(a.tanggal)
    );
    
    sortedPelanggaran.forEach((p, idx) => {
        html += `
            <div class="pelanggaran-item">
                <div class="header">
                    <span class="tanggal">${formatDate(p.tanggal)}</span>
                    <span class="poin">+${p.poin} poin</span>
                </div>
                <div class="jenis">${p.jenisPelanggaran}</div>
                ${p.keterangan ? `<div style="font-size: 0.82rem; color: #64748b; margin-top: 4px;">📝 ${p.keterangan}</div>` : ''}
                <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">Pelapor: ${p.pelapor || '-'}</div>
            </div>
        `;
    });
    
    document.getElementById('detailSiswaContent').innerHTML = html;
    document.getElementById('modalDetailSiswa').classList.add('active');
};
