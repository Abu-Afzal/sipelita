import { auth, db } from '../js/firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDocs, collection, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
            createdAt: new Date().toISOString()
        });

        tampilkanAlert('alertTambah', '✅ User baru berhasil disimpan!');
        formTambah.reset();
        loadUsers();

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
// 📋 LOAD DAFTAR USER (Dengan Password, NIP, Mapel)
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
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">📭 Belum ada data user.</td></tr>';
            return;
        }

        snapshot.forEach(docSnap => {
            const user = docSnap.data();
            const email = docSnap.id;
            const safePassword = (user.password || '')
                .replace(/\\/g, '\\\\').replace(/'/g, "\\'")
                .replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            const roleBadge = user.role === 'admin' 
                ? '<span class="badge badge-admin">👑 Admin</span>' 
                : '<span class="badge badge-guru">👤 Guru</span>';

            // Kolom Password dengan toggle & copy
            let passwordCell = '';
            if (user.password) {
                passwordCell = `
                    <div class="pw-cell">
                        <span id="pwd-${docSnap.id}">••••••••</span>
                        <button onclick="window.togglePassword('${docSnap.id}', '${safePassword}')" title="Lihat">👁️</button>
                        <button onclick="window.copyPassword('${safePassword}')" title="Salin">📋</button>
                    </div>
                `;
            } else {
                passwordCell = `
                    <div class="pw-cell">
                        <span style="color:#94a3b8;font-style:italic;">Belum di-set</span>
                        <button onclick="window.setPassword('${docSnap.id}', '${email.replace(/'/g, "\\'")}')" 
                                style="background:#10b981;color:white;padding:2px 8px;font-size:0.72rem;border-radius:4px;font-weight:600;">🔑 Set</button>
                    </div>
                `;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${user.nama || '-'}</strong></td>
                <td>${user.email}</td>
                <td>${passwordCell}</td>
                <td>${roleBadge}</td>
                <td>${user.nip || '-'}</td>
                <td>${user.mataPelajaran || '-'}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="window.bukaModalEdit('${email}')">✏️ Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="window.hapusUser('${email}')" style="margin-left:5px;">🗑️</button>
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
window.togglePassword = (docId, password) => {
    const span = document.getElementById(`pwd-${docId}`);
    if (!span) return;
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

window.copyPassword = async (password) => {
    try {
        await navigator.clipboard.writeText(password);
        showNotification('✅ Password disalin!', 'success');
    } catch (err) {
        alert('Password: ' + password);
    }
};

window.setPassword = async (docId, email) => {
    const newPassword = prompt(`Set password baru untuk:\n${email}\n\n(Minimal 6 karakter)`);
    if (!newPassword || newPassword.length < 6) {
        if (newPassword) alert('❌ Password minimal 6 karakter!');
        return;
    }
    try {
        await updateDoc(doc(db, 'users', docId), { password: newPassword });
        showNotification('✅ Password berhasil di-set!', 'success');
        loadUsers();
    } catch (err) {
        alert('❌ Gagal: ' + err.message);
    }
};

// ══════════════════════════════════════════════
// ✏️ EDIT USER
// ══════════════════════════════════════════════
window.bukaModalEdit = async (email) => {
    try {
        const docSnap = await getDocs(collection(db, 'users'));
        let userData = null;
        docSnap.forEach(d => { if (d.id === email) userData = d.data(); });
        if (!userData) return alert('Data user tidak ditemukan!');

        document.getElementById('editDocId').value = email;
        document.getElementById('editNama').value = userData.nama || '';
        document.getElementById('editNip').value = userData.nip || '';
        document.getElementById('editMapel').value = userData.mataPelajaran || '';
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
        alert('❌ Gagal: ' + err.message);
    }
    btn.disabled = false;
    btn.innerHTML = '💾 Simpan Perubahan';
});

document.getElementById('btnBatalEdit')?.addEventListener('click', () => {
    document.getElementById('modalEdit').style.display = 'none';
});

// ══════════════════════════════════════════════
// 🗑️ HAPUS USER
// ══════════════════════════════════════════════
window.hapusUser = async (email) => {
    if (!confirm(`⚠️ Yakin hapus user "${email}" secara permanen?`)) return;
    try {
        await deleteDoc(doc(db, 'users', email));
        showNotification('✅ User dihapus!', 'success');
        loadUsers();
    } catch (err) {
        alert('❌ Gagal: ' + err.message);
    }
};

// ══════════════════════════════════════════════
// 📥 EKSPOR KE EXCEL
// ══════════════════════════════════════════════
document.getElementById('btnExportExcel')?.addEventListener('click', () => {
    const tabel = document.querySelector('#tableUsers table');
    if (!tabel || tabel.offsetParent === null) {
        alert('❌ Tabel belum ada atau masih kosong!');
        return;
    }
    const cloneTabel = tabel.cloneNode(true);
    cloneTabel.querySelectorAll('tr').forEach(row => {
        if (row.lastElementChild) row.removeChild(row.lastElementChild);
    });
    try {
        const wb = XLSX.utils.table_to_book(cloneTabel, { sheet: "Daftar Akun SIPELITA" });
        const tanggal = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Daftar_Akun_SIPELITA_${tanggal}.xlsx`);
    } catch (err) {
        alert('❌ Gagal ekspor: ' + err.message);
    }
});

// Ekspor ke window agar bisa dipanggil dari luar
window.loadUsers = loadUsers;
loadUsers();

console.log('✅ Users manager loaded');
