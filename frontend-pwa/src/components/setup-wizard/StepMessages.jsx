import { motion } from 'framer-motion';
import { MessageCircle, Sparkles, Shield, CheckCircle, AlertCircle, Clock, MapPin, Truck, ChefHat, PartyPopper } from 'lucide-react';
import * as WizardComponents from '../ui/WizardComponents';

export default function StepMessages({ formData, setFormData, handleChange }) {
  const messageFields = [
    {
      key: 'welcome',
      label: 'Mensaje de Bienvenida',
      placeholder: '¡Hola {nombre}! Bienvenido a {restaurante}',
      required: true,
      icon: MessageCircle,
      variables: ['{nombre}', '{restaurante}'],
      description: 'Primer mensaje que verán tus clientes'
    },
    {
      key: 'menu_intro',
      label: 'Introducción al Menú',
      placeholder: 'Este es nuestro menú:',
      icon: ChefHat,
      description: 'Texto antes de mostrar el menú'
    },
    {
      key: 'ask_delivery_or_pickup',
      label: 'Preguntar Delivery o Recoger',
      placeholder: '¿Cómo deseas tu pedido?',
      icon: Truck,
      description: 'Pregunta sobre el método de entrega'
    },
    {
      key: 'ask_location',
      label: 'Solicitar Ubicación',
      placeholder: 'Comparte tu ubicación para calcular envío',
      icon: MapPin,
      description: 'Mensaje para pedir la ubicación'
    },
    {
      key: 'order_confirmed',
      label: 'Pedido Confirmado',
      placeholder: '✅ Pedido #{numero} confirmado. Total: ${total}.',
      icon: CheckCircle,
      variables: ['{numero}', '{total}'],
      description: 'Confirmación de pedido recibido'
    },
    {
      key: 'order_preparing',
      label: 'Pedido en Preparación',
      placeholder: '👨‍🍳 Tu pedido está en preparación.',
      icon: Clock,
      description: 'Aviso de que están cocinando'
    },
    {
      key: 'order_ready',
      label: 'Pedido Listo',
      placeholder: '✅ ¡Tu pedido está listo!',
      icon: CheckCircle,
      description: 'Aviso de pedido terminado'
    },
    {
      key: 'order_delivered',
      label: 'Pedido Entregado',
      placeholder: '🎉 ¡Gracias por tu compra!',
      icon: PartyPopper,
      description: 'Mensaje de despedida'
    },
    {
      key: 'closed_message',
      label: 'Mensaje de Cerrado',
      placeholder: 'Estamos cerrados. Horario: {horario}',
      icon: AlertCircle,
      variables: ['{horario}'],
      description: 'Cuando el restaurante está cerrado'
    },
    {
      key: 'outside_hours_message',
      label: 'Fuera de Horario',
      placeholder: 'Fuera de horario. Horario: {horario}',
      icon: Clock,
      variables: ['{horario}'],
      description: 'Fuera del horario de atención'
    },
    {
      key: 'complaint_message',
      label: 'Respuesta a Comentarios',
      placeholder: 'Gracias por tu comentario. Lo revisaremos.',
      icon: MessageCircle,
      description: 'Respuesta automática a quejas'
    }
  ];

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 sm:space-y-6"
    >
      <WizardComponents.WizardSectionHeader 
        icon={MessageCircle} 
        title="Mensajes"
        subtitle="Personaliza tus mensajes automáticos"
      />

      <WizardComponents.WizardInfoBox icon={Sparkles} variant="warning">
        <p className="font-semibold mb-1 text-xs sm:text-sm">✨ Personaliza tu Experiencia</p>
        <p className="text-xs">
          Estos mensajes se enviarán automáticamente en diferentes momentos del pedido. 
          Usa las variables para hacerlos más personales.
        </p>
      </WizardComponents.WizardInfoBox>

      <div className="space-y-3 sm:space-y-4">
        {messageFields.map((field, index) => (
          <motion.div
            key={field.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <WizardComponents.WizardCard className="bg-gradient-to-r from-[#ffe4c4]/20 to-[#ffd3c3]/20">
              <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#ffae91]/30 to-[#ff7f50]/30 rounded-lg flex items-center justify-center text-[#ff7f50] flex-shrink-0">
                  <field.icon size={16} className="sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[#ff7f50] text-xs sm:text-sm truncate">
                    {field.label} {field.required && <span className="text-error">*</span>}
                  </h4>
                  {field.description && (
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{field.description}</p>
                  )}
                </div>
              </div>

              <WizardComponents.WizardTextAreaField
                value={formData.messages[field.key]}
                onChange={(e) => handleChange('messages', field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={2}
                className="text-xs sm:text-sm"
              />

              {field.variables && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-gray-600 font-medium">Variables:</span>
                  {field.variables.map((variable) => (
                    <code
                      key={variable}
                      className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-[#ffe4c4]/70 rounded-md text-[#ff7f50] font-mono text-xs border border-[#ffb9a0]/50"
                    >
                      {variable}
                    </code>
                  ))}
                </div>
              )}
            </WizardComponents.WizardCard>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6 shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <p className="font-bold text-blue-900 text-sm sm:text-lg">Vista Previa</p>
        </div>
        <div className="space-y-2 sm:space-y-3">
          <div className="bg-white/70 p-3 sm:p-4 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-1 uppercase">Bienvenida:</p>
            <p className="text-xs sm:text-sm italic text-blue-800">
              {formData.messages.welcome
                .replace('{nombre}', 'Juan')
                .replace('{restaurante}', formData.info.name || 'tu restaurante')}
            </p>
          </div>
          <div className="bg-white/70 p-3 sm:p-4 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-1 uppercase">Confirmación:</p>
            <p className="text-xs sm:text-sm italic text-blue-800">
              {formData.messages.order_confirmed
                .replace('{numero}', '001')
                .replace('{total}', '250.00')}
            </p>
          </div>
        </div>
      </motion.div>

      <WizardComponents.WizardInfoBox icon={Shield} variant="success">
        <p className="font-semibold mb-1 text-xs sm:text-sm">🔒 Editable después</p>
        <p className="text-xs">
          Todos estos mensajes pueden ser editados posteriormente desde la configuración del restaurante.
        </p>
      </WizardComponents.WizardInfoBox>
    </motion.div>
  );
}