
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { WizardInputField, WizardSelectField } from '../ui/WizardComponents';
import { ButtonLoader } from '../ui/Loader';
import { X } from 'lucide-react';

const DiscountRuleForm = ({ rule: initialRule, menuItems, onSave, onCancel, saving }) => {
  const [localRule, setLocalRule] = useState(initialRule || {});

  useEffect(() => {
    const currentRule = initialRule || {};
    if (!currentRule.accion) {
        currentRule.accion = { tipo: 'descuento_porcentual', valor: 0 };
    }
    setLocalRule({ ...currentRule });
  }, [initialRule]);

  const handleChange = (field, value) => {
    setLocalRule(prev => ({ ...prev, [field]: value }));
  };

  const handleActionChange = (field, value) => {
    const updatedAction = { ...localRule.accion, [field]: value };
    handleChange('accion', updatedAction);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(localRule);
  };

  const itemOptions = menuItems.map(item => ({ value: item.id, label: `(${item.id}) ${item.name}` }));

  return (
    <div className="bg-white rounded-xl p-4 shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{localRule.id ? 'Editar Regla' : 'Crear Nueva Regla de Descuento'}</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <WizardInputField
          label="Nombre de la Regla"
          placeholder="Ej: Promo Almuerzo"
          value={localRule.nombre_regla || ''}
          onChange={(e) => handleChange('nombre_regla', e.target.value)}
          required
        />
        
        <h4 className="text-md font-semibold mt-4 mb-2 text-gray-600">Condiciones</h4>
        <div className="my-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Items Requeridos</label>
            <Select
              isMulti
              options={itemOptions}
              value={itemOptions.filter(opt => (localRule.condiciones || []).includes(opt.value))}
              onChange={(selectedOptions) => handleChange('condiciones', selectedOptions ? selectedOptions.map(opt => opt.value) : [])}
              placeholder="Selecciona los items que activan la regla..."
              classNamePrefix="react-select"
            />
        </div>

        <h4 className="text-md font-semibold mt-4 mb-2 text-gray-600">Acción</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WizardSelectField
                label="Tipo de Acción"
                value={localRule.accion?.tipo || 'descuento_porcentual'}
                onChange={(e) => handleActionChange('tipo', e.target.value)}
            >
                <option value="descuento_porcentual">Descuento Porcentual (%)</option>
                <option value="precio_paquete_fijo">Precio Fijo del Paquete ($)</option>
            </WizardSelectField>
            <WizardInputField
                label="Valor"
                type="number"
                step="0.01"
                value={localRule.accion?.valor || ''}
                onChange={(e) => handleActionChange('valor', parseFloat(e.target.value) || 0)}
                required
            />
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? <ButtonLoader size="sm" /> : (localRule.id ? 'Actualizar Regla' : 'Guardar Regla')}
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

export default DiscountRuleForm;
