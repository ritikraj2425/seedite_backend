const Razorpay = require('razorpay');
const crypto = require('crypto');
const Course = require('../models/Course');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Coupon = require('../models/Coupon');

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
        const { courseId, couponCode } = req.body;

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

        let finalPrice = course.price;
        let discountApplied = 0;
        let couponId = null;
        let couponData = null;

        // Validate and apply coupon if provided
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

            if (!coupon) {
                return res.status(400).json({ message: 'Invalid coupon code' });
            }

            // Check if coupon is active
            if (!coupon.isActive) {
                return res.status(400).json({ message: 'This coupon is no longer active' });
            }

            // Check expiry
            if (coupon.expiryDate < new Date()) {
                return res.status(400).json({ message: 'This coupon has expired' });
            }

            // Check usage limit
            if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
                return res.status(400).json({ message: 'This coupon has reached its usage limit' });
            }

            // Check if coupon is course-specific
            if (coupon.course && coupon.course.toString() !== courseId) {
                return res.status(400).json({ message: 'This coupon is not valid for this course' });
            }

            // Check minimum purchase amount
            if (coupon.minPurchaseAmount > course.price) {
                return res.status(400).json({
                    message: `This coupon requires a minimum purchase of ₹${coupon.minPurchaseAmount}`
                });
            }

            // Calculate discount
            discountApplied = coupon.calculateDiscount(course.price);
            finalPrice = Math.max(0, course.price - discountApplied);
            couponId = coupon._id;
            couponData = {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue
            };

            console.log(`[Payment] Coupon ${coupon.code} applied: discount ₹${discountApplied}, final price ₹${finalPrice}`);
        }

        // Create Razorpay order
        const options = {
            amount: finalPrice * 100, // Amount in paise (INR smallest unit)
            currency: 'INR',
            receipt: `rcpt_${courseId.toString().slice(-6)}_${Date.now()}`, // Shortened to fit 40 chars limit
            notes: {
                courseId: courseId,
                userId: req.user._id.toString(),
                courseTitle: course.title,
                couponCode: couponCode || '',
                originalPrice: course.price,
                discountApplied: discountApplied
            }
        };

        const order = await razorpay.orders.create(options);

        // Save payment record in database for tracking
        await Payment.create({
            razorpay_order_id: order.id,
            user: req.user._id,
            course: courseId,
            amount: finalPrice,
            originalAmount: course.price,
            discountApplied: discountApplied,
            coupon: couponId,
            currency: 'INR',
            status: 'created'
        });

        console.log(`[Payment] Order created: ${order.id} for user: ${req.user._id} course: ${courseId}`);

        res.json({
            success: true,
            order: order,
            course: {
                id: course._id,
                title: course.title,
                price: course.price,
                finalPrice: finalPrice
            },
            coupon: couponData,
            discountApplied: discountApplied,
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

        console.log(`[Payment] Verifying payment: order=${razorpay_order_id}, payment=${razorpay_payment_id}`);

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            console.error(`[Payment] Invalid signature for order: ${razorpay_order_id}`);

            // Update payment record with failure
            await Payment.findOneAndUpdate(
                { razorpay_order_id },
                {
                    status: 'failed',
                    errorLog: 'Invalid signature during client verification'
                }
            );

            return res.status(400).json({ message: 'Payment verification failed - Invalid signature' });
        }

        // Update payment record
        const paymentRecord = await Payment.findOneAndUpdate(
            { razorpay_order_id },
            {
                razorpay_payment_id,
                razorpay_signature,
                status: 'paid',
                verifiedVia: 'client'
            },
            { new: true }
        );

        // Payment verified, enroll user
        const user = await User.findById(req.user._id);

        if (!user.enrolledCourses.includes(courseId)) {
            user.enrolledCourses.push(courseId);

            // Auto-enroll logic: Buy course X get course Y free
            const TARGET_COURSE_ID = "6960e65b670769cfa385fcc4";
            const FREE_BATCH_ID = "697135aa4d70d320275ffcc7";

            if (courseId.toString() === TARGET_COURSE_ID) {
                if (!user.enrolledCourses.includes(FREE_BATCH_ID)) {
                    user.enrolledCourses.push(FREE_BATCH_ID);
                    console.log(`[Payment] User ${req.user._id} auto-enrolled in free batch ${FREE_BATCH_ID} (verify)`);
                }
            }

            await user.save();

            // Update enrollment status
            if (paymentRecord) {
                paymentRecord.enrollmentStatus = 'enrolled';
                await paymentRecord.save();

                // Increment coupon usage count if a coupon was used
                if (paymentRecord.coupon) {
                    await Coupon.findByIdAndUpdate(paymentRecord.coupon, {
                        $inc: { usedCount: 1 }
                    });
                    console.log(`[Payment] Coupon usage incremented for coupon: ${paymentRecord.coupon}`);
                }

                // Send purchase confirmation email (non-blocking)
                const course = await Course.findById(courseId);
                if (course) {
                    const { sendPurchaseConfirmationEmail } = require('../utils/emailService');
                    sendPurchaseConfirmationEmail(
                        user.email,
                        user.name,
                        { title: course.title, price: paymentRecord.originalAmount || course.price },
                        {
                            amount: paymentRecord.amount,
                            paymentId: razorpay_payment_id,
                            couponCode: paymentRecord.coupon ? '' : null, // Will be populated if needed
                            discount: paymentRecord.discountApplied || 0
                        }
                    ).catch(err => {
                        console.error('[Payment] Failed to send purchase confirmation email:', err);
                    });
                }
            }

            console.log(`[Payment] User ${req.user._id} enrolled in course ${courseId} via client verification`);
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

// Helper function to enroll user in course
const enrollUserInCourse = async (userId, courseId, paymentRecord) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            console.error(`[Payment] User not found: ${userId}`);
            return false;
        }

        if (!user.enrolledCourses.includes(courseId)) {
            user.enrolledCourses.push(courseId);

            // Auto-enroll logic: Buy course X get course Y free
            const TARGET_COURSE_ID = "6960e65b670769cfa385fcc4";
            const FREE_BATCH_ID = "697135aa4d70d320275ffcc7";

            if (courseId.toString() === TARGET_COURSE_ID) {
                if (!user.enrolledCourses.includes(FREE_BATCH_ID)) {
                    user.enrolledCourses.push(FREE_BATCH_ID);
                    console.log(`[Payment] User ${userId} auto-enrolled in free batch ${FREE_BATCH_ID}`);
                }
            }

            await user.save();
            console.log(`[Payment] User ${userId} enrolled in course ${courseId}`);
        } else {
            console.log(`[Payment] User ${userId} already enrolled in course ${courseId}`);
        }

        if (paymentRecord) {
            paymentRecord.enrollmentStatus = 'enrolled';
            await paymentRecord.save();
        }

        return true;
    } catch (error) {
        console.error(`[Payment] Enrollment error for user ${userId}:`, error);
        if (paymentRecord) {
            paymentRecord.enrollmentStatus = 'failed';
            paymentRecord.errorLog = error.message;
            await paymentRecord.save();
        }
        return false;
    }
};

