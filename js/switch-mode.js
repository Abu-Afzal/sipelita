// ══════════════════════════════════════════════
// SWITCH MODE - Ganti Role (Guru <-> Admin) tanpa logout
// Penempatan pintar: sebelum Logout → header → floating
// ══════════════════════════════════════════════
import { auth, db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

onAuthStateChanged(auth, async (u) => {
  if (!u) return;
  if (document.getElementById('btnSwitchMode')) return;

  let local = {};
  try { local = JSON.parse(localStorage.getItem('sipelita_user') || '{}'); } catch (e) {}
  const email = local.email || u.email || '';

  try {
    const snap = await getDocs(collection(db, 'users'));
    let me = null;
    snap.forEach(d => { const x = d.data(); if ((x.email || '') === email) me = x; });
    if (!me) return;

    const realAdmin = (me.role === 'admin');
    const dual = (me.dual_role === true) || ((me.roles || []).includes('admin'));

    // 🛡️ Anti-spoofing
    if ((local.role === 'admin') && !realAdmin && !dual) {
      local.role = 'guru';
      localStorage.setItem('sipelita_user', JSON.stringify(local));
      location.reload();
      return;
    }

    if (!dual) return;

    const isAdm = (local.role === 'admin');
    const btn = document.createElement('button');
    btn.id = 'btnSwitchMode';
    btn.innerHTML = isAdm ? '🔄 Mode: <b>Admin</b>' : '🔄 Mode: <b>Guru</b>';
    btn.title = 'Klik untuk pindah mode';
    btn.style.cssText = 'background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;border:none;padding:8px 16px;border-radius:20px;font-size:.85rem;cursor:pointer;margin:0 6px;box-shadow:0 2px 8px rgba(124,58,237,.4)';

    btn.onclick = () => {
      local.role = isAdm ? 'guru' : 'admin';
      localStorage.setItem('sipelita_user', JSON.stringify(local));
      location.reload();
    };

    // ✅ Penempatan pintar
    const logoutBtn = [...document.querySelectorAll('button,a')].find(el => /logout/i.test(el.textContent || ''));
    if (logoutBtn && logoutBtn.parentNode) {
      logoutBtn.parentNode.insertBefore(btn, logoutBtn);
    } else {
      const header = document.querySelector('.header-inner') || document.querySelector('.header') || document.querySelector('header');
      if (header) header.appendChild(btn);
      else { btn.style.position = 'fixed'; btn.style.top = '10px'; btn.style.right = '10px'; btn.style.zIndex = '99999'; document.body.appendChild(btn); }
    }
  } catch (err) {
    console.error('Switch mode:', err);
  }
});