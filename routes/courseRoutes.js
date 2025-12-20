const express = require('express');
const router = express.Router();
const { getAllCourses, getCourseById, enrollCourse, createCourse } = require('../controllers/courseController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', getAllCourses);

// For getCourseById, we want to allow public access but show more if logged in.
// We can use a middleware that attempts to extract user but doesn't fail if no token.
// Or we just make two endpoints or handle it in controller.
// To keep it simple, let's use a "optionalProtect" middleware logic or just handle token extraction inside controller if we didn't use the strict 'protect'.
// Actually, let's manually handle token in controller or use a specific middleware.
// For now, let's stick to: if you have a token, send it.
// I will create a middleware 'optionalProtect' in authMiddleware.js later or inline here.
// But 'protect' fails if no token.
// Let's modify authMiddleware to export optionalProtect or just use protect for enrollment.

// For get course: handled by checking header manually in controller if we don't apply protect globally?
// But `req.user` comes from protect.
// Quick fix: `getCourseById` will be public but won't show content.
// A separate `getCourseContent` (protected) could be better but let's stick to the plan: `getCourseById`.
// I'll make a custom middleware here.

const optionalProtect = async (req, res, next) => {
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    let token;
    if (req.cookies.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
            req.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            console.error('Token failed in optionalProtect');
        }
    }
    next();
};

router.get('/:id', optionalProtect, getCourseById);
router.post('/:id/enroll', protect, enrollCourse);
router.post('/', protect, admin, createCourse);

module.exports = router;
