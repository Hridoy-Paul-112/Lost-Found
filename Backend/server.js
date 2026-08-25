// server.js - Main Express server
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./db');
const authRoutes = require('./authRoutes');

const app = express();

// ============ CORS Configuration ============
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'https://lost-found-tau-rosy.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// ============ Database Connection ============
connectDB();

// ============ Routes ============
app.use('/api/auth', authRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('✅ Found & Lost API is running on Render!');
});

// ============ Start Server ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
});