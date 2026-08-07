// 1. DOM elements
const authPage = document.getElementById('authPage');
const navbar = document.getElementById('navbar');
const dashboardPage = document.getElementById('dashboardPage');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMessage = document.getElementById('authMessage');

const showRegisterLink = document.getElementById('showRegisterLink');
const showLoginLink = document.getElementById('showLoginLink');

const userNameDisplay = document.getElementById('userNameDisplay');
const studentIdDisplay = document.getElementById('studentIdDisplay');

// 2. Helper functions

function showMessage(text, type = 'success') {
  authMessage.textContent = text;
  authMessage.className = type; // 'success' or 'error'
  authMessage.style.display = 'block';
  // auto hide after 4 seconds
  setTimeout(() => {
    authMessage.style.display = 'none';
  }, 4000);
}

// Get stored users from localStorage (or empty array)
function getUsers() {
  const data = localStorage.getItem('users');
  return data ? JSON.parse(data) : [];
}

// Save users array to localStorage
function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

// Get currently logged-in user (from sessionStorage)
function getCurrentUser() {
  const data = sessionStorage.getItem('currentUser');
  return data ? JSON.parse(data) : null;
}

// ============================================================
// 3. Registration
// ============================================================
registerForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const studentId = document.getElementById('regStudentId').value.trim();
  const password = document.getElementById('regPassword').value.trim();

  // --- Validation ---
  if (!name || !email || !studentId || !password) {
    showMessage('All fields are required.', 'error');
    return;
  }
  if (password.length < 6) {
    showMessage('Password must be at least 6 characters.', 'error');
    return;
  }
  // Simple email format check
  if (!email.includes('@') || !email.includes('.')) {
    showMessage('Please enter a valid email address.', 'error');
    return;
  }

  // Check if email already registered
  const users = getUsers();
  if (users.some(user => user.email === email)) {
    showMessage('This email is already registered. Please login.', 'error');
    return;
  }

  // Create new user object (store plain password for demo – in real app, hash it)
  const newUser = {
    name,
    email,
    studentId,
    password, // ⚠️ For demo only; real apps use hashing
  };

  users.push(newUser);
  saveUsers(users);

  // Clear form
  registerForm.reset();
  showMessage('Registration successful! You can now login.', 'success');

  // Switch to login form
  registerForm.style.display = 'none';
  loginForm.style.display = 'flex'; // (it's a flex column by default)
});

// ============================================================
// 4. Login
// ============================================================
loginForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const email = document
    .getElementById('loginEmail')
    .value.trim()
    .toLowerCase();
  const password = document.getElementById('loginPassword').value.trim();

  if (!email || !password) {
    showMessage('Please fill in both fields.', 'error');
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    showMessage('Invalid email or password.', 'error');
    return;
  }

  // Login successful – store session
  sessionStorage.setItem('currentUser', JSON.stringify(user));
  // Update UI
  renderDashboard(user);
  showPage('dashboard');
  // Clear login form
  loginForm.reset();
  showMessage('Welcome back, ' + user.name + '!', 'success');
});

// ============================================================
// 5. Dashboard & Navigation
// ============================================================
function renderDashboard(user) {
  userNameDisplay.textContent = user.name;
  studentIdDisplay.textContent = user.studentId;
}

function showPage(page) {
  // Hide all pages
  document
    .querySelectorAll('[id$="Page"]')
    .forEach(el => (el.style.display = 'none'));
  // Show the requested page
  const target = document.getElementById(page + 'Page');
  if (target) target.style.display = 'block';
}

// Toggle between login / register forms
showRegisterLink.addEventListener('click', function (e) {
  e.preventDefault();
  loginForm.style.display = 'none';
  registerForm.style.display = 'flex';
  authMessage.style.display = 'none';
});

showLoginLink.addEventListener('click', function (e) {
  e.preventDefault();
  registerForm.style.display = 'none';
  loginForm.style.display = 'flex';
  authMessage.style.display = 'none';
});

// Logout
function logout() {
  sessionStorage.removeItem('currentUser');
  // Show auth page, hide navbar and dashboard
  authPage.style.display = 'flex';
  navbar.style.display = 'none';
  dashboardPage.style.display = 'none';
  // Also hide any other pages
  document
    .querySelectorAll('[id$="Page"]')
    .forEach(el => (el.style.display = 'none'));
  // Show login form (default)
  loginForm.style.display = 'flex';
  registerForm.style.display = 'none';
  // Clear messages
  authMessage.style.display = 'none';
}

// ============================================================
// 6. Auto-login check on page load
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
  const user = getCurrentUser();
  if (user) {
    // User already logged in
    authPage.style.display = 'none';
    navbar.style.display = 'flex';
    renderDashboard(user);
    showPage('dashboard');
  } else {
    // Show auth page
    authPage.style.display = 'flex';
    navbar.style.display = 'none';
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
  }
});
