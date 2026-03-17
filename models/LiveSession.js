const mongoose = require('mongoose');

const liveSessionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a session title']
    },
    description: {
        type: String,
        required: [true, 'Please add a session description']
    },
    sessionDate: {
        type: Date,
        required: [true, 'Please add a session date']
    },
    sessionTime: {
        type: String,
        required: [true, 'Please add a session time']
    },
    startTime: {
        type: Date,
        required: [true, 'Please add a start time for the banner']
    },
    endTime: {
        type: Date,
        required: [true, 'Please add an end time']
    },
    isActive: {
        type: Boolean,
        default: false
    },
    registeredUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('LiveSession', liveSessionSchema);
