const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const MockTest = require('../models/MockTest');
const User = require('../models/User');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
const getAdminStats = async (req, res) => {
    try {
        const totalCourses = await Course.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalLectures = await Lecture.countDocuments();
        const totalMockTests = await MockTest.countDocuments();

        const recentCourses = await Course.find().sort({ createdAt: -1 }).limit(5);
        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('-password');

        // Advanced Analytics per Course
        const courses = await Course.find().populate('mockTests');
        const courseAnalytics = [];

        for (const course of courses) {
            // Find users enrolled in this course
            const enrolledUsers = await User.find({ enrolledCourses: course._id }).select('email mockTestResults');

            const enrolledCount = enrolledUsers.length;
            const totalRevenue = enrolledCount * course.price;
            const studentEmails = enrolledUsers.map(u => u.email);

            // Calculate Mock Test Stats for this course
            let totalTestsTaken = 0;
            let totalScoreSum = 0;

            // Get IDs of mock tests belonging to this course
            const courseMockTestIds = course.mockTests.map(mt => mt._id.toString());

            enrolledUsers.forEach(user => {
                user.mockTestResults.forEach(result => {
                    if (result.test && courseMockTestIds.includes(result.test.toString())) {
                        totalTestsTaken++;
                        totalScoreSum += (result.normalizedScore || 0);
                    }
                });
            });

            const avgMockScore = totalTestsTaken > 0 ? (totalScoreSum / totalTestsTaken).toFixed(1) : 0;

            courseAnalytics.push({
                _id: course._id,
                title: course.title,
                price: course.price,
                enrolledCount,
                totalRevenue,
                studentEmails,
                totalTestsTaken,
                avgMockScore
            });
        }

        res.json({
            totalCourses,
            totalUsers,
            totalLectures,
            totalMockTests,
            recentCourses,
            recentUsers,
            courseAnalytics
        });
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create course
// @route   POST /api/admin/courses
// @access  Admin
const createCourse = async (req, res) => {
    try {
        const { title, description, price, thumbnail, category, instructor, courseDetails } = req.body;

        const course = await Course.create({
            title,
            description,
            price,
            thumbnail,
            category,
            instructor: instructor || 'Ritik Raj',
            courseDetails: courseDetails || []
        });

        res.status(201).json(course);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update course
// @route   PUT /api/admin/courses/:id
// @access  Admin
const updateCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const { title, description, price, thumbnail, category, instructor, courseDetails } = req.body;

        course.title = title || course.title;
        course.description = description || course.description;
        course.price = price !== undefined ? price : course.price;
        course.thumbnail = thumbnail || course.thumbnail;
        course.category = category || course.category;
        course.instructor = instructor || course.instructor;
        if (courseDetails) course.courseDetails = courseDetails;

        const updatedCourse = await course.save();
        res.json(updatedCourse);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete course
// @route   DELETE /api/admin/courses/:id
// @access  Admin
const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        await Course.deleteOne({ _id: req.params.id });
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create lecture
// @route   POST /api/admin/lectures
// @access  Admin
const createLecture = async (req, res) => {
    try {
        const { title, videoKey, duration, isFree, courseId } = req.body;

        if (!videoKey) {
            return res.status(400).json({ message: 'Video key is required (CloudFront file key)' });
        }

        const lecture = await Lecture.create({
            title,
            videoKey,  // CloudFront file key
            duration: duration || '',
            isFree: isFree || false,
            course: courseId
        });

        // Add lecture to course
        await Course.findByIdAndUpdate(courseId, {
            $push: { lectures: lecture._id }
        }, { new: true });

        res.status(201).json(lecture);
    } catch (error) {
        console.error('CREATE LECTURE ERROR:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update lecture
// @route   PUT /api/admin/lectures/:id
// @access  Admin
const updateLecture = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id);

        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        const { title, videoKey, duration, isFree } = req.body;

        lecture.title = title || lecture.title;
        lecture.videoKey = videoKey || lecture.videoKey;
        lecture.duration = duration !== undefined ? duration : lecture.duration;
        lecture.isFree = isFree !== undefined ? isFree : lecture.isFree;

        const updatedLecture = await lecture.save();
        res.json(updatedLecture);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete lecture
// @route   DELETE /api/admin/lectures/:id
// @access  Admin
const deleteLecture = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id);

        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        // Remove from course
        await Course.findByIdAndUpdate(lecture.course, {
            $pull: { lectures: lecture._id }
        });

        await Lecture.deleteOne({ _id: req.params.id });
        res.json({ message: 'Lecture deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create mock test
// @route   POST /api/admin/mock-tests
// @access  Admin
const createMockTest = async (req, res) => {
    try {
        const { title, duration, totalQuestions, passingScore, correctMarks, incorrectMarks, videoSolutionKey, courseId, questions } = req.body;

        const mockTest = await MockTest.create({
            title,
            duration,
            totalQuestions,
            passingScore,
            correctMarks,
            incorrectMarks,
            videoSolutionKey: videoSolutionKey || '',  // CloudFront file key
            course: courseId,
            questions: questions || []
        });

        // Add mock test to course
        await Course.findByIdAndUpdate(courseId, {
            $push: { mockTests: mockTest._id }
        });

        res.status(201).json(mockTest);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update mock test
// @route   PUT /api/admin/mock-tests/:id
// @access  Admin
const updateMockTest = async (req, res) => {
    try {
        const mockTest = await MockTest.findById(req.params.id);

        if (!mockTest) {
            return res.status(404).json({ message: 'Mock Test not found' });
        }

        const { title, duration, totalQuestions, passingScore, correctMarks, incorrectMarks, questions, videoSolutionKey } = req.body;

        mockTest.title = title || mockTest.title;
        mockTest.duration = duration || mockTest.duration;
        mockTest.totalQuestions = totalQuestions || mockTest.totalQuestions;
        mockTest.passingScore = passingScore || mockTest.passingScore;
        mockTest.correctMarks = correctMarks !== undefined ? correctMarks : mockTest.correctMarks;
        mockTest.incorrectMarks = incorrectMarks !== undefined ? incorrectMarks : mockTest.incorrectMarks;
        if (questions) mockTest.questions = questions;
        if (videoSolutionKey !== undefined) mockTest.videoSolutionKey = videoSolutionKey;

        const updatedMockTest = await mockTest.save();
        res.json(updatedMockTest);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete mock test
// @route   DELETE /api/admin/mock-tests/:id
// @access  Admin
const deleteMockTest = async (req, res) => {
    try {
        const mockTest = await MockTest.findById(req.params.id);

        if (!mockTest) {
            return res.status(404).json({ message: 'Mock Test not found' });
        }

        // Remove from course
        await Course.findByIdAndUpdate(mockTest.course, {
            $pull: { mockTests: mockTest._id }
        });

        await MockTest.deleteOne({ _id: req.params.id });
        res.json({ message: 'Mock Test deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
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
};
