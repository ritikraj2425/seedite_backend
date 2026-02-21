const Coupon = require('../models/Coupon');
const Course = require('../models/Course');

// @desc    Create new coupon
// @route   POST /api/coupons
// @access  Admin
const createCoupon = async (req, res) => {
    try {
        const {
            code,
            discountType,
            discountValue,
            courseId,
            expiryDate,
            usageLimit,
            minPurchaseAmount,
            description,
            assignedTo,
            assignedAmount
        } = req.body;

        // Validate discount value for percentage
        if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
            return res.status(400).json({ message: 'Percentage discount must be between 0 and 100' });
        }

        // Check if coupon code already exists
        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (existingCoupon) {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }

        // Validate course if provided
        if (courseId) {
            const course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }
        }

        const coupon = await Coupon.create({
            code: code.toUpperCase(),
            discountType,
            discountValue,
            course: courseId || null,
            expiryDate: new Date(expiryDate),
            usageLimit: usageLimit || null,
            minPurchaseAmount: minPurchaseAmount || 0,
            description: description || '',
            assignedTo: assignedTo || [],
            assignedAmount: assignedAmount || 0
        });

        console.log(`[Coupon] Created: ${coupon.code} by admin: ${req.user._id}`);

        res.status(201).json({
            success: true,
            coupon
        });
    } catch (error) {
        console.error('Create coupon error:', error);
        res.status(500).json({ message: 'Failed to create coupon', error: error.message });
    }
};

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Admin
const getAllCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find()
            .populate('course', 'title')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: coupons.length,
            coupons
        });
    } catch (error) {
        console.error('Get all coupons error:', error);
        res.status(500).json({ message: 'Failed to fetch coupons', error: error.message });
    }
};

// @desc    Get single coupon by ID
// @route   GET /api/coupons/:id
// @access  Admin
const getCouponById = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id).populate('course', 'title').populate('assignedTo', 'name email');

        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.json({
            success: true,
            coupon
        });
    } catch (error) {
        console.error('Get coupon by ID error:', error);
        res.status(500).json({ message: 'Failed to fetch coupon', error: error.message });
    }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Admin
const updateCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        const {
            code,
            discountType,
            discountValue,
            courseId,
            expiryDate,
            usageLimit,
            minPurchaseAmount,
            isActive,
            description,
            assignedTo
        } = req.body;

        // Check if new code already exists (if code is being changed)
        if (code && code.toUpperCase() !== coupon.code) {
            const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
            if (existingCoupon) {
                return res.status(400).json({ message: 'Coupon code already exists' });
            }
            coupon.code = code.toUpperCase();
        }

        // Validate discount value for percentage
        if (discountType === 'percentage' && discountValue !== undefined) {
            if (discountValue < 0 || discountValue > 100) {
                return res.status(400).json({ message: 'Percentage discount must be between 0 and 100' });
            }
        }

        // Update fields
        if (discountType) coupon.discountType = discountType;
        if (discountValue !== undefined) coupon.discountValue = discountValue;
        if (courseId !== undefined) coupon.course = courseId || null;
        if (expiryDate) coupon.expiryDate = new Date(expiryDate);
        if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
        if (minPurchaseAmount !== undefined) coupon.minPurchaseAmount = minPurchaseAmount;
        if (isActive !== undefined) coupon.isActive = isActive;
        if (description !== undefined) coupon.description = description;
        if (assignedTo !== undefined) coupon.assignedTo = assignedTo;
        // NOTE: assignedAmount is intentionally NOT updatable after creation

        const updatedCoupon = await coupon.save();

        console.log(`[Coupon] Updated: ${updatedCoupon.code} by admin: ${req.user._id}`);

        res.json({
            success: true,
            coupon: updatedCoupon
        });
    } catch (error) {
        console.error('Update coupon error:', error);
        res.status(500).json({ message: 'Failed to update coupon', error: error.message });
    }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Admin
const deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        await Coupon.deleteOne({ _id: req.params.id });

        console.log(`[Coupon] Deleted: ${coupon.code} by admin: ${req.user._id}`);

        res.json({
            success: true,
            message: 'Coupon deleted successfully'
        });
    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({ message: 'Failed to delete coupon', error: error.message });
    }
};

