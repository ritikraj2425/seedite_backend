const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const LiveSession = require('../models/LiveSession');
const { sendLiveSessionRegistrationEmail } = require('../utils/emailService');

// @desc    Get all live sessions (Admin)
// @route   GET /api/live-sessions
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
    try {
        const sessions = await LiveSession.find({})
            .populate('registeredUsers', 'name email')
            .sort({ startTime: -1 });
        res.json(sessions);
    } catch (error) {
        console.error('Error fetching live sessions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Create a live session
// @route   POST /api/live-sessions
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
    try {
        const { title, description, sessionDate, sessionTime, startTime, endTime, isActive } = req.body;

        const session = await LiveSession.create({
            title,
            description,
            sessionDate,
            sessionTime,
            startTime,
            endTime,
            isActive: isActive || false
        });

        res.status(201).json(session);
    } catch (error) {
        console.error('Error creating live session:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Update a live session
// @route   PUT /api/live-sessions/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const { title, description, sessionDate, sessionTime, startTime, endTime, isActive } = req.body;

        const session = await LiveSession.findById(req.params.id);

        if (session) {
            session.title = title || session.title;
            session.description = description || session.description;
            session.sessionDate = sessionDate || session.sessionDate;
            session.sessionTime = sessionTime || session.sessionTime;
            session.startTime = startTime || session.startTime;
            session.endTime = endTime || session.endTime;
            session.isActive = isActive !== undefined ? isActive : session.isActive;

            const updatedSession = await session.save();
            res.json(updatedSession);
        } else {
            res.status(404).json({ message: 'Session not found' });
        }
    } catch (error) {
        console.error('Error updating live session:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Delete a live session
// @route   DELETE /api/live-sessions/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id);

        if (session) {
            await session.deleteOne();
            res.json({ message: 'Session removed' });
        } else {
            res.status(404).json({ message: 'Session not found' });
        }
    } catch (error) {
        console.error('Error deleting live session:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Get currently active live session
// @route   GET /api/live-sessions/active
// @access  Public
router.get('/active', async (req, res) => {
    try {
        // Find a session that is marked as active and has not yet ended
        const activeSession = await LiveSession.findOne({
            isActive: true,
            endTime: { $gte: new Date() }
        }).sort({ startTime: 1 });

        if (activeSession) {
            res.json(activeSession);
        } else {
            res.json(null);
        }
    } catch (error) {
        console.error('Error fetching active live session:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Register for a live session
// @route   POST /api/live-sessions/:id/register
// @access  Private
router.post('/:id/register', protect, async (req, res) => {
    try {
        const session = await LiveSession.findById(req.params.id);

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        if (!session.isActive || session.endTime < new Date()) {
            return res.status(400).json({ message: 'This session is not available for registration' });
        }

        // Check if user is already registered
        const isRegistered = session.registeredUsers.includes(req.user._id);

        if (isRegistered) {
            return res.status(400).json({ message: 'You have already registered for this session' });
        }

        // Register the user
        session.registeredUsers.push(req.user._id);
        await session.save();

        // Send confirmation email
        if (req.user.email) {
            await sendLiveSessionRegistrationEmail(
                req.user.email,
                req.user.name || 'Student',
                {
                    title: session.title,
                    sessionDate: session.sessionDate,
                    sessionTime: session.sessionTime
                }
            );
        }

        res.status(200).json({ message: 'Successfully registered for the session' });
    } catch (error) {
        console.error('Error registering for live session:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
