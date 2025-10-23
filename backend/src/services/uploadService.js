// backend/src/services/uploadService.js
const { bucket } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

class UploadService {
  /**
   * Sube una imagen a Firebase Storage
   * @param {Buffer} fileBuffer - Buffer del archivo
   * @param {string} originalName - Nombre original del archivo
   * @param {string} folder - Carpeta donde guardar (ej: 'menu_items', 'combos')
   * @returns {Promise<string>} - URL pública de la imagen
   */
  async uploadImageToStorage(fileBuffer, originalName, folder = 'uploads') {
    try {
      // Generar nombre único para el archivo
      const fileExtension = originalName.split('.').pop();
      const fileName = `${folder}/${uuidv4()}.${fileExtension}`;
      
      // Crear referencia al archivo en el bucket
      const file = bucket.file(fileName);
      
      // Subir el archivo
      await file.save(fileBuffer, {
        metadata: {
          contentType: this.getContentType(fileExtension),
          metadata: {
            firebaseStorageDownloadTokens: uuidv4(), // Token para URL pública
          }
        },
        public: true, // Hacer el archivo público
      });

      // Hacer el archivo accesible públicamente
      await file.makePublic();

      // Obtener la URL pública
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      
      console.log('Imagen subida exitosamente:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error al subir imagen a Storage:', error);
      throw new Error('Error al subir la imagen: ' + error.message);
    }
  }

  /**
   * Elimina una imagen de Firebase Storage
   * @param {string} imageUrl - URL de la imagen a eliminar
   */
  async deleteImageFromStorage(imageUrl) {
    try {
      // Extraer el nombre del archivo de la URL
      const fileName = this.extractFileNameFromUrl(imageUrl);
      if (!fileName) {
        console.warn('No se pudo extraer el nombre del archivo de la URL');
        return;
      }

      const file = bucket.file(fileName);
      await file.delete();
      console.log('Imagen eliminada exitosamente:', fileName);
    } catch (error) {
      console.error('Error al eliminar imagen de Storage:', error);
      // No lanzar error para no bloquear otras operaciones
    }
  }

  /**
   * Extrae el nombre del archivo de una URL de Firebase Storage
   * @param {string} url - URL completa de la imagen
   * @returns {string|null} - Nombre del archivo o null
   */
  extractFileNameFromUrl(url) {
    try {
      if (!url || !url.includes('storage.googleapis.com')) {
        return null;
      }
      
      // Formato: https://storage.googleapis.com/bucket-name/folder/filename.ext
      const parts = url.split('/');
      const bucketIndex = parts.findIndex(part => part === bucket.name);
      
      if (bucketIndex === -1 || bucketIndex === parts.length - 1) {
        return null;
      }
      
      // Unir las partes después del nombre del bucket
      return parts.slice(bucketIndex + 1).join('/');
    } catch (error) {
      console.error('Error al extraer nombre de archivo:', error);
      return null;
    }
  }

  /**
   * Obtiene el content type basado en la extensión
   * @param {string} extension - Extensión del archivo
   * @returns {string} - Content type
   */
  getContentType(extension) {
    const contentTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    
    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}

module.exports = new UploadService();