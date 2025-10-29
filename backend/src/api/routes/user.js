// backend/src/api/routes/user.js
const express = require('express');
const authService = require('../../services/authService');
const { verifyTokenAndGetProfile } = require('../middleware/auth');

const router = express.Router();

// GET /api/user/notification-prefs
router.get('/notification-prefs', verifyTokenAndGetProfile, async (req, res) => {
  try {
    const { uid } = req.user;
    const prefs = await authService.getUserNotificationPrefs(uid);
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/user/notification-prefs
router.put('/notification-prefs', verifyTokenAndGetProfile, async (req, res) => {
  try {
    const { uid } = req.user;
    const prefs = req.body;
    // Basic validation to prevent saving unwanted fields
    const allowedPrefs = {};
    if (prefs.notificationsEnabled !== undefined) {
        allowedPrefs.notificationsEnabled = prefs.notificationsEnabled;
    }
    if (prefs.fcmToken !== undefined) {
        allowedPrefs.fcmToken = prefs.fcmToken;
    }

    if (Object.keys(allowedPrefs).length === 0) {
        return res.status(400).json({ error: 'No valid preferences provided' });
    }

    await authService.updateUserNotificationPrefs(uid, allowedPrefs);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
