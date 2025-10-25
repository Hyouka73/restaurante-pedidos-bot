
import { useState, useEffect } from 'react';
import { WizardCard, WizardCheckboxField } from '../ui/WizardComponents';
import { MessageSquare } from 'lucide-react';
import { ButtonLoader } from '../ui/Loader';
import { useAlert } from '../ui/CustomAlert';
import { api } from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';

const CommandsForm = ({ initialData }) => {
  const [commands, setCommands] = useState(initialData.commands);
  const [saving, setSaving] = useState(false);
  const { data: restaurant } = useRestaurant();
  const { showAlert } = useAlert();

  useEffect(() => {
    setCommands(initialData.commands);
  }, [initialData]);

  const handleCommandChange = (id, field, value) => {
    setCommands(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSave = async () => {
    if (!restaurant?.id) {
      showAlert('Error: No se pudo encontrar el ID del restaurante.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/config/${restaurant.id}/general`, { commands });
      showAlert('Comandos guardados correctamente.', 'success');
    } catch (error) {
      showAlert(`Error al guardar: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WizardCard>
      <div className="flex items-center gap-3 pb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
          <MessageSquare size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-indigo-600">Comandos del Bot</h3>
          <p className="text-sm text-gray-600 mt-1">Activa o desactiva comandos del bot</p>
        </div>
      </div>
      <div className="space-y-2">
        {Object.keys(commands).map((cmdId) => (
          <div key={cmdId} className="flex items-center justify-between p-2 border-b">
            <div>
              <span className="label-text font-mono">/{cmdId}</span>
              <span className="text-sm text-gray-500 ml-2">{commands[cmdId].description}</span>
            </div>
            <WizardCheckboxField
              label="Habilitado"
              checked={commands[cmdId].enabled}
              onChange={(e) => handleCommandChange(cmdId, 'enabled', e.target.checked)}
              className="!flex-row-reverse !items-center !justify-start !gap-2"
            />
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <ButtonLoader size="sm"/> : 'Guardar Comandos'}
        </button>
      </div>
    </WizardCard>
  );
};

export default CommandsForm;
