// frontend-pwa/src/components/config/CommandsForm.jsx
import { WizardCard, WizardCheckboxField } from '../ui/WizardComponents'; // Ajusta la ruta
import { MessageSquare } from 'lucide-react';

const CommandsForm = ({ config, onChange }) => {
  const handleCommandChange = (id, field, value) => {
    const updatedCommands = { ...config.commands };
    updatedCommands[id] = { ...updatedCommands[id], [field]: value };
    onChange('commands', updatedCommands);
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
        {Object.keys(config.commands).map((cmdId) => (
          <div key={cmdId} className="flex items-center justify-between p-2 border-b">
            <div>
              <span className="label-text font-mono">/{cmdId}</span>
              <span className="text-sm text-gray-500 ml-2">{config.commands[cmdId].description}</span>
            </div>
            <WizardCheckboxField
              label=""
              checked={config.commands[cmdId].enabled}
              onChange={(e) => handleCommandChange(cmdId, 'enabled', e.target.checked)}
              className="!flex-row !items-center !justify-start !gap-2"
            />
          </div>
        ))}
      </div>
    </WizardCard>
  );
};

export default CommandsForm;