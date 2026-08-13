import { db } from '../js/firebase-config.js';
import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { labelFitur } from './fitur.js';

async function loadUsers(){

    const loadEl = document.getElementById('loadingUsers');
    const tblEl  = document.getElementById('tableUsers');
    const tbody  = document.getElementById('userTableBody');

    if(!loadEl || !tblEl || !tbody) return;

    try{
        loadEl.style.display = 'block';
        tblEl.style.display  = 'none';

        const snapshot = await getDocs(collection(db, 'users'));
        tbody.innerHTML = '';

        if(snapshot.empty){
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; color:#64748b; padding:20px;">
                        📭 Belum ada user terdaftar
                    </td>
                </tr>
            `;
        } else {
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                
                // Render fitur badges
                let tampilanFitur = '-';
                try {
                    if (typeof labelFitur === 'function') {
                        tampilanFitur = labelFitur(data.fitur || []);
                    } else if (Array.isArray(data.fitur)) {
                        tampilanFitur = data.fitur.map(f => 
                            `<span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:600;">${f}</span>`
                        ).join(' ');
                    }
                } catch (e) {
                    tampilanFitur = Array.isArray(data.fitur) ? data.fitur.join(', ') : '-';
                }

                const badgeClass = data.role === 'admin' ? 'badge-admin' : 'badge-guru';
                const namaRole = data.role === 'admin' ? '👑 Admin' : '👤 Guru';

                // Cek apakah user punya password di Firestore
                const hasPassword = !!data.password;
                const rawPassword = data.password || '';
                
                // Escape password untuk keamanan
                const safePassword = rawPassword
                    .replace(/\\/g, '\\\\')
                    .replace(/'/g, "\\'")
                    .replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                // Render kolom password
                let passwordCell = '';
                if (hasPassword) {
                    passwordCell = `
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span id="pwd-${docSnap.id}" 
                                style="font-family:'Courier New',monospace;font-weight:600;color:#1a237e;letter-spacing:1px;">
                                ••••••••
                            </span>
                            <button onclick="togglePassword('${docSnap.id}', '${safePassword}')" 
                                style="background:none;border:none;cursor:pointer;padding:4px 6px;font-size:0.95rem;border-radius:4px;"
                                title="Tampilkan/Sembunyikan">
                                👁️
                            </button>
                            <button onclick="copyPassword('${safePassword}')" 
                                style="background:none;border:none;cursor:pointer;padding:4px 6px;font-size:0.95rem;border-radius:4px;"
                                title="Copy password">
                                📋
                            </button>
                        </div>
                    `;
                } else {
                    passwordCell = `
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="color:#94a3b8;font-style:italic;font-size:0.85rem;">Belum di-set</span>
                            <button onclick="setPassword('${docSnap.id}', '${data.email.replace(/'/g, "\\'")}')" 
                                style="background:#10b981;color:white;border:none;cursor:pointer;padding:4px 10px;font-size:0.75rem;border-radius:4px;font-weight:600;"
                                title="Set password">
                                🔑 Set
                            </button>
                        </div>
                    `;
                }

                // Render baris tabel
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${data.nama || '-'}</strong></td>
                        <td>${data.email || '-'}</td>
                        <td>${passwordCell}</td>
                        <td><span class="badge ${badgeClass}">${namaRole}</span></td>
                        <td>${tampilanFitur}</td>
                        <td>
                            <button class="btn btn-warning btn-sm" onclick="if(window.bukaModalEdit){ window.bukaModalEdit('${docSnap.id}') }">✏️ Edit</button>
                            <button class="btn btn-danger btn-sm" onclick="if(window.hapusUser){ window.hapusUser('${docSnap.id}') }" style="margin-left:5px;">🗑️ Hapus</button>
                        </td>
                    </tr>
                `;
            });
        }

        loadEl.style.display = 'none';
        tblEl.style.display  = 'block';

    } catch(err) {
        console.error('Error loadUsers:', err);
        loadEl.innerHTML = `<div style="color:red; padding:20px;">❌ Gagal memuat data user: ${err.message}</div>`;
    }
}

// ══════════════════════════════════════════════
// 🔐 FITUR TOGGLE & COPY PASSWORD
// ══════════════════════════════════════════════

// Toggle show/hide password
window.togglePassword = (docId, password) => {
    const span = document.getElementById(`pwd-${docId}`);
    if (!span) {
        console.error('Span password tidak ditemukan:', docId);
        return;
    }
    
    if (span.textContent === '••••••••') {
        span.textContent = password;
        span.style.color = '#d32f2f';
        span.style.letterSpacing = 'normal';
    } else {
        span.textContent = '••••••••';
        span.style.color = '#1a237e';
        span.style.letterSpacing = '1px';
    }
};

// Copy password ke clipboard
window.copyPassword = async (password) => {
    try {
        await navigator.clipboard.writeText(password);
        showNotification('✅ Password berhasil disalin!', 'success');
    } catch (err) {
        // Fallback untuk browser lama
        const textArea = document.createElement('textarea');
        textArea.value = password;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            showNotification('✅ Password disalin!', 'success');
        } catch (e) {
            alert('❌ Gagal menyalin. Password: ' + password);
        }
        
        document.body.removeChild(textArea);
    }
};

// ══════════════════════════════════════════════
// 🔑 SET PASSWORD UNTUK USER LAMA
// ══════════════════════════════════════════════
window.setPassword = async (docId, email) => {
    const newPassword = prompt(`Set password baru untuk:\n${email}\n\n(Minimal 6 karakter)`);
    
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
        alert('❌ Password minimal 6 karakter!');
        return;
    }
    
    if (!confirm(`Yakin set password untuk ${email}?`)) return;
    
    try {
        await updateDoc(doc(db, 'users', docId), {
            password: newPassword
        });
        
        showNotification('✅ Password berhasil di-set!', 'success');
        loadUsers(); // Reload tabel
        
    } catch (err) {
        console.error('Error setPassword:', err);
        alert('❌ Gagal set password: ' + err.message);
    }
};

// ══════════════════════════════════════════════
// 🔔 NOTIFICATION HELPER
// ══════════════════════════════════════════════
function showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    
    const bgColor = type === 'success' 
        ? 'linear-gradient(135deg, #10b981, #059669)' 
        : 'linear-gradient(135deg, #ef4444, #dc2626)';
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.9rem;
        z-index: 99999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
    `;
    
    // Tambahkan keyframes jika belum ada
    if (!document.getElementById('toast-keyframes')) {
        const style = document.createElement('style');
        style.id = 'toast-keyframes';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

window.loadUsers = loadUsers;
loadUsers();
