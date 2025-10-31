// frontend-pwa/src/components/menu/MenuItemForm.jsx
import { WizardInputField, WizardTextAreaField, WizardSelectField, WizardCheckboxField } from '../ui/WizardComponents';
import { ButtonLoader } from '../ui/Loader';
import { X } from 'lucide-react';
import ItemImageUpload from './ItemImageUpload';
import Select from 'react-select'; // 🔥 1. IMPORTAMOS 'Select'

// Opciones para los tags de recomendación
const TAG_OPTIONS = { 
  categoria_general: ['Comida', 'Bebida', 'Postre'],
  tipo_plato: ['Plato Fuerte', 'Entrada', 'Para Compartir', 'Acompañante', 'Snack'],
  proteina: ['Res', 'Pollo', 'Cerdo', 'Pescado', 'Vegano', 'Vegetariano', 'Otro'],
  perfil_sabor: ['Ligero', 'Contundente', 'Picante', 'Dulce', 'Salado', 'Agridulce', 'Amargo'],
};

// 🔥 2. ACEPTAMOS 'allItems' COMO NUEVA PROP
const MenuItemForm = ({ item, categories, allItems, onSave, onCancel, onChange, saving }) => {
  const isEditing = !!item.id; 

  const handleImageUrlChange = (url) => { 
    onChange('imageUrl', url);
  };

  // Manejador para los cambios en los tags (estado anidado)
  const handleTagChange = (tagName, value) => { 
    const newTags = { ...(item.tags || {}), [tagName]: value };
    onChange('tags', newTags);
  };

  // --- 🔥 3. LÓGICA PARA EL SELECTOR DE ITEMS ---
  const itemOptions = (allItems || [])
    .filter(i => i.id !== item.id) // Un item no puede sugerirse a sí mismo
    .map(i => ({ value: i.id, label: `${i.name} (ID: ...${i.id.slice(-5)})` })); // Mostramos ID y Nombre

  // Convertimos el array de IDs guardado (ej: ['id1', 'id2'])
  // al formato que 'react-select' necesita (ej: [{value: 'id1', label: 'Item 1'}])
  const selectedItemOptions = (item.sugerir_items || [])
    .map(itemId => itemOptions.find(opt => opt.value === itemId))
    .filter(Boolean); // Filtramos por si algún item fue eliminado

  return (
    <div className="bg-white rounded-xl p-4 shadow-md max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2 z-10">
        <h3 className="text-lg font-semibold">{isEditing ? 'Editar Item' : 'Agregar Nuevo Item'}</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        {/* --- Información Básica --- */}
        <WizardInputField
          label="Nombre"
          value={item.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          required
        />
        <WizardTextAreaField
          label="Descripción"
          value={item.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          rows={3}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WizardInputField
            label="Precio ($)"
            type="number"
            step="0.01"
            value={item.price || ''}
            onChange={(e) => onChange('price', e.target.value)}
            required
          />
          <WizardSelectField
            label="Categoría (Visual)"
            value={item.category || ''}
            onChange={(e) => onChange('category', e.target.value)}
          >
            <option value="">Sin categoría</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </WizardSelectField>
        </div>
        
        {/* --- Metadatos para el Asistente de Recomendaciones --- */}
        <div className="mt-6 p-4 border border-gray-200 rounded-lg">
            <h4 className="text-md font-semibold text-gray-600 mb-3">Asistente de Recomendaciones (Tags)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <WizardSelectField
                    label="Categoría General"
                    value={item.tags?.categoria_general || ''}
                    onChange={(e) => handleTagChange('categoria_general', e.target.value)}
                >
                    <option value="">Seleccionar...</option>
                    {TAG_OPTIONS.categoria_general.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </WizardSelectField>
                <WizardSelectField
                    label="Tipo de Plato"
                    value={item.tags?.tipo_plato || ''}
                    onChange={(e) => handleTagChange('tipo_plato', e.target.value)}
                >
                    <option value="">Seleccionar...</option>
                    {TAG_OPTIONS.tipo_plato.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </WizardSelectField>
                <WizardSelectField
                    label="Proteína Principal"
                    value={item.tags?.proteina || ''}
                    onChange={(e) => handleTagChange('proteina', e.target.value)}
                >
                    <option value="">Seleccionar...</option>
                    {TAG_OPTIONS.proteina.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </WizardSelectField>
                <WizardSelectField
                    label="Perfil de Sabor"
                    value={item.tags?.perfil_sabor || ''}
                    onChange={(e) => handleTagChange('perfil_sabor', e.target.value)}
                >
                    <option value="">Seleccionar...</option>
                    {TAG_OPTIONS.perfil_sabor.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </WizardSelectField>
            </div>
        </div>

        {/* --- Venta Cruzada (Cross-Sell) --- */}
        <div className="mt-6 p-4 border border-gray-200 rounded-lg">
            <h4 className="text-md font-semibold text-gray-600 mb-3">Venta Cruzada (Cross-Sell)</h4>
            
            {/* --- 🔥 4. REEMPLAZAMOS EL TEXTAREA  --- */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Sugerir Items</label>
            <Select
              isMulti
              options={itemOptions}
              value={selectedItemOptions}
              onChange={(selectedOptions) => {
                // Guardamos solo el array de IDs, no el objeto completo
                const selectedIds = selectedOptions.map(opt => opt.value);
                onChange('sugerir_items', selectedIds);
              }}
              placeholder="Selecciona items para sugerir..."
              classNamePrefix="react-select"
            />
            <p className="text-xs text-gray-500 mt-1">Añade productos para sugerir cuando este se añada al carrito.</p>
            {/* --- FIN DEL REEMPLAZO --- */}
        </div>

        {/* --- Otros Detalles --- */}
        <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <WizardInputField
                    label="Tiempo de Preparación (min)"
                    type="number"
                    value={item.prepTime || ''}
                    onChange={(e) => onChange('prepTime', e.target.value)}
                />
                <WizardInputField
                    label="Complejidad (1-5)"
                    type="number"
                    min="1"
                    max="5"
                    value={item.complexity || ''}
                    onChange={(e) => onChange('complexity', e.target.value)}
                />
                <WizardInputField
                    label="Orden (Visual)"
                    type="number"
                    value={item.order || ''}
                    onChange={(e) => onChange('order', e.target.value)}
                />
            </div>
        </div>

        <ItemImageUpload
          imageUrl={item.imageUrl}
          onImageChange={handleImageUrlChange}
        />
        <WizardCheckboxField
          label="Disponible"
          checked={item.available !== false} // Default a true si es undefined
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