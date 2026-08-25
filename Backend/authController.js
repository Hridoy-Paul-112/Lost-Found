// authController.js - Complete authentication with OTP
const User = require('./User');
const jwt = require('jsonwebtoken');
const { generateOTP, storeOTP, verifyOTP, hasOTP, deleteOTP } = require('./otpService');
const { sendOTPEmail } = require('./emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ==================== REGISTER (Step 1: Send OTP) ====================
const register = async (req, res) => {
  try {
    const { name, email, password, university, department, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'This email is already registered' });
    }

    // Check if OTP already exists for this email (prevent spam)
    if (hasOTP(email)) {
      return res.status(429).json({ message: 'OTP already sent. Please check your email or wait 5 minutes.' });
    }

    // Generate and store OTP
    const otp = generateOTP();
    storeOTP(email, otp);

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, name, otp, 'verification');
    if (!emailResult.success) {
      deleteOTP(email);
      return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }

    // Store user data temporarily (will be used when OTP is verified)
    // We'll store in a temp store or use the OTP store with additional data
    // For simplicity, we'll store user data in a temporary map
    const tempUserStore = global.tempUserStore || new Map();
    tempUserStore.set(email, { name, email, password, university, department, phone });
    global.tempUserStore = tempUserStore;

    res.status(200).json({
      message: 'OTP sent to your email. Please verify.',
      email: email
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== VERIFY OTP (Step 2: Complete Registration) ====================
const verifyOTPAndRegister = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Verify OTP
    const verification = verifyOTP(email, otp);
    if (!verification.valid) {
      return res.status(400).json({ message: verification.message });
    }

    // Get temporary user data
    const tempUserStore = global.tempUserStore || new Map();
    const userData = tempUserStore.get(email);
    if (!userData) {
      return res.status(400).json({ message: 'Registration data expired. Please register again.' });
    }

    // Check if user was already created (race condition)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      tempUserStore.delete(email);
      return res.status(400).json({ message: 'This email is already registered' });
    }

    // Create user
    const user = await User.create({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      university: userData.university,
      department: userData.department,
      phone: userData.phone,
      isVerified: true
    });

    // Clean up temp data
    tempUserStore.delete(email);

    // Generate token and return
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
};

// ==================== RESEND OTP ====================
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'This email is already registered' });
    }

    // Check if OTP exists and is still valid
    if (hasOTP(email)) {
      // Delete old OTP
      deleteOTP(email);
    }

    // Get user data from temp store
    const tempUserStore = global.tempUserStore || new Map();
    const userData = tempUserStore.get(email);
    if (!userData) {
      return res.status(400).json({ message: 'Registration data not found. Please register again.' });
    }

    // Generate new OTP
    const otp = generateOTP();
    storeOTP(email, otp);

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, userData.name, otp, 'verification');
    if (!emailResult.success) {
      deleteOTP(email);
      return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }

    res.status(200).json({ message: 'OTP resent successfully. Please check your email.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== LOGIN ====================
const login = async (req, res) => {
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
};

// ==================== FORGOT PASSWORD (Send OTP) ====================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Check if OTP already exists
    if (hasOTP(email)) {
      return res.status(429).json({ message: 'OTP already sent. Please check your email or wait 5 minutes.' });
    }

    // Generate and store OTP
    const otp = generateOTP();
    storeOTP(email, otp);

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, user.name, otp, 'reset');
    if (!emailResult.success) {
      deleteOTP(email);
      return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }

    res.status(200).json({
      message: 'OTP sent to your email. Please check and reset your password.',
      email: email
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== RESET PASSWORD (Verify OTP + Update) ====================
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Verify OTP
    const verification = verifyOTP(email, otp);
    if (!verification.valid) {
      return res.status(400).json({ message: verification.message });
    }

    // Find user and update password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. Please login with your new password.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== GET CURRENT USER ====================
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  verifyOTPAndRegister,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  getMe
};