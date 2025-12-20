const express = require('express');
const router = express.Router();
const { getUserProfile, getMockTestResult, getAllUsers } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Admin middleware
const adminProtect = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

router.get('/profile', protect, getUserProfile);
router.get('/me/mock-test-results/:testId', protect, getMockTestResult);

module.exports = router;
