// Import Firebase SDK (Modular v10.7.1)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getDatabase, ref, set, push, onValue, onDisconnect, serverTimestamp, query, orderByChild 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyB24GCKSTPGlN9HG9E6uhCECVa4ibCpKEA",
  authDomain: "sipelita-digital.firebaseapp.com",
  databaseURL: "https://sipelita-digital-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sipelita-digital",
  storageBucket: "sipelita-digital.firebasestorage.app",
  messagingSenderId: "787840817745",
  appId: "1:787840817745:web:e6b5237cfbb5e51be93670",
  measurementId: "G-1D5DWJV54E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// State Aplikasi
let currentUserId = null;
let currentUserIdSafe = null;
let currentChatPartnerId = null;
let currentChatRoomId = null;
let currentUserName = 'User';

// DOM Elements
let chatWidgetBtn, chatWidgetContainer, chatWidgetUsers, chatWidgetMessages, chatWidgetInput, sendBtn, chatWidgetChatArea, chatWidgetHeaderName, chatWidgetHeaderStatus;

function encodeEmail(email) {
    return email.replace(/\./g, '_').replace(/@/g, '_at_');
}

export function initChatWidget() {
    console.log('🚀 [Chat Widget] Memulai inisialisasi...');
    createWidgetHTML();
    
    chatWidgetBtn = document.getElementById('chatWidgetBtn');
    chatWidgetContainer = document.getElementById('chatWidgetContainer');
    chatWidgetUsers = document.getElementById('chatWidgetUsers');
    chatWidgetMessages = document.getElementById('chatWidgetMessages');
    chatWidgetInput = document.getElementById('chatWidgetInput');
    sendBtn = document.getElementById('chatWidgetSendBtn');
    chatWidgetChatArea = document.getElementById('chatWidgetChatArea');
    chatWidgetHeaderName = document.getElementById('chatWidgetHeaderName');
    chatWidgetHeaderStatus = document.getElementById('chatWidgetHeaderStatus');
    
    if (!chatWidgetBtn) {
        console.error('❌ [Chat Widget] Gagal membuat elemen HTML.');
        return;
    }

    chatWidgetBtn.addEventListener('click', toggleChat);
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatWidgetInput) {
        chatWidgetInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
    
    const closeBtn = document.getElementById('chatWidgetCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => chatWidgetContainer.classList.remove('active'));
    
    const backBtn = document.getElementById('chatWidgetBackBtn');
    if (backBtn) backBtn.addEventListener('click', showUserList);
    
    checkExistingUser();
}

function checkExistingUser() {
    const userData = localStorage.getItem('sipelita_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            currentUserId = user.email;
            currentUserIdSafe = encodeEmail(user.email);
            currentUserName = user.nama || user.name || user.email.split('@')[0];
            
            // 1. SETUP PRESENCE: Online saat aplikasi dibuka
            setupPresence();
            
            // 2. Load data
            setupUserInRTDB();
            loadUsers(); // Ini sekarang akan mengurutkan berdasarkan chat terbaru
        } catch (error) {
            console.error('❌ [Chat Widget] Error parsing user data:', error);
        }
    }
}

function setupUserInRTDB() {
    const userRef = ref(db, `users/${currentUserIdSafe}`);
    set(userRef, {
        name: currentUserName,
        email: currentUserId,
        status: 'online',
        lastSeen: serverTimestamp()
    }).catch((error) => console.error('❌ Error simpan ke RTDB:', error));
}

// ✅ PERBAIKAN 2: Status online lebih agresif saat aplikasi aktif
function setupPresence() {
    const userStatusRef = ref(db, `users/${currentUserIdSafe}/status`);
    const userLastSeenRef = ref(db, `users/${currentUserIdSafe}/lastSeen`);
    const connectedRef = ref(db, '.info/connected');
    
    // Saat koneksi terdeteksi
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            set(userStatusRef, 'online');
            set(userLastSeenRef, serverTimestamp()); // Update last seen saat online
            
            onDisconnect(userStatusRef).set('offline');
            onDisconnect(userLastSeenRef).set(serverTimestamp());
        }
    });

    // Juga update status saat window browser difokuskan kembali
    window.addEventListener('focus', () => {
        set(userStatusRef, 'online');
        set(userLastSeenRef, serverTimestamp());
    });
}

