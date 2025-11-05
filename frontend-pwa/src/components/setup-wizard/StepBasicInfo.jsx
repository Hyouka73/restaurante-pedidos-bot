import { motion } from 'framer-motion';
import { Store, Phone, Home, Bot, Shield, MapPin, Sparkles, HelpCircle } from 'lucide-react';
import * as WizardComponents from '../ui/WizardComponents';
import MapSelectorModal from '../ui/MapSelectorModal';
import CustomTooltip from '../ui/CustomTooltip';
import { useState } from 'react';

export default function StepBasicInfo({ formData, setFormData, handleChange, handleSelectLocation }) {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const openMapModal = () => setIsMapModalOpen(true);
  const closeMapModal = () => setIsMapModalOpen(false);

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 sm:space-y-6"
    >
      <WizardComponents.WizardSectionHeader 
        icon={Store} 
        title="Información Básica"
        subtitle="Cuéntanos sobre tu restaurante"
      />

      {/* Card de Información General */}
      <WizardComponents.WizardCard>
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="label-text text-xs sm:text-sm font-semibold text-gray-700">
                Nombre del Restaurante <span className="text-[#ff7f50]">*</span>
              </label>
              <CustomTooltip 
                text="Este nombre aparecerá en todos los mensajes que se envíen a tus clientes"
                position="right"
              >
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-[#ff7f50] cursor-help transition-colors" />
              </CustomTooltip>
            </div>
            <WizardComponents.WizardInputField
              value={formData.info.name}
              onChange={(e) => handleChange('info', 'name', e.target.value)}
              placeholder="Ej: Restaurante El Sabor"
              required
              icon={Store}
            />
          </div>

          <WizardComponents.WizardTextAreaField
            label="Descripción"
            value={formData.info.description}
            onChange={(e) => handleChange('info', 'description', e.target.value)}
            placeholder="Describe tu restaurante..."
            rows={3}
            maxLength={200}
            helperText="Breve descripción (máx. 200 caracteres)"
          />
        </div>
      </WizardComponents.WizardCard>

      {/* Card de Contacto */}
      <WizardComponents.WizardCard>
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff7f50]" />
          <h4 className="font-bold text-sm sm:text-base text-gray-800">Información de Contacto</h4>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="label-text text-xs sm:text-sm font-semibold text-gray-700">
                Teléfono <span className="text-[#ff7f50]">*</span>
              </label>
              <CustomTooltip 
                text="Número de contacto donde los clientes pueden comunicarse. Se recomienda formato internacional: +52 961 123 4567"
                position="right"
              >
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-[#ff7f50] cursor-help transition-colors" />
              </CustomTooltip>
            </div>
            <WizardComponents.WizardInputField
              type="tel"
              value={formData.info.phone}
              onChange={(e) => handleChange('info', 'phone', e.target.value)}
              placeholder="+52 961 123 4567"
              required
              icon={Phone}
            />
          </div>
          
          {/* Ubicación en el Mapa */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="label-text text-xs sm:text-sm font-semibold text-gray-700">
                Ubicación del Restaurante <span className="text-[#ff7f50]">*</span>
              </label>
              <CustomTooltip 
                text="Selecciona la ubicación exacta de tu restaurante. Esto se usará para calcular distancias de envío y mostrar a tus clientes dónde estás"
                position="right"
              >
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-[#ff7f50] cursor-help transition-colors" />
              </CustomTooltip>
            </div>
            
            <motion.button
              type="button"
              onClick={openMapModal}
              whileTap={{ scale: 0.98 }}
              className="
                w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl font-medium text-sm sm:text-base
                bg-white border-2 border-[#ffe4c4] hover:border-[#ff7f50]
                text-gray-700 hover:text-[#ff7f50]
                flex items-center justify-center gap-2
                transition-all duration-300 shadow-sm hover:shadow-md
                active:scale-95
              "
            >
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{formData.info.location?.lat ? 'Cambiar Ubicación' : 'Seleccionar en el Mapa'}</span>
            </motion.button>
            
            {/* Feedback de ubicación seleccionada */}
            {formData.info.location?.lat && formData.info.location?.lng ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 p-2.5 sm:p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield size={10} className="text-white sm:w-3 sm:h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green-700">Ubicación confirmada</p>
                    <p className="text-xs text-green-600 mt-1 truncate">
                      {formData.info.location.lat.toFixed(6)}, {formData.info.location.lng.toFixed(6)}
                    </p>
                    {formData.info.location.formatted_address && (
                      <p className="text-xs text-green-600 mt-0.5 line-clamp-2">
                        {formData.info.location.formatted_address}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <p className="text-xs text-red-500 mt-2 ml-1 flex items-center gap-1">
                <Sparkles size={12} />
                <span>Selecciona tu ubicación para continuar</span>
              </p>
            )}
          </div>
        </div>
      </WizardComponents.WizardCard>

      {/* Card de Integración con Telegram */}
      {/*
      <WizardComponents.WizardCard className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm sm:text-lg text-gray-800 truncate">Integración con Telegram</h4>
            <p className="text-xs text-gray-600">Conecta tu bot para recibir pedidos</p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="label-text text-xs sm:text-sm font-semibold text-gray-700">
              Token de Bot de Telegram <span className="text-[#ff7f50]">*</span>
            </label>
            <CustomTooltip 
              text="Obtén tu token desde @BotFather en Telegram. Este token es obligatorio para que el sistema pueda recibir y procesar pedidos automáticamente. Sin él, tu bot no funcionará."
              position="top"
            >
              <HelpCircle className="w-4 h-4 text-gray-400 hover:text-[#ff7f50] cursor-help transition-colors" />
            </CustomTooltip>
          </div>
          <WizardComponents.WizardInputField
            value={formData.info.telegramToken}
            onChange={(e) => handleChange('info', 'telegramToken', e.target.value)}
            placeholder="123456789:ABC..."
            type="password"
            required
            icon={Bot}
          />
        </div>

        {formData.info.telegramToken && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 sm:mt-4"
          >
            <WizardComponents.WizardInfoBox icon={Shield} variant="success">
              <p className="font-semibold mb-1 text-xs sm:text-sm">Token guardado de forma segura</p>
              <p className="text-xs">
                Este token es obligatorio para que tu bot pueda recibir y procesar pedidos automáticamente.
              </p>
            </WizardComponents.WizardInfoBox>
          </motion.div>
        )}
      </WizardComponents.WizardCard>
      */}'

      {/* Info Box Final */}
      <WizardComponents.WizardInfoBox icon={Sparkles} variant="warning">
        <p className="font-semibold mb-1 text-xs sm:text-sm">💡 ¿Por qué necesitamos esto?</p>
        <ul className="text-xs space-y-1 mt-2">
          <li>• <strong>Nombre:</strong> Personalizar tu menú</li>
          <li>• <strong>Teléfono:</strong> Contacto con clientes</li>
          <li>• <strong>Ubicación:</strong> Calcular envíos</li>
          {/* <li>• <strong>Token:</strong> Automatizar pedidos</li> */}
        </ul>
      </WizardComponents.WizardInfoBox>

      {/* Modal de Mapa */}
      <MapSelectorModal
        isOpen={isMapModalOpen}
        onClose={closeMapModal}
        onSelectLocation={handleSelectLocation}
        initialLocation={
          formData.info.location &&
          typeof formData.info.location.lat === 'number' &&
          !isNaN(formData.info.location.lat) &&
          typeof formData.info.location.lng === 'number' &&
          !isNaN(formData.info.location.lng)
            ? formData.info.location
            : null
        }
      />
    </motion.div>
  );
}