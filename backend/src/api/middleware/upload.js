// backend/src/api/middleware/upload.js
const multer = require('multer');
const uploadService = require('../../services/uploadService');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Middleware para subir imagen a Firebase Storage
const uploadImageToStorage = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se ha subido ningún archivo' });
  }

  try {
    const url = await uploadService.uploadImageToStorage(
      req.file.buffer,
      req.file.originalname,
      'menu_items' // Carpeta por defecto
    );

    req.imageUrl = url;
    next();
  } catch (error) {
    console.error('Error subiendo imagen a Storage desde middleware:', error);
    return res.status(500).json({ 
      error: 'Error al subir la imagen',
      details: error.message 
    });
  }
};

module.exports = { upload, uploadImageToStorage };