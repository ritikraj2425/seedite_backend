const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate a unique session ID
const generateSessionId = () => {
    const sessionId = crypto.randomUUID();
    console.log(`[GoogleAuth] Generated new session ID: ${sessionId}`);
    return sessionId;
};

const generateToken = (id, sessionId) => {
    return jwt.sign({ id, sessionId }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d',
    });
};

/**
 * @desc    Authenticate with Google OAuth
 * @route   POST /api/auth/google
 * @access  Public
 * 
 * This endpoint handles both login and signup with Google.
 * - If user exists with this Google ID: log them in
 * - If user exists with this email (signed up with email/password): link Google account
 * - If user doesn't exist: create new account
 */
const googleCallback = async (req, res) => {
    const { code, redirectUri } = req.body;

    if (!code) {
        return res.status(400).json({ message: 'Authorization code is required' });
    }

    try {
        // Step 1: Exchange authorization code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri || `${process.env.FRONTEND_URL}/auth/google/callback`,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error('[GoogleAuth] Token exchange error:', tokenData);
            return res.status(400).json({
                message: 'Failed to authenticate with Google',
                error: tokenData.error_description || tokenData.error
            });
        }

        // Step 2: Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const googleUser = await userInfoResponse.json();

        if (!googleUser.email) {
            return res.status(400).json({ message: 'Failed to get user information from Google' });
        }

        console.log(`[GoogleAuth] Google user info received: ${googleUser.email}`);

        // Step 3: Find or create user
        let user = await User.findOne({
            $or: [
                { googleId: googleUser.id },
                { email: googleUser.email.toLowerCase() }
            ]
        });

        const sessionId = generateSessionId();

        if (user) {
            // User exists - check if we need to link Google account
            if (!user.googleId) {
                // User signed up with email/password, now linking Google account
                console.log(`[GoogleAuth] Linking Google account to existing user: ${user.email}`);
                user.googleId = googleUser.id;
                // Keep authProvider as 'local' since they originally signed up that way
                // This allows them to still use password if they want
            }

            // Update session token
            user.activeSessionToken = sessionId;
            await user.save();

            console.log(`[GoogleAuth] Existing user logged in: ${user.email}`);
        } else {
            // New user - create account
            user = await User.create({
                name: googleUser.name,
                email: googleUser.email.toLowerCase(),
                googleId: googleUser.id,
                authProvider: 'google',
                activeSessionToken: sessionId
                // No password needed for Google users
            });

            console.log(`[GoogleAuth] New user created: ${user.email}`);

            // Send welcome email (non-blocking)
            try {
                const { sendWelcomeEmail } = require('../utils/emailService');
                sendWelcomeEmail(user.email, user.name).catch(err => {
                    console.error('[GoogleAuth] Failed to send welcome email:', err);
                });
            } catch (emailError) {
                console.error('[GoogleAuth] Email service error:', emailError);
            }
        }

        // Step 4: Generate JWT token and respond
        const token = generateToken(user._id, sessionId);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            sameSite: 'strict'
        });

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            authProvider: user.authProvider,
            token
        });

    } catch (error) {
        console.error('[GoogleAuth] Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { googleCallback };
