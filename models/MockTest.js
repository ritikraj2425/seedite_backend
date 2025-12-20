const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    image: { type: String }, // URL of the question image
    options: [{ type: String, required: true }],
    correctOption: { type: Number, required: true },
    marks: { type: Number, default: 4 } // Keeping per-question marks if needed, but will rely on test defaults usually
});

const mockTestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
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
        type: String,  // CloudFront file key for video solution
        default: ''
    },
    questions: [questionSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('MockTest', mockTestSchema);
