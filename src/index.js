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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve optional static files (cookiepolicy, styles, logo, index views if needed)
app.use(express.static('public'));

// Routes
app.use('/api/member/platform', memberPlatformRoutes);
app.use('/api/admin/platform', adminPlatformRoutes);
app.use('/api/callback', callbackRoutes);

// Boot cron pulling worker
require('./jobs/cronPull');

// Start Express server
const server = app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] SurveyStream Express Server running on port ${PORT}`);
});

module.exports = { app, server };
