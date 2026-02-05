const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

/* =========================
   CORS Middleware (FIRST - before everything)
========================= */
app.use((req, res, next) => {
  // Set CORS headers for all requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight for:', req.url);
    return res.status(200).end();
  }
  
  console.log(`${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// IMPORT ROUTES
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const paravetRoutes = require('./routes/paravetRoutes');
const parentRoutes = require('./routes/parentRoutes');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   MongoDB Connection
========================= */
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI missing in .env');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((error) => {
    console.error('❌ MongoDB connection failed', error.message);
    process.exit(1);
  });

/* =========================
   API Routes
========================= */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/paravet', paravetRoutes);
app.use('/api/parents', parentRoutes);

/* =========================
   Health Check
========================= */
app.get('/', (req, res) => {
  res.send('🚀 Server is running & DB connected');
});

// Test endpoint for CORS
app.get('/api/test', (req, res) => {
  res.json({ message: 'CORS is working!', timestamp: new Date().toISOString() });
});

app.post('/api/test', (req, res) => {
  res.json({ message: 'POST request successful!', body: req.body });
});

/* =========================
   Start Server
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server live at http://localhost:${PORT}`);
});
