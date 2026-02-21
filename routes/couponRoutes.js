const express = require('express');
const router = express.Router();
const {
    createCoupon,
    getAllCoupons,
    getCouponById,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    getMyCoupons,
    addPayment
} = require('../controllers/couponController');
const { protect } = require('../middleware/authMiddleware');

// Admin middleware
const adminProtect = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

// Client routes (requires login)
router.post('/validate', protect, validateCoupon);
router.get('/my-coupons', protect, getMyCoupons);

// Admin routes - full CRUD
router.post('/', protect, adminProtect, createCoupon);
router.get('/', protect, adminProtect, getAllCoupons);
router.get('/:id', protect, adminProtect, getCouponById);
router.put('/:id', protect, adminProtect, updateCoupon);
router.delete('/:id', protect, adminProtect, deleteCoupon);
router.post('/:id/payment', protect, adminProtect, addPayment);

module.exports = router;
