const mongoose = require('mongoose');

const courseProgressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    completedLectures: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture'
    }],
    progressPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// One progress record per user per course
courseProgressSchema.index({ user: 1, course: 1 }, { unique: true });

// Fast lookup for "show me all progress for this user" (student dashboard)
courseProgressSchema.index({ user: 1 });

// Fast lookup for "show me all progress for this course" (admin/college analytics)
courseProgressSchema.index({ course: 1 });

module.exports = mongoose.model('CourseProgress', courseProgressSchema);
