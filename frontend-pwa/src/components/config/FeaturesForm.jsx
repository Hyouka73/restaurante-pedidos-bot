// frontend-pwa/src/components/config/FeaturesForm.jsx
import { WizardCard, WizardCheckboxField } from '../ui/WizardComponents'; // Ajusta la ruta
import { ShoppingBag, MapPin, Image, MessageSquare } from 'lucide-react';

const FeaturesForm = ({ config, onChange }) => {
  const handleFeatureChange = (field, value) => {
    onChange('features', field, value);
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
          checked={config.features.deliveryEnabled}
          onChange={(e) => handleFeatureChange('deliveryEnabled', e.target.checked)}
        />
        <WizardCheckboxField
          label="Aceptar Pedidos para Recoger"
          checked={config.features.pickupEnabled}
          onChange={(e) => handleFeatureChange('pickupEnabled', e.target.checked)}
        />
        <WizardCheckboxField
          label="Requerir ubicación si es delivery"
          checked={config.features.requireLocationIfDelivery}
          onChange={(e) => handleFeatureChange('requireLocationIfDelivery', e.target.checked)}
        />
        <WizardCheckboxField
          label="Mostrar imágenes en el menú"
          checked={config.features.showMenuImages}
          onChange={(e) => handleFeatureChange('showMenuImages', e.target.checked)}
        />
        <WizardCheckboxField
          label="Aceptar Comentarios/Reclamos"
          checked={config.features.acceptComplaints}
          onChange={(e) => handleFeatureChange('acceptComplaints', e.target.checked)}
        />
        <WizardCheckboxField
          label="Preguntar por Nombre"
          checked={config.features.askForName}
          onChange={(e) => handleFeatureChange('askForName', e.target.checked)}
        />
        <WizardCheckboxField
          label="Preguntar por Teléfono"
          checked={config.features.askForPhone}
          onChange={(e) => handleFeatureChange('askForPhone', e.target.checked)}
        />
      </div>
    </WizardCard>
  );
};

export default FeaturesForm;