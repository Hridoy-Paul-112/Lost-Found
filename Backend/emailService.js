// emailService.js - Send emails using Brevo (Sendinblue) API
const nodemailer = require('nodemailer');

// Create transporter using Brevo SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
      user: 'hridoy89hp@gmail.com', // Your Brevo login email
      pass: process.env.BREVO_API_KEY // Brevo SMTP key (not the API key)
    }
  });
};

// Send OTP email
const sendOTPEmail = async (email, name, otp, type = 'verification') => {
  try {
    const transporter = createTransporter();
    
    let subject = '';
    let html = '';
    
    if (type === 'verification') {
      subject = '🔐 Verify Your Email - Found & Lost';
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { font-size: 36px; font-weight: bold; color: #1e3a8a; text-align: center; padding: 20px; background: white; border-radius: 10px; border: 2px dashed #1e3a8a; margin: 20px 0; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔍 Found & Lost</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Thank you for registering with <strong>Found & Lost</strong> - your university lost and found platform.</p>
            <p>Please use the following OTP to verify your email address:</p>
            <div class="otp-code">${otp}</div>
            <p>This OTP is valid for <strong>5 minutes</strong>.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Found & Lost. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'reset') {
      subject = '🔑 Reset Your Password - Found & Lost';
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { font-size: 36px; font-weight: bold; color: #dc3545; text-align: center; padding: 20px; background: white; border-radius: 10px; border: 2px dashed #dc3545; margin: 20px 0; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔑 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>We received a request to reset your password for <strong>Found & Lost</strong>.</p>
            <p>Please use the following OTP to reset your password:</p>
            <div class="otp-code">${otp}</div>
            <p>This OTP is valid for <strong>5 minutes</strong>.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Found & Lost. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;
    }

    const mailOptions = {
      from: 'Found & Lost <noreply@foundandlost.com>',
      to: email,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOTPEmail };