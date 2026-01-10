const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null // null means applies to all courses
    },
    expiryDate: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        default: null // null means unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    },
    minPurchaseAmount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for quick code lookups
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, expiryDate: 1 });

// Virtual to check if coupon is valid (not expired and active)
couponSchema.virtual('isValid').get(function () {
    const now = new Date();
    const notExpired = this.expiryDate > now;
    const withinUsageLimit = this.usageLimit === null || this.usedCount < this.usageLimit;
    return this.isActive && notExpired && withinUsageLimit;
});

// Method to calculate discount for a given price
couponSchema.methods.calculateDiscount = function (originalPrice) {
    if (this.discountType === 'percentage') {
        return Math.round((originalPrice * this.discountValue) / 100);
    } else {
        // Fixed discount, but cannot exceed original price
        return Math.min(this.discountValue, originalPrice);
    }
};

// Ensure JSON includes virtuals
couponSchema.set('toJSON', { virtuals: true });
couponSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Coupon', couponSchema);
