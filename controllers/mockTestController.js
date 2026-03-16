const MockTest = require('../models/MockTest');
const User = require('../models/User');
const { getBunnyStreamUrl } = require('../config/bunny');

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
        if (!mockTest.isIQTest) {
            const user = await User.findById(req.user._id);
            const courseId = mockTest.course?._id || mockTest.course;

            if (!user.enrolledCourses.includes(courseId.toString()) && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'You must be enrolled in this course to access this test' });
            }
        }

        // Transform response for frontend compatibility
        const mockTestObj = mockTest.toObject();

        // Transform videoSolutionKey to videoSolutionUrl (CloudFront URL)
        mockTestObj.videoSolutionUrl = getBunnyStreamUrl(mockTestObj.videoSolutionKey);

        // Map correctOption to correctOptionIndex for frontend compatibility
        if (mockTestObj.questions) {
            mockTestObj.questions = mockTestObj.questions.map(q => ({
                type: q.type || 'mcq',
                externalLink: q.externalLink || '',
                isUnrated: q.isUnrated || false,
                correctOptionIndex: q.correctOption,  // Frontend expects correctOptionIndex
                questionText: q.type === 'mcq' ? q.text : (q.text || ''),  // Frontend expects questionText
                solution: q.solution || '',  // Solution explanation shown after submission
                options: q.options || [],
                image: q.image || '',
                marks: q.marks,
                _id: q._id
            }));
        }

        // DOUBLE CHECK: Ensure no sensitive data at root level of mapped object
        if (mockTestObj.questions) {
            mockTestObj.questions.forEach(q => {
                delete q.correctOption;
            });
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
        const { score, totalMarks, normalizedScore, totalQuestions, answers, timeSpent, totalTime } = req.body;
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
                timeSpent: timeSpent || {},
                totalTime: totalTime || 0,
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

// @desc    Get all IQ tests
// @route   GET /api/mock-tests/iq-tests
// @access  Public
const getAllIQTests = async (req, res) => {
    try {
        const iqTests = await MockTest.find({ isIQTest: true })
            .select('title duration totalQuestions passingScore createdAt')
            .sort({ createdAt: -1 });
        res.json(iqTests);
    } catch (error) {
        console.error('getAllIQTests error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get leaderboard for a mock test
// @route   GET /api/mock-tests/:id/leaderboard
// @access  Private
const getMockTestLeaderboard = async (req, res) => {
    try {
        const testId = req.params.id;
        // Find users who have a result for this test
        const users = await User.find({ "mockTestResults.test": testId })
            .select('name mockTestResults')
            .lean();
            
        // Map and extract the specific result
        const leaderboard = users.map(user => {
            const result = user.mockTestResults.find(r => r.test.toString() === testId);
            return {
                _id: user._id,
                name: user.name,
                score: result.score,
                normalizedScore: result.normalizedScore,
                totalTime: result.totalTime || 0,
                completedAt: result.completedAt
            };
        });
        
        // Sort by normalizedScore (DESC), then totalTime (ASC)
        leaderboard.sort((a, b) => {
            if (b.normalizedScore !== a.normalizedScore) {
                return b.normalizedScore - a.normalizedScore;
            }
            return a.totalTime - b.totalTime;
        });
        
        // Return top 50 (or all)
        res.json(leaderboard.slice(0, 50));
    } catch (error) {
        console.error('getMockTestLeaderboard error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getMockTestById, submitMockTest, getAllIQTests, getMockTestLeaderboard };
