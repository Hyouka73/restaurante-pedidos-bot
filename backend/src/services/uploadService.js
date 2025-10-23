// backend/src/services/uploadService.js
const { getStorage } = require('firebase-admin/storage');
const { db } = require('../config/firebase'); // Si necesitas interactuar con Firestore desde aquí

class UploadService {

  async uploadImageToStorage(buffer, originalName, folder = 'menu_items') {
    try {
      const bucket = getStorage().bucket(); // Obtener el bucket de Storage
      // Nombre único, incluyendo la carpeta
      const fileName = `${folder}/${Date.now()}_${originalName}`;
      const file = bucket.file(fileName);

      // Subir el buffer a Storage
      await file.save(buffer, {
        metadata: {
          contentType: this.getMimeType(originalName), // Inferir tipo MIME del nombre
        },
      });

      // Generar la URL de descarga pública (asegúrate de que el bucket sea público o ajusta permisos)
      // Si el bucket es público, puedes usar getDownloadURL
      // const { getDownloadURL, ref } = require('firebase-admin/storage');
      // const url = await getDownloadURL(ref(getStorage(), fileName));

      // Si usas signed URLs (recomendado para control de acceso)
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491', // Fecha de expiración muy lejana
      });

      return url; // Devolver la URL generada

    } catch (error) {
      console.error('Error en uploadService.uploadImageToStorage:', error);
      throw error; // Volver a lanzar para que el controlador lo maneje
    }
  }

  // Método auxiliar para inferir el tipo MIME (opcional, multer ya lo proporciona)
  getMimeType(originalName) {
    const ext = originalName.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      // Agrega más tipos si es necesario
    };
    return mimeTypes[ext] || 'application/octet-stream'; // Tipo por defecto
  }
}

module.exports = new UploadService();