// @desc    Razorpay Webhook Handler
// @route   POST /api/payment/webhook
// @access  Public (verified via signature)
const handleWebhook = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // Verify webhook signature
        const signature = req.headers['x-razorpay-signature'];

        if (webhookSecret && signature) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(req.body))
                .digest('hex');

            if (expectedSignature !== signature) {
                console.error('[Webhook] Invalid signature');
                return res.status(400).json({ message: 'Invalid webhook signature' });
            }
        }

        const event = req.body.event;
        const payload = req.body.payload;

        console.log(`[Webhook] Received event: ${event}`);

        // Handle payment.captured event
        if (event === 'payment.captured') {
            const payment = payload.payment.entity;
            const orderId = payment.order_id;
            const paymentId = payment.id;
            const notes = payment.notes || {};

            console.log(`[Webhook] Payment captured: order=${orderId}, payment=${paymentId}`);
            console.log(`[Webhook] Notes:`, notes);

            // Find the payment record
            let paymentRecord = await Payment.findOne({ razorpay_order_id: orderId });

            if (paymentRecord) {
                // Update payment record
                paymentRecord.razorpay_payment_id = paymentId;
                paymentRecord.status = 'paid';
                paymentRecord.verifiedVia = 'webhook';
                paymentRecord.paymentMethod = payment.method;
                paymentRecord.webhookData = payment;
                await paymentRecord.save();

                // Enroll user if not already enrolled
                if (paymentRecord.enrollmentStatus !== 'enrolled') {
                    await enrollUserInCourse(paymentRecord.user, paymentRecord.course, paymentRecord);
                }
            } else {
                // Payment record not found - try to enroll using notes
                console.log(`[Webhook] Payment record not found for order: ${orderId}, using notes`);

                if (notes.userId && notes.courseId) {
                    // Create payment record from webhook data
                    paymentRecord = await Payment.create({
                        razorpay_order_id: orderId,
                        razorpay_payment_id: paymentId,
                        user: notes.userId,
                        course: notes.courseId,
                        amount: payment.amount / 100,
                        currency: payment.currency,
                        status: 'paid',
                        verifiedVia: 'webhook',
                        paymentMethod: payment.method,
                        webhookData: payment
                    });

                    await enrollUserInCourse(notes.userId, notes.courseId, paymentRecord);
                } else {
                    console.error(`[Webhook] Cannot enroll: missing userId or courseId in notes`);
                }
            }
        }

        // Handle payment.failed event
        if (event === 'payment.failed') {
            const payment = payload.payment.entity;
            const orderId = payment.order_id;

            console.log(`[Webhook] Payment failed: order=${orderId}`);

            await Payment.findOneAndUpdate(
                { razorpay_order_id: orderId },
                {
                    status: 'failed',
                    webhookData: payment,
                    errorLog: payment.error_description || 'Payment failed'
                }
            );
        }

        // Acknowledge webhook
        res.json({ status: 'ok' });
    } catch (error) {
        console.error('[Webhook] Error:', error);
        // Still return 200 to prevent Razorpay from retrying
        res.status(200).json({ status: 'error', message: error.message });
    }
};

