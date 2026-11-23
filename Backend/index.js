

const axios = require('axios');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://lost-found-tau-rosy.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));


const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['student', 'admin', 'security'], default: 'student' },
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
  secretQuestion: String,
  secretAnswer: String,
  createdBy: String,
  createdByName: String,
  resolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Item = mongoose.model('Item', itemSchema);

const claimSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  claimantEmail: String,
  proofText: String,
  proofImage: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const Claim = mongoose.model('Claim', claimSchema);


const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

async function sendOtpEmail(email, otp) {
  try {
    await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: 'Campus Lost & Found', email: 'hridoy89hp@gmail.com' },
      to: [{ email }],
      subject: 'Your OTP Verification Code',
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
          <h2 style="color:#2c3e50;">Campus Lost & Found</h2>
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
  }
}

// Authentication Middleware (Checks HTTPOnly Cookie OR Bearer Token)
const auth = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'No token, access denied' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ msg: 'Invalid or expired token' });
  }
};

// Role-Based Access Control Middleware
const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ msg: 'Forbidden: Insufficient privileges' });
  }
  next();
};

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
      { id: user._id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTPOnly Cookie for enhanced security
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'Lax'
    });
    
    res.json({ msg: 'Login successful', token, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during login' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ msg: 'Logged out successfully' });
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
// SMART MATCHING ENGINE (Rule-Based + Token Overlap)
// ============================================================
function calculateMatchScore(lostItem, foundItem) {
  let score = 0;
  
  // 1. Category Match (Heavy weight: 40 pts)
  if (lostItem.category === foundItem.category) score += 40;
  
  // 2. Keyword/Token Overlap in Description (Max: 30 pts)
  const tokenize = (text) => text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 2);
  const lostWords = new Set([...tokenize(lostItem.title), ...tokenize(lostItem.description)]);
  const foundWords = new Set([...tokenize(foundItem.title), ...tokenize(foundItem.description)]);
  let commonWords = 0;
  lostWords.forEach(w => { if (foundWords.has(w)) commonWords++; });
  const overlapRatio = commonWords / Math.max(lostWords.size, foundWords.size, 1);
  score += overlapRatio * 30;

  // 3. Location Match (15 pts)
  if (lostItem.location && foundItem.location) {
    const loc1 = lostItem.location.toLowerCase();
    const loc2 = foundItem.location.toLowerCase();
    if (loc1.includes(loc2) || loc2.includes(loc1)) score += 15;
  }

  // 4. Date Difference (Less than 3 days: 15 pts)
  const diffDays = Math.abs(new Date(lostItem.createdAt) - new Date(foundItem.createdAt)) / (1000 * 60 * 60 * 24);
  if (diffDays <= 3) score += 15;

  return Math.min(Math.round(score), 100);
}

app.get('/api/matches', auth, async (req, res) => {
  try {
    const lostItems = await Item.find({ type: 'lost', resolved: false });
    const foundItems = await Item.find({ type: 'found', resolved: false });
    let matches = [];

    lostItems.forEach(lost => {
      foundItems.forEach(found => {
        const score = calculateMatchScore(lost, found);
        if (score > 50) {
          matches.push({ lost, found, score });
        }
      });
    });

    matches.sort((a, b) => b.score - a.score);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ msg: 'Error running matching engine' });
  }
});

// ============================================================
// ITEM ROUTES (Protected)
// ============================================================
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

app.get('/api/items', auth, async (req, res) => {
  try {
    const { search, type, category } = req.query;
    const query = { resolved: false };
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

app.get('/api/items/user/mine', auth, async (req, res) => {
  try {
    const items = await Item.find({ createdBy: req.user.email }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching your items' });
  }
});

app.get('/api/items/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching item' });
  }
});

app.put('/api/items/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.createdBy !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    Object.assign(item, req.body);
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ msg: 'Error updating item' });
  }
});

app.delete('/api/items/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.createdBy !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    await item.deleteOne();
    res.json({ msg: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Error deleting item' });
  }
});

// ============================================================
// CLAIM WORKFLOW (With Secret Question Verification)
// ============================================================
app.post('/api/claims', auth, async (req, res) => {
  try {
    const { itemId, proofText, secretAnswer, proofImage } = req.body;
    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ msg: 'Item not found' });

    if (item.secretAnswer && item.secretAnswer.toLowerCase() !== secretAnswer.toLowerCase()) {
      return res.status(400).json({ msg: 'Incorrect secret answer' });
    }

    const claim = await Claim.create({
      itemId,
      claimantEmail: req.user.email,
      proofText,
      proofImage,
      status: 'pending'
    });
    res.json({ msg: 'Claim submitted for verification', claim });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error submitting claim' });
  }
});

app.get('/api/claims', auth, requireRole(['admin', 'security']), async (req, res) => {
  try {
    const claims = await Claim.find().populate('itemId');
    res.json(claims);
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching claims' });
  }
});

app.put('/api/claims/:id/verify', auth, requireRole(['admin', 'security']), async (req, res) => {
  try {
    const { status } = req.body;
    const claim = await Claim.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!claim) return res.status(404).json({ msg: 'Claim not found' });

    if (status === 'approved') {
      await Item.findByIdAndUpdate(claim.itemId, { resolved: true });
    }
    res.json({ msg: `Claim ${status}`, claim });
  } catch (err) {
    res.status(500).json({ msg: 'Error verifying claim' });
  }
});

// ============================================================
// ADMIN ANALYTICS
// ============================================================
app.get('/api/admin/analytics', auth, requireRole(['admin']), async (req, res) => {
  try {
    const totalItems = await Item.countDocuments();
    const lostItems = await Item.countDocuments({ type: 'lost' });
    const foundItems = await Item.countDocuments({ type: 'found' });
    const resolvedItems = await Item.countDocuments({ resolved: true });
    const totalClaims = await Claim.countDocuments();
    
    res.json({ totalItems, lostItems, foundItems, resolvedItems, totalClaims });
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching analytics' });
  }
});


app.get('/', (req, res) => res.send('✅ Lost & Found API is running'));

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Allowed origins:`, allowedOrigins);
  });
}

// Export app for Jest/Supertest Testing (Sir's Requirement #4)
module.exports = app;