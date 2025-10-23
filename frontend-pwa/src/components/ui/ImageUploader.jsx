// frontend-pwa/src/components/ui/ImageUploader.jsx
import { useState } from 'react';
import { useAlert } from './CustomAlert'; // Usamos el alert del frontend
import { ButtonLoader } from './Loader';
import { Upload } from 'lucide-react';
import { api } from '../../services/api'; // Importa tu servicio API

const ImageUploader = ({ onUploadSuccess, onError, currentImageUrl = '', accept = "image/*", maxFileSizeMB = 5 }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl); // Vista previa local
  const [uploading, setUploading] = useState(false);
  const { showAlert } = useAlert(); // Obtén la función showAlert

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validación de tipo
      if (!selectedFile.type.startsWith('image/')) {
        const errorMsg = 'Por favor selecciona un archivo de imagen válido.';
        if (onError) onError(errorMsg);
        showAlert(errorMsg, 'error', 3000);
        return;
      }
      // Validación de tamaño
      const maxSizeBytes = maxFileSizeMB * 1024 * 1024; // Convertir MB a bytes
      if (selectedFile.size > maxSizeBytes) {
        const errorMsg = `El archivo es demasiado grande. Máximo ${maxFileSizeMB}MB permitidos.`;
        if (onError) onError(errorMsg);
        showAlert(errorMsg, 'error', 3000);
        return;
      }

      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile)); // Vista previa local
    }
  };

  const handleUpload = async () => {
    if (!file) {
      const errorMsg = 'No se ha seleccionado ningún archivo.';
      if (onError) onError(errorMsg);
      showAlert(errorMsg, 'warning', 3000);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      // Enviar al backend
      const response = await api.post('/upload/image', formData); // Nueva ruta en el backend
      const downloadURL = response.url; // Asumiendo que el backend devuelve { url: '...' }

      // Notificar al componente padre
      onUploadSuccess(downloadURL);
      showAlert('Imagen subida exitosamente.', 'success', 2000);

    } catch (error) {
      console.error('Error al subir imagen:', error);
      const errorMsg = 'Error al subir la imagen: ' + error.message;
      if (onError) onError(errorMsg);
      showAlert(errorMsg, 'error', 4000);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreviewUrl(''); // Limpiar vista previa
    onUploadSuccess(''); // Notificar al padre que la URL es vacía
    showAlert('Imagen removida.', 'info', 2000);
  };

  return (
    <div className="form-control mt-2">
      <label className="label">
        <span className="label-text">Seleccionar Imagen</span>
      </label>
      <input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="file-input file-input-bordered w-full max-w-xs"
      />
      {previewUrl && (
        <div className="mt-2">
          <img src={previewUrl} alt="Vista previa" className="max-w-xs max-h-48 object-contain border rounded-lg" />
          <button
            type="button"
            onClick={handleRemove}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors flex items-center gap-1"
          >
            Remover
          </button>
        </div>
      )}
      <button
        type="button"
        className="btn btn-sm btn-primary mt-2"
        onClick={handleUpload}
        disabled={uploading || !file}
      >
        {uploading ? <><ButtonLoader size="xs" /> Subiendo...</> : <><Upload size={14} /> Subir Imagen</>}
      </button>
    </div>
  );
};

export default ImageUploader;