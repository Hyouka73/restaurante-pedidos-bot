const express = require('express');
const authService = require('../../services/authService');
const { admin } = require('../../config/firebase');
const jwt = require('jsonwebtoken');

const router = express.Router();

// --- MIDDLEWARES ---

const verifyApiToken = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// --- RUTAS ---

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { user, restaurant } = await authService.login(email, password);
    const token = jwt.sign({ uid: user.uid, restaurantId: restaurant.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });

    res.json({ user, restaurant });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logout successful' });
});

router.get('/me', verifyApiToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(userDoc.data());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;