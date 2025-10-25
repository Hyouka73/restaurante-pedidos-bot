import { useState, useEffect } from 'react';
import { WizardCard, WizardCheckboxField, WizardSelectField } from '../ui/WizardComponents';
import { Clock } from 'lucide-react';
import { ButtonLoader } from '../ui/Loader';
import { useAlert } from '../ui/CustomAlert';
import { api } from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';

const HoursForm = ({ initialData }) => {
  const [hours, setHours] = useState(initialData.hours);
  const [availabilitySettings, setAvailabilitySettings] = useState(initialData.availabilitySettings);
  const [saving, setSaving] = useState(false);
  const { data: restaurant } = useRestaurant();
  const { showAlert } = useAlert();

  useEffect(() => {
    setHours(initialData.hours);
    setAvailabilitySettings(initialData.availabilitySettings);
  }, [initialData]);

  const handleHourChange = (day, field, value) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSettingsChange = (field, value) => {
    setAvailabilitySettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!restaurant?.id) {
      showAlert('Error: No se pudo encontrar el ID del restaurante.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { hours, availabilitySettings };
      await api.put(`/config/${restaurant.id}/general`, payload);
      showAlert('Horarios y disponibilidad guardados correctamente.', 'success');
    } catch (error) {
      showAlert(`Error al guardar: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const days = [
    { key: 'monday', name: 'Lunes' },
    { key: 'tuesday', name: 'Martes' },
    { key: 'wednesday', name: 'Miércoles' },
    { key: 'thursday', name: 'Jueves' },
    { key: 'friday', name: 'Viernes' },
    { key: 'saturday', name: 'Sábado' },
    { key: 'sunday', name: 'Domingo' },
  ];

  const availabilityModes = [
    { key: 'hybrid', name: '🔄 Modo Híbrido', description: 'Recomendado. Combina horarios con control manual.' },
    { key: 'fixed', name: '⏰ Horarios Fijos', description: 'El sistema abre y cierra automáticamente.' },
    { key: 'always_open', name: '🌟 Siempre Abierto', description: 'Tu negocio acepta pedidos 24/7.' },
    { key: 'manual', name: '🎮 Control Manual', description: 'Tú decides manualmente cuándo abrir y cerrar.' }
  ];

  return (
    <WizardCard>
      <div className="flex items-center gap-3 pb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg">
          <Clock size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-blue-600">Horarios y Disponibilidad</h3>
          <p className="text-sm text-gray-600 mt-1">Define cuándo y cómo atenderás pedidos</p>
        </div>
      </div>

      <div className="mb-6">
        <WizardSelectField
          label="Modo de Disponibilidad"
          value={availabilitySettings.mode}
          onChange={(e) => handleSettingsChange('mode', e.target.value)}
          icon={Clock}
          helperText={availabilityModes.find(m => m.key === availabilitySettings.mode)?.description}
        >
          {availabilityModes.map(mode => (
            <option key={mode.key} value={mode.key}>{mode.name}</option>
          ))}
        </WizardSelectField>
      </div>

      <div className="space-y-2">
        <h4 className="text-lg font-bold text-gray-800 mb-3">Horarios de Operación Semanal</h4>
        {days.map(day => (
          <div key={day.key} className="flex items-center justify-between p-2 border-b">
            <span className="capitalize w-24">{day.name}</span>
            <WizardCheckboxField
              label="Cerrado"
              checked={hours[day.key].closed}
              onChange={(e) => handleHourChange(day.key, 'closed', e.target.checked)}
              className="!flex-row !items-center !justify-start !gap-2"
            />
            {!hours[day.key].closed && (
              <>
                <input type="time" className="input input-sm input-bordered w-24" value={hours[day.key].open} onChange={(e) => handleHourChange(day.key, 'open', e.target.value)} />
                <span className="mx-2">a</span>
                <input type="time" className="input input-sm input-bordered w-24" value={hours[day.key].close} onChange={(e) => handleHourChange(day.key, 'close', e.target.value)} />
              </>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <ButtonLoader size="sm"/> : 'Guardar Horarios'}
        </button>
      </div>
    </WizardCard>
  );
};

export default HoursForm;