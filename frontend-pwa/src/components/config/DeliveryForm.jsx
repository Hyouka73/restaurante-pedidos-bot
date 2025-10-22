// frontend-pwa/src/components/config/DeliveryForm.jsx
import { WizardCard, WizardInputField, WizardSelectField, WizardCheckboxField } from '../ui/WizardComponents'; // Ajusta la ruta
import { Truck, DollarSign, MapPin } from 'lucide-react';

const DeliveryForm = ({ config, onChange }) => {
  const handleDeliveryChange = (field, value) => {
    onChange('delivery', field, value);
  };

  return (
    <WizardCard>
      <div className="flex items-center gap-3 pb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          <Truck size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-green-600">Opciones de Delivery</h3>
          <p className="text-sm text-gray-600 mt-1">Configura cómo entregarás</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardSelectField
          label="Tipo de Costo"
          value={config.delivery.type}
          onChange={(e) => handleDeliveryChange('type', e.target.value)}
        >
          <option value="distance_based">Por Distancia</option>
          <option value="fixed">Costo Fijo</option>
        </WizardSelectField>
        {config.delivery.type === 'distance_based' ? (
          <>
            <WizardInputField
              label="Costo por Km ($)"
              type="number"
              step="0.01"
              value={config.delivery.costPerKm}
              onChange={(e) => handleDeliveryChange('costPerKm', parseFloat(e.target.value) || 0)}
              icon={DollarSign}
            />
            <WizardInputField
              label="Distancia Máx (Km)"
              type="number"
              step="0.1"
              value={config.delivery.maxDistance}
              onChange={(e) => handleDeliveryChange('maxDistance', parseFloat(e.target.value) || 0)}
              icon={MapPin}
            />
          </>
        ) : (
          <WizardInputField
            label="Costo de Envío Fijo ($)"
            type="number"
            step="0.01"
            value={config.delivery.baseCost}
            onChange={(e) => handleDeliveryChange('baseCost', parseFloat(e.target.value) || 0)}
            icon={DollarSign}
          />
        )}
        <WizardInputField
          label="Pedido Mínimo para Envío Gratis ($)"
          type="number"
          step="0.01"
          value={config.delivery.freeDeliveryMinAmount}
          onChange={(e) => handleDeliveryChange('freeDeliveryMinAmount', parseFloat(e.target.value) || 0)}
          icon={DollarSign}
        />
      </div>
      <div className="mt-4">
        <WizardCheckboxField
          label="Habilitar Delivery"
          checked={config.features.deliveryEnabled}
          onChange={(e) => onChange('features', 'deliveryEnabled', e.target.checked)}
        />
      </div>
    </WizardCard>
  );
};

export default DeliveryForm;