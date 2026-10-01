import { auth, db } from '../js/firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDocs, getDoc, collection, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const formTambah = document.getElementById('formTambahUser');
const btnTambah  = document.getElementById('btnTambah');

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
        position: fixed; top: 20px; right: 20px;
        background: ${bgColor}; color: white;
        padding: 12px 20px; border-radius: 8px;
        font-weight: 600; font-size: 0.9rem;
        z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
    `;
    if (!document.getElementById('toast-keyframes')) {
        const style = document.createElement('style');
        style.id = 'toast-keyframes';
        style.textContent = `@keyframes slideInRight { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
        document.head.appendChild(style);
    }
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function tampilkanAlert(elementId, pesan, tipe = 'success') {
    const alertEl = document.getElementById(elementId);
    if (!alertEl) return;
    alertEl.style.display = 'block';
    alertEl.style.background = tipe === 'success' ? '#dcfce7' : '#fee2e2';
    alertEl.style.color = tipe === 'success' ? '#14532d' : '#991b1b';
    alertEl.innerText = pesan;
    setTimeout(() => { alertEl.style.display = 'none'; }, 4000);
}

// ══════════════════════════════════════════════
// ➕ TAMBAH USER BARU
// ══════════════════════════════════════════════
formTambah?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const nama     = document.getElementById('nama').value.trim();
    const password = document.getElementById('password').value;
    const role     = document.getElementById('role').value;
    const nip      = document.getElementById('nip')?.value.trim() || '-';
    const mataPelajaran = document.getElementById('mapel')?.value.trim() || '-';

    try {
        btnTambah.disabled = true;
        btnTambah.innerHTML = '⌛ Menyimpan...';

        const cred = await createUserWithEmailAndPassword(auth, email, password);

        await setDoc(doc(db, 'users', email), {
            uid: cred.user.uid,
            email, nama, password, role,
            nip, mataPelajaran,
            status: 'active',
            approvedAt: new Date().toISOString(),
            approvedBy: auth.currentUser?.email || 'admin',
            createdAt: new Date().toISOString()
        });

        tampilkanAlert('alertTambah', '✅ User baru berhasil disimpan & langsung aktif!');
        formTambah.reset();
        loadUsers();
        loadPendingUsers();

    } catch (err) {
        console.error("Error Simpan User:", err);
        let pesanError = err.message;
        if (err.code === 'auth/email-already-in-use') pesanError = '❌ Email ini sudah terdaftar!';
        else if (err.code === 'auth/weak-password') pesanError = '❌ Password minimal 6 karakter!';
        tampilkanAlert('alertTambah', pesanError, 'danger');
    }

    btnTambah.disabled = false;
    btnTambah.innerHTML = '💾 Simpan User';
});

