// js/alarm-engine.js — Mesin alarm mandiri (Firestore via fs-adapter)
(function(){
  if (window.__SIPELITA_ALARM_ENGINE) return;
  window.__SIPELITA_ALARM_ENGINE = true;

  let currentUser='', userEmail='', rawEmail='';
  let daftarJadwal=[], fired=new Set(), audioCtx=null, idVoice=null;
  let alarmEnabled=false, started=false;

  // ====== TUNGGU FIREBASE + ADAPTER SIAP ======
  function waitForReady(cb, tries){
    tries = tries || 0;
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length && window.ROOT) {
      cb();
    } else if (tries < 100) {
      setTimeout(function(){ waitForReady(cb, tries+1); }, 100);
    } else {
      console.warn('⚠️ Alarm engine: Firebase/ROOT tidak siap setelah 10 detik');
    }
  }

  waitForReady(function () {
    try {
      const s = JSON.parse(localStorage.getItem('sipelita_user') || 'null');
      if (s) {
        currentUser = s.nama || s.email || 'guru';
        rawEmail = s.email || '';
        userEmail = rawEmail.toLowerCase();
      }
      try { alarmEnabled = localStorage.getItem('sipelita_alarm_' + rawEmail) === 'true'; } catch(e) {}
      startEngine();
    } catch (e) {
      console.error('❌ Alarm engine init error:', e);
    }
  });

  // ====== LOAD VOICE INDONESIA ======
  function loadVoice(){
    if (!('speechSynthesis' in window)) return;
    const v = window.speechSynthesis.getVoices();
    idVoice = v.find(function(x){ return x.lang === 'id-ID'; })
           || v.find(function(x){ return x.lang && x.lang.indexOf('id') === 0; })
           || v.find(function(x){ return /indonesia|damayanti/i.test(x.name); })
           || null;
    if (idVoice) console.log('✅ Voice Indonesia:', idVoice.name);
  }
  if ('speechSynthesis' in window) {
    loadVoice();
    window.speechSynthesis.onvoiceschanged = loadVoice;
    setTimeout(loadVoice, 1000);
    setTimeout(loadVoice, 3000);
  }

  // ====== UNLOCK AUDIO + VOICE (user gesture) ======
  function unlock(){
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch(e) {}
    try {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0.01; u.lang = 'id-ID';
        if (idVoice) u.voice = idVoice;
        window.speechSynthesis.speak(u);
      }
    } catch(e) {}
    document.removeEventListener('click', unlock);
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('keydown', unlock);
    console.log('🔓 Audio+Voice unlocked');
  }
  document.addEventListener('click', unlock);
  document.addEventListener('touchstart', unlock);
  document.addEventListener('keydown', unlock);

  // ====== PENCOCOKAN PEMILIK (email / nama / tanpa gelar) ======
  function sameOwner(d){
    var un = String(d.user_name || '').toLowerCase();
    var ue = String(d.user_email || '').toLowerCase();
    var nama = (currentUser || '').toLowerCase();
    if (userEmail && (ue === userEmail || un === userEmail)) return true;
    if (nama && un === nama) return true;
    var strip = function (s) { return s.split(',')[0].trim(); };
    if (nama && un && strip(un) === strip(nama)) return true;
    return false;
  }

  // ====== START ENGINE ======
  function startEngine(){
    if (started) return;
    started = true;

    // Sinkron status alarm antar tab/halaman
    window.addEventListener('storage', function (e) {
      if (e.key === 'sipelita_alarm_' + rawEmail) {
        alarmEnabled = e.newValue === 'true';
        console.log('🔄 Status alarm:', alarmEnabled ? 'AKTIF' : 'NONAKTIF');
      }
    });

    // ✅ BACA JADWAL DARI FIRESTORE (folder jadwal_mengajar)
    window.ROOT.child('jadwal_mengajar').on('value', function (snap) {
      var val = snap.val() || {};
      var all = Object.keys(val).map(function (k) { return Object.assign({ __key: k }, val[k]); });
      daftarJadwal = all.filter(sameOwner);
      console.log('📅 ' + daftarJadwal.length + ' jadwal dimuat untuk user ini');
    });

    // ====== BEEP ======
    function beep(){
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const ctx = audioCtx, now = ctx.currentTime;
        const b = function (t, f) {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.35, t+0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t+0.35);
          o.connect(g); g.connect(ctx.destination);
          o.start(t); o.stop(t+0.4);
        };
        for (let i=0; i<3; i++) { b(now+i*0.55, 880); b(now+i*0.55+0.25, 660); }
      } catch(e) { console.error('Beep error:', e); }
    }

    // ====== VOICE ======
    function speak(kelas, mapel){
      if (!('speechSynthesis' in window)) return;
      try {
        if (!idVoice) loadVoice();
        const text = 'Perhatian! Sekarang saatnya Anda mengajar di kelas ' + kelas + (mapel ? ', mata pelajaran ' + mapel : '') + '. Selamat mengajar...';
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'id-ID'; u.rate = 0.9; u.volume = 1;
        if (idVoice) u.voice = idVoice;
        window.speechSynthesis.speak(u);
      } catch(e) { console.error('Speak error:', e); }
    }

    // ====== NOTIFIKASI ======
    async function notif(title, body, tag){
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body: body,
              icon: '/sipelita/assets/images/sipelita-app.png',
              badge: '/sipelita/assets/images/sipelita-app.png',
              tag: tag, requireInteraction: true, vibrate: [300, 150, 300]
            });
            return;
          }
        }
        new Notification(title, { body: body, tag: tag, requireInteraction: true });
      } catch(e) {}
    }

    // ====== CEK SETIAP 1 DETIK (alarm tepat waktu + pengingat 5 menit) ======
    setInterval(function () {
      if (!alarmEnabled) return;
      const now = new Date();
      const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()];
      const hh = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
      const today = now.toISOString().slice(0,10);
      const menitSekarang = now.getHours()*60 + now.getMinutes();

      daftarJadwal.forEach(function (j) {
        const mulai = j.mulai || j.jam_mulai;
        if (!mulai || j.hari !== hari) return;

        // Cek periode berlaku
        if (j.periode_mulai && j.periode_sampai) {
          const t = new Date(); t.setHours(0,0,0,0);
          if (t < new Date(j.periode_mulai) || t > new Date(j.periode_sampai)) return;
        }

        // 1) Alarm tepat waktu
        if (mulai === hh) {
          const key = today + '_' + mulai;
          if (!fired.has(key)) {
            fired.add(key);
            console.log('🔔 ALARM: ' + j.kelas + ' @ ' + mulai);
            beep();
            speak(j.kelas, j.mapel);
            notif('⏰ Waktunya Mengajar!', 'Kelas ' + j.kelas + ' · ' + (j.mapel||'') + ' · ' + mulai, 'sipelita-alarm');
          }
        }

        // 2) Pengingat 5 menit sebelumnya
        const p = mulai.split(':').map(Number);
        const menitJadwal = (p[0]||0)*60 + (p[1]||0);
        if (menitJadwal - menitSekarang === 5) {
          const key5 = today + '_' + mulai + '_5min';
          if (!fired.has(key5)) {
            fired.add(key5);
            notif('⏳ 5 Menit Lagi Mengajar', 'Kelas ' + j.kelas + ' · ' + (j.mapel||'') + ' · ' + mulai, 'sipelita-5min');
          }
        }
      });
    }, 1000);

    console.log('🔔 Alarm engine aktif | Status:', alarmEnabled ? 'AKTIF' : 'NONAKTIF', '| User:', userEmail || currentUser);
  }
})();