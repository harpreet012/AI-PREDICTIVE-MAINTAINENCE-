require('dotenv').config();
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const cors      = require('cors');
const connectDB = require('./config/db');
const { startSimulation } = require('./services/dataSimulator');

// Route imports
const equipmentRoutes  = require('./routes/equipment');
const sensorRoutes     = require('./routes/sensors');
const alertRoutes      = require('./routes/alerts');
const analyticsRoutes  = require('./routes/analytics');
const maintenanceRoutes = require('./routes/maintenance');
const authRoutes       = require('./routes/auth');
const userRoutes       = require('./routes/users');
const importRoutes     = require('./routes/dataImport');
const chatbotRoutes    = require('./routes/chatbot');
const anomalyRoutes    = require('./routes/anomalies');

const app    = express();
const server = http.createServer(app);

// ─── CORS — must be ABOVE all routes ─────────────────────────────────────────
const corsOptions = {
  origin: [
    'https://pm-frontend-qxlo.onrender.com',
    'https://pm-backend-1-ym3w.onrender.com',
    process.env.FRONTEND_URL,
    // Dev origins
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes

const io = new Server(server, {
  cors: {
    origin: corsOptions.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/import',     importRoutes);
app.use('/api/chat',       chatbotRoutes);
app.use('/api/equipment',  equipmentRoutes);
app.use('/api/sensors',    sensorRoutes);
app.use('/api/alerts',     alertRoutes);
app.use('/api/analytics',  analyticsRoutes);
app.use('/api/maintenance',maintenanceRoutes);
app.use('/api/anomalies', anomalyRoutes);

app.get('/api/health', (_, res) => {
  res.json({ status: 'OK', timestamp: new Date(), version: '2.0.0' });
});

// ─── /api/upload — Simple JSON bulk-insert (for direct fetch() calls) ─────────
const mongoose   = require('mongoose');
const axios      = require('axios');
const RawDataSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const RawData    = mongoose.models.RawData || mongoose.model('RawData', RawDataSchema, 'rawUploads');

app.post('/api/upload', async (req, res) => {
  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'No data provided' });
    }

    const saved = await RawData.insertMany(data);
    console.log('Saved records:', saved.length);

    // Call ML service for predictions on each record
    const ML_API = process.env.ML_SERVICE_URL || 'https://pm-ml-service.onrender.com/predict';
    const predictions = [];
    for (const record of data.slice(0, 5)) { // limit to 5 to avoid timeout
      try {
        const mlRes = await axios.post(ML_API, record, { timeout: 3000 });
        predictions.push(mlRes.data);
      } catch { predictions.push({ error: 'ML unavailable' }); }
    }
    console.log('ML Predictions:', predictions);

    res.json({ success: true, count: saved.length, predictions });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Backend Running 🚀');
});

// ─── Serve Static Frontend (Deployment Fix) ──────────────────────────────────
const path = require('path');
const fs = require('fs');

const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath) || process.env.NODE_ENV === 'production') {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// ─── Socket.io ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('subscribe:equipment', (equipmentId) => {
    socket.join(`equipment:${equipmentId}`);
  });
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// ─── Auto-seed admin ─────────────────────────────────────────────────────────
const User = require('./models/User');

async function ensureAdminExists() {
  try {
    const admin = await User.findOne({ email: 'admin@factory.com' });
    if (!admin) {
      await User.create({
        name: 'Admin',
        email: 'admin@factory.com',
        password: 'Admin@1234',
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Auto-created admin user: admin@factory.com / Admin@1234');
    }
    const op = await User.findOne({ email: 'operator@factory.com' });
    if (!op) {
      await User.create({
        name: 'Operator',
        email: 'operator@factory.com',
        password: 'Op@1234',
        role: 'operator',
        isActive: true,
      });
      console.log('✅ Auto-created operator user: operator@factory.com / Op@1234');
    }
  } catch (err) {
    console.error('⚠️  Could not auto-create users:', err.message);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await ensureAdminExists();          // ← guarantees login always works
  server.listen(PORT, () => {
    console.log(`\n🏭 AI Predictive Maintenance Server v2.0`);
    console.log(`   ➜ API:    http://localhost:${PORT}/api`);
    console.log(`   ➜ Socket: ws://localhost:${PORT}`);
    console.log(`   ➜ Mode:   ${process.env.NODE_ENV}`);
    console.log(`   ➜ Login:  admin@factory.com / Admin@1234\n`);
  });
  setTimeout(async () => {
    const interval = await startSimulation(io);
    
    // ─── Graceful Shutdown ────────────────────────────────────────────────────────
    const shutdown = () => {
      console.log('\n🔄 Shutting down server gracefully...');
      if (interval) clearInterval(interval);
      server.close(() => {
        console.log('✅ Server closed.');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 3000).unref();
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
    process.once('SIGUSR2', shutdown); // nodemon restart
  }, 2000);
};

startServer();
