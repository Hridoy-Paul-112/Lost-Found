// ============================================================
// index.js - Complete Backend in a Single File
// Contains: Config, DB, Models, OTP, Email, Middleware, Routes
// ============================================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// 1. CORS Configuration
// ============================================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'https://lost-found-tau-rosy.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// ============================================================
// 2. MongoDB Connection
// ============================================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// ============================================================
// 3. User Model
// ============================================================
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  university: { type: String, required: true },
  department: String,
  phone: String,
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

// ============================================================
// 4. OTP Service (In-Memory Storage)
// ============================================================
const otpStore = new Map();

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

const storeOTP = (email, otp) => {
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(email, { otp, expiry });
  setTimeout(() => {
    if (otpStore.has(email)) {
      const stored = otpStore.get(email);
      if (stored.expiry < Date.now()) otpStore.delete(email);
    }
  }, 5 * 60 * 1000 + 1000);
};

const verifyOTP = (email, otp) => {
  const stored = otpStore.get(email);
  if (!stored) return { valid: false, message: 'No OTP found for this email' };
  if (stored.expiry < Date.now()) {
    otpStore.delete(email);
    return { valid: false, message: 'OTP has expired' };
  }
  if (stored.otp !== otp) {
    return { valid: false, message: 'Invalid OTP' };
  }
  otpStore.delete(email);
  return { valid: true, message: 'OTP verified successfully' };
};

const hasOTP = (email) => {
  const stored = otpStore.get(email);
  if (!stored) return false;
  if (stored.expiry < Date.now()) {
    otpStore.delete(email);
    return false;
  }
  return true;
};

const deleteOTP = (email) => otpStore.delete(email);

// ============================================================
// 5. Email Service (Brevo/Sendinblue)
// ============================================================
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
      user: 'hridoy89hp@gmail.com',
      pass: process.env.BREVO_API_KEY
    }
  });
};

const sendOTPEmail = async (email, name, otp, type = 'verification') => {
  try {
    const transporter = createTransporter();
    let subject = '', html = '';

    if (type === 'verification') {
      subject = '🔐 Verify Your Email - Found & Lost';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #1e3a8a;">🔍 Found & Lost</h2>
          <h3>Hello ${name}!</h3>
          <p>Thank you for registering. Please use the following OTP to verify your email:</p>
          <div style="font-size: 32px; font-weight: bold; color: #1e3a8a; padding: 15px; background: #f0f4ff; border-radius: 8px; text-align: center; letter-spacing: 5px;">${otp}</div>
          <p style="color: #555;">This OTP is valid for <strong>5 minutes</strong>.</p>
          <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `;
    } else if (type === 'reset') {
      subject = '🔑 Reset Your Password - Found & Lost';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #dc3545;">🔑 Password Reset</h2>
          <h3>Hello ${name}!</h3>
          <p>We received a request to reset your password. Please use the following OTP:</p>
          <div style="font-size: 32px; font-weight: bold; color: #dc3545; padding: 15px; background: #f8d7da; border-radius: 8px; text-align: center; letter-spacing: 5px;">${otp}</div>
          <p style="color: #555;">This OTP is valid for <strong>5 minutes</strong>.</p>
          <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `;
    }

    const info = await transporter.sendMail({
      from: 'Found & Lost <noreply@foundandlost.com>',
      to: email,
      subject: subject,
      html: html
    });
    console.log(`✅ Email sent to ${email}: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================================
// 6. JWT Middleware
// ============================================================
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

// ============================================================
// 7. Temporary User Store (for registration flow)
// ============================================================
const tempUserStore = new Map();

// ============================================================
// 8. API Routes
// ============================================================

// --- 8.1: Register (Step 1 - Send OTP) ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, university, department, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'This email is already registered' });

    if (hasOTP(email)) {
      return res.status(429).json({ message: 'OTP already sent. Please wait 5 minutes.' });
    }

    const otp = generateOTP();
    storeOTP(email, otp);

    const emailResult = await sendOTPEmail(email, name, otp, 'verification');
    if (!emailResult.success) {
      deleteOTP(email);
      return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }

    tempUserStore.set(email, { name, email, password, university, department, phone });

    res.status(200).json({ message: 'OTP sent to your email. Please verify.', email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- 8.2: Verify OTP (Step 2 - Complete Registration) ---
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const verification = verifyOTP(email, otp);
    if (!verification.valid) return res.status(400).json({ message: verification.message });

    const userData = tempUserStore.get(email);
    if (!userData) {
      return res.status(400).json({ message: 'Registration data expired. Please register again.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      tempUserStore.delete(email);
      return res.status(400).json({ message: 'This email is already registered' });
    }

    const user = await User.create({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      university: userData.university,
      department: userData.department,
      phone: userData.phone,
      isVerified: true
    });

    tempUserStore.delete(email);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      university: user.university,
      token: generateToken(user._id),
      message: 'Registration successful!'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- 8.3: Resend OTP ---
app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'This email is already registered' });

    if (hasOTP(email)) deleteOTP(email);

    const userData = tempUserStore.get(email);
    if (!userData) {
      return res.status(400).json({ message: 'Registration data not found. Please register again.' });
    }

    const otp = generateOTP();
    storeOTP(email, otp);

    const emailResult = await sendOTPEmail(email, userData.name, otp, 'verification');
    if (!emailResult.success) {
      deleteOTP(email);
      return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }

    res.status(200).json({ message: 'OTP resent successfully. Please check your email.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- 8.4: Login ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      university: user.university,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- 8.5: Forgot Password (Send OTP) ---
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });

    if (hasOTP(email)) {
      return res.status(429).json({ message: 'OTP already sent. Please wait 5 minutes.' });
    }

    const otp = generateOTP();
    storeOTP(email, otp);

    const emailResult = await sendOTPEmail(email, user.name, otp, 'reset');
    if (!emailResult.success) {
      deleteOTP(email);
      return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }

    res.status(200).json({ message: 'OTP sent to your email. Please check.', email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- 8.6: Reset Password (Verify OTP + Update) ---
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const verification = verifyOTP(email, otp);
    if (!verification.valid) return res.status(400).json({ message: verification.message });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. Please login with your new password.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- 8.7: Get Current User (Protected) ---
app.get('/api/auth/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- 8.8: Health Check ---
app.get('/', (req, res) => {
  res.send('✅ Found & Lost API is running on Render!');
});

// ============================================================
// 9. Start Server
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
});