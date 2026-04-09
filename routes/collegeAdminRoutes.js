const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createCollege,
    getAllColleges,
    getCollegeById,
    updateCollege,
    deleteCollege,
    getCollegeAnalytics
} = require('../controllers/collegeController');

// Admin middleware (same pattern as adminRoutes.js)
const adminProtect = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

router.post('/', protect, adminProtect, createCollege);
router.get('/', protect, adminProtect, getAllColleges);
router.get('/:id', protect, adminProtect, getCollegeById);
router.patch('/:id', protect, adminProtect, updateCollege);
router.delete('/:id', protect, adminProtect, deleteCollege);
router.get('/:id/analytics', protect, adminProtect, getCollegeAnalytics);

module.exports = router;