function createWidgetHTML() {
    const widgetHTML = `
        <button id="chatWidgetBtn" class="chat-widget-btn">
            <i class="fas fa-comments"></i>
            <span class="badge" id="chatWidgetBadge" style="display:none">0</span>
        </button>
        
        <div id="chatWidgetContainer" class="chat-widget-container">
            <div class="chat-widget-header">
                <div>
                    <h3><i class="fas fa-user"></i> Chat Sipelita</h3>
                    <small style="opacity:0.8">Personal Chat</small>
                </div>
                <button class="close-btn" id="chatWidgetCloseBtn"><i class="fas fa-times"></i></button>
            </div>
            
            <div id="chatWidgetUsers" class="chat-widget-users">
                <div style="padding:20px;text-align:center;color:#999">Memuat pengguna...</div>
            </div>
            
            <div id="chatWidgetChatArea" class="chat-widget-chat-area" style="display: none;">
                <div class="chat-widget-chat-header">
                    <div class="chat-widget-chat-user-info">
                        <button class="chat-widget-back-icon" id="chatWidgetBackBtn">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <div class="chat-widget-avatar" id="chatWidgetAvatar">U</div>
                        <div>
                            <div class="chat-widget-chat-name" id="chatWidgetHeaderName">Nama User</div>
                            <div class="chat-widget-chat-status" id="chatWidgetHeaderStatus">Offline</div>
                        </div>
                    </div>
                </div>
                <div id="chatWidgetMessages" class="chat-widget-messages"></div>
                <div class="chat-widget-input">
                    <input type="text" id="chatWidgetInput" placeholder="Ketik pesan...">
                    <button id="chatWidgetSendBtn"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', widgetHTML);
}

function toggleChat() {
    chatWidgetContainer.classList.toggle('active');
}

function showUserList() {
    chatWidgetUsers.style.display = 'block';
    chatWidgetChatArea.style.display = 'none';
    
    if (currentChatPartnerId) {
        // ✅ PERBAIKAN 1: Simpan lastRead ke DATABASE, bukan hanya memori
        const lastReadRef = ref(db, `chats/${currentChatRoomId}/lastRead/${currentUserIdSafe}`);
        set(lastReadRef, serverTimestamp());
        
        currentChatPartnerId = null;
        currentChatRoomId = null;
    }
    
    document.querySelectorAll('.chat-widget-user').forEach(el => el.classList.remove('active'));
    loadUsers(); // Reload untuk update urutan dan badge
}

// ✅ PERBAIKAN 3: Load users dengan pengurutan berdasarkan chat terbaru & badge unread
function loadUsers() {
    const usersRef = ref(db, 'users');
    const chatsRef = ref(db, 'chats');
    
    // Kita perlu data users dan chats sekaligus untuk mengurutkan
    onValue(usersRef, (usersSnap) => {
        onValue(chatsRef, (chatsSnap) => {
            if (!chatWidgetUsers) return;
            
            const users = usersSnap.val() || {};
            const chats = chatsSnap.val() || {};
            
            // Array untuk menampung data user yang akan dirender
            let renderList = [];
            
            Object.keys(users).forEach(uidSafe => {
                if (uidSafe === currentUserIdSafe) return;
                const user = users[uidSafe];
                if (!user.name || user.name === 'User' || user.name.length < 3) return;
                
                // Cari chat room dengan user ini
                const roomId = [currentUserIdSafe, uidSafe].sort().join('_');
                const roomData = chats[roomId] || {};
                const messages = roomData.messages || {};
                const lastRead = roomData.lastRead?.[currentUserIdSafe] || 0;
                
                // Hitung unread dan cari pesan terakhir
                let unreadCount = 0;
                let lastMessageText = 'Belum ada pesan';
                let lastTimestamp = 0;
                
                const msgKeys = Object.keys(messages);
                if (msgKeys.length > 0) {
                    // Urutkan key pesan untuk mendapatkan yang terbaru
                    // (Asumsi key push Firebase sudah kronologis, ambil yang terakhir)
                    const lastMsgKey = msgKeys[msgKeys.length - 1];
                    const lastMsg = messages[lastMsgKey];
                    lastMessageText = lastMsg.text;
                    lastTimestamp = lastMsg.timestamp || 0;
                    
                    // Hitung unread
                    Object.values(messages).forEach(msg => {
                        if (msg.senderId !== currentUserIdSafe && (msg.timestamp || 0) > lastRead) {
                            unreadCount++;
                        }
                    });
                }
                
                const isOnline = user.status === 'online';
                const lastSeen = user.lastSeen || 0;
                
                let statusText = 'Offline';
                if (isOnline) statusText = 'Online';
                else if (lastSeen) {
                    const diffMinutes = Math.floor((Date.now() - lastSeen) / 60000);
                    if (diffMinutes < 1) statusText = 'Baru saja';
                    else if (diffMinutes < 60) statusText = `${diffMinutes} menit lalu`;
                    else statusText = new Date(lastSeen).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                }
                
                renderList.push({
                    uidSafe,
                    name: user.name,
                    isOnline,
                    statusText,
                    lastMessageText,
                    lastTimestamp,
                    unreadCount
                });
            });
            
            // ✅ SORTING: Yang punya chat terbaru (lastTimestamp terbesar) naik ke atas
            renderList.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
            
            // Render ke HTML
            chatWidgetUsers.innerHTML = '';
            if (renderList.length === 0) {
                chatWidgetUsers.innerHTML = '<div style="padding:20px;text-align:center;color:#999">Tidak ada pengguna lain</div>';
                return;
            }
            
            renderList.forEach(u => {
                const userEl = document.createElement('div');
                userEl.className = `chat-widget-user ${u.unreadCount > 0 ? 'has-unread' : ''}`;
                userEl.dataset.uid = u.uidSafe;
                
                // Badge unread di samping nama
                const unreadBadge = u.unreadCount > 0 ? `<span class="unread-badge">${u.unreadCount}</span>` : '';
                
                userEl.innerHTML = `
                    <div class="avatar">
                        ${u.name.charAt(0).toUpperCase()}
                        ${u.isOnline ? '<div class="status-dot"></div>' : ''}
                    </div>
                    <div class="user-info">
                        <div class="user-name-row">
                            <span class="user-name">${u.name}</span>
                            ${unreadBadge}
                        </div>
                        <div class="user-status-row">
                            <span class="user-status" style="color: ${u.isOnline ? '#10b981' : '#94a3b8'}">
                                ${u.isOnline ? 'Online' : u.statusText}
                            </span>
                            <span class="last-message" style="color:#64748b; font-size:0.8rem; margin-left:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:150px;">
                                ${u.lastMessageText}
                            </span>
                        </div>
                    </div>
                `;
                
                userEl.addEventListener('click', () => openChat(u.uidSafe, u.name, u.isOnline, u.lastSeen));
                chatWidgetUsers.appendChild(userEl);
            });
            
            // Update total badge di tombol widget
            const totalUnread = renderList.reduce((sum, u) => sum + u.unreadCount, 0);
            updateNotificationBadge(totalUnread);
        });
    });
}

function openChat(partnerIdSafe, partnerName, isOnline, lastSeen) {
    currentChatPartnerId = partnerIdSafe;
    currentChatRoomId = [currentUserIdSafe, partnerIdSafe].sort().join('_');
    
    // ✅ PERBAIKAN 1: Tandai sudah dibaca di DATABASE segera saat dibuka
    const lastReadRef = ref(db, `chats/${currentChatRoomId}/lastRead/${currentUserIdSafe}`);
    set(lastReadRef, serverTimestamp());
    
    chatWidgetHeaderName.textContent = partnerName;
    if (isOnline) {
        chatWidgetHeaderStatus.textContent = '🟢 Online';
        chatWidgetHeaderStatus.style.color = '#10b981';
    } else if (lastSeen) {
        const timeStr = new Date(lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        chatWidgetHeaderStatus.textContent = `Terakhir dilihat ${timeStr}`;
        chatWidgetHeaderStatus.style.color = '#94a3b8';
    } else {
        chatWidgetHeaderStatus.textContent = 'Offline';
        chatWidgetHeaderStatus.style.color = '#94a3b8';
    }
    
    document.getElementById('chatWidgetAvatar').textContent = partnerName.charAt(0).toUpperCase();
    chatWidgetUsers.style.display = 'none';
    chatWidgetChatArea.style.display = 'flex';
    
    document.querySelectorAll('.chat-widget-user').forEach(el => el.classList.remove('active'));
    document.querySelector(`.chat-widget-user[data-uid="${partnerIdSafe}"]`)?.classList.add('active');
    
    listenMessages();
    listenPartnerStatus(partnerIdSafe);
}

function listenPartnerStatus(partnerIdSafe) {
    const partnerRef = ref(db, `users/${partnerIdSafe}`);
    onValue(partnerRef, (snapshot) => {
        const user = snapshot.val();
        if (!user) return;
        
        const isOnline = user.status === 'online';
        const lastSeen = user.lastSeen || 0;
        
        if (isOnline) {
            chatWidgetHeaderStatus.textContent = '🟢 Online';
            chatWidgetHeaderStatus.style.color = '#10b981';
        } else if (lastSeen) {
            const timeStr = new Date(lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            chatWidgetHeaderStatus.textContent = `Terakhir dilihat ${timeStr}`;
            chatWidgetHeaderStatus.style.color = '#94a3b8';
        }
    });
}

function listenMessages() {
    const messagesRef = ref(db, `chats/${currentChatRoomId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));
    
    onValue(messagesQuery, (snapshot) => {
        if (!chatWidgetMessages) return;
        chatWidgetMessages.innerHTML = '';
        const messages = snapshot.val();
        
        if (!messages) {
            chatWidgetMessages.innerHTML = `<div style="text-align:center;color:#999;padding:40px"><i class="fas fa-comments" style="font-size:48px;opacity:0.3;margin-bottom:10px"></i><p>Belum ada pesan. Sapa dia!</p></div>`;
            return;
        }
        
        Object.keys(messages).forEach(key => {
            const msg = messages[key];
            const isSent = msg.senderId === currentUserIdSafe;
            const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '';
            
            const msgEl = document.createElement('div');
            msgEl.className = `chat-widget-message ${isSent ? 'sent' : 'received'}`;
            msgEl.innerHTML = `<div class="message-text">${msg.text}</div><div class="message-time">${time}</div>`;
            chatWidgetMessages.appendChild(msgEl);
        });
        chatWidgetMessages.scrollTop = chatWidgetMessages.scrollHeight;
    });
}

function sendMessage() {
    const text = chatWidgetInput.value.trim();
    if (!text || !currentChatRoomId) return;
    
    const messagesRef = ref(db, `chats/${currentChatRoomId}/messages`);
    push(messagesRef, {
        senderId: currentUserIdSafe,
        senderName: currentUserName,
        text: text,
        timestamp: serverTimestamp()
    }).then(() => {
        chatWidgetInput.value = '';
        chatWidgetInput.focus();
    }).catch((error) => {
        console.error('❌ Error kirim pesan:', error);
        alert('Gagal kirim pesan: ' + error.message);
    });
}

function updateNotificationBadge(totalCount) {
    const badge = document.getElementById('chatWidgetBadge');
    if (!badge) return;
    
    if (totalCount && totalCount > 0) {
        badge.textContent = totalCount > 99 ? '99+' : totalCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
} else {
    initChatWidget();
}
