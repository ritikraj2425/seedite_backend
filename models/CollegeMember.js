const mongoose = require('mongoose');

const collegeMemberSchema = new mongoose.Schema({
    college: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
        required: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // Null until the student actually registers on Seedite
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'revoked'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Prevent duplicate email per college
collegeMemberSchema.index({ college: 1, email: 1 }, { unique: true });

// Fast lookup when a student logs in — "which colleges does this email belong to?"
collegeMemberSchema.index({ email: 1 });

// Fast lookup for college analytics — "give me all active members of this college"
collegeMemberSchema.index({ college: 1, status: 1 });

module.exports = mongoose.model('CollegeMember', collegeMemberSchema);
