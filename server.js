const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
require('dotenv').config();

// IMPORT ROUTES
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const paravetRoutes = require('./routes/paravetRoutes');
const parentRoutes = require('./routes/parentRoutes');

const app = express();

/* =========================
   CORS Middleware (Fixed)
========================= */

const allowedOrigins = [
  'http://localhost:3000',   // Web frontend
  'exp://127.0.0.1:19000',   // React Native Expo
  // Agar mobile device se LAN testing: add IP
  'http://192.168.1.100:3000'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*'); // Postman / undefined origin
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, ngrok-skip-browser-warning'
  );
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );

  // Preflight request
  if (req.method === 'OPTIONS') return res.sendStatus(204);

  next();
});

/* =========================
   Helmet Security
========================= */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   Logger (Debug)
========================= */
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url} - Origin: ${req.headers.origin} - Auth: ${req.header('Authorization') ? 'Yes' : 'No'}`);
  next();
});

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

/* =========================
   Start Server
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server live at http://localhost:${PORT}`);
});
