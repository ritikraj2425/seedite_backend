const express = require('express');
const router = express.Router();
const {
    getAdminStats,
    createCourse,
    updateCourse,
    deleteCourse,
    createLecture,
    updateLecture,
    deleteLecture,
    createMockTest,
    updateMockTest,
    deleteMockTest
} = require('../controllers/adminController');
const { getAllUsers } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Admin middleware
const adminProtect = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

// Dashboard
router.get('/stats', protect, adminProtect, getAdminStats);

// Users
router.get('/users', protect, adminProtect, getAllUsers);

// Course routes
router.post('/courses', protect, adminProtect, createCourse);
router.put('/courses/:id', protect, adminProtect, updateCourse);
router.delete('/courses/:id', protect, adminProtect, deleteCourse);

// Lecture routes
router.post('/lectures', protect, adminProtect, createLecture);
router.put('/lectures/:id', protect, adminProtect, updateLecture);
router.delete('/lectures/:id', protect, adminProtect, deleteLecture);

// Mock Test routes
router.post('/mock-tests', protect, adminProtect, createMockTest);
router.put('/mock-tests/:id', protect, adminProtect, updateMockTest);
router.delete('/mock-tests/:id', protect, adminProtect, deleteMockTest);

module.exports = router;