// @desc    Get Razorpay key (public)
// @route   GET /api/payment/key
// @access  Public
const getKey = (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
};

// @desc    Check payment status (for debugging/manual verification)
// @route   GET /api/payment/status/:orderId
// @access  Private (Admin)
const getPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        const payment = await Payment.findOne({ razorpay_order_id: orderId })
            .populate('user', 'name email')
            .populate('course', 'title');

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        res.json({ payment });
    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({ message: 'Failed to get payment status', error: error.message });
    }
};

// @desc    Get all payments (for admin)
// @route   GET /api/payment/all
// @access  Private (Admin)
const getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('user', 'name email')
            .populate('course', 'title')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({ payments });
    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({ message: 'Failed to get payments', error: error.message });
    }
};

// @desc    Manually enroll user (for admin fixing failed payments)
// @route   POST /api/payment/manual-enroll
// @access  Private (Admin)
const manualEnroll = async (req, res) => {
    try {
        const { userId, courseId, paymentId } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        if (user.enrolledCourses.includes(courseId)) {
            return res.status(400).json({ message: 'User already enrolled in this course' });
        }

        user.enrolledCourses.push(courseId);
        await user.save();

        // Update payment record if provided
        if (paymentId) {
            await Payment.findOneAndUpdate(
                { razorpay_payment_id: paymentId },
                {
                    enrollmentStatus: 'enrolled',
                    verifiedVia: 'manual'
                }
            );
        }

        console.log(`[Payment] Manual enrollment: user=${userId} course=${courseId} by admin=${req.user._id}`);

        res.json({
            success: true,
            message: 'User enrolled successfully',
            user: { id: user._id, name: user.name, email: user.email },
            course: { id: course._id, title: course.title }
        });
    } catch (error) {
        console.error('Manual enroll error:', error);
        res.status(500).json({ message: 'Failed to enroll user', error: error.message });
    }
};

module.exports = {
    createOrder,
    verifyPayment,
    getKey,
    handleWebhook,
    getPaymentStatus,
    getAllPayments,
    manualEnroll
};
