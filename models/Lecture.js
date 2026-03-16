const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['video', 'pdf'],
        default: 'video'
    },
    videoKey: {
        type: String,  // Bunny Stream video ID (GUID)
        required: false // Required only if type is 'video'
    },
    videoUrl: {
        type: String,  // YouTube or other external video URL
        required: false
    },
    pdfUrl: {
        type: String, // S3 URL for PDF
        required: false // Required only if type is 'pdf'
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
