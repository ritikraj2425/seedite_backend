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

        if (user && (await bcrypt.compare(password, user.password))) {
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

module.exports = { registerUser, loginUser, logoutUser };
