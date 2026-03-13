const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Generate a unique session ID
const generateSessionId = () => {
    const sessionId = crypto.randomUUID();
    console.log(`[Auth] Generated new session ID: ${sessionId}`);
    return sessionId;
};

const generateToken = (id, sessionId) => {
    return jwt.sign({ id, sessionId }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate session ID for this login
        const sessionId = generateSessionId();

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            activeSessionToken: sessionId
        });

        if (user) {
            const token = generateToken(user._id, sessionId);
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                sameSite: 'strict'
            });

            // Send welcome email (non-blocking)
            const { sendWelcomeEmail } = require('../utils/emailService');
            sendWelcomeEmail(user.email, user.name).catch(err => {
                console.error('[Auth] Failed to send welcome email:', err);
            });

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.authProvider === 'google' && !user.password) {
            return res.status(400).json({ message: 'This account uses Google Sign-In. Please sign in with Google.' });
        }

        if (await bcrypt.compare(password, user.password)) {
            // Generate new session ID - this invalidates any previous sessions
            const sessionId = generateSessionId();

            // Save new session ID to user (invalidates old sessions)
            user.activeSessionToken = sessionId;
            await user.save();

            const token = generateToken(user._id, sessionId);
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                sameSite: 'strict'
            });

            console.log(`[Auth] User ${user.email} logged in with new session: ${sessionId}`);

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = async (req, res) => {
    try {
        // Clear the session token if user is authenticated
        if (req.user) {
            await User.findByIdAndUpdate(req.user._id, { activeSessionToken: null });
        }
    } catch (error) {
        console.error('Logout error:', error);
    }

    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({ message: 'Logged out' });
};

// @desc    Forgot password - send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if user exists
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash the token before storing
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Set token and expiry (15 minutes)
        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save();

        // Create reset URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        // Send email
        const { sendPasswordResetEmail } = require('../utils/emailService');
        await sendPasswordResetEmail(user.email, resetUrl, user.name);

        console.log(`[Auth] Password reset email sent to: ${user.email}`);

        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Error sending password reset email. Please try again later.' });
    }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Hash the token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token. Please request a new password reset.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Clear reset token fields
        user.passwordResetToken = null;
        user.passwordResetExpires = null;

        // Invalidate all existing sessions
        user.activeSessionToken = null;

        await user.save();

        console.log(`[Auth] Password reset successful for: ${user.email}`);

        res.json({ message: 'Password reset successful. You can now login with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { registerUser, loginUser, logoutUser, forgotPassword, resetPassword };

