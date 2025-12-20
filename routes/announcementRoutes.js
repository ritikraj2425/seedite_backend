const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const User = require('../models/User'); // Need User model to check enrollments if needed, or rely on request user
const { protect, admin } = require('../middleware/authMiddleware');

// @route   GET /api/announcements/my-announcements
// @desc    Get announcements for enrolled courses
// @access  Private
router.get('/my-announcements', protect, async (req, res) => {
    try {
        // 1. Get user's enrolled courses from the User document
        // req.user is populated by 'protect' middleware, but let's re-fetch to be safe on enrollments
        // or assumes req.user.enrolledCourses is available/populated.
        // The 'protect' middleware usually attaches the user doc.

        // However, standard protect might not populate enrolledCourses fully if it's just ID.
        // Assuming req.user has enrolledCourses array of IDs.

        const enrolledCourseIds = req.user.enrolledCourses;

        if (!enrolledCourseIds || enrolledCourseIds.length === 0) {
            return res.json([]);
        }

        // 2. Find announcements where course is in enrolledCourseIds
        const announcements = await Announcement.find({
            course: { $in: enrolledCourseIds }
        })
            .populate('course', 'title thumbnail') // Populate course details for display
            .sort({ createdAt: -1 });

        res.json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/announcements/course/:courseId
// @desc    Get announcements for a specific course (Admin or Enrolled)
// @access  Private
router.get('/course/:courseId', protect, async (req, res) => {
    try {
        const { courseId } = req.params;

        // Optional: Check if user is enrolled or admin
        // For now, allow logged in users to see if they request it, or strict check?
        // Let's keep it simple: fetched by ID.

        const announcements = await Announcement.find({ course: courseId }).sort({ createdAt: -1 });
        res.json(announcements);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/announcements
// @desc    Create an announcement (Admin only)
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
    try {
        const { courseId, title, message } = req.body;

        if (!courseId || !title || !message) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const announcement = new Announcement({
            course: courseId,
            title,
            message
        });

        await announcement.save();

        res.status(201).json({ message: 'Announcement created', announcement });
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
