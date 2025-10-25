
import { useState, useEffect } from 'react';
import { WizardCard, WizardInputField, WizardSelectField, WizardCheckboxField } from '../ui/WizardComponents';
import { Truck, DollarSign, MapPin } from 'lucide-react';
import { ButtonLoader } from '../ui/Loader';
import { useAlert } from '../ui/CustomAlert';
import { api } from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';

const DeliveryForm = ({ initialData }) => {
  const [delivery, setDelivery] = useState(initialData.delivery);
  const [features, setFeatures] = useState(initialData.features);
  const [saving, setSaving] = useState(false);
  const { data: restaurant } = useRestaurant();
  const { showAlert } = useAlert();

  useEffect(() => {
    setDelivery(initialData.delivery);
    setFeatures(initialData.features);
  }, [initialData]);

  const handleDeliveryChange = (field, value) => {
    setDelivery(prev => ({ ...prev, [field]: value }));
  };

  const handleFeatureChange = (field, value) => {
    setFeatures(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!restaurant?.id) {
      showAlert('Error: No se pudo encontrar el ID del restaurante.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { delivery, features };
      await api.put(`/config/${restaurant.id}/general`, payload);
      showAlert('Configuración de delivery guardada correctamente.', 'success');
    } catch (error) {
      showAlert(`Error al guardar: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
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
          value={delivery.type}
          onChange={(e) => handleDeliveryChange('type', e.target.value)}
        >
          <option value="distance_based">Por Distancia</option>
          <option value="fixed">Costo Fijo</option>
        </WizardSelectField>
        {delivery.type === 'distance_based' ? (
          <>
            <WizardInputField
              label="Costo por Km ($)"
              type="number"
              step="0.01"
              value={delivery.costPerKm}
              onChange={(e) => handleDeliveryChange('costPerKm', parseFloat(e.target.value) || 0)}
              icon={DollarSign}
            />
            <WizardInputField
              label="Distancia Máx (Km)"
              type="number"
              step="0.1"
              value={delivery.maxDistance}
              onChange={(e) => handleDeliveryChange('maxDistance', parseFloat(e.target.value) || 0)}
              icon={MapPin}
            />
          </>
        ) : (
          <WizardInputField
            label="Costo de Envío Fijo ($)"
            type="number"
            step="0.01"
            value={delivery.baseCost}
            onChange={(e) => handleDeliveryChange('baseCost', parseFloat(e.target.value) || 0)}
            icon={DollarSign}
          />
        )}
        <WizardInputField
          label="Pedido Mínimo para Envío Gratis ($)"
          type="number"
          step="0.01"
          value={delivery.freeDeliveryMinAmount}
          onChange={(e) => handleDeliveryChange('freeDeliveryMinAmount', parseFloat(e.target.value) || 0)}
          icon={DollarSign}
        />
      </div>
      <div className="mt-4">
        <WizardCheckboxField
          label="Habilitar Delivery"
          checked={features.deliveryEnabled}
          onChange={(e) => handleFeatureChange('deliveryEnabled', e.target.checked)}
        />
      </div>
      <div className="mt-6 flex justify-end">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <ButtonLoader size="sm"/> : 'Guardar Delivery'}
        </button>
      </div>
    </WizardCard>
  );
};

export default DeliveryForm;
