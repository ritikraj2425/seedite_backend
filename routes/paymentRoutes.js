const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getKey } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Get Razorpay key (public)
router.get('/key', getKey);

// Create order (requires auth)
router.post('/create-order', protect, createOrder);

// Verify payment and enroll (requires auth)
router.post('/verify', protect, verifyPayment);

module.exports = router;
