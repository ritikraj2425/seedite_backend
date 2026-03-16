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
    deleteMockTest,
    createSection,
    updateSection,
    deleteSection,
    getAllFeedback,
    grantFreeAccess,
    revokeFreeAccess,
    getFreeAccessList,
    generateAIQuery,
    executeAIQuery,
    getIQTests,
    createIQTest,
    updateIQTest,
    deleteIQTest
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

// Feedback
router.get('/feedback', protect, adminProtect, getAllFeedback);

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

// Section routes
router.post('/courses/:id/sections', protect, adminProtect, createSection);
router.put('/courses/:id/sections/:sectionId', protect, adminProtect, updateSection);
router.delete('/courses/:id/sections/:sectionId', protect, adminProtect, deleteSection);

// IQ Test routes
router.get('/iq-tests', protect, adminProtect, getIQTests);
router.post('/iq-tests', protect, adminProtect, createIQTest);
router.put('/iq-tests/:id', protect, adminProtect, updateIQTest);
router.delete('/iq-tests/:id', protect, adminProtect, deleteIQTest);

// Free Access routes
router.get('/free-access', protect, adminProtect, getFreeAccessList);
router.post('/free-access', protect, adminProtect, grantFreeAccess);
router.delete('/free-access/:userId/:courseId', protect, adminProtect, revokeFreeAccess);

// AI Database Query routes
router.post('/ai-query/generate', protect, adminProtect, generateAIQuery);
router.post('/ai-query/execute', protect, adminProtect, executeAIQuery);

module.exports = router;
