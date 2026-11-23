// ===== CONFIG =====
const API = 'https://lost-found-2nke.onrender.com';

// ===== PAGE ROUTING =====
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  if (page === 'home') loadItems();
  if (page === 'myitems') loadMyItems();
  if (page === 'matches') loadMatches();
  if (page === 'admin') loadAdminPanel();
  if (page === 'verify')
    setTimeout(() => document.querySelector('.otp-digit')?.focus(), 100);
  
  updateNav();
  window.scrollTo(0, 0);
}

function updateNav() {
  const token = localStorage.getItem('token');
  const name = localStorage.getItem('userName');
  const role = localStorage.getItem('userRole');

  const loggedOut = document.getElementById('loggedOutBox');
  const loggedIn = document.getElementById('loggedInBox');
  const adminLink = document.getElementById('adminNavLink');
  
  if (loggedOut) loggedOut.style.display = token ? 'none' : 'flex';
  if (loggedIn) loggedIn.style.display = token ? 'flex' : 'none';

  const greeting = document.getElementById('userGreeting');
  if (greeting) greeting.textContent = token ? `Hi, ${name}` : '';

  // Show Admin link if user is an admin
  if (adminLink) {
    if (token && role === 'admin') {
      adminLink.style.display = 'inline-block';
    } else {
      adminLink.style.display = 'none';
    }
  }
}

// ===== HELPERS =====
function showMsg(elId, text, ok = true) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? '#3F8F5F' : '#D64545';
}

