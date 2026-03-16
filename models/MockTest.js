const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    type: { type: String, enum: ['mcq', 'code'], default: 'mcq' },
    text: { type: String, required: true },
    image: { type: String }, // URL of the question image
    options: [{ type: String }],
    correctOption: { type: String },
    externalLink: { type: String },
    isUnrated: { type: Boolean, default: false },
    marks: { type: Number, default: 4 },
    solution: { type: String, default: '' } // Optional solution/explanation text
});

const mockTestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    isIQTest: {
        type: Boolean,
        default: false
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    duration: {
        type: Number, // in minutes
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    passingScore: {
        type: Number,
        required: true
    },
    correctMarks: {
        type: Number,
        default: 4
    },
    incorrectMarks: {
        type: Number,
        default: -1
    },
    videoSolutionKey: {
        type: String,  // Bunny Stream video ID for video solution
        default: ''
    },
    questions: [questionSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('MockTest', mockTestSchema);
