// frontend-pwa/src/components/menu/ItemImageUpload.jsx
import ImageUploader from '../ui/ImageUploader'; // Importar el componente reutilizable
import { X } from 'lucide-react';

const ItemImageUpload = ({ imageUrl, onImageChange }) => { // Recibe la URL actual y una función para actualizarla

  const handleUploadSuccess = (url) => {
    onImageChange(url); // Notificar al padre con la nueva URL
  };

  const handleUploadError = (error) => {
    // Puedes manejar el error aquí si es necesario, o dejar que lo maneje ImageUploader
    console.error("Error en ItemImageUpload:", error);
  };

  return (
    <div className="form-control mt-2">
      <label className="label">
        <span className="label-text">Imagen del Item</span>
      </label>
      <ImageUploader
        onUploadSuccess={handleUploadSuccess}
        onError={handleUploadError}
        currentImageUrl={imageUrl}
        maxFileSizeMB={5} // Puedes pasar este límite como prop también
      />
      {imageUrl && !imageUrl.startsWith('blob:') && ( // Mostrar solo si hay una URL real (no una vista previa local)
        <div className="mt-2">
          <p className="text-sm text-gray-500">Imagen actual:</p>
          <img src={imageUrl} alt="Actual" className="max-w-xs max-h-48 object-contain border rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default ItemImageUpload;