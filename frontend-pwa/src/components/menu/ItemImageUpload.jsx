// frontend-pwa/src/components/menu/ItemImageUpload.jsx
import ImageUploader from '../ui/ImageUploader';

const ItemImageUpload = ({ imageUrl, onImageChange }) => {
  const handleUploadSuccess = (url) => {
    onImageChange(url);
  };

  const handleUploadError = (error) => {
    console.error("Error en ItemImageUpload:", error);
  };

  return (
    <div className="form-control mt-2">
      <label className="label">
        <span className="label-text font-medium">Imagen del Item</span>
      </label>
      <ImageUploader
        onUploadSuccess={handleUploadSuccess}
        onError={handleUploadError}
        currentImageUrl={imageUrl}
        maxFileSizeMB={5}
      />
    </div>
  );
};

export default ItemImageUpload;