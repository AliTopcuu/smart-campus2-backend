const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authenticate = require('../middleware/authMiddleware');

router.get('/balance', authenticate, walletController.getBalance);
router.post('/topup', authenticate, walletController.createTopupSession);
router.post('/topup/webhook', authenticate, walletController.handleWebhook); // In real scenario standard webhooks are public but signed. Here authenticated for security in demo.
router.get('/transactions', authenticate, walletController.getTransactions);

// Legacy/Compatibility endpoints if needed (optional)
router.get('/', authenticate, walletController.getBalance);

module.exports = router;