// ══════════════════════════════════════════════
// 📋 LOAD DAFTAR USER (DIPERBAIKI: 8 KOLOM PASTI)
// ══════════════════════════════════════════════
async function loadUsers() {
    const tbody = document.getElementById('userTableBody');
    const loading = document.getElementById('loadingUsers');
    const tableWrap = document.getElementById('tableUsers');

    if (!tbody || !loading) return;
    loading.style.display = 'block';
    if (tableWrap) tableWrap.style.display = 'none';
    tbody.innerHTML = '';

    try {
        const snapshot = await getDocs(collection(db, 'users'));
        loading.style.display = 'none';
        if (tableWrap) tableWrap.style.display = 'block';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#64748b;">📭 Belum ada data user.</td></tr>';
            return;
        }

        snapshot.forEach(docSnap => {
            const user = docSnap.data();
            const email = docSnap.id; // ID dokumen adalah email
            
            // Escape karakter khusus agar tidak merusak HTML/JS
            const safeEmail = email.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safePw = (user.password || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeNama = (user.nama || '-').replace(/'/g, "\\'");

            const roleBadge = user.role === 'admin' 
                ? '<span class="badge badge-admin">👑 Admin</span>' 
                : '<span class="badge badge-guru">👤 Guru</span>';

            const statusBadge = user.status === 'pending'
                ? '<span class="badge badge-pending">⏳ Pending</span>'
                : user.status === 'rejected'
                    ? '<span class="badge badge-rejected">❌ Ditolak</span>'
                    : '<span class="badge badge-active">✅ Aktif</span>';

            // LOGIKA PASSWORD: Tampilkan tombol lihat/salin, atau tombol "Set" jika belum ada
            let passwordCell = '';
            if (user.password && user.password.length > 0) {
                passwordCell = `
                    <div class="pw-cell">
                        <span id="pwd-${safeEmail}">••••••••</span>
                        <button type="button" onclick="window.togglePassword('${safeEmail}', '${safePw}')" title="Lihat" style="background:none;border:none;cursor:pointer;font-size:1rem;">👁️</button>
                        <button type="button" onclick="window.copyPassword('${safePw}')" title="Salin" style="background:none;border:none;cursor:pointer;font-size:1rem;">📋</button>
                    </div>
                `;
            } else {
                passwordCell = `
                    <div class="pw-cell">
                        <span style="color:#94a3b8;font-style:italic;font-size:0.85rem;">Belum di-set</span>
                        <button type="button" onclick="window.setPassword('${safeEmail}', '${safeEmail}')" 
                                style="background:#10b981;color:white;padding:2px 6px;font-size:0.7rem;border-radius:4px;font-weight:600;border:none;cursor:pointer;margin-left:4px;">🔑 Set</button>
                    </div>
                `;
            }

            // PASTIKAN 8 KOLOM (<td>) SESUAI DENGAN 8 HEADER (<th>)
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${user.nama || '-'}</strong></td>
                <td>${user.email || email}</td>
                <td>${passwordCell}</td>
                <td>${roleBadge}</td>
                <td>${user.nip || '-'}</td>
                <td>${user.mataPelajaran || user.mapel || '-'}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="window.bukaModalEdit('${safeEmail}')" style="padding:4px 8px;font-size:0.8rem;">✏️ Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="window.hapusUser('${safeEmail}', '${safeNama}')" style="padding:4px 8px;font-size:0.8rem;margin-left:4px;">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error Load Users:", err);
        loading.innerHTML = `<div style="color:#ef4444;padding:20px;">❌ Gagal memuat: ${err.message}</div>`;
    }
}

// ══════════════════════════════════════════════
// 🔐 TOGGLE & COPY PASSWORD
// ══════════════════════════════════════════════
window.togglePassword = (safeEmail, password) => {
    const span = document.getElementById(`pwd-${safeEmail}`);
    if (!span) return;
    
    if (span.textContent === '••••••••') {
        span.textContent = password;
        span.style.color = '#d32f2f';
        span.style.fontFamily = 'monospace';
    } else {
        span.textContent = '••••••••';
        span.style.color = '#1a237e';
        span.style.fontFamily = 'inherit';
    }
};

window.copyPassword = async (password) => {
    try {
        await navigator.clipboard.writeText(password);
        showNotification('✅ Password disalin ke clipboard!', 'success');
    } catch (err) {
        // Fallback untuk browser lama
        const textArea = document.createElement('textarea');
        textArea.value = password;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('✅ Password disalin!', 'success');
    }
};

window.setPassword = async (safeEmail, originalEmail) => {
    const newPassword = prompt(`Set password baru untuk:\n${originalEmail}\n\n(Minimal 6 karakter)`);
    if (!newPassword || newPassword.length < 6) {
        if (newPassword) showNotification('❌ Password minimal 6 karakter!', 'error');
        return;
    }
    try {
        await updateDoc(doc(db, 'users', originalEmail), { password: newPassword });
        showNotification('✅ Password berhasil di-set!', 'success');
        loadUsers();
    } catch (err) {
        showNotification('❌ Gagal: ' + err.message, 'error');
    }
};

// ══════════════════════════════════════════════
// ✏️ EDIT USER (DIOPTIMALKAN DENGAN getDoc)
// ══════════════════════════════════════════════
window.bukaModalEdit = async (safeEmail) => {
    try {
        // Gunakan getDoc untuk mengambil 1 dokumen spesifik (lebih cepat dari getDocs)
        const docSnap = await getDoc(doc(db, 'users', safeEmail));
        if (!docSnap.exists()) return alert('Data user tidak ditemukan!');
        
        const userData = docSnap.data();

        document.getElementById('editDocId').value = safeEmail;
        document.getElementById('editNama').value = userData.nama || '';
        document.getElementById('editNip').value = userData.nip || '';
        document.getElementById('editMapel').value = userData.mataPelajaran || userData.mapel || '';
        document.getElementById('editRole').value = userData.role || 'guru';
        
        document.getElementById('modalEdit').style.display = 'flex';
    } catch (err) {
        alert('Gagal memuat data: ' + err.message);
    }
};

document.getElementById('formEditUser')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('editDocId').value;
    const btn = document.getElementById('btnSimpanEdit');

    try {
        btn.disabled = true;
        btn.innerHTML = '⌛ Menyimpan...';

        await updateDoc(doc(db, 'users', email), {
            nama: document.getElementById('editNama').value.trim(),
            nip: document.getElementById('editNip').value.trim() || '-',
            mataPelajaran: document.getElementById('editMapel').value.trim() || '-',
            role: document.getElementById('editRole').value,
            updatedAt: new Date().toISOString()
        });

        document.getElementById('modalEdit').style.display = 'none';
        showNotification('✅ Data user diperbarui!', 'success');
        loadUsers();
    } catch (err) {
        showNotification('❌ Gagal: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💾 Simpan Perubahan';
    }
});

document.getElementById('btnBatalEdit')?.addEventListener('click', () => {
    document.getElementById('modalEdit').style.display = 'none';
});

// ══════════════════════════════════════════════
// 🗑️ HAPUS USER
// ══════════════════════════════════════════════
window.hapusUser = async (email, nama) => {
    if (!confirm(`⚠️ Yakin hapus user "${nama}" (${email}) secara permanen?`)) return;
    try {
        await deleteDoc(doc(db, 'users', email));
        showNotification('✅ User dihapus!', 'success');
        loadUsers();
        loadPendingUsers();
    } catch (err) {
        showNotification('❌ Gagal: ' + err.message, 'error');
    }
};

// ══════════════════════════════════════════════
// 📥 EKSPOR KE EXCEL
// ══════════════════════════════════════════════
document.getElementById('btnExportExcel')?.addEventListener('click', () => {
    const tabel = document.querySelector('#tableUsers table');
    if (!tabel || tabel.offsetParent === null) {
        showNotification('❌ Tabel belum ada atau masih kosong!', 'error');
        return;
    }
    const cloneTabel = tabel.cloneNode(true);
    // Hapus kolom aksi agar tidak ikut terekspor
    cloneTabel.querySelectorAll('tr').forEach(row => {
        if (row.cells.length > 7) row.deleteCell(7); 
    });
    try {
        const wb = XLSX.utils.table_to_book(cloneTabel, { sheet: "Daftar Akun" });
        const tanggal = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Daftar_Akun_SIPELITA_${tanggal}.xlsx`);
        showNotification('✅ File Excel berhasil diunduh!', 'success');
    } catch (err) {
        showNotification('❌ Gagal ekspor: ' + err.message, 'error');
    }
});

// ══════════════════════════════════════════════
// ⏳ APPROVAL PENDAFTAR BARU
// ══════════════════════════════════════════════
window.loadPendingUsers = async () => {
    const section = document.getElementById('approvalSection');
    const tbody   = document.getElementById('pendingTbody');
    const badge   = document.getElementById('pendingCountBadge');
    if (!section || !tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#94a3b8;">Memuat...</td></tr>';

    try {
        const snapshot = await getDocs(collection(db, 'users'));
        const pending = [];
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            if (d.status === 'pending') pending.push({ id: docSnap.id, ...d });
        });

        if (!pending.length) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        if (badge) badge.textContent = pending.length + ' pendaftar';

        tbody.innerHTML = pending.map(u => {
            const tgl = u.createdAt
                ? new Date(u.createdAt).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
                : '-';
            const safeNama = (u.nama || '-').replace(/"/g, '&quot;').replace(/'/g, "\\'");
            const safeEmail = u.email.replace(/'/g, "\\'");
            return `
                <tr>
                    <td><strong>${u.nama || '-'}</strong></td>
                    <td>${u.email}</td>
                    <td>${u.mataPelajaran || u.mapel || '-'}</td>
                    <td>${u.nip || '-'}</td>
                    <td>${tgl}</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button class="btn-approve" onclick="window.approveUser('${safeEmail}', '${safeNama}')">✅ Approve</button>
                        <button class="btn-reject-approval" onclick="window.rejectUser('${safeEmail}', '${safeNama}')">❌ Reject</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error("Error load pending:", err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#dc2626;">❌ Gagal: ${err.message}</td></tr>`;
    }
};

window.approveUser = async (email, nama) => {
    if (!confirm(`✅ Setujui pendaftaran "${nama}"?\n\nGuru ini langsung bisa login.`)) return;
    try {
        await updateDoc(doc(db, 'users', email), {
            status: 'active',
            approvedAt: new Date().toISOString(),
            approvedBy: auth.currentUser?.email || 'admin'
        });
        showNotification(`✅ "${nama}" disetujui!`, 'success');
        window.loadPendingUsers();
        loadUsers();
    } catch (err) {
        showNotification('❌ Gagal approve: ' + err.message, 'error');
    }
};

window.rejectUser = async (email, nama) => {
    const alasan = prompt(`Alasan penolakan untuk "${nama}" (opsional):`);
    if (alasan === null) return;
    try {
        await updateDoc(doc(db, 'users', email), {
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectedBy: auth.currentUser?.email || 'admin',
            rejectReason: alasan || ''
        });
        showNotification(`❌ "${nama}" ditolak.`, 'error');
        window.loadPendingUsers();
        loadUsers();
    } catch (err) {
        showNotification('❌ Gagal reject: ' + err.message, 'error');
    }
};

// ══════════════════════════════════════════════
// 🚀 INISIALISASI
// ══════════════════════════════════════════════
window.loadUsers = loadUsers;
loadUsers();
loadPendingUsers();

console.log('✅ Users manager loaded & fixed!');
