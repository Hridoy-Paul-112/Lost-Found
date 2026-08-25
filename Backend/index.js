// ============================================================
// Backend/index.js – Complete API
// Posts are protected – only logged-in users can see them
// ============================================================

// ✅ Single axios import – no duplicates
const axios = require('axios');

// Rest of dependencies
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// ============================================================
// CORS CONFIGURATION – allows Vercel frontend
// ============================================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://lost-found-tau-rosy.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ============================================================
// DATABASE CONNECTION
// ============================================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

// ============================================================
// SCHEMAS
// ============================================================
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  verified: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  expiresAt: Date
});
const Otp = mongoose.model('Otp', otpSchema);

const itemSchema = new mongoose.Schema({
  title: String,
  description: String,
  type: { type: String, enum: ['lost', 'found'] },
  category: String,
  location: String,
  contact: String,
  image: String,
  createdBy: String,
  createdByName: String,
  resolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Item = mongoose.model('Item', itemSchema);

// ============================================================
// HELPERS
// ============================================================
const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

async function sendOtpEmail(email, otp) {
  try {
    await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: 'Varsity Lost & Found', email: 'hridoy89hp@gmail.com' },
      to: [{ email }],
      subject: 'Your OTP Verification Code',
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
          <h2 style="color:#2c3e50;">Varsity Lost & Found</h2>
          <p>Your OTP verification code is:</p>
          <h1 style="letter-spacing:5px;color:#e67e22;">${otp}</h1>
          <p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>`
    }, {
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' }
    });
    console.log(`✅ OTP email sent to ${email}`);
  } catch (err) {
    console.error('❌ Email send error:', err.response?.data || err.message);
    throw err;
  }
}

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'No token, access denied' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ msg: 'Invalid or expired token' });
  }
}

// ============================================================
// AUTH ROUTES
// ============================================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ msg: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ msg: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ email });
    if (existing && existing.verified) return res.status(400).json({ msg: 'Email already registered. Please login.' });

    const hashed = await bcrypt.hash(password, 10);
    if (existing) {
      existing.name = name;
      existing.password = hashed;
      await existing.save();
    } else {
      await User.create({ name, email, password: hashed });
    }

    const otp = genOtp();
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    await sendOtpEmail(email, otp);

    res.json({ msg: 'OTP sent to your email. Please verify.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during registration' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await Otp.findOne({ email, otp });
    if (!record) return res.status(400).json({ msg: 'Invalid OTP' });
    if (record.expiresAt < new Date()) return res.status(400).json({ msg: 'OTP expired. Please resend.' });

    await User.updateOne({ email }, { verified: true });
    await Otp.deleteMany({ email });

    res.json({ msg: 'Account verified successfully! You can login now.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during verification' });
  }
});

app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'User not found' });
    if (user.verified) return res.status(400).json({ msg: 'Account already verified' });

    const otp = genOtp();
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    await sendOtpEmail(email, otp);

    res.json({ msg: 'OTP resent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error resending OTP' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'User not found' });
    if (!user.verified) return res.status(400).json({ msg: 'Please verify your email first' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: 'Incorrect password' });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ msg: 'Login successful', token, name: user.name, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during login' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'No account with this email' });

    const otp = genOtp();
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    await sendOtpEmail(email, otp);

    res.json({ msg: 'OTP sent for password reset' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const record = await Otp.findOne({ email, otp });
    if (!record) return res.status(400).json({ msg: 'Invalid OTP' });
    if (record.expiresAt < new Date()) return res.status(400).json({ msg: 'OTP expired' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ email }, { password: hashed });
    await Otp.deleteMany({ email });

    res.json({ msg: 'Password reset successful. Please login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ============================================================
// ITEM ROUTES – PROTECTED (require login)
// ============================================================

// ---- Create item (protected) ----
app.post('/api/items', auth, async (req, res) => {
  try {
    const item = await Item.create({
      ...req.body,
      createdBy: req.user.email,
      createdByName: req.user.name
    });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error posting item' });
  }
});

// ---- Get all items (protected) ----
app.get('/api/items', auth, async (req, res) => {
  try {
    const { search, type, category } = req.query;
    const query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    const items = await Item.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error fetching items' });
  }
});

// ---- Get single item (protected) ----
app.get('/api/items/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching item' });
  }
});

// ---- Get my items (protected) ----
app.get('/api/items/user/mine', auth, async (req, res) => {
  try {
    const items = await Item.find({ createdBy: req.user.email }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching your items' });
  }
});

// ---- Update item (protected) ----
app.put('/api/items/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.createdBy !== req.user.email) return res.status(403).json({ msg: 'Not authorized' });

    Object.assign(item, req.body);
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ msg: 'Error updating item' });
  }
});

// ---- Delete item (protected) ----
app.delete('/api/items/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.createdBy !== req.user.email) return res.status(403).json({ msg: 'Not authorized' });

    await item.deleteOne();
    res.json({ msg: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Error deleting item' });
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/', (req, res) => res.send('✅ Lost & Found API is running'));

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Allowed origins:`, allowedOrigins);
});