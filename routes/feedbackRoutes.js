const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/feedback
// @desc    Submit feedback for a course
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { courseId, text } = req.body;

        if (!courseId || !text) {
            return res.status(400).json({ message: 'Course ID and text are required' });
        }

        const feedback = new Feedback({
            user: req.user._id,
            course: courseId,
            text
        });

        await feedback.save();

        res.status(201).json({ message: 'Feedback submitted successfully', feedback });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
