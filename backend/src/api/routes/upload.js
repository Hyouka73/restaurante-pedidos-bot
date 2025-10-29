// backend/src/api/routes/upload.js
const express = require('express');
const router = express.Router();
const { upload, uploadImageToStorage } = require('../middleware/upload');
const { verifyTokenAndGetProfile } = require('../middleware/auth');

// Ruta para subir imagen
// POST /api/upload/image
// El middleware `verifyTokenAndGetProfile` adjunta `req.restaurantId`
// que puede ser usado por `uploadImageToStorage` si se necesita para la ruta de guardado.
router.post('/image', verifyTokenAndGetProfile, upload.single('image'), uploadImageToStorage, (req, res) => {
  res.json({ 
    success: true,
    url: req.imageUrl 
  });
});

module.exports = router;