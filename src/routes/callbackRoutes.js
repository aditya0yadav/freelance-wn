const express = require('express');
const router = express.Router();
const CallbackController = require('../controllers/callbackController');

// Webhook callback routes
router.all('/', CallbackController.callback);
router.all('/bitlabs', CallbackController.bitlabs);

module.exports = router;
