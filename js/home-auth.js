import { AuthService } from './auth-service.js';

document.addEventListener('DOMContentLoaded', () => {
    // Cek status autentikasi aktif saat halaman dimuat
    try {
        const loggedInUser = AuthService.checkAuth();
        if (loggedInUser) {
            window.location.href = 'index.html';
            return;
        }
    } catch(e) {
        console.log("Sistem autentikasi lokal siap.");
    }

    const loginForm = document.getElementById('landingLoginForm');
    const errorMsg = document.getElementById('errorMsg');
    const btnLogin = document.getElementById('btnLogin');
    
    // Elemen tambahan baru
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const togglePassword = document.getElementById('togglePassword');

    // ---- FEATURE 1: CEK DATA "INGAT SAYA" YANG TERSIMPAN ----
    if (localStorage.getItem('sipelita_remember') === 'true') {
        emailInput.value = localStorage.getItem('sipelita_email') || '';
        passwordInput.value = localStorage.getItem('sipelita_pass') || '';
        rememberMeCheckbox.checked = true;
    }

    // ---- FEATURE 2: TOMBOL LIHAT PASSWORD (MATA) ----
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            // Tukar tipe input antara password dan text
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Tukar ikon mata terbuka / tertutup
            togglePassword.classList.toggle('fa-eye');
            togglePassword.classList.toggle('fa-eye-slash');
        });
    }

    // ---- LOGIKA UTAMA SUBMIT LOGIN ----
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            errorMsg.style.display = 'none';
            btnLogin.disabled = true;
            btnLogin.textContent = 'MEMPROSES...';

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            try {
                const result = await AuthService.login(email, password);
                
                if (result && result.success) {
                    // ---- FEATURE 3: PROSES SIMPAN / HAPUS DATA KREDENSIAL ----
                    if (rememberMeCheckbox.checked) {
                        localStorage.setItem('sipelita_email', email);
                        localStorage.setItem('sipelita_pass', password);
                        localStorage.setItem('sipelita_remember', 'true');
                    } else {
                        localStorage.removeItem('sipelita_email');
                        localStorage.removeItem('sipelita_pass');
                        localStorage.removeItem('sipelita_remember');
                    }

                    window.location.href = 'index.html';
                } else {
                    errorMsg.textContent = result ? result.message : 'Akses ditolak. Email atau password salah.';
                    errorMsg.style.display = 'block';
                    btnLogin.disabled = false;
                    btnLogin.textContent = 'MASUK PORTAL';
                }
            } catch (err) {
                console.error("Firebase Connection Error:", err);
                errorMsg.textContent = 'Gagal terhubung ke server database Firebase.';
                errorMsg.style.display = 'block';
                btnLogin.disabled = false;
                btnLogin.textContent = 'MASUK PORTAL';
            }
        });
    }
});
