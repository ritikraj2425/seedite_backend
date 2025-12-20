const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    razorpay_order_id: {
        type: String,
        required: true,
        index: true
    },
    razorpay_payment_id: {
        type: String,
        sparse: true,
        index: true
    },
    razorpay_signature: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['created', 'attempted', 'paid', 'failed', 'refunded'],
        default: 'created'
    },
    enrollmentStatus: {
        type: String,
        enum: ['pending', 'enrolled', 'failed'],
        default: 'pending'
    },
    paymentMethod: {
        type: String
    },
    verifiedVia: {
        type: String,
        enum: ['client', 'webhook', 'manual'],
        default: 'client'
    },
    webhookData: {
        type: mongoose.Schema.Types.Mixed
    },
    errorLog: {
        type: String
    }
}, {
    timestamps: true
});

// Index for finding pending payments
paymentSchema.index({ status: 1, enrollmentStatus: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
