const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const pool = require('./config/database');
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const userRoutes = require('./routes/users');
const badgeRoutes = require('./routes/badges');
const parkRoutes = require('./routes/parks');
const notificationRoutes = require('./routes/notifications');
const challengeRoutes = require('./routes/challenges');
const trickRoutes = require('./routes/tricks');
const dashboardRoutes = require('./routes/dashboard');
const passesRoutes = require('./routes/passes');
const specializationsRoutes = require('./routes/specializations');
const skillTreeRoutes = require('./routes/skillTree');
const skillTreeAdminRoutes = require('./routes/skillTreeAdmin');
const componentAdminRoutes = require('./routes/componentAdmin');
const skillComponentsRoutes = require('./routes/skillComponents');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);

const allowedOriginsFromEnv = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const additionalDevOrigins = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
];

const allowedOriginsSet = new Set(allowedOriginsFromEnv);

if (process.env.NODE_ENV !== 'production') {
  additionalDevOrigins.forEach((origin) => allowedOriginsSet.add(origin));
  if (process.env.DEV_TUNNEL_ORIGIN) {
    allowedOriginsSet.add(process.env.DEV_TUNNEL_ORIGIN.trim());
  }
}

const allowedOrigins = Array.from(allowedOriginsSet);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
};

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors(corsOptions));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads (temporarily)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/parks', parkRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/tricks', trickRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/passes', passesRoutes);
app.use('/api/specializations', specializationsRoutes);
app.use('/api/skill-tree', skillTreeRoutes);
app.use('/api/skill-tree-admin', skillTreeAdminRoutes);
app.use('/api/admin', componentAdminRoutes);
app.use('/api/skill-components', skillComponentsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Ŷ\'UP Backend API'
  });
});

// Database connectivity check
app.get('/api/db-check', async (req, res) => {
  const startedAt = Date.now();
  try {
    const result = await pool.query('SELECT NOW() AS current_time');
    const latency = Date.now() - startedAt;

    res.json({
      status: 'OK',
      latencyMs: latency,
      timestamp: result.rows[0].current_time
    });
  } catch (error) {
    console.error('Erro no db-check:', error);
    res.status(503).json({
      status: 'ERROR',
      message: 'Não foi possível conectar ao banco de dados'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo deu errado!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor',
    details: err?.stack || err?.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Ŷ'UP Backend rodando na porta ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Increase default HTTP timeouts so large uploads have time to finish.
const FIVE_MINUTES_MS = 5 * 60 * 1000;
if (server.keepAliveTimeout < FIVE_MINUTES_MS) {
  server.keepAliveTimeout = FIVE_MINUTES_MS;
}
if (server.headersTimeout < FIVE_MINUTES_MS + 1000) {
  server.headersTimeout = FIVE_MINUTES_MS + 1000; // headers timeout must be > keepAliveTimeout
}
if (server.requestTimeout < FIVE_MINUTES_MS) {
  server.requestTimeout = FIVE_MINUTES_MS;
}