// Updated to support HTTPOnly Cookies
async function apiCall(endpoint, method = 'GET', body = null, needsAuth = false) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include' // <--- CRITICAL FOR HTTPONLY COOKIES
  };

  // Fallback to Bearer token if cookie fails (e.g., cross-origin issues)
  if (needsAuth && localStorage.getItem('token')) {
    opts.headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
  }

  if (body) opts.body = JSON.stringify(body);

  const fullEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API}/api${fullEndpoint}`;

  try {
    const res = await fetch(url, opts);
    const data = await res.json();
    if (data.message && !data.msg) data.msg = data.message;
    if (data.msg && !data.message) data.message = data.msg;
    return { ok: res.ok, data };
  } catch (err) {
    console.error('API Error:', err);
    return { ok: false, data: { msg: 'Network error. Please try again.' } };
  }
}

// ===== REGISTER =====
document.getElementById('registerForm').addEventListener('submit', async e => {
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

// ===== OTP BOX BEHAVIOR =====
const otpBoxes = document.querySelectorAll('.otp-digit');
otpBoxes.forEach((box, idx) => {
  box.addEventListener('input', () => {
    box.value = box.value.replace(/[^0-9]/g, '');
    if (box.value && idx < otpBoxes.length - 1) otpBoxes[idx + 1].focus();
  });
  box.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !box.value && idx > 0) otpBoxes[idx - 1].focus();
  });
  box.addEventListener('paste', e => {
    e.preventDefault();
    const digits = (e.clipboardData.getData('text').match(/\d/g) || []).slice(0, otpBoxes.length);
    digits.forEach((d, i) => {
      if (otpBoxes[i]) otpBoxes[i].value = d;
    });
    otpBoxes[Math.min(digits.length, otpBoxes.length - 1)].focus();
  });
});

function getOtpValue() {
  return Array.from(otpBoxes).map(b => b.value).join('');
}
function clearOtpBoxes() {
  otpBoxes.forEach(b => (b.value = ''));
  otpBoxes[0]?.focus();
}

// ===== VERIFY OTP =====
document.getElementById('otpForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = localStorage.getItem('pendingEmail');
  const otp = getOtpValue();

  if (otp.length < 6) {
    showMsg('verify-msg', 'Enter all 6 digits', false);
    return;
  }

  const { ok, data } = await apiCall('/auth/verify-otp', 'POST', { email, otp });
  showMsg('verify-msg', data.msg, ok);

  if (ok) setTimeout(() => showPage('login'), 1100);
  else clearOtpBoxes();
});

document.getElementById('resendBtn').addEventListener('click', async () => {
  const email = localStorage.getItem('pendingEmail');
  const { ok, data } = await apiCall('/auth/resend-otp', 'POST', { email });
  showMsg('verify-msg', data.msg, ok);
  clearOtpBoxes();
});

// ===== LOGIN =====
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { ok, data } = await apiCall('/auth/login', 'POST', { email, password });
  showMsg('login-msg', data.msg, ok);

  if (ok) {
    // Store token as fallback, but primary auth is via HTTPOnly cookie
    localStorage.setItem('token', data.token);
    localStorage.setItem('userName', data.name);
    localStorage.setItem('userEmail', data.email);
    localStorage.setItem('userRole', data.role);
    
    updateNav();
    setTimeout(() => showPage('home'), 700);
  }
});

// ===== FORGOT / RESET PASSWORD =====
document.getElementById('forgotForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value;
  const { ok, data } = await apiCall('/auth/forgot-password', 'POST', { email });
  showMsg('forgot-msg', data.msg, ok);

  if (ok) {
    localStorage.setItem('resetEmail', email);
    document.getElementById('resetForm').style.display = 'flex';
  }
});

document.getElementById('resetForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = localStorage.getItem('resetEmail');
  const otp = document.getElementById('reset-otp').value;
  const newPassword = document.getElementById('reset-password').value;

  const { ok, data } = await apiCall('/auth/reset-password', 'POST', { email, otp, newPassword });
  showMsg('forgot-msg', data.msg, ok);

  if (ok) setTimeout(() => showPage('login'), 1100);
});

// ===== LOGOUT =====
function requestLogout() {
  document.getElementById('logoutModal').style.display = 'flex';
}
function cancelLogout() {
  document.getElementById('logoutModal').style.display = 'none';
}
async function confirmLogout() {
  document.getElementById('logoutModal').style.display = 'none';
  await apiCall('/auth/logout', 'POST'); // Clears HTTPOnly cookie
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userRole');
  updateNav();
  showPage('home');
}

// ===== POST ITEM =====
document.getElementById('itemForm').addEventListener('submit', async e => {
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
    secretQuestion: document.getElementById('item-secret-q').value,
    secretAnswer: document.getElementById('item-secret-a').value,
    image: document.getElementById('item-image').value,
  };

  const { ok, data } = await apiCall('/items', 'POST', body, true);
  showMsg('post-msg', ok ? 'Pinned to the board!' : data.msg, ok);

  if (ok) {
    document.getElementById('itemForm').reset();
    setTimeout(() => showPage('home'), 900);
  }
});

// ===== LOAD ITEMS (PUBLIC BOARD) =====
async function loadItems() {
  const list = document.getElementById('itemsList');
  const token = localStorage.getItem('token');

  if (!token) {
    list.innerHTML = `
      <div class="empty" style="grid-column:1/-1; padding:2rem; background:white; border-radius:8px;">
        <p style="font-size:1.1rem; margin-bottom:0.5rem;">🔒 Please log in to see the board.</p>
        <p><a href="#" onclick="showPage('login')" style="color:var(--navy); font-weight:600;">Log in</a> or 
        <a href="#" onclick="showPage('register')" style="color:var(--navy); font-weight:600;">Sign up</a></p>
      </div>`;
    return;
  }

  const search = document.getElementById('searchInput').value;
  const type = document.getElementById('typeFilter').value;
  const category = document.getElementById('categoryFilter').value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (type) params.append('type', type);
  if (category) params.append('category', category);

  list.innerHTML = '<p class="empty" style="color:var(--muted);">Loading posts...</p>';

  const { ok, data } = await apiCall(`/items?${params.toString()}`, 'GET', null, true);

  if (!ok) {
    list.innerHTML = `
      <div class="empty" style="grid-column:1/-1; padding:2rem; background:white; border-radius:8px;">
        <p style="font-size:1.1rem; margin-bottom:0.5rem;">🔒 Session expired or you are not logged in.</p>
        <p><a href="#" onclick="showPage('login')" style="color:var(--navy); font-weight:600;">Log in again</a></p>
      </div>`;
    return;
  }

  if (data.length === 0) {
    list.innerHTML = '<p class="empty">Nothing pinned here yet. Be the first to post.</p>';
    return;
  }

  list.innerHTML = data.map(renderCard).join('');
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
  if (!ok) {
    list.innerHTML = '<p class="empty" style="color:var(--red);">⚠️ Could not load your items.</p>';
    return;
  }

  list.innerHTML = data.length
    ? data.map(i => `
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
    </div>`).join('')
    : '<p class="empty">You haven\'t pinned anything yet.</p>';
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

// ===== ITEM DETAIL MODAL (With Claim Form) =====
async function openModal(id) {
  if (!localStorage.getItem('token')) {
    alert('Please log in to view item details.');
    showPage('login');
    return;
  }

  const { ok, data } = await apiCall(`/items/${id}`, 'GET', null, true);
  if (!ok) {
    alert('Could not load item details.');
    return;
  }

  // Only show the claim form if it's a Found item and I didn't post it
  const currentUser = localStorage.getItem('userEmail');
  const showClaimForm = data.type === 'found' && data.createdBy !== currentUser && !data.resolved;

  document.getElementById('modalBody').innerHTML = `
    ${data.image ? `<img src="${data.image}" class="modal-img" alt="${data.title}">` : ''}
    <span class="badge ${data.type}">${data.type.toUpperCase()}</span>
    ${data.resolved ? '<span class="badge resolved">RESOLVED</span>' : ''}
    <h2>${data.title}</h2>
    <p><b>Category:</b> ${data.category || 'N/A'}</p>
    <p><b>Description:</b> ${data.description}</p>
    <p><b>Location:</b> ${data.location}</p>
    <p><b>Contact:</b> ${data.contact}</p>
    <p><b>Posted by:</b> ${data.createdByName || data.createdBy}</p>
    <p class="date">${new Date(data.createdAt).toLocaleString()}</p>

    ${showClaimForm ? `
    <div class="claim-form">
      <h3>Is this yours? Claim it.</h3>
      <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 0.8rem;">Answer the secret question to verify ownership.</p>
      <label>Secret Question: <b>${data.secretQuestion || 'N/A'}</b></label>
      <input id="claim-answer" placeholder="Your answer" style="margin: 0.5rem 0;">
      <input id="claim-proof" placeholder="Add some proof details (e.g. lock screen wallpaper)" style="margin-bottom: 0.8rem;">
      <button onclick="submitClaim('${data._id}')">Submit Claim</button>
      <p id="claim-msg" class="msg"></p>
    </div>` : ''}
  `;
  document.getElementById('itemModal').style.display = 'flex';
}

// ===== SUBMIT CLAIM =====
async function submitClaim(itemId) {
  const answer = document.getElementById('claim-answer').value;
  const proof = document.getElementById('claim-proof').value;

  if (!answer) return showMsg('claim-msg', 'Please enter the secret answer', false);

  const { ok, data } = await apiCall('/claims', 'POST', {
    itemId, secretAnswer: answer, proofText: proof
  }, true);

  showMsg('claim-msg', data.msg, ok);
  if (ok) {
    document.getElementById('claim-answer').value = '';
    document.getElementById('claim-proof').value = '';
    setTimeout(closeModal, 2000);
  }
}

function closeModal() {
  document.getElementById('itemModal').style.display = 'none';
}

window.onclick = e => {
  if (e.target.id === 'itemModal') closeModal();
};

// ===== SMART MATCHES (New) =====
async function loadMatches() {
  const list = document.getElementById('matchesList');
  if (!localStorage.getItem('token')) {
    list.innerHTML = '<p class="empty">Log in to see smart matches.</p>';
    return;
  }

  list.innerHTML = '<p class="empty">Running matching engine...</p>';

  const { ok, data } = await apiCall('/matches', 'GET', null, true);
  
  if (!ok || data.length === 0) {
    list.innerHTML = '<p class="empty">No high-confidence matches found right now.</p>';
    return;
  }

  list.innerHTML = data.map(m => `
    <div class="match-card">
      <div class="match-header">
        <h3>Match Found!</h3>
        <span class="match-score">${m.score}% Match</span>
      </div>
      <div class="match-pair">
        <div class="match-col">
          <span class="badge lost">LOST</span>
          <h4>${m.lost.title}</h4>
          <p>📍 ${m.lost.location}</p>
          <p>${m.lost.description.substring(0, 60)}...</p>
        </div>
        <div class="match-col">
          <span class="badge found">FOUND</span>
          <h4>${m.found.title}</h4>
          <p>📍 ${m.found.location}</p>
          <p>${m.found.description.substring(0, 60)}...</p>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== ADMIN PANEL (New) =====
