// ══════════════════════════════════════════════
// SIPENA: Bank Soal / Dokumen
// ══════════════════════════════════════════════

window.getFileIcon = (ext) => {
  if (!ext) return '📄'; ext = ext.toLowerCase();
  if (ext === 'pdf') return '📕';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['xls', 'xlsx'].includes(ext)) return '📗';
  return '📄';
};
window.getFileExt = (filename) => filename.split('.').pop() || '';
window.formatBytes = (bytes) => { if (bytes < 1024) return bytes + ' B'; if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'; return (bytes / 1048576).toFixed(1) + ' MB'; };

window.bindDropZone = () => {
  const zone = document.getElementById('dropZone');
  const input = document.getElementById('inputFileDokumen');
  const preview = document.getElementById('filePreview');
  zone.onclick = () => input.click();
  zone.ondragover = e => { e.preventDefault(); zone.style.borderColor = '#4f46e5'; zone.style.background = '#ede9fe'; };
  zone.ondragleave = () => { zone.style.borderColor = '#c7d2fe'; zone.style.background = '#f5f3ff'; };
  zone.ondrop = e => { e.preventDefault(); zone.style.borderColor = '#c7d2fe'; zone.style.background = '#f5f3ff'; if (e.dataTransfer.files[0]) window.prosesFile(e.dataTransfer.files[0]); };
  input.onchange = () => { if (input.files[0]) window.prosesFile(input.files[0]); };
  document.getElementById('btnHapusFile').onclick = e => {
    e.stopPropagation(); selectedFileData = null; input.value = ''; preview.style.display = 'none'; zone.style.display = 'block';
  };
};

window.prosesFile = (file) => {
  const ext = window.getFileExt(file.name);
  const allowed = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
  if (!allowed.includes(ext.toLowerCase())) { window.toast('Format tidak didukung! Gunakan PDF, Word, atau Excel.', 'err'); return; }
  if (file.size > 5 * 1024 * 1024) { window.toast('Ukuran file maks 5 MB!', 'err'); return; }

  const prog = document.getElementById('uploadProgress');
  const bar = document.getElementById('progressBar');
  prog.style.display = 'block'; bar.style.width = '0%';

  const reader = new FileReader();
  reader.onprogress = e => { if (e.lengthComputable) bar.style.width = (e.loaded / e.total * 80) + '%'; };
  reader.onload = e => {
    bar.style.width = '100%';
    setTimeout(() => { prog.style.display = 'none'; bar.style.width = '0%'; }, 400);
    const mimeMap = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    selectedFileData = { name: file.name, ext: ext.toLowerCase(), size: file.size, base64: e.target.result, mime: mimeMap[ext.toLowerCase()] || 'application/octet-stream' };
    const namaInput = document.getElementById('inputNamaDokumen');
    if (!namaInput.value) namaInput.value = file.name.replace(/\.[^.]+$/, '');
    document.getElementById('fileIcon').textContent = window.getFileIcon(ext);
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = window.formatBytes(file.size);
    document.getElementById('filePreview').style.display = 'flex';
    document.getElementById('dropZone').style.display = 'none';
  };
  reader.onerror = () => { window.toast('Gagal membaca file!', 'err'); prog.style.display = 'none'; };
  reader.readAsDataURL(file);
};

window.renderBankSoal = () => {
  const docs = allData.filter(d => d.type === 'document' && d.user_name === currentUser).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const cont = document.getElementById('documentList');
  if (!docs.length) { cont.innerHTML = '<div class="empty"><div class="ei">📚</div><p>Belum ada dokumen. Klik "+ Upload Dokumen" untuk menambahkan.</p></div>'; return; }
  cont.innerHTML = docs.map(d => {
    const ext = d.file_ext || window.getFileExt(d.doc_name) || '';
    const icon = window.getFileIcon(ext);
    const size = d.file_size ? window.formatBytes(d.file_size) : '';
    const badge = ext ? `<span style="background:#e0e7ff;color:#3730a3;padding:2px 7px;border-radius:4px;font-size:0.7rem;font-weight:700;text-transform:uppercase;">${ext}</span>` : '';
    return `<div style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:#fff;border-radius:12px;margin-bottom:10px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.04);">
      <div style="font-size:2rem;flex-shrink:0;">${icon}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.doc_name}</div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:3px;">${badge}${size ? `<span style="font-size:0.72rem;color:#94a3b8;">${size}</span>` : ''}</div>
        <div style="font-size:0.7rem;color:#cbd5e1;margin-top:2px;">${new Date(d.created_at).toLocaleString('id-ID')}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;">
        ${d.file_data ? `<button class="btn btn-primary btn-sm" data-key="${d.__key}" data-action="lihatdok">👁 Lihat</button>` : ''}
        ${d.file_data ? `<button class="btn btn-success btn-sm" data-key="${d.__key}" data-action="downloaddok">⬇ Unduh</button>` : ''}
        <button class="btn btn-danger btn-sm" data-key="${d.__key}" data-name="${d.doc_name}" data-action="hapusdok">🗑 Hapus</button>
      </div>
    </div>`;
  }).join('');

  cont.querySelectorAll('[data-action="lihatdok"]').forEach(btn => {
    btn.onclick = () => { const doc = allData.find(d => d.__key === btn.dataset.key); if (!doc?.file_data) { window.toast('File tidak tersedia.', 'err'); return; } window.bukaViewer(doc); };
  });
  cont.querySelectorAll('[data-action="downloaddok"]').forEach(btn => {
    btn.onclick = () => { const doc = allData.find(d => d.__key === btn.dataset.key); if (doc) window.downloadDok(doc); };
  });
  cont.querySelectorAll('[data-action="hapusdok"]').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm(`Hapus dokumen "${btn.dataset.name}"?`)) return;
      btn.disabled = true; btn.textContent = '⏳';
      try { await ROOT.child(btn.dataset.key).remove(); window.toast('Dokumen berhasil dihapus.'); }
      catch (e) { window.toast('Gagal: ' + e.message, 'err'); btn.disabled = false; btn.textContent = '🗑 Hapus'; }
    };
  });
};

