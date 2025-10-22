import { motion } from 'framer-motion';
import { Bike, Truck, CreditCard, ShoppingBag, DollarSign, MapPin, Info, HelpCircle } from 'lucide-react';
import * as WizardComponents from '../ui/WizardComponents';
import CustomTooltip from '../ui/CustomTooltip';

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
          <CustomTooltip 
            text="Selecciona los métodos de entrega que ofrecerás a tus clientes. Puedes activar ambos."
            position="top"
          >
            <HelpCircle className="w-4 h-4 text-gray-400 hover:text-[#ff7f50] cursor-help transition-colors" />
          </CustomTooltip>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:gap-3">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="deliveryEnabled"
              checked={formData.features.deliveryEnabled}
              onChange={(e) => handleChange('features', 'deliveryEnabled', e.target.checked)}
              className="mt-0.5 checkbox checkbox-sm"
              style={{ accentColor: '#ff7f50' }}
            />
            <div className="flex-1">
              <label htmlFor="deliveryEnabled" className="text-xs sm:text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                🛵 Aceptar Delivery
                <CustomTooltip 
                  text="Permite que los clientes soliciten entrega a domicilio. Podrás configurar costos y zonas de cobertura."
                  position="right"
                >
                  <HelpCircle className="w-3 h-3 text-gray-400 hover:text-[#ff7f50] cursor-help transition-colors" />
                </CustomTooltip>
              </label>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="pickupEnabled"
              checked={formData.features.pickupEnabled}
              onChange={(e) => handleChange('features', 'pickupEnabled', e.target.checked)}
              className="mt-0.5 checkbox checkbox-sm"
              style={{ accentColor: '#ff7f50' }}
            />
            <div className="flex-1">
              <label htmlFor="pickupEnabled" className="text-xs sm:text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                🏃 Aceptar Para Recoger
                <CustomTooltip 
                  text="Los clientes pueden recoger su pedido directamente en tu local sin costo de envío."
                  position="right"
                >
                  <HelpCircle className="w-3 h-3 text-gray-400 hover:text-[#ff7f50] cursor-help transition-colors" />
                </CustomTooltip>
              </label>
            </div>
          </div>
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

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="label-text text-xs sm:text-sm font-semibold text-gray-700">
                  Tipo de Cálculo
                </label>
                <CustomTooltip 
                  text="Por Distancia: Se calcula según kilómetros. Por Zonas: Defines áreas con precios fijos. Costo Fijo: Mismo precio para todos."
                  position="right"
                >
                  <HelpCircle className="w-4 h-4 text-gray-400 hover:text-[#ff7f50] cursor-help transition-colors" />
                </CustomTooltip>
              </div>
              
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none z-10" />
                <select
                  value={formData.delivery.type}
                  onChange={(e) => handleChange('delivery', 'type', e.target.value)}
                  className="
                    w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base
                    bg-white border-2 border-[#ffe4c4] rounded-xl
                    text-gray-700 font-medium
                    focus:outline-none focus:border-[#ff7f50] focus:ring-4 focus:ring-[#ffe4c4]/50
                    transition-all duration-300 appearance-none cursor-pointer
                    hover:border-[#ffb9a0]
                  "
                >
                  <option value="distance_based">📏 Por Distancia (Km)</option>
                  <option value="zone_based">🗺️ Por Zonas</option>
                  <option value="fixed">💵 Costo Fijo</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-2 ml-1">Método para calcular envíos</p>
            </div>

            {/* Configuración por Distancia */}
            {formData.delivery.type === 'distance_based' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 sm:space-y-4 mt-3 sm:mt-4"
              >
                <WizardComponents.WizardInfoBox icon={Info} variant="info">
                  <p className="text-xs">
                    El costo se calcula multiplicando los km por la tarifa establecida. Ejemplo: Si pones $5/km, un pedido a 3km costará $15.
                  </p>
                </WizardComponents.WizardInfoBox>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="label-text text-xs sm:text-sm font-semibold text-gray-700">
                        Costo por Km
                      </label>
                      <CustomTooltip 
                        text="Precio que cobrarás por cada kilómetro de distancia desde tu restaurante hasta el cliente"
                        position="top"
                      >
                        <HelpCircle className="w-3 h-3 text-gray-400 hover:text-[#ff7f50] cursor-help transition-colors" />
                      </CustomTooltip>
                    </div>
                    <WizardComponents.WizardInputField
                      type="number"
                      value={formData.delivery.costPerKm}
                      onChange={(e) => handleChange('delivery', 'costPerKm', Number(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      icon={DollarSign}
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="label-text text-xs sm:text-sm font-semibold text-gray-700">
                        Distancia Máx (Km)
                      </label>
                      <CustomTooltip 
                        text="Radio máximo de cobertura desde tu restaurante. Los pedidos fuera de esta distancia serán rechazados automáticamente"
                        position="top"
                      >
                        <HelpCircle className="w-3 h-3 text-gray-400 hover:text-[#ff7f50] cursor-help transition-colors" />
                      </CustomTooltip>
                    </div>
                    <WizardComponents.WizardInputField
                      type="number"
                      value={formData.delivery.maxDistance}
                      onChange={(e) => handleChange('delivery', 'maxDistance', Number(e.target.value) || 0)}
                      min="0"
                      step="0.1"
                      icon={MapPin}
                    />
                  </div>
                </div>

                {/* Preview del cálculo */}
                <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-blue-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Vista Previa de Costos:</p>
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
                className="mt-3 sm:mt-4 space-y-3 sm:space-y-4"
              >
                <WizardComponents.WizardInfoBox icon={Info} variant="info">
                  <p className="text-xs">
                    Todos los envíos tendrán el mismo precio, sin importar la distancia. Ideal para zonas pequeñas o áreas bien definidas.
                  </p>
                </WizardComponents.WizardInfoBox>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="label-text text-xs sm:text-sm font-semibold text-gray-700">
                      Costo de Envío Fijo
                    </label>
                    <CustomTooltip 
                      text="Este será el costo de envío para todos los pedidos, independientemente de la distancia"
                      position="right"
                    >
                      <HelpCircle className="w-3 h-3 text-gray-400 hover:text-[#ff7f50] cursor-help transition-colors" />
                    </CustomTooltip>
                  </div>
                  <WizardComponents.WizardInputField
                    type="number"
                    value={formData.delivery.baseCost}
                    onChange={(e) => handleChange('delivery', 'baseCost', Number(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    icon={DollarSign}
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
                    Podrás definir zonas con costos específicos después de la configuración inicial. Por ejemplo: Zona Centro $20, Zona Norte $30, etc.
                  </p>
                </WizardComponents.WizardInfoBox>
              </motion.div>
            )}

            {/* Envío Gratis */}
            <div className="mt-3 sm:mt-4">
              <div className="flex items-center gap-2 mb-2">
                <label className="label-text text-xs sm:text-sm font-semibold text-gray-700">
                  Pedido Mínimo para Envío Gratis
                </label>
                <CustomTooltip 
                  text="Si el total del pedido supera este monto, el envío será gratis. Pon 0 para desactivar esta opción."
                  position="top"
                >
                  <HelpCircle className="w-4 h-4 text-gray-400 hover:text-[#ff7f50] cursor-help transition-colors" />
                </CustomTooltip>
              </div>
              <WizardComponents.WizardInputField
                type="number"
                value={formData.delivery.freeDeliveryMinAmount}
                onChange={(e) => handleChange('delivery', 'freeDeliveryMinAmount', Number(e.target.value) || 0)}
                min="0"
                step="0.01"
                icon={DollarSign}
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
          <CustomTooltip 
            text="Selecciona los métodos de pago que aceptarás. Puedes activar varios al mismo tiempo."
            position="top"
          >
            <HelpCircle className="w-4 h-4 text-gray-400 hover:text-[#ff7f50] cursor-help transition-colors" />
          </CustomTooltip>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {formData.paymentMethods.map((method, index) => (
            <div key={method.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                id={`payment-${method.id}`}
                checked={method.enabled}
                onChange={(e) => {
                  const updatedMethods = [...formData.paymentMethods];
                  updatedMethods[index].enabled = e.target.checked;
                  setFormData(prev => ({ ...prev, paymentMethods: updatedMethods }));
                }}
                className="mt-0.5 checkbox checkbox-sm"
                style={{ accentColor: '#ff7f50' }}
              />
              <label htmlFor={`payment-${method.id}`} className="text-xs sm:text-sm font-medium text-gray-700 cursor-pointer">
                {method.name}
              </label>
            </div>
          ))}
        </div>
      </WizardComponents.WizardCard>

      {/* Info Box Final */}
      <WizardComponents.WizardInfoBox icon={Info} variant="success">
        <p className="font-semibold mb-1">💡 Recomendación</p>
        <p className="text-xs">
          Múltiples opciones de pago aumentan las conversiones. Ten un sistema de costos claro para tus clientes y evita sorpresas en el checkout.
        </p>
      </WizardComponents.WizardInfoBox>
    </motion.div>
  );
}