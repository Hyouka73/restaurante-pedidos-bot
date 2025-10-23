// backend/src/api/middleware/upload.js
const multer = require('multer');
const uploadService = require('../../services/uploadService'); // Importar el servicio

const storage = multer.memoryStorage(); // Almacenar en memoria temporalmente
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo imágenes
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
    // Usar el servicio para subir la imagen
    const url = await uploadService.uploadImageToStorage(
      req.file.buffer,        // El buffer del archivo
      req.file.originalname,  // El nombre original del archivo
      'menu_items'            // La carpeta específica (puedes pasarla como parámetro si es dinámica)
    );

    req.imageUrl = url; // Añadir la URL al objeto request
    next(); // Continuar al siguiente middleware o controlador
  } catch (error) {
    console.error('Error subiendo imagen a Storage desde middleware:', error);
    return res.status(500).json({ error: 'Error interno del servidor al subir la imagen' });
  }
};

module.exports = { upload, uploadImageToStorage };