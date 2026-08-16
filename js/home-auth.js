import { AuthService } from './auth-service.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cek status autentikasi aktif saat halaman dimuat
    // Jika sudah login, langsung lempar ke dashboard
    try {
        const loggedInUser = AuthService.checkAuth();
        if (loggedInUser) {
            window.location.href = 'dashboard.html'; // ✅ Sudah benar
            return;
        }
    } catch(e) {
        console.log("Sistem autentikasi lokal siap.");
    }

    const loginForm = document.getElementById('landingLoginForm');
    const errorMsg = document.getElementById('errorMsg');
    const btnLogin = document.getElementById('btnLogin');
    
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const togglePassword = document.getElementById('togglePassword');

    // 2. FEATURE: CEK DATA "INGAT SAYA" (HANYA EMAIL, JANGAN PASSWORD!)
    const savedEmail = localStorage.getItem('sipelita_guru_remember_email');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMeCheckbox.checked = true;
    }

    // 3. FEATURE: TOMBOL LIHAT PASSWORD (MATA)
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.classList.toggle('fa-eye');
            togglePassword.classList.toggle('fa-eye-slash');
        });
    }

    // 4. LOGIKA UTAMA SUBMIT LOGIN
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            errorMsg.style.display = 'none';
            btnLogin.disabled = true;
            btnLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            try {
                const result = await AuthService.login(email, password);
                
                if (result && result.success) {
                    // ✅ PERBAIKAN KEAMANAN: Hanya simpan email, JANGAN password!
                    // Firebase sudah otomatis mengingat sesi login (session persistence)
                    if (rememberMeCheckbox.checked) {
                        localStorage.setItem('sipelita_guru_remember_email', email);
                    } else {
                        localStorage.removeItem('sipelita_guru_remember_email');
                    }

                    // ✅ PERBAIKAN REDIRECT: Arahkan ke dashboard, BUKAN index.html
                    window.location.href = 'dashboard.html'; 
                    
                } else {
                    errorMsg.textContent = result ? result.message : 'Akses ditolak. Email atau password salah.';
                    errorMsg.style.display = 'block';
                    btnLogin.disabled = false;
                    btnLogin.innerHTML = 'MASUK PORTAL';
                }
            } catch (err) {
                console.error("Firebase Connection Error:", err);
                errorMsg.textContent = 'Gagal terhubung ke server database Firebase.';
                errorMsg.style.display = 'block';
                btnLogin.disabled = false;
                btnLogin.innerHTML = 'MASUK PORTAL';
            }
        });
    }
});
