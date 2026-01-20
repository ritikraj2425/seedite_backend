const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.cookies.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized, user not found' });
        }

        // Check if session is still valid (single device login)
        if (decoded.sessionId) {
            if (req.user.activeSessionToken !== decoded.sessionId) {
                console.log(`[Auth] Session BLOCKED for user ${req.user.email} (${req.user._id}). Token session: ${decoded.sessionId}, Active session: ${req.user.activeSessionToken}`);
                return res.status(401).json({
                    message: 'Session expired. You have been logged in on another device.',
                    code: 'SESSION_EXPIRED'
                });
            }
        } else {

            // If user has an active session in DB, this legacy token is invalid
            if (req.user.activeSessionToken) {
                return res.status(401).json({
                    message: 'Session expired. You have been logged in on another device.',
                    code: 'SESSION_EXPIRED'
                });
            }
        }

        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
