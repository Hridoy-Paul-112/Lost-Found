// ===== CONFIG =====
const API = 'https://lost-found-2nke.onrender.com/api';

// ===== PAGE ROUTING =====
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  if (page === 'home') loadItems();
  if (page === 'myitems') loadMyItems();
  if (page === 'verify') setTimeout(() => document.querySelector('.otp-digit')?.focus(), 100);
  updateNav();
  window.scrollTo(0, 0);
}

function updateNav() {
  const token = localStorage.getItem('token');
  const name = localStorage.getItem('userName');
  document.getElementById('authLink').style.display = token ? 'none' : 'inline';
  document.getElementById('registerLink').style.display = token ? 'none' : 'inline';
  document.getElementById('logoutLink').style.display = token ? 'inline' : 'none';
  document.getElementById('userGreeting').textContent = token ? `Hi, ${name}` : '';
}

// ===== HELPERS =====
function showMsg(elId, text, ok = true) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? '#3F8F5F' : '#D64545';
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function apiCall(endpoint, method = 'GET', body = null, needsAuth = false) {
  const opts = {
    method,
    headers: needsAuth ? authHeaders() : { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${endpoint}`, opts);
  const data = await res.json();
  return { ok: res.ok, data };
}

// ===== REGISTER =====
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  const { ok, data } = await apiCall('/auth/register', 'POST', { name, email, password });
  showMsg('register-msg', data.msg, ok);

  if (ok) {
    localStorage.setItem('pendingEmail', email);
    document.getElementById('verify-email-display').textContent = email;
    setTimeout(() => showPage('verify'), 700);
  }
});

// ===== OTP BOX BEHAVIOR (auto-advance, backspace, paste) =====
const otpBoxes = document.querySelectorAll('.otp-digit');
otpBoxes.forEach((box, idx) => {
  box.addEventListener('input', () => {
    box.value = box.value.replace(/[^0-9]/g, '');
    if (box.value && idx < otpBoxes.length - 1) otpBoxes[idx + 1].focus();
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !box.value && idx > 0) otpBoxes[idx - 1].focus();
  });
  box.addEventListener('paste', (e) => {
    e.preventDefault();
    const digits = (e.clipboardData.getData('text').match(/\d/g) || []).slice(0, otpBoxes.length);
    digits.forEach((d, i) => { if (otpBoxes[i]) otpBoxes[i].value = d; });
    otpBoxes[Math.min(digits.length, otpBoxes.length - 1)].focus();
  });
});

function getOtpValue() {
  return Array.from(otpBoxes).map(b => b.value).join('');
}

function clearOtpBoxes() {
  otpBoxes.forEach(b => b.value = '');
  otpBoxes[0]?.focus();
}

// ===== VERIFY OTP =====
document.getElementById('otpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = localStorage.getItem('pendingEmail');
  const otp = getOtpValue();

  if (otp.length < 6) {
    showMsg('verify-msg', 'Enter all 6 digits', false);
    return;
  }

  const { ok, data } = await apiCall('/auth/verify-otp', 'POST', { email, otp });
  showMsg('verify-msg', data.msg, ok);

  if (ok) {
    setTimeout(() => showPage('login'), 1100);
  } else {
    clearOtpBoxes();
  }
});

document.getElementById('resendBtn').addEventListener('click', async () => {
  const email = localStorage.getItem('pendingEmail');
  const { ok, data } = await apiCall('/auth/resend-otp', 'POST', { email });
  showMsg('verify-msg', data.msg, ok);
  clearOtpBoxes();
});

// ===== LOGIN =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { ok, data } = await apiCall('/auth/login', 'POST', { email, password });
  showMsg('login-msg', data.msg, ok);

  if (ok) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userName', data.name);
    localStorage.setItem('userEmail', data.email);
    updateNav();
    setTimeout(() => showPage('home'), 700);
  }
});

// ===== FORGOT / RESET PASSWORD =====
document.getElementById('forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value;
  const { ok, data } = await apiCall('/auth/forgot-password', 'POST', { email });
  showMsg('forgot-msg', data.msg, ok);

  if (ok) {
    localStorage.setItem('resetEmail', email);
    document.getElementById('resetForm').style.display = 'flex';
  }
});

document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = localStorage.getItem('resetEmail');
  const otp = document.getElementById('reset-otp').value;
  const newPassword = document.getElementById('reset-password').value;

  const { ok, data } = await apiCall('/auth/reset-password', 'POST', { email, otp, newPassword });
  showMsg('forgot-msg', data.msg, ok);

  if (ok) setTimeout(() => showPage('login'), 1100);
});

// ===== LOGOUT =====
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  updateNav();
  showPage('home');
}

// ===== POST ITEM =====
document.getElementById('itemForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!localStorage.getItem('token')) {
    showMsg('post-msg', 'Please log in first', false);
    return setTimeout(() => showPage('login'), 900);
  }

  const type = document.querySelector('input[name="itype"]:checked').value;

  const body = {
    title: document.getElementById('item-title').value,
    description: document.getElementById('item-description').value,
    type,
    category: document.getElementById('item-category').value,
    location: document.getElementById('item-location').value,
    contact: document.getElementById('item-contact').value,
    image: document.getElementById('item-image').value
  };

  const { ok, data } = await apiCall('/items', 'POST', body, true);
  showMsg('post-msg', ok ? 'Pinned to the board!' : data.msg, ok);

  if (ok) {
    document.getElementById('itemForm').reset();
    setTimeout(() => showPage('home'), 900);
  }
});

// ===== LOAD ITEMS (HOME) =====
async function loadItems() {
  const list = document.getElementById('itemsList');
  const search = document.getElementById('searchInput').value;
  const type = document.getElementById('typeFilter').value;
  const category = document.getElementById('categoryFilter').value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (type) params.append('type', type);
  if (category) params.append('category', category);

  const { ok, data } = await apiCall(`/items?${params.toString()}`);
  if (!ok) return;

  list.innerHTML = data.length ? data.map(renderCard).join('') : '<p class="empty">Nothing pinned here yet. Be the first to post.</p>';
}

function renderCard(i) {
  return `
    <div class="item-card" onclick="openModal('${i._id}')">
      ${i.image ? `<img src="${i.image}" alt="${i.title}">` : '<div class="no-image">NO IMAGE</div>'}
      <div class="card-body">
        <span class="badge ${i.type}">${i.type.toUpperCase()}</span>
        <h3>${i.title}</h3>
        <p class="category">${i.category || ''}</p>
        <p class="location">📍 ${i.location}</p>
      </div>
    </div>`;
}

// ===== MY ITEMS =====
async function loadMyItems() {
  const list = document.getElementById('myItemsList');
  if (!localStorage.getItem('token')) {
    list.innerHTML = '<p class="empty">Log in to see the items you\'ve pinned.</p>';
    return;
  }
  const { ok, data } = await apiCall('/items/user/mine', 'GET', null, true);
  if (!ok) return;

  list.innerHTML = data.length ? data.map(i => `
    <div class="item-card">
      ${i.image ? `<img src="${i.image}" alt="${i.title}">` : '<div class="no-image">NO IMAGE</div>'}
      <div class="card-body">
        <span class="badge ${i.type}">${i.type.toUpperCase()}</span>
        ${i.resolved ? '<span class="badge resolved">RESOLVED</span>' : ''}
        <h3>${i.title}</h3>
        <p class="location">📍 ${i.location}</p>
        <div class="card-actions">
          ${!i.resolved ? `<button onclick="markResolved('${i._id}')">Mark resolved</button>` : ''}
          <button class="danger" onclick="deleteItem('${i._id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('') : '<p class="empty">You haven\'t pinned anything yet.</p>';
}

async function markResolved(id) {
  await apiCall(`/items/${id}`, 'PUT', { resolved: true }, true);
  loadMyItems();
}

async function deleteItem(id) {
  if (!confirm('Remove this pin from the board?')) return;
  await apiCall(`/items/${id}`, 'DELETE', null, true);
  loadMyItems();
}

// ===== ITEM DETAIL MODAL =====
async function openModal(id) {
  const { ok, data } = await apiCall(`/items/${id}`);
  if (!ok) return;

  document.getElementById('modalBody').innerHTML = `
    ${data.image ? `<img src="${data.image}" class="modal-img" alt="${data.title}">` : ''}
    <span class="badge ${data.type}">${data.type.toUpperCase()}</span>
    <h2>${data.title}</h2>
    <p><b>Category:</b> ${data.category || 'N/A'}</p>
    <p><b>Description:</b> ${data.description}</p>
    <p><b>Location:</b> ${data.location}</p>
    <p><b>Contact:</b> ${data.contact}</p>
    <p><b>Posted by:</b> ${data.createdByName || data.createdBy}</p>
    <p class="date">${new Date(data.createdAt).toLocaleString()}</p>
  `;
  document.getElementById('itemModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('itemModal').style.display = 'none';
}

window.onclick = (e) => {
  if (e.target.id === 'itemModal') closeModal();
};

// ===== INIT =====
updateNav();
showPage('home');