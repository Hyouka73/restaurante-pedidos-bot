// frontend-pwa/src/components/menu/MenuItemForm.jsx
import { WizardInputField, WizardTextAreaField, WizardSelectField, WizardCheckboxField } from '../ui/WizardComponents'; // Ajusta la ruta
import { ButtonLoader } from '../ui/Loader';
import { X } from 'lucide-react';
import ItemImageUpload from './ItemImageUpload'; // Importar el nuevo componente

const MenuItemForm = ({ item, categories, onSave, onCancel, onChange, saving }) => { // Agregar props para imagen
  const isEditing = !!item.id;

  const handleImageUrlChange = (url) => {
    onChange('imageUrl', url); // Actualiza el campo imageUrl en el estado del padre
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{isEditing ? 'Editar Item' : 'Agregar Nuevo Item'}</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <WizardInputField
          label="Nombre"
          value={item.name}
          onChange={(e) => onChange('name', e.target.value)}
          required
        />
        <WizardTextAreaField
          label="Descripción"
          value={item.description}
          onChange={(e) => onChange('description', e.target.value)}
          rows={3}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WizardInputField
            label="Precio ($)"
            type="number"
            step="0.01"
            value={item.price}
            onChange={(e) => onChange('price', e.target.value)}
            required
          />
          <WizardSelectField
            label="Categoría"
            value={item.category}
            onChange={(e) => onChange('category', e.target.value)}
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </WizardSelectField>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <WizardInputField
            label="Tiempo de Preparación (min)"
            type="number"
            value={item.prepTime}
            onChange={(e) => onChange('prepTime', e.target.value)}
          />
          <WizardInputField
            label="Complejidad (1-5)"
            type="number"
            min="1"
            max="5"
            value={item.complexity}
            onChange={(e) => onChange('complexity', e.target.value)}
          />
          <WizardInputField
            label="Orden"
            type="number"
            value={item.order}
            onChange={(e) => onChange('order', e.target.value)}
          />
        </div>
        <ItemImageUpload
          imageUrl={item.imageUrl}
          onImageChange={handleImageUrlChange}
        />
        <WizardCheckboxField
          label="Disponible"
          checked={item.available}
          onChange={(e) => onChange('available', e.target.checked)}
        />
        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-[#ff7f50] to-[#ff6347] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? <ButtonLoader size="sm" /> : (isEditing ? 'Actualizar' : 'Agregar')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all"
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default MenuItemForm;