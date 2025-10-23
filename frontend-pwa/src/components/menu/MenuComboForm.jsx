// frontend-pwa/src/components/menu/MenuComboForm.jsx
import { WizardInputField, WizardTextAreaField, WizardCheckboxField } from '../ui/WizardComponents';
import { ButtonLoader } from '../ui/Loader';
import { X, Plus } from 'lucide-react';
import ItemImageUpload from './ItemImageUpload'; // Reutilizar el componente

const MenuComboForm = ({ combo, availableItems, onSave, onCancel, onChange, onAddItem, onRemoveItem, saving }) => {
  const isEditing = !!combo.id;

  const handleImageUrlChange = (url) => {
    onChange('imageUrl', url);
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{isEditing ? 'Editar Combo' : 'Agregar Nuevo Combo'}</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <WizardInputField
          label="Nombre"
          value={combo.name}
          onChange={(e) => onChange('name', e.target.value)}
          required
        />
        <WizardTextAreaField
          label="Descripción"
          value={combo.description}
          onChange={(e) => onChange('description', e.target.value)}
          rows={3}
        />
        
        {/* Upload de imagen para combo */}
        <ItemImageUpload
          imageUrl={combo.imageUrl}
          onImageChange={handleImageUrlChange}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <WizardCheckboxField
            label="Calcular precio sumando items individuales"
            checked={combo.useItemPrices}
            onChange={(e) => onChange('useItemPrices', e.target.checked)}
          />
          {!combo.useItemPrices && (
            <WizardInputField
              label="Precio Fijo del Combo ($)"
              type="number"
              step="0.01"
              value={combo.price}
              onChange={(e) => onChange('price', e.target.value)}
              required={!combo.useItemPrices}
            />
          )}
          {combo.useItemPrices && (
            <div className="flex items-end">
              <WizardInputField
                label="Precio Calculado"
                type="text"
                value={availableItems.filter(item => combo.items.includes(item.id)).reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                disabled
              />
            </div>
          )}
          <WizardInputField
            label="Orden"
            type="number"
            value={combo.order}
            onChange={(e) => onChange('order', e.target.value)}
          />
        </div>
        
        <WizardCheckboxField
          label="Disponible"
          checked={combo.available}
          onChange={(e) => onChange('available', e.target.checked)}
        />

        {/* Selección de Items para el Combo */}
        <div className="mt-4">
          <h4 className="font-medium mb-2">Agregar Items al Combo:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
            {availableItems.filter(item => !combo.items.includes(item.id)).map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded border">
                <span className="text-sm">{item.name} - ${item.price}</span>
                <button
                  type="button"
                  onClick={() => onAddItem(item.id)}
                  className="text-green-600 hover:text-green-800"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Items Actuales del Combo */}
        <div className="mt-4">
          <h4 className="font-medium mb-2">Items en el Combo:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
            {availableItems.filter(item => combo.items.includes(item.id)).map(item => (
              <div key={item.id} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                <span className="text-sm">{item.name} - ${item.price}</span>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
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

export default MenuComboForm;