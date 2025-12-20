const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String, // URL to image
        default: 'https://via.placeholder.com/300x200?text=Course+Thumbnail'
    },
    courseDetails: [{
        type: String // Array of bullet points/features
    }],
    price: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        default: ''
    },
    instructor: {
        type: String,
        default: 'Ritik Raj'
    },
    lectures: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture'
    }],
    mockTests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MockTest'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Course', courseSchema);

