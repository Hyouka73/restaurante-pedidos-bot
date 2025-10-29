// backend/src/api/middleware/auth.js
const { admin, db } = require('../../config/firebase');

/**
 * Middleware para verificar el token de Firebase y el perfil del usuario en Firestore.
 * Obtiene el token, lo verifica con Firebase Auth, y luego busca el perfil
 * del usuario y su restaurante en Firestore.
 * 
 * Si todo es correcto, adjunta `req.user` y `req.restaurant` al objeto de solicitud.
 */
const verifyTokenAndGetProfile = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado.' });
  }

  try {
    // 1. Verificar el token JWT con Firebase Auth
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Adjuntar info del token (uid, email, etc.)

    // 2. Obtener el perfil del usuario desde Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: 'Perfil de usuario no encontrado en la base de datos.' });
    }
    const userData = userDoc.data();
    req.restaurantId = userData.restaurantId; // Adjuntar el ID del restaurante

    next(); // Todo correcto, continuar a la ruta
  } catch (error) {
    console.error("Error en middleware de autenticación (getProfile):", error);
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

/**
 * Middleware para verificar el token de Firebase y que el usuario sea dueño
 * del restaurante especificado en `req.params.restaurantId`.
 * Es una versión más estricta que `verifyTokenAndGetProfile`.
 */
const verifyTokenAndOwner = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado.' });
  }

  try {
    // 1. Verificar el token JWT con Firebase Auth
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Adjuntar info del token (uid, email, etc.)

    // 2. Obtener el perfil del usuario desde Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: 'Perfil de usuario no encontrado en la base de datos.' });
    }
    const userData = userDoc.data();

    // 3. Verificar que el usuario es dueño del restaurante solicitado
    if (userData.restaurantId !== req.params.restaurantId) {
      return res.status(403).json({ error: 'No autorizado para acceder a este recurso.' });
    }

    next(); // Todo correcto, continuar a la ruta
  } catch (error) {
    console.error("Error en middleware de autenticación:", error);
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

module.exports = { verifyTokenAndOwner, verifyTokenAndGetProfile };