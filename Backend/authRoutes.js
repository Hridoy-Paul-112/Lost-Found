// authRoutes.js - All authentication routes
const express = require('express');
const {
  register,
  verifyOTPAndRegister,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  getMe
} = require('./authController');
const { protect } = require('./auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/verify-otp', verifyOTPAndRegister);
router.post('/resend-otp', resendOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);

module.exports = router;