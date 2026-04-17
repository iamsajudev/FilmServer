const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createPaymentIntent,
    getPaymentStatus,
    stripeWebhook
} = require('../controllers/paymentController');

// Public webhook route (no authentication needed)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Protected routes (require authentication)
router.use(protect);
router.post('/create-payment-intent', createPaymentIntent);
router.get('/status/:paymentIntentId', getPaymentStatus);

module.exports = router;