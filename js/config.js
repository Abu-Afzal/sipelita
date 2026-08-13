const CONFIG = {
    layananUmum: [
        { 
            id: 'pusaka', 
            title: 'PUSAKA', 
            desc: '', 
            color: '#ffffff', 
            url: 'https://pusaka-v3.kemenag.go.id/',
            logo: 'assets/images/icon-app.png'
        },
        { 
            id: 'pusaka', 
            icon: '📜',
            title: 'SSO KEMENAG', 
            desc: '', 
            color: '#9c27b0', 
            url: 'https://absensi.kemenag.go.id'
        },
        { 
            id: 'myasn', 
            icon: '👤', 
            title: 'MyASN BKN', 
            desc: '', 
            color: '#673ab7', 
            url: 'https://myasn.bkn.go.id/',
            logo: 'assets/images/logobkn-app.png'
        },
        { 
            id: 'emis', 
            icon: '💻', 
            title: 'EMIS GTK', 
            desc: '', 
            color: '#7e57c2', 
            url: 'https://emisgtk.kemenag.go.id/',
            logo: 'assets/images/emis-app.png'
        },
        { 
            id: 'simpeg', 
            icon: '📘', 
            title: 'SIMPEG 5', 
            desc: '', 
            color: '#546e7a', 
            url: 'https://simpeg5.kemenag.go.id/',
            logo: 'assets/images/simpeg-app.png'
        },
        { 
            id: 'pelatihan', 
            icon: '', 
            title: 'PINTAR', 
            desc: '', 
            color: '#afb6b5', 
            url: 'https://pintar.kemenag.go.id/',
            logo: 'assets/images/pintar-app.png'
        }
    ],
    
    layananMadrasah: [
        { icon: '👨‍💼', title: 'Admin Users', desc: '', color: '#dc3309', page: '/admin-users.html' },
        { 
            icon: '📢', 
            title: 'Kelola Berita', 
            desc: '', 
            color: '#673ab7', 
            url: 'pages/kelola-berita.html' 
        },
        { 
            id: 'Edu', 
            icon: '', 
            title: 'EduLogs', 
            desc: 'Pencatatan & Monitoring Pembelajaran', 
            color: '#7e57c2', 
            url: 'https://edulogs.manbantaeng.web.id/',
            logo: 'assets/images/manbtg-app.png'
        },
        { 
            icon: '🌐', 
            title: 'Website', 
            desc: '', 
            color: '#37474f', 
            url: 'https://www.manbantaeng.sch.id/' 
        },
        { icon: '🧾', title: 'PMBM', desc: 'Penerimaan Murid Baru Madrasah', color: '#00695c', page: 'pages/pmbm.html' },
        { icon: '📖', title: 'SIPENA', desc: 'Sistem Penilaian dan Absensi', color: '#3949ab', page: 'pages/sipena.html' },
        { icon: '⏱️', title: 'Jadwal Mengajar', desc: '', color: '#a704c8', page: 'pages/jadwal-mengajar.html' },
        { icon: '✅', title: 'Tatib', desc: 'Tata Tertib MAN Bantaeng', color: '#f57c00', page: 'pages/sitaat.html' },
        { 
            icon: '📷', 
            title: 'SISCA', 
            desc: 'Sistem Scan Cepat', 
            color: '#0d47a1', 
            url: 'sican/sican.html'
        },
        { icon: '🎓', title: 'SIBEL', desc: 'Sistem Belajar Digital', color: '#d32f2f', page: 'pages/elearning.html' },
        { icon: '📁', title: 'Bank Dokumen', desc: '', color: '#1e88e5', page: 'pages/edokumen.html' },
        { icon: '🏥', title: 'SEHAT', desc: 'Sistem Informasi Kesehatan', color: '#e91e63', page: 'pages/sehat.html' },
        { icon: '📚', title: 'Jurnal Mengajar', desc: '', color: '#6d4c41', page: 'pages/jurnal-online.html' },
        { icon: '👥', title: 'Master Siswa', desc: 'Kelola Data Siswa', color: '#009688', page: 'sican/siswa-sican.html',role: 'admin' },
        { icon: '📝', title: 'Supervisi', desc: '', color: '#78909c', page: 'pages/supervisi.html' },
        { icon: '🏆', title: 'EKSKUL', desc: '', color: '#6d4c41', page: 'pages/ekskul.html' },
        { icon: '👨‍💼', title: 'PKKM', desc: 'Penilaian Kinerja Kepala Madrasah', color: '#1b5e20', page: 'pkkm.html' },
        { icon: '🛠️', title: 'Master PKKM', desc: 'Kelola Instrumen PKKM', color: '#0dd940', page: '/pages/master-pkkm.html' },
        { 
            icon: '📗',  // ← Tetap tambahkan icon sebagai fallback
            title: 'RDM', 
            desc: 'Raport Digital Madrasah', 
            color: '#283593', 
            url: 'https://manbantaeng.rdmnet.my.id/',
            logo: 'assets/images/rapor-app.png'  // ← Path ke logo
        },
        { icon: '📈', title: 'LCKH', desc: 'Laporan Capaian Kinerja Harian', color: '#c62828', page: 'pages/jurnal.html' }
    ]
};
