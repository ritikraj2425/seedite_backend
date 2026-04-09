const CourseProgress = require('../models/CourseProgress');
const Course = require('../models/Course');

// Helper: Check if a lecture is a trackable Bunny video
const isBunnyLecture = (lecture) => {
    if (!lecture || lecture.type === 'pdf') return false;
    if (lecture.videoKey) return true;
    if (lecture.videoUrl && lecture.videoUrl.includes('mediadelivery.net')) return true;
    return false;
};

// Helper: Count total Bunny video lectures in a course
const countBunnyLectures = (course) => {
    let count = 0;

    if (course.lectures) {
        course.lectures.forEach(l => { if (isBunnyLecture(l)) count++; });
    }

    if (course.sections) {
        course.sections.forEach(s => {
            if (s.lectures) {
                s.lectures.forEach(l => { if (isBunnyLecture(l)) count++; });
            }
        });
    }

    return count;
};

// @desc    Mark a lecture as completed for the logged-in user
// @route   POST /api/progress/complete-lecture
// @access  Private
const completeLecture = async (req, res) => {
    try {
        const { courseId, lectureId } = req.body;
        const userId = req.user._id;

        if (!courseId || !lectureId) {
            return res.status(400).json({ message: 'courseId and lectureId are required' });
        }

        // Fetch course with populated lectures to count Bunny videos
        const course = await Course.findById(courseId)
            .populate('lectures')
            .populate('sections.lectures');

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        let totalBunnyLectures = countBunnyLectures(course);
        if (totalBunnyLectures === 0) totalBunnyLectures = 1;

        // Atomic upsert: $addToSet is idempotent and safe for concurrent requests
        const progress = await CourseProgress.findOneAndUpdate(
            { user: userId, course: courseId },
            {
                $addToSet: { completedLectures: lectureId },
                $set: { lastAccessed: new Date() }
            },
            { upsert: true, new: true }
        );

        // Recalculate percentage after atomic update
        const pct = Math.min(100, Math.round((progress.completedLectures.length / totalBunnyLectures) * 100));
        progress.progressPercentage = pct;
        await progress.save();

        res.json({
            message: 'Lecture marked as complete',
            progressPercentage: pct,
            completedCount: progress.completedLectures.length,
            totalBunnyLectures
        });
    } catch (error) {
        console.error('[Progress] completeLecture error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get progress for a specific course for the logged-in user
// @route   GET /api/progress/:courseId
// @access  Private
const getCourseProgress = async (req, res) => {
    try {
        const userId = req.user._id;
        const { courseId } = req.params;

        const progress = await CourseProgress.findOne({ user: userId, course: courseId });

        if (!progress) {
            return res.json({
                courseId,
                progressPercentage: 0,
                completedLectures: [],
                completedCount: 0
            });
        }

        res.json({
            courseId,
            progressPercentage: progress.progressPercentage,
            completedLectures: progress.completedLectures,
            completedCount: progress.completedLectures.length,
            lastAccessed: progress.lastAccessed
        });
    } catch (error) {
        console.error('[Progress] getCourseProgress error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get progress for ALL enrolled courses for the logged-in user (dashboard)
// @route   GET /api/progress
// @access  Private
const getAllProgress = async (req, res) => {
    try {
        const userId = req.user._id;

        const progressRecords = await CourseProgress.find({ user: userId })
            .populate('course', 'title thumbnail');

        res.json(progressRecords);
    } catch (error) {
        console.error('[Progress] getAllProgress error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { completeLecture, getCourseProgress, getAllProgress };
