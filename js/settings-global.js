// ══════════════════════════════════════════════
// SIG — SETTINGS IDENTITAS GLOBAL (SIPELITA)
// Satu form untuk SEMUA fitur: LCKH, Jurnal, Rekap, Ekskul, dll.
// Tersimpan per-akun (localStorage + sinkron Firestore)
// ══════════════════════════════════════════════
(function () {
  if (window.__SIG_LOADED) return;
  window.__SIG_LOADED = true;

  var DEFAULTS = { tempat: '', kamadNama: '', kamadNip: '' };

  function userEmail() {
    try {
      var u = JSON.parse(localStorage.getItem('sipelita_user') || 'null');
      return (u && u.email) || '';
    } catch (e) { return ''; }
  }
  function storeKey() {
    return 'sig_settings_' + (userEmail() || 'umum').replace(/[.#$\[\]]/g, '_');
  }
  function docId() { return (userEmail() || 'umum').replace(/[.#$\[\]]/g, '_'); }

  window.SIG = {
    // ✅ Baca setelan (sinkron, selalu aman)
    get: function () {
      var s = {};
      try { s = JSON.parse(localStorage.getItem(storeKey()) || 'null') || {}; } catch (e) {}
      var out = {};
      for (var k in DEFAULTS) out[k] = s[k] || '';
      // Format siap pakai di dokumen (fallback titik-titik netral)
      out.ttdTempat = out.tempat || '....................';
      out.ttdKamad  = out.kamadNama || '( .................................................... )';
      out.ttdNip    = 'NIP. ' + (out.kamadNip || '....................');
      return out;
    },

    // ✅ Simpan (localStorage + Firestore agar lintas perangkat)
    save: function (data) {
      localStorage.setItem(storeKey(), JSON.stringify(data));
      try {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length && userEmail()) {
          firebase.firestore().collection('pengaturan_user').doc(docId())
            .set(Object.assign({}, data, { email: userEmail(), updatedAt: new Date().toISOString() }))
            .catch(function () {});
        }
      } catch (e) {}
    },

    // ✅ Tarik dari cloud bila perangkat ini belum punya (panggil sebelum cetak dokumen)
    pull: function () {
      return new Promise(function (resolve) {
        try {
          if (localStorage.getItem(storeKey()) || typeof firebase === 'undefined' ||
              !firebase.apps || !firebase.apps.length || !userEmail()) { resolve(SIG.get()); return; }
          firebase.firestore().collection('pengaturan_user').doc(docId()).get()
            .then(function (docSnap) {
              if (docSnap.exists) {
                var d = docSnap.data(), clean = {};
                for (var k in DEFAULTS) clean[k] = d[k] || '';
                localStorage.setItem(storeKey(), JSON.stringify(clean));
              }
              resolve(SIG.get());
            })
            .catch(function () { resolve(SIG.get()); });
        } catch (e) { resolve(SIG.get()); }
      });
    },

    // ✅ (Opsional) Buka modal bawaan — dipakai bila halaman lain butuh form sendiri
    open: function () { openUI(); }
  };

  // ── UI modal (hanya dibuat bila SIG.open() dipanggil) ──
  function injectUI() {
    if (document.getElementById('sigModal')) return;
    var style = document.createElement('style');
    style.textContent =
      '#sigModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;}' +
      '#sigModal.active{display:flex;}' +
      '#sigModal .sig-box{background:#fff;border-radius:14px;padding:24px;width:100%;max-width:460px;}' +
      '#sigModal h3{color:#047857;margin:0 0 6px;}' +
      '#sigModal .hint{font-size:.8rem;color:#64748b;margin-bottom:14px;}' +
      '#sigModal label{display:block;font-size:.85rem;font-weight:600;color:#374151;margin:10px 0 5px;}' +
      '#sigModal input{width:100%;padding:10px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:.92rem;box-sizing:border-box;}' +
      '#sigModal .sig-foot{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;}' +
      '#sigModal button{padding:10px 16px;border:none;border-radius:8px;font-weight:700;cursor:pointer;}' +
      '#sigModal .sig-save{background:#059669;color:#fff;}' +
      '#sigModal .sig-cancel{background:#e2e8f0;color:#475569;}';
    document.head.appendChild(style);

    var modal = document.createElement('div');
    modal.id = 'sigModal';
    modal.innerHTML =
      '<div class="sig-box">' +
      '<h3>⚙️ Pengaturan Identitas Madrasah</h3>' +
      '<div class="hint">Nama Kamad & NIP otomatis dipakai di <b>LCKH, Jurnal, Rekap, Ekskul</b>.</div>' +
      '<label>🏙️ Kota / Tempat</label><input id="sigTempat2" placeholder="Contoh: Bantaeng">' +
      '<label>👑 Nama Kepala Madrasah</label><input id="sigKamadNama2" placeholder="Nama lengkap + gelar">' +
      '<label>🔢 NIP Kepala Madrasah</label><input id="sigKamadNip2" placeholder="Kosongkan bila tidak ada">' +
      '<div class="sig-foot">' +
      '<button class="sig-cancel" id="sigBatal2">Batal</button>' +
      '<button class="sig-save" id="sigSimpan2">💾 Simpan</button>' +
      '</div></div>';
    document.body.appendChild(modal);

    modal.querySelector('#sigBatal2').onclick = function () { modal.classList.remove('active'); };
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('active'); });
    modal.querySelector('#sigSimpan2').onclick = function () {
      SIG.save({
        tempat: modal.querySelector('#sigTempat2').value.trim(),
        kamadNama: modal.querySelector('#sigKamadNama2').value.trim(),
        kamadNip: modal.querySelector('#sigKamadNip2').value.trim()
      });
      modal.classList.remove('active');
      if (window.toast) window.toast('✅ Pengaturan identitas tersimpan!');
      else alert('✅ Pengaturan identitas tersimpan!');
    };
  }

  function openUI() {
    injectUI();
    var s = SIG.get();
    document.getElementById('sigTempat2').value = s.tempat || '';
    document.getElementById('sigKamadNama2').value = s.kamadNama || '';
    document.getElementById('sigKamadNip2').value = s.kamadNip || '';
    document.getElementById('sigModal').classList.add('active');
  }
})();