window.bukaViewer = (doc) => {
  const ext = doc.file_ext || '';
  const isPdf = ext === 'pdf';
  function base64ToBlob(b64, mime) {
    const byteStr = atob(b64.split(',')[1]); const ab = new ArrayBuffer(byteStr.length); const ia = new Uint8Array(ab);
    for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
    return new Blob([ab], { type: mime });
  }
  const mimeMap = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  const mime = mimeMap[ext] || 'application/octet-stream';
  const overlay = document.createElement('div');
  overlay.id = 'docViewerOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:3000;display:flex;flex-direction:column;';
  overlay.innerHTML = `<div style="background:#1e293b;padding:12px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0;">
    <span style="font-size:1.4rem;">${window.getFileIcon(ext)}</span>
    <span style="color:#fff;font-weight:700;font-size:0.95rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${doc.doc_name}</span>
    <button id="vBtnUnduh" style="padding:7px 16px;background:#10b981;color:#fff;border:none;border-radius:7px;font-weight:600;cursor:pointer;font-size:0.85rem;">⬇ Unduh</button>
    <button id="vBtnTutup" style="padding:7px 14px;background:#ef4444;color:#fff;border:none;border-radius:7px;font-weight:600;cursor:pointer;font-size:0.85rem;">✕ Tutup</button>
  </div><div id="vBody" style="flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;"><div style="color:#94a3b8;font-size:0.9rem;">⏳ Memuat dokumen...</div></div>`;
  document.body.appendChild(overlay);
  const vBody = document.getElementById('vBody');
  document.getElementById('vBtnTutup').onclick = () => { overlay.remove(); };
  document.getElementById('vBtnUnduh').onclick = () => { window.downloadDok(doc); };
  try {
    const blob = base64ToBlob(doc.file_data, mime);
    const blobUrl = URL.createObjectURL(blob);
    if (isPdf) { vBody.innerHTML = `<iframe src="${blobUrl}" style="width:100%;height:100%;border:none;"></iframe>`; }
    else {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(blobUrl)}`;
      const iframe = document.createElement('iframe'); iframe.style.cssText = 'width:100%;height:100%;border:none;'; iframe.src = officeViewerUrl;
      vBody.innerHTML = ''; vBody.appendChild(iframe);
      const fallbackTimer = setTimeout(() => {
        vBody.innerHTML = `<div style="text-align:center;padding:40px;max-width:420px;"><div style="font-size:3rem;margin-bottom:16px;">${window.getFileIcon(ext)}</div><div style="color:#fff;font-weight:700;font-size:1rem;margin-bottom:8px;">${doc.doc_name}</div><div style="color:#94a3b8;font-size:0.85rem;margin-bottom:20px;line-height:1.6;">Preview online membutuhkan koneksi internet. Klik <strong style="color:#10b981;">Unduh</strong> untuk membuka langsung.</div><button id="vBtnUnduh2" style="padding:9px 18px;background:#10b981;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">⬇ Unduh File</button></div>`;
        document.getElementById('vBtnUnduh2').onclick = () => window.downloadDok(doc);
      }, 4000);
      iframe.onload = () => { clearTimeout(fallbackTimer); };
    }
  } catch (e) { vBody.innerHTML = `<div style="color:#ef4444;text-align:center;padding:30px;">Gagal memuat file: ${e.message}</div>`; }
};

window.downloadDok = (doc) => {
  if (!doc.file_data) { window.toast('File tidak tersedia.', 'err'); return; }
  const a = document.createElement('a'); a.href = doc.file_data; a.download = doc.doc_name + (doc.doc_name.includes('.') ? '' : '.' + doc.file_ext); a.click();
  window.toast('File mulai diunduh!');
};

window.simpanDokumen = async () => {
  const nama = document.getElementById('inputNamaDokumen').value.trim();
  if (!selectedFileData) { window.toast('Pilih file terlebih dahulu!', 'err'); return; }
  if (!nama) { window.toast('Nama dokumen tidak boleh kosong!', 'err'); return; }
  const btn = document.getElementById('btnSimpanDokumen');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  try {
    await ROOT.push().set({ type: 'document', doc_name: nama, file_ext: selectedFileData.ext, file_size: selectedFileData.size, file_data: selectedFileData.base64, user_name: currentUser, created_at: window.nowISO() });
    selectedFileData = null; document.getElementById('inputFileDokumen').value = ''; document.getElementById('filePreview').style.display = 'none'; document.getElementById('dropZone').style.display = 'block';
    window.closeModal('modalDokumen'); window.toast('Dokumen berhasil diupload!');
  } catch (e) { window.toast('Gagal upload: ' + e.message, 'err'); }
  btn.disabled = false; btn.innerHTML = '⬆️ Upload';
};

window.hapusSemuaData = async () => {
  if (document.getElementById('inputKonfirmasiHapus').value !== 'HAPUS') { window.toast('Ketik HAPUS untuk konfirmasi!', 'err'); return; }
  const btn = document.getElementById('btnKonfirmasiHapus');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menghapus...';
  const toDelete = allData.filter(d => d.user_name === currentUser && d.type !== 'user');
  try {
    await Promise.all(toDelete.map(d => ROOT.child(d.__key).remove()));
    window.closeModal('modalHapus'); window.toast('Semua data berhasil dihapus!');
  } catch (e) { window.toast('Gagal: ' + e.message, 'err'); }
  btn.disabled = false; btn.textContent = 'Hapus Semua Data';
};
