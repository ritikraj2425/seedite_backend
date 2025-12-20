const User = require('../models/User');

// @desc    Get user profile & enrolled courses
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('enrolledCourses')
            .populate('mockTestResults.test');

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                enrolledCourses: user.enrolledCourses,
                mockTestResults: user.mockTestResults
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user's specific mock test result
// @route   GET /api/users/me/mock-test-results/:testId
// @access  Private
const getMockTestResult = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find result for specific test
        const result = user.mockTestResults.find(
            r => r.test.toString() === req.params.testId
        );

        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ message: 'No result found for this test' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all users (admin only)
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getUserProfile, getMockTestResult, getAllUsers };
