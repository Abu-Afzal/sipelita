// js/alarm-engine.js — Mesin alarm mandiri (tunggu Firebase siap)
(function(){
  if (window.__SIPELITA_ALARM_ENGINE) return;
  window.__SIPELITA_ALARM_ENGINE = true;

  let db=null, currentUser='', userEmail='';
  let daftarJadwal=[], fired=new Set(), audioCtx=null, idVoice=null;
  let alarmEnabled=false, started=false;

  // ====== TUNGGU FIREBASE SIAP ======
  function waitForFirebase(cb, tries=0){
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
      cb();
    } else if (tries < 50) {
      setTimeout(() => waitForFirebase(cb, tries+1), 100); // coba lagi 100ms
    } else {
      console.warn('⚠️ Alarm engine: Firebase tidak siap setelah 5 detik');
    }
  }

  waitForFirebase(() => {
    try {
      db = firebase.database();
      
      // Ambil data user dari localStorage
      const s = JSON.parse(localStorage.getItem('sipelita_user') || 'null');
      if (s) {
        currentUser = s.nama || s.email || 'guru';
        userEmail = s.email || '';
      }
      
      // Cek status alarm dari localStorage
      try {
        alarmEnabled = localStorage.getItem('sipelita_alarm_' + userEmail) === 'true';
      } catch(e) {}
      
      startEngine();
    } catch (e) {
      console.error('❌ Alarm engine init error:', e);
    }
  });

  // ====== LOAD VOICE INDONESIA ======
  function loadVoice(){
    if (!('speechSynthesis' in window)) return;
    const v = window.speechSynthesis.getVoices();
    idVoice = v.find(x => x.lang === 'id-ID') 
           || v.find(x => x.lang && x.lang.startsWith('id')) 
           || v.find(x => /indonesia|damayanti/i.test(x.name)) 
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
        u.volume = 0.01;
        u.lang = 'id-ID';
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

  // ====== START ENGINE ======
  function startEngine(){
    if (started) return;
    started = true;
    
    // ====== DENGARKAN PERUBAHAN TOGGLE ALARM (sinkron antar halaman) ======
    window.addEventListener('storage', (e) => {
      if (e.key === 'sipelita_alarm_' + userEmail) {
        alarmEnabled = e.newValue === 'true';
        console.log('🔄 Status alarm diperbarui:', alarmEnabled ? 'AKTIF' : 'NONAKTIF');
      }
    });

    // ====== MUAT JADWAL DARI FIREBASE ======
    db.ref('jadwal_alarm').on('value', snap => {
      const val = snap.val() || {};
      const all = Object.keys(val).map(k => ({__key: k, ...val[k]}));
      daftarJadwal = all.filter(d =>
        d.user_email === userEmail ||
        d.user_name === currentUser ||
        (d.user_name && currentUser && 
         d.user_name.split(',')[0].trim().toLowerCase() === 
         currentUser.split(',')[0].trim().toLowerCase())
      );
      console.log(`📅 ${daftarJadwal.length} jadwal dimuat untuk user ini`);
    });

    // ====== BEEP ======
    function beep(){
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const ctx = audioCtx, now = ctx.currentTime;
        const b = (t, f) => {
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
        // Pastikan voice sudah di-load
        if (!idVoice) loadVoice();
        const text = `Perhatian! Sekarang saatnya Anda mengajar di kelas ${kelas}${mapel ? ', mata pelajaran ' + mapel : ''}. Selamat mengajar...`;
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
              body, icon: '/assets/images/manbtg-app.png',
              tag, requireInteraction: true, vibrate: [300, 150, 300]
            });
            return;
          }
        }
        new Notification(title, {body, tag, requireInteraction: true});
      } catch(e) {}
    }

    // ====== CEK SETIAP 1 DETIK ======
    setInterval(() => {
      if (!alarmEnabled) return;
      const now = new Date();
      const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()];
      const hh = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
      const today = now.toISOString().slice(0,10);
      
      daftarJadwal.forEach(j => {
        if (j.hari !== hari || j.mulai !== hh) return;
        if (j.periode_mulai && j.periode_sampai) {
          const t = new Date(); t.setHours(0,0,0,0);
          if (t < new Date(j.periode_mulai) || t > new Date(j.periode_sampai)) return;
        }
        const key = today + '_' + j.mulai;
        if (fired.has(key)) return;
        fired.add(key);
        console.log(`🔔 ALARM: ${j.kelas} @ ${j.mulai}`);
        beep(); speak(j.kelas, j.mapel);
        notif('⏰ Waktunya Mengajar!', `Kelas ${j.kelas} · ${j.mapel || ''} · ${j.mulai}`, 'sipelita-alarm');
      });
    }, 1000);

    console.log('🔔 Alarm engine aktif | Status:', alarmEnabled ? 'AKTIF' : 'NONAKTIF', '| User:', userEmail || currentUser);
  }
})();