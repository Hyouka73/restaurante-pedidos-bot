
import { useState, useEffect } from 'react';
import { WizardCard, WizardCheckboxField } from '../ui/WizardComponents';
import { ShoppingBag } from 'lucide-react';
import { ButtonLoader } from '../ui/Loader';
import { useAlert } from '../ui/CustomAlert';
import { api } from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';

const FeaturesForm = ({ initialData }) => {
  const [features, setFeatures] = useState(initialData.features);
  const [saving, setSaving] = useState(false);
  const { data: restaurant } = useRestaurant();
  const { showAlert } = useAlert();

  useEffect(() => {
    setFeatures(initialData.features);
  }, [initialData]);

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
      await api.put(`/config/${restaurant.id}/general`, { features });
      showAlert('Características guardadas correctamente.', 'success');
    } catch (error) {
      showAlert(`Error al guardar: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WizardCard>
      <div className="flex items-center gap-3 pb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg">
          <ShoppingBag size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-purple-600">Opciones de Pedido</h3>
          <p className="text-sm text-gray-600 mt-1">Define cómo operarán los pedidos</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardCheckboxField
          label="Aceptar Pedidos con Delivery"
          checked={features.deliveryEnabled}
          onChange={(e) => handleFeatureChange('deliveryEnabled', e.target.checked)}
        />
        <WizardCheckboxField
          label="Aceptar Pedidos para Recoger"
          checked={features.pickupEnabled}
          onChange={(e) => handleFeatureChange('pickupEnabled', e.target.checked)}
        />
        <WizardCheckboxField
          label="Requerir ubicación si es delivery"
          checked={features.requireLocationIfDelivery}
          onChange={(e) => handleFeatureChange('requireLocationIfDelivery', e.target.checked)}
        />
        <WizardCheckboxField
          label="Mostrar imágenes en el menú"
          checked={features.showMenuImages}
          onChange={(e) => handleFeatureChange('showMenuImages', e.target.checked)}
        />
        <WizardCheckboxField
          label="Aceptar Comentarios/Reclamos"
          checked={features.acceptComplaints}
          onChange={(e) => handleFeatureChange('acceptComplaints', e.target.checked)}
        />
        <WizardCheckboxField
          label="Preguntar por Nombre"
          checked={features.askForName}
          onChange={(e) => handleFeatureChange('askForName', e.target.checked)}
        />
        <WizardCheckboxField
          label="Preguntar por Teléfono"
          checked={features.askForPhone}
          onChange={(e) => handleFeatureChange('askForPhone', e.target.checked)}
        />
      </div>
      <div className="mt-6 flex justify-end">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <ButtonLoader size="sm"/> : 'Guardar Características'}
        </button>
      </div>
    </WizardCard>
  );
};

export default FeaturesForm;