async function loadAdminPanel() {
  const role = localStorage.getItem('userRole');
  if (role !== 'admin') {
    alert('Access Denied. Admins only.');
    showPage('home');
    return;
  }

  // 1. Load Analytics
  const statsRes = await apiCall('/admin/analytics', 'GET', null, true);
  const statsBox = document.getElementById('adminStats');
  
  if (statsRes.ok) {
    const s = statsRes.data;
    statsBox.innerHTML = `
      <div class="stat-card"><h3>${s.totalItems}</h3><p>Total Items</p></div>
      <div class="stat-card"><h3>${s.lostItems}</h3><p>Lost Items</p></div>
      <div class="stat-card"><h3>${s.foundItems}</h3><p>Found Items</p></div>
      <div class="stat-card"><h3>${s.totalClaims}</h3><p>Total Claims</p></div>
    `;
  }

  // 2. Load Pending Claims
  const claimsRes = await apiCall('/claims', 'GET', null, true);
  const claimsBox = document.getElementById('adminClaims');

  if (!claimsRes.ok || claimsRes.data.length === 0) {
    claimsBox.innerHTML = '<p class="empty">No pending claims to verify.</p>';
    return;
  }

  claimsBox.innerHTML = claimsRes.data.map(c => `
    <div class="claim-row">
      <div class="claim-details">
        <h4>${c.itemId?.title || 'Unknown Item'}</h4>
        <p>Claimed by: <b>${c.claimantEmail}</b></p>
        <p>Proof: ${c.proofText || 'None provided'}</p>
        <p style="font-size: 0.75rem; color: #999;">Status: ${c.status.toUpperCase()}</p>
      </div>
      ${c.status === 'pending' ? `
      <div class="claim-actions">
        <button class="btn-approve" onclick="verifyClaim('${c._id}', 'approved')">Approve</button>
        <button class="btn-reject" onclick="verifyClaim('${c._id}', 'rejected')">Reject</button>
      </div>` : ''}
    </div>
  `).join('');
}

async function verifyClaim(claimId, status) {
  const { ok, data } = await apiCall(`/claims/${claimId}/verify`, 'PUT', { status }, true);
  if (ok) {
    alert(`Claim ${status} successfully!`);
    loadAdminPanel(); // Reload the dashboard
  } else {
    alert(data.msg);
  }
}

// ===== INIT =====
updateNav();
showPage('home');