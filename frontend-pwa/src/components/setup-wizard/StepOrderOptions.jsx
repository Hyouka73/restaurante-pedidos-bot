import { motion } from 'framer-motion';
import { Bike, Truck, CreditCard, ShoppingBag, DollarSign, MapPin, Info } from 'lucide-react';
import * as WizardComponents from '../ui/WizardComponents';

export default function StepOrderOptions({ formData, setFormData, handleChange }) {
  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 sm:space-y-6"
    >
      <WizardComponents.WizardSectionHeader 
        icon={Bike} 
        title="Opciones de Pedido"
        subtitle="Configura cómo entregarás"
      />

      {/* Card de Tipos de Servicio */}
      <WizardComponents.WizardCard>
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff7f50]" />
          <h4 className="font-bold text-sm sm:text-lg text-gray-800">Tipos de Servicio</h4>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:gap-3">
          <WizardComponents.WizardCheckboxField
            label="🛵 Aceptar Delivery"
            checked={formData.features.deliveryEnabled}
            onChange={(e) => handleChange('features', 'deliveryEnabled', e.target.checked)}
          />
          <WizardComponents.WizardCheckboxField
            label="🏃 Aceptar Para Recoger"
            checked={formData.features.pickupEnabled}
            onChange={(e) => handleChange('features', 'pickupEnabled', e.target.checked)}
          />
        </div>
      </WizardComponents.WizardCard>

      {/* Card de Configuración de Delivery */}
      {formData.features.deliveryEnabled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <WizardComponents.WizardCard className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-lg text-gray-800 truncate">Configuración de Delivery</h4>
                <p className="text-xs text-gray-600">Define el costo de envío</p>
              </div>
            </div>

            <WizardComponents.WizardSelectField
              label="Tipo de Cálculo"
              value={formData.delivery.type}
              onChange={(e) => handleChange('delivery', 'type', e.target.value)}
              icon={Truck}
              tooltipText="Elige el método para calcular el costo de envío"
              tooltipId="delivery-type"
              helperText="Método para calcular envíos"
            >
              <option value="distance_based">📏 Por Distancia (Km)</option>
              <option value="zone_based">🗺️ Por Zonas</option>
              <option value="fixed">💵 Costo Fijo</option>
            </WizardComponents.WizardSelectField>

            {/* Configuración por Distancia */}
            {formData.delivery.type === 'distance_based' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 sm:space-y-4 mt-3 sm:mt-4"
              >
                <WizardComponents.WizardInfoBox icon={Info} variant="info">
                  <p className="text-xs">
                    El costo se calcula multiplicando los km por la tarifa establecida.
                  </p>
                </WizardComponents.WizardInfoBox>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <WizardComponents.WizardInputField
                    label="Costo por Km"
                    type="number"
                    value={formData.delivery.costPerKm}
                    onChange={(e) => handleChange('delivery', 'costPerKm', Number(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    icon={DollarSign}
                    helperText="Ej: $5.00 por km"
                  />
                  <WizardComponents.WizardInputField
                    label="Distancia Máx (Km)"
                    type="number"
                    value={formData.delivery.maxDistance}
                    onChange={(e) => handleChange('delivery', 'maxDistance', Number(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    icon={MapPin}
                    helperText="Radio de cobertura"
                  />
                </div>

                {/* Preview del cálculo */}
                <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-blue-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Vista Previa:</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-blue-50 p-2 rounded text-center">
                      <p className="text-gray-600">2 km</p>
                      <p className="font-bold text-blue-700">${(formData.delivery.costPerKm * 2).toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 p-2 rounded text-center">
                      <p className="text-gray-600">5 km</p>
                      <p className="font-bold text-blue-700">${(formData.delivery.costPerKm * 5).toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 p-2 rounded text-center">
                      <p className="text-gray-600">{formData.delivery.maxDistance} km</p>
                      <p className="font-bold text-blue-700">${(formData.delivery.costPerKm * formData.delivery.maxDistance).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Configuración Costo Fijo */}
            {formData.delivery.type === 'fixed' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 sm:mt-4"
              >
                <WizardComponents.WizardInfoBox icon={Info} variant="info">
                  <p className="text-xs">
                    Todos los envíos tendrán el mismo precio.
                  </p>
                </WizardComponents.WizardInfoBox>

                <div className="mt-3 sm:mt-4">
                  <WizardComponents.WizardInputField
                    label="Costo de Envío Fijo"
                    type="number"
                    value={formData.delivery.baseCost}
                    onChange={(e) => handleChange('delivery', 'baseCost', Number(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    icon={DollarSign}
                    helperText="Precio único para todos"
                  />
                </div>
              </motion.div>
            )}

            {/* Configuración por Zonas */}
            {formData.delivery.type === 'zone_based' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 sm:mt-4"
              >
                <WizardComponents.WizardInfoBox icon={Info} variant="warning">
                  <p className="text-xs">
                    Podrás definir zonas con costos específicos después de la configuración inicial.
                  </p>
                </WizardComponents.WizardInfoBox>
              </motion.div>
            )}

            {/* Envío Gratis */}
            <div className="mt-3 sm:mt-4">
              <WizardComponents.WizardInputField
                label="Pedido Mínimo para Envío Gratis"
                type="number"
                value={formData.delivery.freeDeliveryMinAmount}
                onChange={(e) => handleChange('delivery', 'freeDeliveryMinAmount', Number(e.target.value) || 0)}
                min="0"
                step="0.01"
                icon={DollarSign}
                helperText="0 = desactivar envío gratis"
              />
              
              {formData.delivery.freeDeliveryMinAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-2.5 sm:p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <p className="text-xs text-green-700">
                    🎉 <strong>Envío gratis</strong> en pedidos &gt; <strong>${formData.delivery.freeDeliveryMinAmount}</strong>
                  </p>
                </motion.div>
              )}
            </div>
          </WizardComponents.WizardCard>
        </motion.div>
      )}

      {/* Card de Métodos de Pago */}
      <WizardComponents.WizardCard>
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff7f50]" />
          <h4 className="font-bold text-sm sm:text-lg text-gray-800">Métodos de Pago</h4>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {formData.paymentMethods.map((method, index) => (
            <WizardComponents.WizardCheckboxField
              key={method.id}
              label={method.name}
              checked={method.enabled}
              onChange={(e) => {
                const updatedMethods = [...formData.paymentMethods];
                updatedMethods[index].enabled = e.target.checked;
                setFormData(prev => ({ ...prev, paymentMethods: updatedMethods }));
              }}
            />
          ))}
        </div>
      </WizardComponents.WizardCard>

      {/* Info Box Final */}
      <WizardComponents.WizardInfoBox icon={Info} variant="success">
        <p className="font-semibold mb-1">💡 Recomendación</p>
        <p className="text-xs">
          Múltiples opciones de pago aumentan conversiones. Ten un sistema de costos claro para tus clientes.
        </p>
      </WizardComponents.WizardInfoBox>
    </motion.div>
  );
}