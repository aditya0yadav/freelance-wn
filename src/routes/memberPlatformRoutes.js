const express = require('express');
const router = express.Router();
const PlatformController = require('../controllers/platformController');
const { verifyToken } = require('../middleware/apiAuth');

// Member platform routes
router.get('/list', verifyToken, PlatformController.list);
router.get('/offers', verifyToken, PlatformController.offers);
router.get('/featured', verifyToken, PlatformController.featured);
router.get('/quota', verifyToken, PlatformController.quota);
router.get('/copy', verifyToken, PlatformController.copy);
router.get('/wall_copy', verifyToken, PlatformController.wall_copy);
router.get('/profile', verifyToken, PlatformController.profile);
router.get('/conversions', verifyToken, PlatformController.conversions);

// Link redirection endpoints (token validated inside controller via 'key' query param)
router.get('/link', PlatformController.link);
router.get('/wall_link', PlatformController.wall_link);

// Auth & seed routes (no JWT auth header required)
router.post('/login', PlatformController.login);
router.post('/seed-demo', PlatformController.seedDemo);

// Statistics, Rankings and Team routes (JWT verifyToken required)
router.get('/statistics', verifyToken, PlatformController.statistics);
router.get('/team-statistics', verifyToken, PlatformController.teamStatistics);
router.get('/ranking', verifyToken, PlatformController.ranking);
router.get('/team-rewards', verifyToken, PlatformController.teamRewards);
router.post('/pull', verifyToken, PlatformController.manualPull);

module.exports = router;
