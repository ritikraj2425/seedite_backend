const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const MockTest = require('../models/MockTest');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const FreeAccess = require('../models/FreeAccess');

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

        // Free Access Analytics
        const freeAccessCount = await FreeAccess.countDocuments();
        const freeAccessDetails = await FreeAccess.find()
            .populate('user', 'name email')
            .populate('course', 'title')
            .populate('grantedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            totalCourses,
            totalUsers,
            totalLectures,
            totalMockTests,
            recentCourses,
            recentUsers,
            courseAnalytics,
            freeAccessCount,
            freeAccessDetails
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
        const { title, description, price, originalPrice, thumbnail, category, instructor, courseDetails } = req.body;

        const course = await Course.create({
            title,
            description,
            price,
            originalPrice,
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

        const { title, description, price, originalPrice, thumbnail, category, instructor, courseDetails } = req.body;

        course.title = title || course.title;
        course.description = description || course.description;
        course.price = price !== undefined ? price : course.price;
        course.originalPrice = originalPrice !== undefined ? originalPrice : course.originalPrice;
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
        const { title, videoKey, duration, isFree, courseId, sectionId } = req.body;

        if (!videoKey) {
            return res.status(400).json({ message: 'Video key is required (Bunny Stream video ID)' });
        }

        const lecture = await Lecture.create({
            title,
            videoKey,  // Bunny Stream video ID
            duration: duration || '',
            isFree: isFree || false,
            course: courseId
        });

        // Add lecture to course
        if (sectionId) {
            // Add to specific section ONLY
            await Course.updateOne(
                { _id: courseId, 'sections._id': sectionId },
                { $push: { 'sections.$.lectures': lecture._id } }
            );
        } else {
            // Add to root lectures (ungrouped)
            await Course.findByIdAndUpdate(courseId, {
                $push: { lectures: lecture._id }
            }, { new: true });
        }

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

// @desc    Create section
// @route   POST /api/admin/courses/:id/sections
// @access  Admin
const createSection = async (req, res) => {
    try {
        const { title } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        course.sections.push({ title, lectures: [] });
        await course.save();

        res.status(201).json(course.sections[course.sections.length - 1]);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update section
// @route   PUT /api/admin/courses/:id/sections/:sectionId
// @access  Admin
const updateSection = async (req, res) => {
    try {
        const { title } = req.body;
        const { id, sectionId } = req.params;

        const course = await Course.findOneAndUpdate(
            { _id: id, 'sections._id': sectionId },
            { $set: { 'sections.$.title': title } },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({ message: 'Course or Section not found' });
        }

        res.json(course.sections.id(sectionId));
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete section
// @route   DELETE /api/admin/courses/:id/sections/:sectionId
// @access  Admin
const deleteSection = async (req, res) => {
    try {
        const { id, sectionId } = req.params;

        const course = await Course.findByIdAndUpdate(
            id,
            { $pull: { sections: { _id: sectionId } } },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        res.json({ message: 'Section deleted successfully' });
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

        // Remove from course (both root lectures and sections)
        await Course.findByIdAndUpdate(lecture.course, {
            $pull: {
                lectures: lecture._id,
                'sections.$[].lectures': lecture._id
            }
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
            duration: parseInt(duration) || 0,
            totalQuestions: parseInt(totalQuestions) || 0,
            passingScore: parseInt(passingScore) || 0,
            correctMarks: correctMarks !== undefined ? parseInt(correctMarks) : 4,
            incorrectMarks: incorrectMarks !== undefined ? parseInt(incorrectMarks) : -1,
            videoSolutionKey: videoSolutionKey || '',
            course: courseId,
            questions: (questions || []).map(q => ({
                type: q.type || 'mcq',
                text: q.questionText || q.text || '',
                image: q.image || '',
                options: q.options || [],
                correctOption: (q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctOption)?.toString() || '',
                externalLink: q.externalLink || '',
                isUnrated: q.isUnrated || false,
                marks: q.marks !== undefined ? parseInt(q.marks) : 4,
                solution: q.solution || '' // Optional solution text
            }))
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
        mockTest.duration = duration !== undefined ? parseInt(duration) : mockTest.duration;
        mockTest.totalQuestions = totalQuestions !== undefined ? parseInt(totalQuestions) : mockTest.totalQuestions;
        mockTest.passingScore = passingScore !== undefined ? parseInt(passingScore) : mockTest.passingScore;
        mockTest.correctMarks = correctMarks !== undefined ? parseInt(correctMarks) : mockTest.correctMarks;
        mockTest.incorrectMarks = incorrectMarks !== undefined ? parseInt(incorrectMarks) : mockTest.incorrectMarks;

        if (questions) {
            mockTest.questions = questions.map(q => ({
                type: q.type || 'mcq',
                text: q.questionText || q.text || '',
                image: q.image || '',
                options: q.options || [],
                correctOption: (q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctOption)?.toString() || '',
                externalLink: q.externalLink || '',
                isUnrated: q.isUnrated || false,
                marks: q.marks !== undefined ? parseInt(q.marks) : 4,
                solution: q.solution || '' // Optional solution text
            }));
        }
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

// @desc    Get all feedback
// @route   GET /api/admin/feedback
// @access  Admin
const getAllFeedback = async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .populate('user', 'name email')
            .populate('course', 'title')
            .sort({ createdAt: -1 });

        // Map 'course' to 'courseId' for frontend compatibility
        const mappedFeedbacks = feedbacks.map(f => {
            const doc = f.toObject();
            return {
                ...doc,
                courseId: doc.course
            };
        });

        res.json(mappedFeedbacks);
    } catch (error) {
        console.error('Fetch Feedback Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Grant free access to a user for a course
// @route   POST /api/admin/free-access
// @access  Admin
const grantFreeAccess = async (req, res) => {
    try {
        const { userId, courseId, reason } = req.body;

        // Validate inputs
        if (!userId || !courseId) {
            return res.status(400).json({ message: 'userId and courseId are required' });
        }

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if already enrolled
        if (user.enrolledCourses.includes(courseId)) {
            return res.status(400).json({ message: 'User is already enrolled in this course' });
        }

        // Create free access record
        const freeAccess = await FreeAccess.create({
            user: userId,
            course: courseId,
            grantedBy: req.user._id,
            reason: reason || ''
        });

        // Enroll user in course
        user.enrolledCourses.push(courseId);
        await user.save();

        console.log(`[Admin] Free access granted: ${user.email} -> ${course.title} by ${req.user.email}`);

        res.status(201).json({
            message: 'Free access granted successfully',
            freeAccess: {
                user: { _id: user._id, name: user.name, email: user.email },
                course: { _id: course._id, title: course.title },
                reason: freeAccess.reason,
                createdAt: freeAccess.createdAt
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Free access already granted to this user for this course' });
        }
        console.error('Grant Free Access Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Revoke free access from a user for a course
// @route   DELETE /api/admin/free-access/:userId/:courseId
// @access  Admin
const revokeFreeAccess = async (req, res) => {
    try {
        const { userId, courseId } = req.params;

        // Find and delete free access record
        const freeAccess = await FreeAccess.findOneAndDelete({ user: userId, course: courseId });

        if (!freeAccess) {
            return res.status(404).json({ message: 'Free access record not found' });
        }

        // Remove user from course enrollment
        await User.findByIdAndUpdate(userId, {
            $pull: { enrolledCourses: courseId }
        });

        console.log(`[Admin] Free access revoked: userId ${userId} from courseId ${courseId}`);

        res.json({ message: 'Free access revoked successfully' });
    } catch (error) {
        console.error('Revoke Free Access Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all free access records
// @route   GET /api/admin/free-access
// @access  Admin
const getFreeAccessList = async (req, res) => {
    try {
        const freeAccessList = await FreeAccess.find()
            .populate('user', 'name email')
            .populate('course', 'title price')
            .populate('grantedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(freeAccessList);
    } catch (error) {
        console.error('Get Free Access List Error:', error);
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
    deleteMockTest,
    createSection,
    updateSection,
    deleteSection,
    getAllFeedback,
    grantFreeAccess,
    revokeFreeAccess,
    getFreeAccessList
};