// @desc    Validate coupon for a course (client-facing)
// @route   POST /api/coupons/validate
// @access  Private (logged-in user)
const validateCoupon = async (req, res) => {
    try {
        const { code, courseId } = req.body;

        if (!code || !courseId) {
            return res.status(400).json({ message: 'Coupon code and course ID are required' });
        }

        // Find the coupon
        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.status(404).json({
                valid: false,
                message: 'Invalid coupon code'
            });
        }

        // Get course details
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                valid: false,
                message: 'Course not found'
            });
        }

        // Check if coupon is active
        if (!coupon.isActive) {
            return res.status(400).json({
                valid: false,
                message: 'This coupon is no longer active'
            });
        }

        // Check expiry
        if (coupon.expiryDate < new Date()) {
            return res.status(400).json({
                valid: false,
                message: 'This coupon has expired'
            });
        }

        // Check usage limit
        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({
                valid: false,
                message: 'This coupon has reached its usage limit'
            });
        }

        // Check if coupon is course-specific
        if (coupon.course && coupon.course.toString() !== courseId) {
            return res.status(400).json({
                valid: false,
                message: 'This coupon is not valid for this course'
            });
        }

        // Check minimum purchase amount
        if (coupon.minPurchaseAmount > course.price) {
            return res.status(400).json({
                valid: false,
                message: `This coupon requires a minimum purchase of ₹${coupon.minPurchaseAmount}`
            });
        }

        // Calculate discount
        const discountAmount = coupon.calculateDiscount(course.price);
        const finalPrice = course.price - discountAmount;

        res.json({
            valid: true,
            couponId: coupon._id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount,
            originalPrice: course.price,
            finalPrice: Math.max(0, finalPrice),
            message: `Coupon applied! You save ₹${discountAmount}`
        });
    } catch (error) {
        console.error('Validate coupon error:', error);
        res.status(500).json({ message: 'Failed to validate coupon', error: error.message });
    }
};

// @desc    Get coupons assigned to the logged-in user
// @route   GET /api/coupons/my-coupons
// @access  Private (logged-in user)
const getMyCoupons = async (req, res) => {
    try {
        const userId = req.user._id;

        const coupons = await Coupon.find({ assignedTo: userId })
            .populate('course', 'title')
            .sort({ createdAt: -1 });

        // Add computed earnings fields
        const enrichedCoupons = coupons.map(c => {
            const couponObj = c.toJSON();
            const commissionPerUse = couponObj.assignedAmount - couponObj.discountValue;
            const totalEarnings = commissionPerUse * couponObj.usedCount;
            const totalPaid = (couponObj.paymentHistory || []).reduce((sum, p) => sum + p.amount, 0);
            const pendingAmount = totalEarnings - totalPaid;
            return {
                ...couponObj,
                commissionPerUse: Math.max(0, commissionPerUse),
                totalEarnings: Math.max(0, totalEarnings),
                totalPaid,
                pendingAmount: Math.max(0, pendingAmount)
            };
        });

        res.json({
            success: true,
            count: enrichedCoupons.length,
            coupons: enrichedCoupons
        });
    } catch (error) {
        console.error('Get my coupons error:', error);
        res.status(500).json({ message: 'Failed to fetch your coupons', error: error.message });
    }
};

// @desc    Record a payment to coupon partner
// @route   POST /api/coupons/:id/payment
// @access  Admin
const addPayment = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        const { amount, note } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Payment amount must be greater than 0' });
        }

        coupon.paymentHistory.push({
            amount,
            date: new Date(),
            note: note || ''
        });

        await coupon.save();

        console.log(`[Coupon] Payment of ₹${amount} recorded for ${coupon.code} by admin: ${req.user._id}`);

        res.json({
            success: true,
            message: `Payment of ₹${amount} recorded successfully`,
            paymentHistory: coupon.paymentHistory
        });
    } catch (error) {
        console.error('Add payment error:', error);
        res.status(500).json({ message: 'Failed to record payment', error: error.message });
    }
};

module.exports = {
    createCoupon,
    getAllCoupons,
    getCouponById,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    getMyCoupons,
    addPayment
};
