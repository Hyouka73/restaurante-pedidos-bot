// backend/src/api/routes/upload.js
const express = require('express');
const router = express.Router();
const { upload, uploadImageToStorage } = require('../middleware/upload'); // Ruta relativa a este archivo
const { admin } = require('../../config/firebase'); // Para verificar el token

// Middleware para verificar token de Firebase Auth (copiado de otros archivos)
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    console.error("No token provided in request headers.");
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Agrega los datos del usuario al request
    console.log("Token verified for user:", decodedToken.uid); // Log para depuración
    next();
  } catch (error) {
    console.error("Error verificando token:", error);
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Ruta para subir imagen
// POST /api/upload/image
router.post('/image', verifyToken, upload.single('image'), uploadImageToStorage, (req, res) => {
  // uploadImageToStorage ya ha añadido req.imageUrl
  res.json({ url: req.imageUrl });
});

module.exports = router;