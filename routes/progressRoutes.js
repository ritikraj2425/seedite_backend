const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { completeLecture, getCourseProgress, getAllProgress } = require('../controllers/progressController');

// Get all progress for the logged-in user (dashboard view)
router.get('/', protect, getAllProgress);

// Get progress for a specific course
router.get('/:courseId', protect, getCourseProgress);

// Mark a lecture as complete (single ping from BunnyPlayer)
router.post('/complete-lecture', protect, completeLecture);

module.exports = router;
