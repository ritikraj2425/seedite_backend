const express = require('express');
const router = express.Router();
const {
    createOrder,
    verifyPayment,
    getKey,
    handleWebhook,
    getPaymentStatus,
    getAllPayments,
    manualEnroll
} = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/authMiddleware');

// Get Razorpay key (public)
router.get('/key', getKey);

// Razorpay webhook (public - verified via signature)
router.post('/webhook', handleWebhook);

// Create order (requires auth)
router.post('/create-order', protect, createOrder);

// Verify payment and enroll (requires auth)
router.post('/verify', protect, verifyPayment);

// Get payment status by order ID (admin only)
router.get('/status/:orderId', protect, admin, getPaymentStatus);

// Get all payments (admin only)
router.get('/all', protect, admin, getAllPayments);

// Manual enrollment (admin only)
router.post('/manual-enroll', protect, admin, manualEnroll);

module.exports = router;
