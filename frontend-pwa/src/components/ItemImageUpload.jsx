// frontend-pwa/src/components/ItemImageUpload.jsx
// Componente para subir imágenes de items del menú a Firebase Storage
// Requiere configuración de Firebase Storage y reglas de seguridad.

import { useState } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function ImageItemUpload({ onUploadSuccess, onError }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Previsualización local
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      onError && onError('No se ha seleccionado ningún archivo.');
      return;
    }

    const storage = getStorage();
    // Nombre único para la imagen
    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `menu_items/${fileName}`; // Carpeta en Storage
    const storageRef = ref(storage, storagePath);

    setUploading(true);
    try {
      // Subir archivo
      const snapshot = await uploadBytes(storageRef, file);
      console.log('Imagen subida:', snapshot.ref.fullPath);

      // Obtener URL de descarga
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('URL de la imagen:', downloadURL);

      // Notificar al componente padre
      onUploadSuccess(downloadURL);
      setFile(null);
      setPreviewUrl('');
    } catch (error) {
      console.error('Error al subir imagen:', error);
      onError && onError('Error al subir la imagen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="form-control">
      <label className="label">Imagen del Producto</label>
      <input
        type="file"
        className="file-input file-input-bordered w-full"
        accept="image/*"
        onChange={handleFileChange}
      />
      {previewUrl && (
        <div className="mt-2">
          <p className="text-sm text-gray-500 mb-1">Previsualización:</p>
          <img src={previewUrl} alt="Vista previa" className="max-w-xs max-h-48 object-contain border" />
        </div>
      )}
      <div className="form-control mt-2">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={handleUpload}
          disabled={uploading || !file}
        >
          {uploading ? 'Subiendo...' : 'Subir Imagen'}
        </button>
      </div>
    </div>
  );
}