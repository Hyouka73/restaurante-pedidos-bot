// frontend-pwa/src/components/ui/ImageUploader.jsx
import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import  api  from '../../services/api';
import { ButtonLoader } from './Loader';

const ImageUploader = ({ 
  onUploadSuccess, 
  onError, 
  currentImageUrl = '', 
  maxFileSizeMB = 5 
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImageUrl);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      const error = new Error('Solo se permiten archivos de imagen');
      if (onError) onError(error);
      return;
    }

    // Validar tamaño
    const maxSize = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      const error = new Error(`El archivo debe ser menor a ${maxFileSizeMB}MB`);
      if (onError) onError(error);
      return;
    }

    // Crear preview local
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Subir imagen
    setUploading(true);
    try {
      const response = await api.upload('/upload/image', file);
      
      if (response && response.url) {
        setPreview(response.url);
        if (onUploadSuccess) {
          onUploadSuccess(response.url);
        }
      } else {
        throw new Error('No se recibió URL de la imagen');
      }
    } catch (error) {
      console.error('Error al subir imagen:', error);
      setPreview(currentImageUrl); // Restaurar preview anterior
      if (onError) {
        onError(error);
      }
    } finally {
      setUploading(false);
      // Limpiar el input para permitir subir el mismo archivo otra vez
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setPreview('');
    if (onUploadSuccess) {
      onUploadSuccess('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="image-upload"
        disabled={uploading}
      />
      
      <div className="flex flex-col gap-3">
        {preview ? (
          <div className="relative group">
            {/* Imagen en tamaño más pequeño y bonito */}
            <img
              src={preview}
              alt="Preview"
              className="w-full h-32 object-cover rounded-lg border-2 border-gray-300"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <ButtonLoader size="md" />
              </div>
            )}
            {!uploading && (
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                type="button"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ) : (
          <label
            htmlFor="image-upload"
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${
              uploading ? 'opacity-50 cursor-not-allowed' : 'border-gray-300'
            }`}
          >
            {uploading ? (
              <ButtonLoader size="md" />
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                <p className="text-xs text-gray-500 text-center px-2">
                  <span className="font-semibold">Click para subir</span> imagen
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG hasta {maxFileSizeMB}MB
                </p>
              </>
            )}
          </label>
        )}
        
        {preview && !uploading && (
          <label
            htmlFor="image-upload"
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer text-sm"
          >
            <Upload size={16} />
            Cambiar imagen
          </label>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;