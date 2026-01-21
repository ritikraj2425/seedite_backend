const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    videoKey: {
        type: String,  // Bunny Stream video ID (GUID)
        required: true
    },
    duration: {
        type: String,  // Optional: Display duration like "10:30"
        default: ''
    },
    isFree: {
        type: Boolean, // Preview lectures available without enrollment
        default: false
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lecture', lectureSchema);
