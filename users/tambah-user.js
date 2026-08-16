import { auth, db } from '../js/firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDocs, collection, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { renderCheckboxFitur, getSelectedFitur, SEMUA_FITUR } from './fitur.js';

// ──────────────────────────────────────────────────────────────
// 1. RENDER FITUR AWAL
// ──────────────────────────────────────────────────────────────
renderCheckboxFitur('checkboxFitur');

const formTambah = document.getElementById('formTambahUser');
const btnTambah  = document.getElementById('btnTambah');
const alertTambah = document.getElementById('alertTambah');

function tampilkanAlert(elementId, pesan, tipe = 'success') {
    const alertEl = document.getElementById(elementId);
    if (!alertEl) return;
    alertEl.style.display = 'block';
    alertEl.style.background = tipe === 'success' ? '#dcfce7' : '#fee2e2';
    alertEl.style.color = tipe === 'success' ? '#14532d' : '#991b1b';
    alertEl.innerText = pesan;
    setTimeout(() => { alertEl.style.display = 'none'; }, 4000);
}

// ──────────────────────────────────────────────────────────────
// 2. TAMBAH USER BARU (Menggunakan mataPelajaran)
// ──────────────────────────────────────────────────────────────
formTambah?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const nama     = document.getElementById('nama').value.trim();
    const password = document.getElementById('password').value;
    const role     = document.getElementById('role').value;
    const fitur    = getSelectedFitur('checkboxFitur');
    
    // ✅ Gunakan mataPelajaran (bukan mapel)
    const nip      = document.getElementById('nip')?.value.trim() || '-';
    const mataPelajaran = document.getElementById('mapel')?.value.trim() || '-';

    try {
        btnTambah.disabled = true;
        btnTambah.innerHTML = '⌛ Menyimpan...';

        const cred = await createUserWithEmailAndPassword(auth, email, password);

        await setDoc(doc(db, 'users', email), {
            uid: cred.user.uid,
            email,
            nama,
            password, 
            role,
            fitur,
            nip,
            mataPelajaran,  // ✅ Simpan sebagai mataPelajaran
            createdAt: new Date().toISOString()
        });

        tampilkanAlert('alertTambah', '✅ User baru berhasil disimpan!');
        formTambah.reset();
        renderCheckboxFitur('checkboxFitur');
        
        if (typeof window.loadUsers === 'function') window.loadUsers();

    } catch (err) {
        console.error("Error Simpan User:", err);
        let pesanError = err.message;
        if (err.code === 'auth/email-already-in-use') pesanError = '❌ Email ini sudah terdaftar!';
        else if (err.code === 'auth/weak-password') pesanError = ' Password minimal 6 karakter!';
        tampilkanAlert('alertTambah', pesanError, 'danger');
    }

    btnTambah.disabled = false;
    btnTambah.innerHTML = '💾 Simpan User';
});

// Auto-centang fitur jika Admin
document.getElementById('role')?.addEventListener('change', e => {
    if (e.target.value === 'admin') {
        SEMUA_FITUR.forEach(f => {
            const el = document.getElementById(`checkboxFitur_${f.id}`);
            if (el) el.checked = true;
        });
    }
});

// ──────────────────────────────────────────────────────────────
// 3. LOAD / TAMPILKAN DATA USER DI TABEL
// ──────────────────────────────────────────────────────────────
window.loadUsers = async () => {
    const tbody = document.getElementById('userTableBody');
    const loading = document.getElementById('loadingUsers');
    const tableWrap = document.getElementById('tableUsers');

    loading.style.display = 'block';
    tableWrap.style.display = 'none';
    tbody.innerHTML = '';

    try {
        const snapshot = await getDocs(collection(db, 'users'));
        loading.style.display = 'none';
        tableWrap.style.display = 'block';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">Belum ada data user.</td></tr>';
            return;
        }

        snapshot.forEach(docSnap => {
            const user = docSnap.data();
            const email = docSnap.id;
            
            const fiturBadges = (user.fitur || []).map(f => `<span class="badge-fitur">${f}</span>`).join(' ');
            const roleBadge = user.role === 'admin' 
                ? '<span class="badge badge-admin">👑 Admin</span>' 
                : '<span class="badge badge-guru"> Guru</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${user.nama || '-'}</strong></td>
                <td>${user.email}</td>
                <td>${roleBadge}</td>
                <td>${user.nip || '-'}</td>
                <td>${user.mataPelajaran || '-'}</td>  <!-- ✅ Gunakan mataPelajaran -->
                <td><div class="fitur-badge-list">${fiturBadges || '-'}</div></td>
                <td>
                    <button class="btn btn-warning btn-sm btn-edit" data-email="${email}">✏️</button>
                    <button class="btn btn-danger btn-sm btn-hapus" data-email="${email}">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Pasang event listener untuk tombol Edit & Hapus
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => bukaModalEdit(btn.dataset.email));
        });
        document.querySelectorAll('.btn-hapus').forEach(btn => {
            btn.addEventListener('click', () => hapusUser(btn.dataset.email));
        });

    } catch (err) {
        console.error("Error Load Users:", err);
        loading.innerText = '❌ Gagal memuat data.';
    }
};

