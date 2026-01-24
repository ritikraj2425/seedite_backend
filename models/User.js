const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: function () {
            // Password is required only if user signed up with email/password (not Google)
            return this.authProvider === 'local';
        }
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null values (for non-Google users)
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    },
    enrolledCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    activeSessionToken: {
        type: String,
        default: null
    },
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetExpires: {
        type: Date,
        default: null
    },
    mockTestResults: [{
        test: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MockTest'
        },
        score: Number,
        totalMarks: Number,
        normalizedScore: Number,
        totalQuestions: Number,
        answers: Object,
        completedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
