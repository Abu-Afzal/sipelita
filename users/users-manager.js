import { auth, db } from '../js/firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDocs, collection, updateDoc, deleteDoc, getDoc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const formTambah = document.getElementById('formTambahUser');
const btnTambah  = document.getElementById('btnTambah');

// ══════════════════════════════════════════════
// 🔔 NOTIFICATION & UTILS HELPER
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
    }, 2500);
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

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getSubscriptionStatus(user) {
    if (!user.subscription_end) return { status: 'Belum Diatur', badge: 'badge-admin', days: 0, date: '-' };
    
    const endDate = user.subscription_end.toDate();
    const now = new Date();
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (user.subscription_status === 'pending_renewal') {
        return { status: 'Menunggu Verifikasi', badge: 'badge-pending', days: diffDays, date: formatDate(endDate) };
    }
    if (diffDays <= 0) {
        return { status: 'Kadaluarsa', badge: 'badge-expired', days: diffDays, date: formatDate(endDate) };
    }
    if (diffDays <= 30) {
        return { status: 'Segera Berakhir', badge: 'badge-warning', days: diffDays, date: formatDate(endDate) };
    }
    return { status: 'Aktif', badge: 'badge-active', days: diffDays, date: formatDate(endDate) };
}

// ══════════════════════════════════════════════
// 🔄 MANAJEMEN PERMOHONAN PERPANJANGAN LANGGANAN
// ══════════════════════════════════════════════
window.loadRenewalRequests = async function() {
    const section = document.getElementById('renewalApprovalSection');
    const tbody = document.getElementById('renewalTbody');
    const badge = document.getElementById('renewalPendingCount');
    
    if (!section || !tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#94a3b8;">Memuat...</td></tr>';

    try {
        const q = query(collection(db, 'renewal_requests'), where('status', '==', 'pending'), orderBy('request_date', 'desc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        if (badge) badge.textContent = snapshot.size;
        tbody.innerHTML = '';

        for (const docSnap of snapshot.docs) {
            const req = docSnap.data();
            const reqId = docSnap.id;
            const tgl = req.request_date ? formatDate(req.request_date) : '-';
            
            let previewBtn = '';
            if (req.file_name && (req.file_name.endsWith('.jpg') || req.file_name.endsWith('.jpeg') || req.file_name.endsWith('.png'))) {
                previewBtn = `<img src="${req.bukti_base64}" class="bukti-img" onclick="window.showBuktiModal('${req.bukti_base64}', 'image')" title="Klik untuk memperbesar" style="max-width:80px;max-height:80px;border-radius:6px;cursor:pointer;border:2px solid #e2e8f0;">`;
            } else if (req.file_name && req.file_name.endsWith('.pdf')) {
                previewBtn = `<button class="btn btn-sm btn-primary" onclick="window.showBuktiModal('${req.bukti_base64}', 'pdf')">📄 Lihat PDF</button>`;
            } else {
                previewBtn = `<span style="font-size:0.8rem;color:#64748b;">${req.file_name || 'File'}</span>`;
            }

            const safeName = (req.user_name || '-').replace(/'/g, "\\'");

            tbody.innerHTML += `
                <tr>
                    <td><strong>${req.user_name}</strong></td>
                    <td>${req.user_email}</td>
                    <td>${previewBtn}</td>
                    <td>${tgl}</td>
                    <td style="text-align:center;">
                        <button class="btn-approve" onclick="window.approveRenewal('${reqId}', '${req.user_email}', '${safeName}')">✅ Setujui (+1 Thn)</button>
                        <button class="btn-reject-approval" onclick="window.rejectRenewal('${reqId}')">❌ Tolak</button>
                    </td>
                </tr>
            `;
        }
    } catch (err) {
        console.error("Error load renewal:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#dc2626;">❌ Gagal: ${err.message}</td></tr>`;
    }
};

window.showBuktiModal = function(base64Data, type) {
    const container = document.getElementById('buktiPreviewContainer');
    if (!container) return;
    if (type === 'image') {
        container.innerHTML = `<img src="${base64Data}" style="max-width:100%;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">`;
    } else {
        container.innerHTML = `<embed src="${base64Data}" type="application/pdf" style="width:100%;height:500px;border-radius:8px;">`;
    }
    document.getElementById('modalBukti').classList.add('active');
};

window.approveRenewal = async (reqId, userEmail, userName) => {
    if (!confirm(`Setujui perpanjangan langganan untuk ${userName} selama 1 tahun?`)) return;
    try {
        const newEndDate = new Date();
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        
        // Update user (Doc ID adalah email berdasarkan struktur Anda)
        await updateDoc(doc(db, 'users', userEmail), {
            subscription_end: newEndDate,
            subscription_status: 'active'
        });

        // Update request status
        await updateDoc(doc(db, 'renewal_requests', reqId), {
            status: 'approved',
            processed_at: serverTimestamp()
        });

        showNotification(`✅ Langganan ${userName} diperpanjang 1 tahun!`, 'success');
        window.loadRenewalRequests();
        window.loadUsers();
    } catch (err) {
        alert('❌ Gagal approve: ' + err.message);
    }
};

window.rejectRenewal = async (reqId) => {
    if (!confirm('Tolak permohonan perpanjangan ini?')) return;
    try {
        await updateDoc(doc(db, 'renewal_requests', reqId), {
            status: 'rejected',
            processed_at: serverTimestamp()
        });
        showNotification('❌ Permohonan ditolak.', 'error');
        window.loadRenewalRequests();
    } catch (err) {
        alert('❌ Gagal reject: ' + err.message);
    }
};

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
            // subscription_end akan diatur nanti oleh admin
        });

        tampilkanAlert('alertTambah', '✅ User baru berhasil disimpan & langsung aktif!', 'success');
        formTambah.reset();
        window.loadUsers();
        window.loadPendingUsers();

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
// 📋 LOAD DAFTAR USER (Dengan Status Langganan)
// ══════════════════════════════════════════════
window.loadUsers = async function() {
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
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#64748b;">📭 Belum ada data user.</td></tr>';
            return;
        }

        snapshot.forEach(docSnap => {
            const user = docSnap.data();
            const email = docSnap.id; // Doc ID adalah email
            const safePassword = (user.password || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeNama = (user.nama || 'User').replace(/'/g, "\\'");

            const roleBadge = user.role === 'admin' 
                ? '<span class="badge badge-admin">👑 Admin</span>' 
                : '<span class="badge badge-guru">👤 Guru</span>';

            const sub = getSubscriptionStatus(user);
            let subText = sub.status;
            if (sub.days > 0 && sub.status === 'Aktif') subText += ` (${sub.days} hari)`;
            if (sub.status === 'Segera Berakhir') subText += ` (${sub.days} hari)`;
            if (sub.status === 'Kadaluarsa') subText += ` (Lewat ${Math.abs(sub.days)} hari)`;

            let passwordCell = '';
            if (user.password) {
                passwordCell = `
                    <div class="pw-cell">
                        <span id="pwd-${email}">••••••••</span>
                        <button onclick="window.togglePassword('${email}', '${safePassword}')" title="Lihat">👁️</button>
                        <button onclick="window.copyPassword('${safePassword}')" title="Salin">📋</button>
                    </div>
                `;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${user.nama || '-'}</strong><br><small style="color:#64748b">${user.nip || 'NIP: -'}</small></td>
                <td>${user.email}</td>
                <td>${roleBadge}</td>
                <td><span class="badge ${sub.badge}">${subText}</span></td>
                <td>${sub.date}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="window.extendManual('${email}', '${safeNama}')" title="Tambah 1 Tahun">➕ 1 Thn</button>
                    <button class="btn btn-sm btn-primary" onclick="window.bukaModalEdit('${email}')" style="margin-left:4px;">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="window.hapusUser('${email}', '${safeNama}')" style="margin-left:4px;">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error Load Users:", err);
        loading.innerHTML = `<div style="color:#ef4444;padding:20px;">❌ Gagal memuat: ${err.message}</div>`;
    }
};

// ══════════════════════════════════════════════
// ➕ EXTEND MANUAL 1 TAHUN
// ══════════════════════════════════════════════
window.extendManual = async (email, nama) => {
    if (!confirm(`Tambah masa aktif ${nama} selama 1 tahun dari hari ini?`)) return;
    try {
        const newEndDate = new Date();
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        
        await updateDoc(doc(db, 'users', email), {
            subscription_end: newEndDate,
            subscription_status: 'active'
        });
        
        showNotification(`✅ Masa aktif ${nama} berhasil ditambah 1 tahun!`, 'success');
        window.loadUsers();
    } catch (err) {
        alert('❌ Gagal: ' + err.message);
    }
};

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

// ══════════════════════════════════════════════
// ✏️ EDIT USER
// ══════════════════════════════════════════════
window.bukaModalEdit = async (email) => {
    try {
        const docSnap = await getDoc(doc(db, 'users', email)); // Lebih efisien dari getDocs
        if (!docSnap.exists()) return alert('Data user tidak ditemukan!');
        const userData = docSnap.data();

        document.getElementById('editDocId').value = email;
        document.getElementById('editNama').value = userData.nama || '';
        document.getElementById('editNip').value = userData.nip || '';
        document.getElementById('editMapel').value = userData.mataPelajaran || '';
        document.getElementById('editRole').value = userData.role || 'guru';
        document.getElementById('modalEdit').classList.add('active');
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

        document.getElementById('modalEdit').classList.remove('active');
        showNotification('✅ Data user diperbarui!', 'success');
        window.loadUsers();
    } catch (err) {
        alert('❌ Gagal: ' + err.message);
    }
    btn.disabled = false;
    btn.innerHTML = '💾 Simpan Perubahan';
});

document.getElementById('btnBatalEdit')?.addEventListener('click', () => {
    document.getElementById('modalEdit').classList.remove('active');
});

// ══════════════════════════════════════════════
// 🗑️ HAPUS USER
// ══════════════════════════════════════════════
window.hapusUser = async (email, nama) => {
    if (!confirm(`⚠️ Yakin hapus user "${nama}" (${email}) secara permanen?`)) return;
    try {
        await deleteDoc(doc(db, 'users', email));
        showNotification('✅ User dihapus!', 'success');
        window.loadUsers();
        window.loadPendingUsers();
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
    // Hapus kolom aksi agar tidak terekspor
    cloneTabel.querySelectorAll('tr').forEach(row => {
        if (row.lastElementChild && row.cells.length > 5) {
            row.removeChild(row.lastElementChild);
        }
    });
    try {
        const wb = XLSX.utils.table_to_book(cloneTabel, { sheet: "Daftar Akun SIPELITA" });
        const tanggal = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Daftar_Akun_SIPELITA_${tanggal}.xlsx`);
    } catch (err) {
        alert('❌ Gagal ekspor: ' + err.message);
    }
});

// ══════════════════════════════════════════════
// ⏳ APPROVAL PENDAFTAR BARU (dari register.html)
// ══════════════════════════════════════════════
window.loadPendingUsers = async function() {
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
            return `
                <tr>
                    <td><strong>${u.nama || '-'}</strong></td>
                    <td>${u.email}</td>
                    <td>${u.mataPelajaran || '-'}</td>
                    <td>${u.nip || '-'}</td>
                    <td>${tgl}</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button class="btn-approve" onclick="window.approveUser('${u.id}', '${safeNama}')">✅ Approve</button>
                        <button class="btn-reject-approval" onclick="window.rejectUser('${u.id}', '${safeNama}')">❌ Reject</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error("Error load pending:", err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#dc2626;">❌ Gagal: ${err.message}</td></tr>`;
    }
};

window.approveUser = async (id, nama) => {
    if (!confirm(`✅ Setujui pendaftaran "${nama}"?\n\nGuru ini langsung bisa login.`)) return;
    try {
        await updateDoc(doc(db, 'users', id), {
            status: 'active',
            approvedAt: new Date().toISOString(),
            approvedBy: auth.currentUser?.email || 'admin'
        });
        showNotification(`✅ "${nama}" disetujui!`, 'success');
        window.loadPendingUsers();
        window.loadUsers();
    } catch (err) {
        alert('❌ Gagal approve: ' + err.message);
    }
};

window.rejectUser = async (id, nama) => {
    const alasan = prompt(`Alasan penolakan untuk "${nama}" (opsional):`);
    if (alasan === null) return;
    try {
        await updateDoc(doc(db, 'users', id), {
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectedBy: auth.currentUser?.email || 'admin',
            rejectReason: alasan || ''
        });
        showNotification(`❌ "${nama}" ditolak.`, 'error');
        window.loadPendingUsers();
        window.loadUsers();
    } catch (err) {
        alert('❌ Gagal reject: ' + err.message);
    }
};

// ══════════════════════════════════════════════
// 🚀 INISIALISASI
// ══════════════════════════════════════════════
window.loadUsers();
window.loadPendingUsers();
window.loadRenewalRequests();

console.log('✅ Users manager loaded (with Subscription & Approval)');