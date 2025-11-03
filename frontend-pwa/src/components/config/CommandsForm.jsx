import { useState, useEffect } from 'react';
import { WizardSaveButton, WizardSwitch } from '../ui/WizardComponents';
import { MessageSquare, Terminal, CheckCircle, XCircle } from 'lucide-react';
import { useAlert } from '../ui/CustomAlert';
import { api } from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';
import { motion } from 'framer-motion';

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

  const commandsArray = Object.entries(commands);
  const enabledCount = commandsArray.filter(([_, cmd]) => cmd.enabled).length;

  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-[#ffe4c4] p-3 sm:p-6 hover:shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="mb-6 pb-4 border-b-2 border-[#ffe4c4]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
            <MessageSquare size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-indigo-600">Comandos del Bot</h3>
            <p className="text-sm text-gray-600 mt-1">Activa o desactiva comandos de Telegram</p>
          </div>
        </div>
      </div>

      {/* Lista de comandos */}
      <div className="space-y-3">
        {commandsArray.map(([cmdId, cmdData], index) => (
          <motion.div
            key={cmdId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              relative overflow-hidden
              bg-gradient-to-r rounded-xl p-4 border-2 transition-all duration-300
              ${cmdData.enabled 
                ? 'from-indigo-50 to-blue-50 border-indigo-300 hover:border-indigo-400' 
                : 'from-gray-50 to-gray-100 border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <label className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer">
              {/* Información del comando */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
                  ${cmdData.enabled 
                    ? 'bg-gradient-to-br from-indigo-400 to-blue-500 shadow-md' 
                    : 'bg-gray-300'
                  }
                `}>
                  {cmdData.enabled ? (
                    <Terminal size={20} className="text-white" />
                  ) : (
                    <XCircle size={20} className="text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-indigo-600 text-sm sm:text-base">
                      /{cmdId}
                    </span>
                    <span className={`
                      text-xs font-semibold px-2 py-0.5 rounded-full
                      ${cmdData.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}
                    `}>
                      {cmdData.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {cmdData.description}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <WizardSwitch
                checked={cmdData.enabled}
                onChange={(e) => handleCommandChange(cmdId, 'enabled', e.target.checked)}
                activeClass="bg-gradient-to-r from-indigo-400 to-blue-500"
                className="self-end sm:self-center"
              />
            </label>
          </motion.div>
        ))}
      </div>

      {/* Resumen */}
      <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            Comandos activos:
          </span>
          <span className="text-2xl font-bold text-indigo-600">
            {enabledCount} / {commandsArray.length}
          </span>
        </div>
      </div>

      {/* Botón de guardar */}
      <div className="mt-8 pt-6 border-t-2 border-[#ffe4c4] flex justify-end">
        <WizardSaveButton 
          onClick={handleSave}
          loading={saving}
          className="w-full sm:w-auto min-w-[180px]"
        >
          Guardar Comandos
        </WizardSaveButton>
      </div>
    </div>
  );
};

export default CommandsForm;