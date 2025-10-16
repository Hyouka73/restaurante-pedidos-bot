// backend/src/api/routes/auth.js
const express = require('express');
const authService = require('../../services/authService');
const { admin } = require('../../config/firebase');

const router = express.Router();

// --- MIDDLEWARES ---

// Middleware para verificar token de Firebase Auth (NO verifica existencia en Firestore)
// Este middleware SOLO verifica el token JWT de Firebase Auth.
const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado (verifyFirebaseToken)' });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Agrega los datos del usuario al request
    next();
  } catch (error) {
    console.error("Error verificando token Firebase:", error);
    res.status(401).json({ error: 'Token inválido (verifyFirebaseToken)' });
  }
};

// Middleware para verificar token Y existencia en Firestore
// Este middleware verifica el token y ADEMÁS exige que el perfil en Firestore exista.
const verifyTokenAndProfile = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado (verifyTokenAndProfile)' });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Agrega los datos del usuario al request

    // Verificar si el perfil de usuario existe en Firestore
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado en la base de datos (verifyTokenAndProfile).' });
    }
    const userData = userDoc.data();
    req.restaurantId = userData.restaurantId;

    // Opcional: Verificar restaurantDoc.exists también
    next();
  } catch (error) {
    console.error("Error verificando token o perfil:", error);
    res.status(401).json({ error: 'Token inválido o perfil no encontrado (verifyTokenAndProfile)' });
  }
};

// --- RUTAS ---

// POST /api/auth/ensure-profile - Crear perfil si no existe
// Esta ruta NO usa verifyTokenAndProfile, sino verifyFirebaseToken
// porque su propósito es CREAR el perfil si no existe.
router.post('/ensure-profile', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, email, displayName } = req.user; // Obtenido del token verificado

    console.log(`[ensure-profile] Solicitud recibida para UID: ${uid}`);

    // Verificar si el perfil de usuario existe
    const userDocRef = admin.firestore().collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      console.log(`[ensure-profile] Usuario ${uid} no encontrado, creando...`);
      // Si no existe, crearlo (y el restaurante asociado)
      await authService.createUserWithRestaurant({
        uid,
        email,
        displayName: displayName || email.split('@')[0]
      });
      console.log(`[ensure-profile] Perfil y restaurante para ${uid} creados.`);
      return res.json({ success: true, message: 'Perfil y restaurante creados.' });
    } else {
      console.log(`[ensure-profile] Perfil para ${uid} ya existía.`);
      // Si ya existe, devolver éxito
      // Opcional: Verificar restaurantDoc.exists también
      return res.json({ success: true, message: 'Perfil ya existía.' });
    }
  } catch (error) {
    console.error('[ensure-profile] Error interno:', error);
    res.status(500).json({ error: `Error interno del servidor: ${error.message}` });
  }
});

// GET /api/auth/profile - Obtener perfil del usuario y restaurante
// Esta ruta SÍ requiere que el perfil exista.
router.get('/profile', verifyTokenAndProfile, async (req, res) => {
  try {
    const profile = await authService.getRestaurantByUserUid(req.user.uid);
    res.json({
      user: {
        uid: req.user.uid,
        email: req.user.email,
        displayName: req.user.displayName,
      },
      restaurant: profile
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/profile - Actualizar perfil del restaurante (info básica)
router.put('/profile', verifyTokenAndProfile, async (req, res) => {
  try {
    const updateData = { info: req.body };
    await authService.updateRestaurantInfo(req.restaurantId, updateData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/link-telegram-token
router.post('/link-telegram-token', verifyTokenAndProfile, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token de bot es requerido.' });
    }

    const { Telegraf } = require('telegraf');
    const tempBot = new Telegraf(token);
    try {
      await tempBot.telegram.getMe();
      res.json({ success: true, message: 'Token de bot verificado exitosamente.' });
    } catch (telegramError) {
      console.error('Error verificando token de bot:', telegramError);
      return res.status(400).json({ error: 'Token de bot inválido o no autorizado.' });
    }

  } catch (error) {
    console.error('Error en link-telegram-token:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;