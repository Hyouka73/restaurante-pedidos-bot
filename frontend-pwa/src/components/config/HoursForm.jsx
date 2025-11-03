import { useState, useEffect } from 'react';
import { 
  WizardCard, 
  WizardCheckboxField, 
  WizardSelectField,
  WizardSaveButton 
} from '../ui/WizardComponents';
import { Clock, Calendar } from 'lucide-react';
import { useAlert } from '../ui/CustomAlert';
import { api } from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';
import { motion } from 'framer-motion';

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
    { key: 'monday', name: 'Lunes', short: 'Lun' },
    { key: 'tuesday', name: 'Martes', short: 'Mar' },
    { key: 'wednesday', name: 'Miércoles', short: 'Mié' },
    { key: 'thursday', name: 'Jueves', short: 'Jue' },
    { key: 'friday', name: 'Viernes', short: 'Vie' },
    { key: 'saturday', name: 'Sábado', short: 'Sáb' },
    { key: 'sunday', name: 'Domingo', short: 'Dom' },
  ];

  const availabilityModes = [
    { key: 'hybrid', name: '🔄 Modo Híbrido', description: 'Recomendado. Combina horarios con control manual.' },
    { key: 'fixed', name: '⏰ Horarios Fijos', description: 'El sistema abre y cierra automáticamente.' },
    { key: 'always_open', name: '🌟 Siempre Abierto', description: 'Tu negocio acepta pedidos 24/7.' },
    { key: 'manual', name: '🎮 Control Manual', description: 'Tú decides manualmente cuándo abrir y cerrar.' }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-[#ffe4c4] p-3 sm:p-6 hover:shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="mb-6 pb-4 border-b-2 border-[#ffe4c4]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-blue-600">Horarios y Disponibilidad</h3>
            <p className="text-sm text-gray-600 mt-1">Define cuándo y cómo atenderás pedidos</p>
          </div>
        </div>
      </div>

      {/* Selector de modo */}
      <div className="mb-8">
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

      {/* Horarios semanales */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-[#ff7f50]" />
          <h4 className="text-lg font-bold text-gray-800">Horarios de Operación Semanal</h4>
        </div>

        <div className="space-y-3">
          {days.map((day, index) => (
            <motion.div
              key={day.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gradient-to-r from-gray-50 to-transparent rounded-xl p-2 sm:p-4 border-2 border-[#ffe4c4] hover:border-[#ffb9a0] transition-colors"
            >
              {/* Layout para desktop y móvil */}
              <div className="flex flex-col gap-3">
                {/* Primera fila: Día y checkbox cerrado */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-gray-700 hidden sm:inline">
                      {day.name}
                    </span>
                    <span className="font-bold text-gray-700 sm:hidden">
                      {day.short}
                    </span>
                  </div>
                  
                  {/* Checkbox cerrado - más compacto en móvil */}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={hours[day.key].closed}
                      onChange={(e) => handleHourChange(day.key, 'closed', e.target.checked)}
                      className="w-5 h-5 rounded-lg border-2 border-gray-300 text-[#ff7f50] focus:ring-2 focus:ring-[#ff7f50] focus:ring-offset-0 transition-all"
                    />
                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-800 transition-colors">
                      Cerrado
                    </span>
                  </label>
                </div>

                {/* Segunda fila: Horarios (solo si no está cerrado) */}
                {!hours[day.key].closed && (
                  <div className="flex items-center gap-2 pl-0 sm:pl-2">
                    {/* Input apertura */}
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Apertura
                      </label>
                      <input
                        type="time"
                        className="w-full px-3 py-2 bg-white border-2 border-[#ffe4c4] rounded-lg text-sm font-medium text-gray-800 focus:border-[#ff7f50] focus:ring-2 focus:ring-[#ffe4c4] outline-none transition-all"
                        value={hours[day.key].open}
                        onChange={(e) => handleHourChange(day.key, 'open', e.target.value)}
                      />
                    </div>

                    {/* Separador */}
                    <div className="flex items-end pb-2">
                      <span className="text-gray-400 font-bold text-sm">→</span>
                    </div>

                    {/* Input cierre */}
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Cierre
                      </label>
                      <input
                        type="time"
                        className="w-full px-3 py-2 bg-white border-2 border-[#ffe4c4] rounded-lg text-sm font-medium text-gray-800 focus:border-[#ff7f50] focus:ring-2 focus:ring-[#ffe4c4] outline-none transition-all"
                        value={hours[day.key].close}
                        onChange={(e) => handleHourChange(day.key, 'close', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Botón de guardar */}
      <div className="mt-8 pt-6 border-t-2 border-[#ffe4c4] flex justify-end">
        <WizardSaveButton 
          onClick={handleSave} 
          loading={saving}
          className="w-full sm:w-auto min-w-[180px]"
        >
          Guardar Horarios
        </WizardSaveButton>
      </div>
    </div>
  );
};

export default HoursForm;