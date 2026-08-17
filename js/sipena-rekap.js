// ══════════════════════════════════════════════
// SIPENA: Rekap Kehadiran (Versi Final & Urut A-Z)
// ✅ NETRAL: tanpa blok statistik ganda & tanpa identitas madrasah
// ══════════════════════════════════════════════

window.renderRekap = () => {
  // ✅ Pengurutan Kelas A-Z
  const kelas = allData
    .filter(d => d.type === 'class' && d.user_name === currentUser)
    .sort((a, b) => (a.class_name || '').localeCompare(b.class_name || '', 'id-ID', { numeric: true, sensitivity: 'base' }));

  if (!kelas.length) { 
    document.getElementById('rekapContent').innerHTML = '<div class="empty"><div class="ei">🏫</div><p>Belum ada kelas.</p></div>'; 
    return; 
  }
  if (!currentRekapClass || !kelas.find(k => k.class_name === currentRekapClass)) currentRekapClass = kelas[0].class_name;

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  let filterHtml = `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
    <div class="fg" style="margin:0;min-width:160px;"><label>Kelas</label>
      <select id="rekapKelasSelect">${kelas.map(k => `<option value="${k.class_name}" ${currentRekapClass === k.class_name ? 'selected' : ''}>${k.class_name}</option>`).join('')}</select>
    </div>`;

  if (currentRekapTab === 'bulanan') {
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
    filterHtml += `<div class="fg" style="margin:0;min-width:130px;"><label>Bulan</label><select id="rekapBulanSelect">${monthNames.map((m, i) => `<option value="${i + 1}" ${selectedMonth === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
    <div class="fg" style="margin:0;min-width:100px;"><label>Tahun</label><select id="rekapTahunSelect">${years.map(y => `<option value="${y}" ${selectedYear === y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>`;
  } else if (currentRekapTab === 'semester') {
    filterHtml += `<div class="fg" style="margin:0;min-width:160px;"><label>Semester</label><select id="rekapSemSelect"><option value="ganjil" ${selectedSemester === 'ganjil' ? 'selected' : ''}>Ganjil (Jul–Des)</option><option value="genap" ${selectedSemester === 'genap' : ''}>Genap (Jan–Jun)</option></select></div>
    <div class="fg" style="margin:0;min-width:100px;"><label>Tahun</label><input type="number" id="rekapTahunSem" value="${selectedYear}" style="width:90px;"></div>`;
  }
  filterHtml += `<div class="fg" style="margin:0;align-self:flex-end;"><button class="btn btn-primary" id="btnTampilRekap"> Tampilkan</button></div></div>`;
  document.getElementById('rekapFilters').innerHTML = filterHtml;

  document.getElementById('rekapKelasSelect').onchange = e => { currentRekapClass = e.target.value; };
  document.getElementById('btnTampilRekap').onclick = () => {
    currentRekapClass = document.getElementById('rekapKelasSelect').value;
    if (currentRekapTab === 'bulanan') { 
      selectedMonth = parseInt(document.getElementById('rekapBulanSelect').value); 
      selectedYear = parseInt(document.getElementById('rekapTahunSelect').value); 
    } else if (currentRekapTab === 'semester') { 
      selectedSemester = document.getElementById('rekapSemSelect').value; 
      selectedYear = parseInt(document.getElementById('rekapTahunSem').value); 
    }
    window.generateRekap();
  };
  window.generateRekap();
};

window.filterLog = (log) => {
  if (!log.date) return false;
  
  const parts = log.date.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);

  if (currentRekapTab === 'harian') return log.date === window.getLocalDate();
  if (currentRekapTab === 'bulanan') return m === selectedMonth && y === selectedYear;
  if (currentRekapTab === 'semester') {
    if (selectedSemester === 'ganjil') return [7, 8, 9, 10, 11, 12].includes(m) && y === selectedYear;
    else return [1, 2, 3, 4, 5, 6].includes(m) && y === selectedYear;
  }
  return true;
};

window.generateRekap = () => {
  // ✅ Filter & Urutkan Siswa Berdasarkan Nama A-Z
  const siswa = allData
    .filter(d => d.type === 'student' && d.class_name === currentRekapClass && d.user_name === currentUser)
    .sort((a, b) => (a.student_name || '').localeCompare(b.student_name || '', 'id-ID', { sensitivity: 'base' }));

  const logs = allData.filter(d => d.type === 'attendance_log' && d.class_name === currentRekapClass && d.user_name === currentUser && window.filterLog(d));
  const cont = document.getElementById('rekapContent');

  if (!siswa.length) { cont.innerHTML = '<div class="empty"><div class="ei">👥</div><p>Tidak ada siswa di kelas ini.</p></div>'; return; }

  const stat = {};
  siswa.forEach(s => { stat[s.__key] = { nama: s.student_name, H: 0, I: 0, S: 0, A: 0, B: 0, detail: [] }; });

  logs.forEach(log => {
    if (!log.records) return;
    Object.keys(log.records).forEach(sid => {
      if (!stat[sid]) return;
      const st = log.records[sid].status || 'ALPA';
      const map = { HADIR: 'H', IZIN: 'I', SAKIT: 'S', ALPA: 'A', BOLOS: 'B' };
      if (map[st]) stat[sid][map[st]]++;
      if (st !== 'HADIR') stat[sid].detail.push(log.date.split('-').reverse().join('/') + `(${st})`);
    });
  });

  // ✅ BLOK STATISTIK ATAS DIHAPUS (duplikat dengan total di tabel)
  let html = `<div class="tbl-wrap"><table id="rekapTable">
    <thead><tr><th>No</th><th>Nama Siswa</th><th>H</th><th>I</th><th>S</th><th>A</th><th>B</th><th>Total</th><th>% Hadir</th><th>Rincian</th></tr></thead><tbody>`;

  // ✅ Mengurutkan ulang baris data berdasarkan nama siswa A-Z
  Object.values(stat)
    .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id-ID', { sensitivity: 'base' }))
    .forEach((s, i) => {
      const total = s.H + s.I + s.S + s.A + s.B;
      const pct = total > 0 ? ((s.H / total) * 100).toFixed(1) : '0.0';
      const col = parseFloat(pct) >= 80 ? '#10b981' : (parseFloat(pct) >= 60 ? '#f59e0b' : '#ef4444');
      html += `<tr>
        <td>${i + 1}</td><td style="font-weight:600;">${s.nama}</td>
        <td style="color:#10b981;font-weight:700;">${s.H}</td><td style="color:#3b82f6;font-weight:700;">${s.I}</td>
        <td style="color:#f59e0b;font-weight:700;">${s.S}</td><td style="color:#ef4444;font-weight:700;">${s.A}</td>
        <td style="color:#8b5cf6;font-weight:700;">${s.B}</td><td><strong>${total}</strong></td>
        <td style="color:${col};"><strong>${pct}%</strong></td>
        <td style="font-size:0.78rem;color:#64748b;">${s.detail.length ? s.detail.join(', ') : '–'}</td>
      </tr>`;
    });
  html += `</tbody></table></div>`;
  cont.innerHTML = html;
};

// ══════════════════════════════════════════════
// FITUR CETAK REKAP (PRINT CLEAN & NETRAL)
// ══════════════════════════════════════════════
window.cetakRekap = () => {
  const table = document.getElementById('rekapTable');
  if (!table) { 
    window.toast('Tampilkan rekap terlebih dahulu.', 'err'); 
    return; 
  }

  const kelasSelect = document.getElementById('rekapKelasSelect');
  const bulanSelect = document.getElementById('rekapBulanSelect');
  const tahunSelect = document.getElementById('rekapTahunSelect');
  const semSelect = document.getElementById('rekapSemSelect');
  const tahunSemInput = document.getElementById('rekapTahunSem');

  const kelasName = kelasSelect ? kelasSelect.value : currentRekapClass;
  let periodeText = '';
  let semesterText = '';
  let tahunText = '';
  
  if (currentRekapTab === 'bulanan') {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const bln = bulanSelect ? monthNames[parseInt(bulanSelect.value) - 1] : '';
    tahunText = tahunSelect ? tahunSelect.value : new Date().getFullYear();
    periodeText = `Bulan ${bln} Tahun ${tahunText}`;
    semesterText = '-';
  } else if (currentRekapTab === 'semester') {
    semesterText = semSelect ? (semSelect.value === 'ganjil' ? 'Ganjil (Jul-Des)' : 'Genap (Jan-Jun)') : '';
    tahunText = tahunSemInput ? tahunSemInput.value : new Date().getFullYear();
    periodeText = `Semester ${semesterText} Tahun ${tahunText}`;
  } else {
    periodeText = `Harian (Tanggal ${window.getLocalDate()})`;
    semesterText = '-';
    tahunText = new Date().getFullYear();
  }

  // ✅ KOP CETAK NETRAL (tanpa identitas madrasah)
  const printHeader = document.createElement('div');
  printHeader.className = 'print-header-rekap';
  printHeader.style.cssText = `
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 3px double #1e40af;
  `;
  printHeader.innerHTML = `
    <h2 style="font-size:16pt; margin:0 0 5px 0; font-weight:bold; color:#1e40af;">REKAP KEHADIRAN SISWA</h2>
    <div style="display: flex; justify-content: center; gap: 40px; margin-top: 12px; font-size: 11pt;">
      <div><strong>Kelas:</strong> ${kelasName}</div>
      <div><strong>Periode:</strong> ${periodeText}</div>
      <div><strong>Tahun:</strong> ${tahunText}</div>
    </div>
  `;

  const tblWrap = table.parentElement;
  tblWrap.insertBefore(printHeader, table);

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      if (printHeader.parentNode) {
        printHeader.parentNode.removeChild(printHeader);
      }
    }, 500);
  }, 300);
};

window.exportRekap = () => {
  const table = document.getElementById('rekapTable');
  if (!table) { 
    window.toast('Tampilkan rekap terlebih dahulu.', 'err'); 
    return; 
  }

  const ws = XLSX.utils.table_to_sheet(table);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Kehadiran');

  XLSX.writeFile(wb, `Rekap_${currentRekapClass}_${currentRekapTab}.xlsx`);
  window.toast('✅ File Excel diekspor!', 'success');
};