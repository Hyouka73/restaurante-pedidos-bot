import React, { useState, useEffect } from 'react';
import { WizardInputField, WizardTextAreaField, WizardSelectField, WizardCheckboxField } from '../ui/WizardComponents';
import { ButtonLoader } from '../ui/Loader';

import ItemImageUpload from './ItemImageUpload';
import Select from 'react-select'; 

// --- 🔥 1. ESTRUCTURA DE TAGS REFINADA ---
// 'tipo_plato' ahora solo contiene opciones de COMIDA.
const TAG_OPTIONS = {
  categoria_general: ['Comida', 'Bebida', 'Postre'],
  tipo_plato: ['Plato Fuerte', 'Entrada', 'Para Compartir', 'Acompañante', 'Snack'],
  proteina: ['Res', 'Pollo', 'Cerdo', 'Pescado', 'Vegano', 'Vegetariano', 'Otro', 'N/A'],
  perfil_sabor: ['Ligero', 'Contundente', 'Picante', 'Dulce', 'Salado', 'Agridulce', 'Amargo'],
};

// --- 🔥 2. ELIMINAMOS 'categories' DE LOS PROPS ---
// --- 🔥 1. EL FORMULARIO AHORA MANEJA SU PROPIO ESTADO ---
const MenuItemForm = ({ item: initialItem, allItems, onSave, onCancel, saving }) => {
  // Manejamos el estado del formulario internamente
  const [item, setItem] = useState(initialItem);
  const isEditing = !!item.id;

  // Sincronizar si el prop 'initialItem' cambia (ej. al cambiar de "editar" a "crear")
  useEffect(() => {
    setItem(initialItem);
  }, [initialItem]);
  
  // 'onChange' ahora es local
  const onChange = (field, value) => {
    setItem(prev => ({ ...prev, [field]: value }));
  };

  // --- 🔥 3. OBSERVAMOS LA CATEGORÍA SELECCIONADA ---
  const selectedCategory = item?.tags?.categoria_general;

  const handleImageUrlChange = (url) => {
    onChange('imageUrl', url);
  };

  // Manejador para los cambios en los tags (estado anidado)
  const handleTagChange = (tagName, value) => {
    const newTags = { ...(item?.tags || {}), [tagName]: value };
    
    // --- 🔥 4. LÓGICA DE LIMPIEZA ---
    // Si la categoría cambia, reseteamos los tags que ya no aplican.
    if (tagName === 'categoria_general') {
      if (value === 'Bebida' || value === 'Postre') {
        newTags.tipo_plato = '';
        newTags.proteina = 'N/A'; // Opcional: poner 'N/A' por defecto
      }
      if (value === 'Comida') {
        newTags.proteina = ''; // Limpiar 'N/A' si volvemos a 'Comida'
      }
    }
    onChange('tags', newTags);
  };

  // Lógica para el selector de 'sugerir_items'
  const itemOptions = (allItems || [])
    .filter(i => i.id !== item?.id) // Un item no puede sugerirse a sí mismo
    .map(i => ({ value: i.id, label: `${i.name} (ID: ...${i.id.slice(-5)})` }));

  const selectedItemOptions = (item?.sugerir_items || [])
    .map(itemId => itemOptions.find(opt => opt.value === itemId))
    .filter(Boolean); // Filtramos por si algún item fue eliminado

  // --- 🔥 2. DIV PRINCIPAL SIMPLIFICADO ---
  return (
    // Ya no tiene clases de 'max-h' ni 'overflow' ni 'shadow'
    <div className="bg-white rounded-xl"> 
      {/* --- 🔥 3. ENCABEZADO Y BOTÓN X ELIMINADOS --- */}
      <form onSubmit={(e) => { e.preventDefault(); onSave(item); }}>
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
        <WizardInputField
          label="Precio ($)"
          type="number"
          step="0.01"
          value={item.price || ''}
          onChange={(e) => onChange('price', e.target.value)}
          required
        />

        {/* --- 🔥 5. CAMPO DE "CATEGORÍA VISUAL" ELIMINADO --- */}
        {/* El 'WizardSelectField' para 'item.category' ha sido removido  */}
        
        {/* --- Metadatos para el Asistente de Recomendaciones --- */}
        <div className="mt-6 p-4 border border-gray-200 rounded-lg">
            <h4 className="text-md font-semibold text-gray-600 mb-3">Asistente de Recomendaciones (Tags)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <WizardSelectField
                    label="Categoría General"
                    value={item.tags?.categoria_general || ''}
                    onChange={(e) => handleTagChange('categoria_general', e.target.value)}
                    required // Hacemos este campo obligatorio
                >
                    <option value="">Seleccionar...</option>
                    {TAG_OPTIONS.categoria_general.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </WizardSelectField>

                {/* --- 🔥 6. RENDERIZADO CONDICIONAL --- */}
                {/* Estos campos solo aparecen si la categoría es "Comida" */}
                {selectedCategory === 'Comida' && (
                  <>
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
                  </>
                )}
                
                {/* Este campo aparece siempre */}
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
            
            <label className="block text-sm font-medium text-gray-700 mb-1">Sugerir Items</label>
            <Select
              isMulti
              options={itemOptions}
              value={selectedItemOptions}
              onChange={(selectedOptions) => {
                const selectedIds = selectedOptions.map(opt => opt.value);
                onChange('sugerir_items', selectedIds);
              }}
              placeholder="Selecciona items para sugerir..."
              classNamePrefix="react-select"
            />
            <p className="text-xs text-gray-500 mt-1">Añade productos para sugerir cuando este se añada al carrito.</p>
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
        {/* --- 🔥 4. BOTONES DENTRO DEL FORMULARIO --- */}
        {/* Los botones ahora se renderizan aquí, al final del formulario */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-[#ff7f50] to-[#ff6347] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? <ButtonLoader size="sm" /> : (isEditing ? 'Actualizar Item' : 'Agregar Item')}
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