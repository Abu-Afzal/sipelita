function renderCards() {
    const umumContainer = document.getElementById('layanan-umum');
    const madrasahContainer = document.getElementById('layanan-madrasah');

    // ====================================================================
    // 🔒 DETEKSI ROLE ANTI-CRASH (KEBAL PELURU)
    // ====================================================================
    let currentRole = 'guru'; // Default fallback aman
    
    try {
        const authKeys = ['sipelita_user', 'user', 'userData', 'auth'];
        
        for (const key of authKeys) {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.role) {
                        currentRole = parsed.role;
                        break;
                    }
                } catch (e) {
                    if (data === 'admin' || data === 'guru') {
                        currentRole = data;
                        break;
                    }
                }
            }
        }
    } catch (err) {
        console.error("Gagal mendeteksi session role, menggunakan akses standar:", err);
    }

    // Daftar judul card yang HANYA boleh dilihat oleh Admin (BACKUP)
    const fiturKhususAdmin = ['Master PKKM', 'Admin Users', 'Kelola Berita', 'Master Siswa'];

    // ══════════════════════════════════════════════
    // 🔐 FUNGSI HELPER: CEK APAKAH MENU BOLEH DITAMPILKAN
    // ══════════════════════════════════════════════
    function isMenuAllowed(item, userRole) {
        // Admin bisa lihat semua menu
        if (userRole === 'admin') return true;
        
        // Cek property 'role' di config (CARA BARU - LEBIH FLEKSIBEL)
        if (item.role) {
            if (Array.isArray(item.role)) {
                return item.role.includes(userRole);
            }
            return item.role === userRole;
        }
        
        // Cek array fiturKhususAdmin (CARA LAMA - BACKUP)
        if (fiturKhususAdmin.includes(item.title)) {
            return false;
        }
        
        return true;
    }

    // ========== LAYANAN UMUM ==========
    if (umumContainer && CONFIG.layananUmum) {
        umumContainer.innerHTML = CONFIG.layananUmum
            .filter(item => isMenuAllowed(item, currentRole))
            .map(item => {
                const displayContent = item.logo 
                    ? `<img src="${item.logo}" alt="${item.title}" class="card-logo" onerror="this.style.display='none'; this.parentElement.querySelector('.card-icon-fallback').style.display='flex';">
                       <div class="card-icon card-icon-fallback" style="display:none;">${item.icon || '📌'}</div>`
                    : `<div class="card-icon">${item.icon || '📌'}</div>`;

                return `
                    <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="card-link">
                        <div class="card" style="background: ${item.color}; color: white;">
                            ${displayContent}
                            <div class="card-title">${item.title}</div>
                            <div class="card-desc">${item.desc || ''}</div>
                        </div>
                    </a>
                `;
            }).join('');
    }

    // ========== LAYANAN MADRASAH ==========
    if (madrasahContainer && CONFIG.layananMadrasah) {
        madrasahContainer.innerHTML = CONFIG.layananMadrasah
            .filter(item => isMenuAllowed(item, currentRole))
            .map(item => {
                const displayContent = item.logo 
                    ? `<img src="${item.logo}" alt="${item.title}" class="card-logo" onerror="this.style.display='none'; this.parentElement.querySelector('.card-icon-fallback').style.display='flex';">
                       <div class="card-icon card-icon-fallback" style="display:none;">${item.icon || '📌'}</div>`
                    : `<div class="card-icon">${item.icon || '📌'}</div>`;

                const cardContent = `
                    <div class="card" style="background: ${item.color}; color: white;">
                        ${displayContent}
                        <div class="card-title">${item.title}</div>
                        <div class="card-desc">${item.desc || ''}</div>
                    </div>
                `;
                
                const link = item.url || item.page;
                const isExternal = link && (link.startsWith('http://') || link.startsWith('https://'));
                
                if (isExternal) {
                    return `<a href="${link}" target="_blank" rel="noopener noreferrer" class="card-link">${cardContent}</a>`;
                } else if (link) {
                    return `<a href="${link}" class="card-link">${cardContent}</a>`;
                } else {
                    return `<div class="card-link">${cardContent}</div>`;
                }
            }).join('');
    }
}

function closeModal() {
    const modal = document.getElementById('integrationModal');
    if (modal) modal.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', function() {
    renderCards();
    
    const modal = document.getElementById('integrationModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }
    
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
});
