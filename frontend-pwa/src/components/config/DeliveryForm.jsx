import { useState, useEffect } from 'react';
import { WizardInputField, WizardSelectField, WizardSaveButton, WizardSwitch } from '../ui/WizardComponents';
import { Truck, DollarSign, MapPin, Package } from 'lucide-react';
import { useAlert } from '../ui/CustomAlert';
import  api  from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';
import { motion } from 'framer-motion';

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
    <div className="bg-white rounded-2xl shadow-xl border-2 border-[#ffe4c4] p-3 sm:p-6 hover:shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="mb-6 pb-4 border-b-2 border-[#ffe4c4]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Truck size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-green-600">Opciones de Delivery</h3>
            <p className="text-sm text-gray-600 mt-1">Configura cómo entregarás los pedidos</p>
          </div>
        </div>
      </div>

      {/* Toggle principal de delivery */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          mb-6 p-3 sm:p-4 rounded-xl border-2 transition-all duration-300
          ${features.deliveryEnabled 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
            : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
          }
        `}
      >
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center transition-all
              ${features.deliveryEnabled 
                ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-md' 
                : 'bg-gray-300'
              }
            `}>
              <Truck size={20} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-700 block">
                Servicio de Delivery
              </span>
              <span className="text-xs text-gray-500">
                {features.deliveryEnabled ? 'Entregas activadas' : 'Entregas desactivadas'}
              </span>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <WizardSwitch
            checked={features.deliveryEnabled}
            onChange={(e) => handleFeatureChange('deliveryEnabled', e.target.checked)}
            activeClass="bg-gradient-to-r from-green-400 to-emerald-500"
          />
        </label>
      </motion.div>

      {/* Configuración de delivery (solo visible si está habilitado) */}
      {features.deliveryEnabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="space-y-6">
            {/* Tipo de costo */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4 border-2 border-blue-200">
              <WizardSelectField
                label="Tipo de Costo de Envío"
                value={delivery.type}
                onChange={(e) => handleDeliveryChange('type', e.target.value)}
                icon={Package}
                helperText="Define cómo se calculará el costo del envío"
              >
                <option value="distance_based">🗺️ Por Distancia (calculado automáticamente)</option>
                <option value="fixed">💵 Costo Fijo (mismo precio siempre)</option>
              </WizardSelectField>
            </div>

            {/* Campos dinámicos según el tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {delivery.type === 'distance_based' ? (
                <>
                  <WizardInputField
                    label="Costo por Kilómetro"
                    type="number"
                    step="0.01"
                    min="0"
                    value={delivery.costPerKm}
                    onChange={(e) => handleDeliveryChange('costPerKm', parseFloat(e.target.value) || 0)}
                    icon={DollarSign}
                    placeholder="10.00"
                    helperText="Precio por km recorrido"
                  />
                  <WizardInputField
                    label="Distancia Máxima"
                    type="number"
                    step="0.1"
                    min="0"
                    value={delivery.maxDistance}
                    onChange={(e) => handleDeliveryChange('maxDistance', parseFloat(e.target.value) || 0)}
                    icon={MapPin}
                    placeholder="10.0"
                    helperText="Kilómetros máximos de entrega"
                  />
                </>
              ) : (
                <div className="md:col-span-2">
                  <WizardInputField
                    label="Costo de Envío Fijo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={delivery.baseCost}
                    onChange={(e) => handleDeliveryChange('baseCost', parseFloat(e.target.value) || 0)}
                    icon={DollarSign}
                    placeholder="50.00"
                    helperText="Precio único de envío para todos los pedidos"
                  />
                </div>
              )}
            </div>

            {/* Envío gratis */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
              <WizardInputField
                label="Pedido Mínimo para Envío Gratis"
                type="number"
                step="0.01"
                min="0"
                value={delivery.freeDeliveryMinAmount}
                onChange={(e) => handleDeliveryChange('freeDeliveryMinAmount', parseFloat(e.target.value) || 0)}
                icon={DollarSign}
                placeholder="200.00"
                helperText="Monto mínimo para envío sin costo (0 = desactivado)"
              />
            </div>

            {/* Resumen visual */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
              <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Truck size={18} className="text-green-600" />
                Resumen de Configuración
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de costo:</span>
                  <span className="font-semibold text-gray-800">
                    {delivery.type === 'distance_based' ? 'Por Distancia' : 'Costo Fijo'}
                  </span>
                </div>
                {delivery.type === 'distance_based' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Precio por km:</span>
                      <span className="font-semibold text-green-600">${delivery.costPerKm?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Distancia máxima:</span>
                      <span className="font-semibold text-green-600">{delivery.maxDistance || 0} km</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Costo de envío:</span>
                    <span className="font-semibold text-green-600">${delivery.baseCost?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-green-200">
                  <span className="text-gray-600">Envío gratis desde:</span>
                  <span className="font-semibold text-amber-600">
                    {delivery.freeDeliveryMinAmount > 0 
                      ? `$${delivery.freeDeliveryMinAmount.toFixed(2)}` 
                      : 'Desactivado'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Botón de guardar */}
      <div className="mt-8 pt-6 border-t-2 border-[#ffe4c4] flex justify-end">
        <WizardSaveButton 
          onClick={handleSave}
          loading={saving}
          className="w-full sm:w-auto min-w-[180px]"
        >
          Guardar Delivery
        </WizardSaveButton>
      </div>
    </div>
  );
};

export default DeliveryForm;