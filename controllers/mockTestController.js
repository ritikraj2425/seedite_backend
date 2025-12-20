const MockTest = require('../models/MockTest');
const User = require('../models/User');
const { getCloudFrontUrl } = require('../config/cloudfront');

// @desc    Get mock test by ID
// @route   GET /api/mock-tests/:id
// @access  Private (should be enrolled in course, but for now just protected)
const getMockTestById = async (req, res) => {
    try {
        const mockTest = await MockTest.findById(req.params.id).populate('course');

        if (!mockTest) {
            return res.status(404).json({ message: 'Mock Test not found' });
        }

        // Security: Verify user is enrolled in the course
        const user = await User.findById(req.user._id);
        const courseId = mockTest.course?._id || mockTest.course;

        if (!user.enrolledCourses.includes(courseId.toString()) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You must be enrolled in this course to access this test' });
        }

        // Transform response for frontend compatibility
        const mockTestObj = mockTest.toObject();

        // Transform videoSolutionKey to videoSolutionUrl (CloudFront URL)
        mockTestObj.videoSolutionUrl = getCloudFrontUrl(mockTestObj.videoSolutionKey);

        // Map correctOption to correctOptionIndex for frontend compatibility
        if (mockTestObj.questions) {
            mockTestObj.questions = mockTestObj.questions.map(q => ({
                ...q,
                correctOptionIndex: q.correctOption,  // Frontend expects correctOptionIndex
                questionText: q.text  // Frontend expects questionText, admin saves as text
            }));
        }

        res.json(mockTestObj);
    } catch (error) {
        console.error('getMockTestById error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit mock test result
// @route   POST /api/mock-tests/:id/submit
// @access  Private
const submitMockTest = async (req, res) => {
    try {
        const { score, totalMarks, normalizedScore, totalQuestions, answers } = req.body;
        const user = await User.findById(req.user._id);

        if (user) {
            // Check if user already has a result for this test - update it instead of adding new
            const existingResultIndex = user.mockTestResults.findIndex(
                r => r.test.toString() === req.params.id
            );

            const result = {
                test: req.params.id,
                score,
                totalMarks: totalMarks || (totalQuestions * 4), // Fallback if not sent
                normalizedScore: normalizedScore || 0,
                totalQuestions,
                answers: answers || {},
                completedAt: Date.now()
            };

            if (existingResultIndex >= 0) {
                // Update existing result
                user.mockTestResults[existingResultIndex] = result;
            } else {
                // Add new result
                user.mockTestResults.push(result);
            }

            await user.save();

            res.json({ message: 'Result saved' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('submitMockTest error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getMockTestById, submitMockTest };
