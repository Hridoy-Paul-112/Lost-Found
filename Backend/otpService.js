// otpService.js - OTP generation and storage
const crypto = require('crypto');

// In-memory OTP storage (for demo purposes)
// In production, use Redis or a database table
const otpStore = new Map();

// Generate a 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Store OTP with email and expiry (5 minutes)
const storeOTP = (email, otp) => {
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(email, { otp, expiry });
  // Auto-cleanup after expiry
  setTimeout(() => {
    if (otpStore.has(email)) {
      const stored = otpStore.get(email);
      if (stored.expiry < Date.now()) {
        otpStore.delete(email);
      }
    }
  }, 5 * 60 * 1000 + 1000);
};

// Verify OTP
const verifyOTP = (email, otp) => {
  const stored = otpStore.get(email);
  if (!stored) {
    return { valid: false, message: 'No OTP found for this email' };
  }
  if (stored.expiry < Date.now()) {
    otpStore.delete(email);
    return { valid: false, message: 'OTP has expired' };
  }
  if (stored.otp !== otp) {
    return { valid: false, message: 'Invalid OTP' };
  }
  // OTP is valid, delete it
  otpStore.delete(email);
  return { valid: true, message: 'OTP verified successfully' };
};

// Check if OTP exists for email
const hasOTP = (email) => {
  const stored = otpStore.get(email);
  if (!stored) return false;
  if (stored.expiry < Date.now()) {
    otpStore.delete(email);
    return false;
  }
  return true;
};

// Delete OTP
const deleteOTP = (email) => {
  otpStore.delete(email);
};

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
  hasOTP,
  deleteOTP
};