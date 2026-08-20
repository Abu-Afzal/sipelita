// ══════════════════════════════════════════════
// SIG — SETTINGS IDENTITAS GLOBAL (SIPELITA)
// tempat, kamadNama, kamadNip, rdmLink
// Default madrasah (diisi Admin) + override per-guru
// ══════════════════════════════════════════════
(function () {
  if (window.__SIG_LOADED) return;
  window.__SIG_LOADED = true;

  var DEFAULTS = { tempat: '', kamadNama: '', kamadNip: '', rdmLink: '' };
  var DEF_KEY = 'sig_settings_DEFAULT';

  function userEmail() {
    try { var u = JSON.parse(localStorage.getItem('sipelita_user') || 'null'); return (u && u.email) || ''; } catch (e) { return ''; }
  }
  function storeKey() { return 'sig_settings_' + (userEmail() || 'umum').replace(/[.#$\[\]]/g, '_'); }
  function docId() { return (userEmail() || 'umum').replace(/[.#$\[\]]/g, '_'); }
  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null') || {}; } catch (e) { return {}; } }
  function clean(d) { var o = {}; for (var k in DEFAULTS) o[k] = d[k] || ''; return o; }
  function fbReady() { return typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length; }

  window.SIG = {
    // ✅ Baca: setelan guru menimpa default madrasah
    get: function () {
      var d = readJSON(DEF_KEY), s = readJSON(storeKey()), out = {};
      for (var k in DEFAULTS) out[k] = s[k] || d[k] || '';
      out.ttdTempat = out.tempat || '....................';
      out.ttdKamad  = out.kamadNama || '( .................................................... )';
      out.ttdNip    = 'NIP. ' + (out.kamadNip || '....................');
      return out;
    },

    // ✅ Simpan (asDefault=true → sekaligus jadi default semua guru; dipakai Admin)
    save: function (data, asDefault) {
      localStorage.setItem(storeKey(), JSON.stringify(data));
      if (asDefault) localStorage.setItem(DEF_KEY, JSON.stringify(data));
      try {
        if (fbReady()) {
          var col = firebase.firestore().collection('pengaturan_user');
          if (userEmail()) col.doc(docId()).set(Object.assign({}, data, { email: userEmail(), updatedAt: new Date().toISOString() })).catch(function () {});
          if (asDefault) col.doc('DEFAULT').set(Object.assign({}, data, { updatedAt: new Date().toISOString() })).catch(function () {});
        }
      } catch (e) {}
    },

    // ✅ Tarik default + setelan user dari cloud (panggil saat dashboard dibuka)
    pull: function () {
      return new Promise(function (resolve) {
        try {
          if (!fbReady()) { resolve(SIG.get()); return; }
          var col = firebase.firestore().collection('pengaturan_user');
          var jobs = [ col.doc('DEFAULT').get().then(function (ds) {
              if (ds.exists) localStorage.setItem(DEF_KEY, JSON.stringify(clean(ds.data())));
            }).catch(function () {}) ];
          if (userEmail()) jobs.push(col.doc(docId()).get().then(function (ds) {
              if (ds.exists) localStorage.setItem(storeKey(), JSON.stringify(clean(ds.data())));
            }).catch(function () {}));
          Promise.all(jobs).then(function () { resolve(SIG.get()); });
        } catch (e) { resolve(SIG.get()); }
      });
    },

    open: function () { openUI(); }
  };

  // ── Modal bawaan (opsional, bila halaman lain butuh form sendiri) ──
  function injectUI() {
    if (document.getElementById('sigModal')) return;
    var style = document.createElement('style');
    style.textContent = '#sigModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;}#sigModal.active{display:flex;}#sigModal .sig-box{background:#fff;border-radius:14px;padding:24px;width:100%;max-width:460px;}#sigModal label{display:block;font-size:.85rem;font-weight:600;color:#374151;margin:10px 0 5px;}#sigModal input{width:100%;padding:10px 12px;border:1.5px solid #d1d5db;border-radius:8px;box-sizing:border-box;}#sigModal .sig-foot{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;}#sigModal button{padding:10px 16px;border:none;border-radius:8px;font-weight:700;cursor:pointer;}#sigModal .sig-save{background:#059669;color:#fff;}#sigModal .sig-cancel{background:#e2e8f0;color:#475569;}';
    document.head.appendChild(style);
    var modal = document.createElement('div');
    modal.id = 'sigModal';
    modal.innerHTML = '<div class="sig-box"><h3 style="color:#047857;margin:0 0 6px;">⚙️ Identitas Madrasah</h3>' +
      '<label>🏙️ Kota / Tempat</label><input id="sigTempat2">' +
      '<label>👑 Nama Kepala Madrasah</label><input id="sigKamadNama2">' +
      '<label>🔢 NIP Kepala Madrasah</label><input id="sigKamadNip2">' +
      '<label>🔗 Link RDM Madrasah</label><input id="sigRdmLink2">' +
      '<div class="sig-foot"><button class="sig-cancel" id="sigBatal2">Batal</button><button class="sig-save" id="sigSimpan2">💾 Simpan</button></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('#sigBatal2').onclick = function () { modal.classList.remove('active'); };
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('active'); });
    modal.querySelector('#sigSimpan2').onclick = function () {
      SIG.save({
        tempat: modal.querySelector('#sigTempat2').value.trim(),
        kamadNama: modal.querySelector('#sigKamadNama2').value.trim(),
        kamadNip: modal.querySelector('#sigKamadNip2').value.trim(),
        rdmLink: modal.querySelector('#sigRdmLink2').value.trim()
      });
      modal.classList.remove('active');
      alert('✅ Pengaturan tersimpan!');
    };
  }
  function openUI() {
    injectUI();
    var s = SIG.get();
    document.getElementById('sigTempat2').value = s.tempat || '';
    document.getElementById('sigKamadNama2').value = s.kamadNama || '';
    document.getElementById('sigKamadNip2').value = s.kamadNip || '';
    document.getElementById('sigRdmLink2').value = s.rdmLink || '';
    document.getElementById('sigModal').classList.add('active');
  }
})();