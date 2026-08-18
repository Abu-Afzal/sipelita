// ══════════════════════════════════════════════════════════════════
// ALARM & PENGINGAT JADWAL GLOBAL (Aktif di Dashboard & Background)
// ══════════════════════════════════════════════════════════════════

(function () {
  let jadwalHariIni = [];
  let alarmFiredToday = new Set();
  let audioUnlocked = false;

  // 1. Minta Izin Notifikasi Browser (Agar Notifikasi Pop-up & Suara Bekerja di Background)
  function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }

  // 2. Trik Unlock Audio Browser (Diperlukan agar browser mengizinkan suara otomatis)
  function unlockAudio() {
    if (audioUnlocked) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      audioUnlocked = true;
      console.log("🔊 Audio Context berhasil di-unlock!");
    } catch (e) {
      console.warn("Gagal unlock audio context:", e);
    }
  }

  // Pasang listener klik sekali di halaman untuk unlock audio
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });

  // 3. Fungsi Membunyikan Nada Pengingat (Menggunakan Web Audio API Synthesizer)
  function playAlarmSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      
      // Bunyi Beep 3 Kali (Pengingat)
      [0, 0.3, 0.6].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now + delay); // Nada A5
        gain.gain.setValueAtTime(0.3, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.2);
      });
    } catch (e) {
      console.error("Gagal membunyikan alarm:", e);
    }
  }

  // 4. Kirim Notifikasi Pop-up Desktop/HP
  function triggerNotification(title, body) {
    playAlarmSound(); // Bunyikan suara

    if ("Notification" in window && Notification.permission === "granted") {
      const notif = new Notification(title, {
        body: body,
        icon: '../assets/images/sipelita-app.png',
        tag: 'jadwal-mengajar',
        requireInteraction: true // Notifikasi tetap muncul sampai diklik
      });

      notif.onclick = function () {
        window.focus();
        this.close();
      };
    }
  }

  // 5. Muat Data Jadwal Mengajar dari Firestore
  function listenJadwalData() {
    if (typeof firebase === 'undefined' || !firebase.auth) return;

    firebase.auth().onAuthStateChanged(user => {
      if (!user) return;

      const userEmail = (user.email || '').toLowerCase().trim();
      
      // Gunakan Firestore Adapter / Realtime Database
      const ROOT_JADWAL = firebase.database().ref('jadwal_mengajar');

      ROOT_JADWAL.on('value', snap => {
        const val = snap.val() || {};
        const all = Object.keys(val).map(k => Object.assign({ __key: k }, val[k]));
        
        // Filter jadwal milik user yang sedang login
        const myJadwal = all.filter(item => {
          const owner = (item.user_name || item.user_email || item.email || '').toLowerCase().trim();
          return owner === userEmail;
        });

        // Ambil Nama Hari Ini (contoh: "Senin", "Selasa", dst)
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const todayName = days[new Date().getDay()];

        // Filter HANYA jadwal hari ini
        jadwalHariIni = myJadwal.filter(j => (j.hari || '').toLowerCase() === todayName.toLowerCase());
        console.log(`⏰ [Alarm Global] Jadwal untuk hari ${todayName}:`, jadwalHariIni.length);
      });
    });
  }

  // 6. Cek Jam Setiap Detik
  function checkScheduleLoop() {
    const now = new Date();
    const jamSekarang = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    jadwalHariIni.forEach(j => {
      const alarmKey = `${j.__key}_${jamSekarang}`;

      // Cek Jam Mulai Mengajar
      if (j.jam_mulai === jamSekarang && !alarmFiredToday.has(alarmKey)) {
        alarmFiredToday.add(alarmKey);
        triggerNotification(
          `🔔 Waktunya Mengajar: ${j.kelas || 'Kelas'}`,
          `Mata Pelajaran: ${j.mapel || '-'}\nJam: ${j.jam_mulai} - ${j.jam_selesai}`
        );
      }

      // (Opsional) Cek Pengingat 5 Menit Sebelum Masuk
      if (j.jam_mulai) {
        const [h, m] = j.jam_mulai.split(':').map(Number);
        const targetTime = new Date(now);
        targetTime.setHours(h, m - 5, 0, 0); // 5 menit sebelumnya
        
        const pengingat5Min = String(targetTime.getHours()).padStart(2, '0') + ':' + String(targetTime.getMinutes()).padStart(2, '0');
        const key5Min = `${j.__key}_5min_${pengingat5Min}`;

        if (pengingat5Min === jamSekarang && !alarmFiredToday.has(key5Min)) {
          alarmFiredToday.add(key5Min);
          triggerNotification(
            `⏳ 5 Menit Lagi Mengajar di ${j.kelas || 'Kelas'}`,
            `Bersiap untuk Mapel: ${j.mapel || '-'}`
          );
        }
      }
    });
  }

  // Inisialisasi saat Halaman Dimuat
  window.addEventListener('load', () => {
    requestNotificationPermission();
    listenJadwalData();
    setInterval(checkScheduleLoop, 5000); // Cek jadwal setiap 5 detik
  });

})();
