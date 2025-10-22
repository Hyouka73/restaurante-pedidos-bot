// frontend-pwa/src/components/config/HoursForm.jsx
import { WizardCard, WizardCheckboxField } from '../ui/WizardComponents'; // Ajusta la ruta
import { Clock } from 'lucide-react';

const HoursForm = ({ config, onChange }) => {
  const handleHourChange = (day, field, value) => {
    onChange('hours', day, { ...config.hours[day], [field]: value });
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

  return (
    <WizardCard>
      <div className="flex items-center gap-3 pb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg">
          <Clock size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-blue-600">Horarios de Operación</h3>
          <p className="text-sm text-gray-600 mt-1">Define cuándo atenderás pedidos</p>
        </div>
      </div>
      <div className="space-y-2">
        {days.map(day => (
          <div key={day.key} className="flex items-center justify-between p-2 border-b">
            <span className="capitalize w-24">{day.name}</span>
            <WizardCheckboxField
              label="Cerrado"
              checked={config.hours[day.key].closed}
              onChange={(e) => handleHourChange(day.key, 'closed', e.target.checked)}
              className="!flex-row !items-center !justify-start !gap-2"
            />
            {!config.hours[day.key].closed && (
              <>
                <input
                  type="time"
                  className="input input-sm input-bordered w-24"
                  value={config.hours[day.key].open}
                  onChange={(e) => handleHourChange(day.key, 'open', e.target.value)}
                />
                <span className="mx-2">a</span>
                <input
                  type="time"
                  className="input input-sm input-bordered w-24"
                  value={config.hours[day.key].close}
                  onChange={(e) => handleHourChange(day.key, 'close', e.target.value)}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </WizardCard>
  );
};

export default HoursForm;