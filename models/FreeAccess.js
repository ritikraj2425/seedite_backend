const mongoose = require('mongoose');

const freeAccessSchema = new mongoose.Schema({
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
    grantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Admin who granted access
        required: true
    },
    reason: {
        type: String,
        default: '' // Optional reason for granting free access
    }
}, {
    timestamps: true // createdAt will serve as grantedAt
});

// Ensure a user can only have one free access record per course
freeAccessSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('FreeAccess', freeAccessSchema);
