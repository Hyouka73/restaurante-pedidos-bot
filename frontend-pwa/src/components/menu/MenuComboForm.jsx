// frontend-pwa/src/components/menu/MenuComboForm.jsx
import React, { useState } from 'react';
import { WizardInputField, WizardTextAreaField, WizardSelectField } from '../ui/WizardComponents';
import { ButtonLoader } from '../ui/Loader';
import { X, Plus, Trash2 } from 'lucide-react';
import ItemImageUpload from './ItemImageUpload';
import Select from 'react-select';

const MenuComboForm = ({ combo, menuItems, onSave, onCancel, onChange, saving }) => {
  const isEditing = !!combo.id;

  const handleComponentChange = (index, field, value) => {
    const newComponents = [...(combo.componentes || [])];
    newComponents[index] = { ...newComponents[index], [field]: value };
    onChange('componentes', newComponents);
  };

  const addComponent = () => {
    const newComponents = [...(combo.componentes || []), { title: '', items_opciones: [] }];
    onChange('componentes', newComponents);
  };

  const removeComponent = (index) => {
    const newComponents = [...(combo.componentes || [])];
    newComponents.splice(index, 1);
    onChange('componentes', newComponents);
  };

  const itemOptions = menuItems.map(item => ({ value: item.id, label: `(${item.id}) ${item.name}` }));

  return (
    <div className="bg-white rounded-xl p-4 shadow-md max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2 z-10">
        <h3 className="text-lg font-semibold">{isEditing ? 'Editar Combo' : 'Agregar Nuevo Combo'}</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        {/* --- Información Básica --- */}
        <WizardInputField
          label="Nombre del Combo"
          value={combo.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          required
        />
        <WizardTextAreaField
          label="Descripción"
          value={combo.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          rows={2}
        />
        <WizardInputField
          label="Precio Fijo ($)"
          type="number"
          step="0.01"
          value={combo.price || ''}
          onChange={(e) => onChange('price', e.target.value)}
          required
        />
        <ItemImageUpload
          imageUrl={combo.imageUrl}
          onImageChange={(url) => onChange('imageUrl', url)}
        />

        {/* --- Componentes del Combo --- */}
        <div className="mt-6 p-4 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-md font-semibold text-gray-600">Componentes del Combo (Slots)</h4>
            <button type="button" onClick={addComponent} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
              <Plus size={16} /> Añadir Componente
            </button>
          </div>

          {(combo.componentes || []).map((component, index) => (
            <div key={index} className="p-3 border rounded-md mb-3 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-semibold text-sm">Componente #{index + 1}</h5>
                <button type="button" onClick={() => removeComponent(index)} className="text-red-500 hover:text-red-700">
                  <Trash2 size={16} />
                </button>
              </div>
              <WizardInputField
                label="Título del Componente (ej: Elige tu bebida)"
                value={component.title || ''}
                onChange={(e) => handleComponentChange(index, 'title', e.target.value)}
              />
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Opciones de Items</label>
                <Select
                  isMulti
                  options={itemOptions}
                  value={itemOptions.filter(opt => (component.items_opciones || []).some(item => item.id === opt.value))}
                  onChange={(selectedOptions) => {
                    const selectedItems = selectedOptions.map(opt => ({ id: opt.value, name: opt.label.split(') ')[1] }));
                    handleComponentChange(index, 'items_opciones', selectedItems);
                  }}
                  placeholder="Selecciona items del menú..."
                  classNamePrefix="react-select"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-[#ff7f50] to-[#ff6347] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? <ButtonLoader size="sm" /> : (isEditing ? 'Actualizar Combo' : 'Agregar Combo')}
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
