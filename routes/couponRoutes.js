const express = require('express');
const router = express.Router();
const {
    createCoupon,
    getAllCoupons,
    getCouponById,
    updateCoupon,
    deleteCoupon,
    validateCoupon
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

// Client route - validate coupon (requires login)
router.post('/validate', protect, validateCoupon);

// Admin routes - full CRUD
router.post('/', protect, adminProtect, createCoupon);
router.get('/', protect, adminProtect, getAllCoupons);
router.get('/:id', protect, adminProtect, getCouponById);
router.put('/:id', protect, adminProtect, updateCoupon);
router.delete('/:id', protect, adminProtect, deleteCoupon);

module.exports = router;
