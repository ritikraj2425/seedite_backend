const Razorpay = require('razorpay');
const crypto = require('crypto');
const Course = require('../models/Course');
const User = require('../models/User');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @desc    Create Razorpay order
// @route   POST /api/payment/create-order
// @access  Private
const createOrder = async (req, res) => {
    try {
        const { courseId } = req.body;

        // Get course details
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if already enrolled
        const user = await User.findById(req.user._id);
        if (user.enrolledCourses.includes(courseId)) {
            return res.status(400).json({ message: 'Already enrolled in this course' });
        }

        // Create Razorpay order
        const options = {
            amount: course.price * 100, // Amount in paise (INR smallest unit)
            currency: 'INR',
            receipt: `rcpt_${courseId.toString().slice(-6)}_${Date.now()}`, // Shortened to fit 40 chars limit
            notes: {
                courseId: courseId,
                userId: req.user._id.toString(),
                courseTitle: course.title
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            order: order,
            course: {
                id: course._id,
                title: course.title,
                price: course.price
            },
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Failed to create payment order', error: error.message });
    }
};

// @desc    Verify payment and enroll user
// @route   POST /api/payment/verify
// @access  Private
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Payment verification failed - Invalid signature' });
        }

        // Payment verified, enroll user
        const user = await User.findById(req.user._id);

        if (!user.enrolledCourses.includes(courseId)) {
            user.enrolledCourses.push(courseId);
            await user.save();
        }

        res.json({
            success: true,
            message: 'Payment verified and enrollment successful',
            courseId: courseId
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ message: 'Payment verification failed', error: error.message });
    }
};

// @desc    Get Razorpay key (public)
// @route   GET /api/payment/key
// @access  Public
const getKey = (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
};

module.exports = { createOrder, verifyPayment, getKey };
