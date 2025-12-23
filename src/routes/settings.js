const express = require('express');
const router = express.Router();
const { requireLogin, requireAdmin } = require('../middleware/auth');
const GlobalSettings = require('../models/GlobalSettings');

// Get background video setting (all authenticated users)
router.get('/background-video', requireLogin, async (req, res) => {
    try {
        const enabled = await GlobalSettings.getSetting('background_video_enabled');
        res.json({ enabled: enabled === 'true' });
    } catch (error) {
        console.error('Error getting background video setting:', error);
        res.status(500).json({ error: 'Không thể lấy thiết lập' });
    }
});

// Toggle background video setting (admin only)
router.post('/background-video/toggle', requireAdmin, async (req, res) => {
    try {
        console.log('Toggle endpoint called');
        console.log('User session:', req.session);
        console.log('User from middleware:', req.user);

        const currentSetting = await GlobalSettings.getSetting('background_video_enabled');
        console.log('Current setting:', currentSetting);

        const newValue = currentSetting === 'true' ? 'false' : 'true';
        console.log('New value:', newValue);

        // Use session userId if req.user is not available
        const userId = req.user?.id || req.session?.userId || null;
        console.log('Using userId:', userId);

        await GlobalSettings.setSetting('background_video_enabled', newValue, userId);
        console.log('Setting updated successfully');

        res.json({
            enabled: newValue === 'true',
            message: `Video nền đã được ${newValue === 'true' ? 'bật' : 'tắt'} cho toàn hệ thống`
        });
    } catch (error) {
        console.error('Error toggling background video:', error);
        console.error('Error stack:', error.stack);
        const payload = { error: 'Không thể đổi thiết lập' };
        if (process.env.NODE_ENV !== 'production') {
            payload.details = error.message;
        }
        res.status(500).json(payload);
    }
});

// Get all settings (admin only)
router.get('/all', requireAdmin, async (req, res) => {
    try {
        const settings = await GlobalSettings.getAllSettings();
        res.json({ settings });
    } catch (error) {
        console.error('Error getting all settings:', error);
        res.status(500).json({ error: 'Không thể lấy danh sách thiết lập' });
    }
});

module.exports = router;
