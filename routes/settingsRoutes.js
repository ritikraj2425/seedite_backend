const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { protect, admin } = require('../middleware/authMiddleware');

// GET /api/settings/banner - Get banner settings (public)
router.get('/banner', async (req, res) => {
    try {
        const settings = await Settings.findOne({ key: 'banner' });

        if (!settings) {
            return res.json({
                active: false,
                text: '',
                link: '',
                expiresAt: null
            });
        }

        res.json(settings.value);
    } catch (error) {
        console.error('Error fetching banner settings:', error);
        res.status(500).json({ message: 'Failed to fetch banner settings' });
    }
});

// POST /api/settings/banner - Update banner settings (admin only)
router.post('/banner', protect, admin, async (req, res) => {
    try {
        const { active, text, link, expiresAt } = req.body;

        const bannerValue = {
            active: !!active,
            text: text || '',
            link: link || '',
            expiresAt: expiresAt || null
        };

        const settings = await Settings.findOneAndUpdate(
            { key: 'banner' },
            {
                key: 'banner',
                value: bannerValue,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({
            message: 'Banner settings updated successfully',
            data: settings.value
        });
    } catch (error) {
        console.error('Error updating banner settings:', error);
        res.status(500).json({ message: 'Failed to update banner settings' });
    }
});

module.exports = router;
