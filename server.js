const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

/* =========================
   CORS Middleware (FIRST - before everything)
========================= */
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// IMPORT ROUTES
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const paravetRoutes = require('./routes/paravetRoutes');
const parentRoutes = require('./routes/parentRoutes');
const doorstepRoutes = require('./routes/doorstepRoutes');

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
app.use('/api/doorstep', doorstepRoutes);

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
