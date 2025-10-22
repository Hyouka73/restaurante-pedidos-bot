// frontend-pwa/src/components/menu/ItemImageUpload.jsx
import { useState } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth } from '../../config/firebase'; // Asegúrate de tener auth importado si es necesario para identificar al usuario
import { useAlert } from '../ui/CustomAlert'; // Usamos el alert del frontend
import { ButtonLoader } from '../ui/Loader';
import { Upload, X } from 'lucide-react';

const ItemImageUpload = ({ onUploadSuccess, currentImageUrl = '', onRemoveImage }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl); // Usamos la URL actual como vista previa inicial
  const [uploading, setUploading] = useState(false);
  const { showAlert } = useAlert();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        showAlert('Por favor selecciona un archivo de imagen válido.', 'error', 3000);
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile)); // Vista previa local
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showAlert('No se ha seleccionado ningún archivo.', 'warning', 3000);
      return;
    }

    const storage = getStorage();
    // Nombre único para la imagen, posiblemente incluyendo el ID del usuario o restaurante para organización
    const user = auth.currentUser;
    if (!user) {
        showAlert('Usuario no autenticado.', 'error', 3000);
        return;
    }
    const fileName = `${user.uid}_${Date.now()}_${file.name}`;
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
      showAlert('Imagen subida exitosamente.', 'success', 2000);

    } catch (error) {
      console.error('Error al subir imagen:', error);
      showAlert('Error al subir la imagen: ' + error.message, 'error', 4000);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreviewUrl(''); // Limpiar vista previa
    onRemoveImage(); // Notificar al padre para limpiar el campo de URL
    showAlert('Imagen removida.', 'info', 2000);
  };

  return (
    <div className="form-control mt-2">
      <label className="label">
        <span className="label-text">Imagen del Item</span>
      </label>
      <input
        type="file"
        accept="image/*"
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
            <X size={14} /> Remover
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

export default ItemImageUpload;