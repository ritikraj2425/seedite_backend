const Course = require('../models/Course');
const User = require('../models/User');
const { getCloudFrontUrl } = require('../config/cloudfront');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find({}).select('-lectures -mockTests'); // Exclude content
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public/Protected
const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('lectures')
            .populate('mockTests');

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const isEnrolled = req.user && req.user.enrolledCourses.includes(req.params.id);

        if (isEnrolled || (req.user && req.user.role === 'admin')) {
            // Transform videoKey to full CloudFront URL for lectures
            const courseObj = course.toObject();
            if (courseObj.lectures) {
                courseObj.lectures = courseObj.lectures.map(lecture => ({
                    ...lecture,
                    videoUrl: getCloudFrontUrl(lecture.videoKey)  // Construct full URL
                }));
            }
            // Transform videoSolutionKey to full CloudFront URL for mock tests
            if (courseObj.mockTests) {
                courseObj.mockTests = courseObj.mockTests.map(test => ({
                    ...test,
                    videoSolutionUrl: getCloudFrontUrl(test.videoSolutionKey)  // Construct full URL
                }));
            }
            res.json(courseObj);
        } else {
            // Return only public info
            const publicInfo = await Course.findById(req.params.id).select('-lectures -mockTests');
            res.json({ ...publicInfo.toObject(), isEnrolled: false });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Enroll in a course
// @route   POST /api/courses/:id/enroll
// @access  Private
const enrollCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const user = await User.findById(req.user._id);

        if (user.enrolledCourses.includes(course._id)) {
            return res.status(400).json({ message: 'Already enrolled' });
        }

        // Simulate payment here
        user.enrolledCourses.push(course._id);
        await user.save();

        res.json({ message: 'Enrolled successfully', courseId: course._id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a course (Admin)
// @route   POST /api/courses
// @access  Private/Admin
const createCourse = async (req, res) => {
    try {
        const { title, description, price, thumbnail } = req.body;
        const course = new Course({
            title, description, price, thumbnail
        });
        const createdCourse = await course.save();
        res.status(201).json(createdCourse);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getAllCourses, getCourseById, enrollCourse, createCourse };
