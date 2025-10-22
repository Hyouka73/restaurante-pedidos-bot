// frontend-pwa/src/components/config/BasicInfoForm.jsx
import { WizardInputField, WizardTextAreaField } from '../ui/WizardComponents'; // Ajusta la ruta

const BasicInfoForm = ({ config, onChange }) => {
  return (
    <div className="card bg-base-100 shadow-xl p-4">
      <h2 className="text-xl font-semibold mb-4">Información Básica</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardInputField
          label="Nombre del Restaurante"
          value={config.info.name}
          onChange={(e) => onChange('info', 'name', e.target.value)}
          required
          placeholder="Ej: Restaurante El Sabor"
        />
        <WizardInputField
          label="Teléfono"
          value={config.info.phone}
          onChange={(e) => onChange('info', 'phone', e.target.value)}
          placeholder="+52 961 123 4567"
        />
        <div className="form-control md:col-span-2">
          <WizardInputField
            label="Dirección"
            value={config.info.address}
            onChange={(e) => onChange('info', 'address', e.target.value)}
            placeholder="Calle, número, ciudad"
          />
        </div>
        <div className="form-control md:col-span-2">
          <WizardTextAreaField
            label="Descripción"
            value={config.info.description}
            onChange={(e) => onChange('info', 'description', e.target.value)}
            placeholder="Describe tu restaurante..."
            rows={3}
            maxLength={200}
            helperText="Breve descripción (máx. 200 caracteres)"
          />
        </div>
      </div>
    </div>
  );
};

export default BasicInfoForm;