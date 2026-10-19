require('dotenv').config();
const express = require('express');
const cors = require('cors');
const memberPlatformRoutes = require('./routes/memberPlatformRoutes');
const adminPlatformRoutes = require('./routes/adminPlatformRoutes');
const callbackRoutes = require('./routes/callbackRoutes');

const app = express();
const PORT = process.env.PORT || 8000;

// Apply standard middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Block malicious vulnerability scanner probes instantly
app.use((req, res, next) => {
  const p = (req.path || '').toLowerCase();
  if (
    p.includes('.env') ||
    p.includes('.php') ||
    p.includes('.yaml') ||
    p.includes('.yml') ||
    p.includes('/wp-') ||
    p.includes('/.git') ||
    p.includes('/@fs') ||
    p.includes('/cgi-bin') ||
    p.includes('/profiler') ||
    p.includes('/owa/')
  ) {
    return res.status(404).send('Not Found');
  }
  next();
});

// Health check & root endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'SurveyStream Backend API is active', status: 'online' });
});

// Serve optional static files (cookiepolicy, styles, logo, index views if needed)
app.use(express.static('public'));

// Routes
app.use('/api/member/platform', memberPlatformRoutes);
app.use('/api/admin/platform', adminPlatformRoutes);
app.use('/api/callback', callbackRoutes);
app.use('/api/index/callback', callbackRoutes); // Legacy PHP callback compatibility

// Catch-all 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// Express error handler middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Express Request Error:`, err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Boot cron pulling worker
require('./jobs/cronPull');

// Boot 24/7 Email Survey Ingestion Daemon
require('./jobs/emailSurveyJob');

// Prevent server shutdown on transient errors or background task exceptions
process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] [UNCAUGHT EXCEPTION CAUGHT - SERVER PROTECTED]`, err);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[${new Date().toISOString()}] [UNHANDLED REJECTION CAUGHT - SERVER PROTECTED]`, reason);
});

// Start Express server
const server = app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] SurveyStream Express Server running on port ${PORT}`);
});

module.exports = { app, server };
