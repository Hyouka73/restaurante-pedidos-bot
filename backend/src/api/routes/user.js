// backend/src/api/routes/user.js
const express = require('express');
const authService = require('../../services/authService');
const { admin } = require('../../config/firebase');

const router = express.Router();

// Middleware para verificar token de Firebase Auth
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// GET /api/user/notification-prefs
router.get('/notification-prefs', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const prefs = await authService.getUserNotificationPrefs(uid);
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/user/notification-prefs
router.put('/notification-prefs', verifyToken, async (req, res) => {
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