// ──────────────────────────────────────────────────────────────
// 4. EDIT USER
// ──────────────────────────────────────────────────────────────
async function bukaModalEdit(email) {
    try {
        const docRef = doc(db, 'users', email);
        const docSnap = await getDocs(collection(db, 'users'));
        let userData = null;
        docSnap.forEach(d => { if(d.id === email) userData = d.data(); });
        
        if (!userData) return alert('Data user tidak ditemukan!');

        document.getElementById('editDocId').value = email;
        document.getElementById('editNama').value = userData.nama || '';
        document.getElementById('editNip').value = userData.nip || '';
        document.getElementById('editMapel').value = userData.mataPelajaran || ''; // ✅ Gunakan mataPelajaran
        document.getElementById('editRole').value = userData.role || 'guru';

        // Render checkbox di modal edit
        const editFiturContainer = document.getElementById('editCheckboxFitur');
        editFiturContainer.innerHTML = '';
        SEMUA_FITUR.forEach(f => {
            const isChecked = (userData.fitur || []).includes(f.id) ? 'checked' : '';
            editFiturContainer.innerHTML += `
                <label class="fitur-item">
                    <input type="checkbox" class="edit-fitur-cb" value="${f.id}" ${isChecked}>
                    <span>${f.nama}</span>
                </label>
            `;
        });

        document.getElementById('modalEdit').style.display = 'flex';
    } catch (err) {
        console.error("Error buka modal edit:", err);
        alert('Gagal memuat data untuk diedit.');
    }
}

document.getElementById('formEditUser')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('editDocId').value;
    const btn = document.getElementById('btnSimpanEdit');
    
    const fiturTerpilih = Array.from(document.querySelectorAll('.edit-fitur-cb:checked')).map(cb => cb.value);

    try {
        btn.disabled = true;
        btn.innerHTML = '⌛ Menyimpan...';

        await updateDoc(doc(db, 'users', email), {
            nama: document.getElementById('editNama').value.trim(),
            nip: document.getElementById('editNip').value.trim() || '-',
            mataPelajaran: document.getElementById('editMapel').value.trim() || '-', // ✅ Update mataPelajaran
            role: document.getElementById('editRole').value,
            fitur: fiturTerpilih,
            updatedAt: new Date().toISOString()
        });

        document.getElementById('modalEdit').style.display = 'none';
        tampilkanAlert('alertTambah', '✅ Data user berhasil diperbarui!');
        if (typeof window.loadUsers === 'function') window.loadUsers();

    } catch (err) {
        console.error("Error Update User:", err);
        alert('❌ Gagal memperbarui data: ' + err.message);
    }
    
    btn.disabled = false;
    btn.innerHTML = '💾 Simpan Perubahan';
});

document.getElementById('btnBatalEdit')?.addEventListener('click', () => {
    document.getElementById('modalEdit').style.display = 'none';
});

// ──────────────────────────────────────────────────────────────
// 5. HAPUS USER
// ──────────────────────────────────────────────────────────────
async function hapusUser(email) {
    if (!confirm(`⚠️ Yakin ingin menghapus user "${email}" secara permanen?`)) return;

    try {
        await deleteDoc(doc(db, 'users', email));
        tampilkanAlert('alertTambah', '✅ User berhasil dihapus dari database.');
        if (typeof window.loadUsers === 'function') window.loadUsers();
    } catch (err) {
        console.error("Error Hapus User:", err);
        alert(' Gagal menghapus user: ' + err.message);
    }
}

// ──────────────────────────────────────────────────────────────
// 6. EKSPOR KE EXCEL
// ──────────────────────────────────────────────────────────────
document.getElementById('btnExportExcel')?.addEventListener('click', () => {
    const tabel = document.querySelector('#tableUsers table');
    if (!tabel || tabel.offsetParent === null) {
        alert('❌ Tabel data tidak ditemukan atau data masih kosong!');
        return;
    }

    const cloneTabel = tabel.cloneNode(true);
    const rows = cloneTabel.querySelectorAll('tr');
    
    // Hapus kolom Aksi (kolom terakhir)
    rows.forEach(row => {
        if (row.lastElementChild) row.removeChild(row.lastElementChild);
    });

    try {
        const workbook = XLSX.utils.table_to_book(cloneTabel, { sheet: "Daftar Akun SIPELITA" });
        const tanggal = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Daftar_Akun_SIPELITA_${tanggal}.xlsx`);
    } catch (error) {
        console.error("Gagal mengekspor Excel:", error);
        alert(" Terjadi kesalahan saat mengekspor ke Excel: " + error.message);
    }
});

// Muat data saat halaman siap
window.loadUsers();
