// frontend-pwa/src/pages/SetupWizard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  Clock,
  Bike,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Shield,
  Bot,
  Sparkles,
  MapPin as MapPinIcon,
  User,
  Phone,
  Home,
  CreditCard,
  Truck,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import * as WizardComponents from '../components/ui/WizardComponents';
import MapSelectorModal from '../components/ui/MapSelectorModal';
import MiniDots from '../components/ui/MiniDots';

export default function SetupWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ isVisible: false, type: 'error', message: '' }); // Cambiado de 'error' a 'alert'
  const hideAlert = () => setAlert(prev => ({ ...prev, isVisible: false }));
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    info: {
      name: '',
      description: '',
      phone: '',
      address: '',
      telegramToken: '', // Campo para el token de Telegram
      location: {
        lat: null,
        lng: null,
        formatted_address: ''
      }
    },
    hours: {
      monday: { open: "10:00", close: "22:00", closed: false },
      tuesday: { open: "10:00", close: "22:00", closed: false },
      wednesday: { open: "10:00", close: "22:00", closed: false },
      thursday: { open: "10:00", close: "22:00", closed: false },
      friday: { open: "10:00", close: "23:00", closed: false },
      saturday: { open: "10:00", close: "23:00", closed: false },
      sunday: { open: "10:00", close: "21:00", closed: false }
    },
    availabilitySettings: {
      mode: 'hybrid',
      useScheduledHours: true,
      remindersEnabled: true,
    },
    delivery: {
      enabled: true,
      type: "distance_based",
      baseCost: 30,
      costPerKm: 5,
      maxDistance: 10,
      freeDeliveryMinAmount: 150
    },
    paymentMethods: [
      { id: "cash", name: "Efectivo 💵", enabled: true },
      { id: "card", name: "Tarjeta 💳", enabled: true },
      { id: "transfer", name: "Transferencia 🏦", enabled: false }
    ],
    features: {
      deliveryEnabled: true,
      pickupEnabled: true,
      askForName: true,
      askForPhone: true,
      requireLocationIfDelivery: true,
      showMenuImages: true,
      acceptComplaints: true
    },
    messages: {
      welcome: '¡Hola {nombre}! Bienvenido a {restaurante}',
      menu_intro: 'Este es nuestro menú:',
      ask_delivery_or_pickup: '¿Cómo deseas tu pedido?',
      ask_location: 'Por favor, comparte tu ubicación para calcular el envío.',
      order_confirmed: '✅ Pedido #{numero} confirmado. Total: ${total}.',
      order_preparing: '👨‍🍳 Tu pedido está en preparación.',
      order_ready: '✅ ¡Tu pedido está listo!',
      order_delivered: '🎉 ¡Gracias por tu compra!',
      closed_message: 'Lo sentimos, estamos cerrados. Horario: {horario}',
      outside_hours_message: 'Lo sentimos, estamos fuera de horario. Horario: {horario}',
      complaint_message: 'Gracias por tu comentario. Lo revisaremos pronto.'
    },
    commands: {
      start: { enabled: true, description: "Iniciar conversación" },
      menu: { enabled: true, description: "Ver menú completo" },
      pedido: { enabled: true, description: "Hacer un pedido" },
      estado: { enabled: true, description: "Ver estado de mi pedido" },
      ayuda: { enabled: true, description: "Obtener ayuda" },
      reclamar: { enabled: true, description: "Enviar un comentario o reclamo" }
    }
  });

  const navigate = useNavigate();

  useEffect(() => {
    const checkSetupStatus = async () => {
      if (!auth.currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (!userDoc.exists()) {
          showAlert('Usuario no encontrado.', 'error'); // Usar showAlert
          return;
        }
        const restaurantId = userDoc.data().restaurantId;

        const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
        if (!restaurantDoc.exists()) {
          showAlert('Restaurante no encontrado.', 'error'); // Usar showAlert
          return;
        }
        const restaurantData = restaurantDoc.data();

        setSetupCompleted(restaurantData.setupCompleted || false);

        if (restaurantData.setupCompleted) {
          navigate('/');
          return;
        }

        // Precargar datos si existen
        if (restaurantData.info) {
          setFormData(prev => ({ ...prev, ...restaurantData }));
        }

      } catch (err) {
        showAlert('Error al verificar el estado de configuración: ' + err.message, 'error'); // Usar showAlert
      }
    };

    checkSetupStatus();
  }, [navigate]);

  // --- FUNCIONES PARA MANEJAR ALERTAS ---
  const showAlert = (message, type = 'error') => {
    setAlert({ isVisible: true, type, message });
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      setAlert(prev => ({ ...prev, isVisible: false }));
    }, 5000);
  };
  // -------------------------------------

  const handleChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleHourChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          ...prev.hours[day],
          [field]: value
        }
      }
    }));
  };

  // --- FUNCIONES PARA EL MODAL DE MAPA ---
  const openMapModal = () => {
    setIsMapModalOpen(true);
  };

  const closeMapModal = () => {
    setIsMapModalOpen(false);
  };

  const handleSelectLocation = (selectedLocation) => {
    handleChange('info', 'location', selectedLocation);
    closeMapModal();
  };
  // ---------------------------------------

  // --- VALIDACIONES ---
  const validateStep = (currentStep) => {
    const errors = [];
    if (currentStep === 1) {
      if (!formData.info.name.trim()) {
        errors.push("El nombre del restaurante es obligatorio.");
      }
      if (!formData.info.phone.trim()) {
        errors.push("El teléfono del restaurante es obligatorio.");
      }
      // Validar que se haya seleccionado una ubicación (lat y lng son números)
      if (
        !formData.info.location ||
        typeof formData.info.location.lat !== 'number' ||
        isNaN(formData.info.location.lat) ||
        typeof formData.info.location.lng !== 'number' ||
        isNaN(formData.info.location.lng)
      ) {
        errors.push("Debes seleccionar la ubicación del restaurante en el mapa.");
      }
      if (!formData.info.name || !formData.info.name.trim()){
        errors.push("El token de bot de Telegram es obligatorio.");
      }
    }
    if (currentStep === 2) {
      // Validaciones para horarios si es necesario
      Object.entries(formData.hours).forEach(([day, schedule]) => {
        if (!schedule.closed) {
          if (schedule.close <= schedule.open) {
            errors.push(`La hora de cierre del ${dayNames[day]} debe ser después de la de apertura.`);
          }
        }
      });
    }
    if (currentStep === 3) {
      // Validaciones para delivery si está habilitado
      if (formData.features.deliveryEnabled) {
        if (formData.delivery.type === 'distance_based') {
          if (isNaN(formData.delivery.costPerKm) || formData.delivery.costPerKm <= 0) {
            errors.push("El costo por Km debe ser un número positivo.");
          }
          if (isNaN(formData.delivery.maxDistance) || formData.delivery.maxDistance <= 0) {
            errors.push("La distancia máxima debe ser un número positivo.");
          }
        }
        if (formData.delivery.type === 'fixed') {
          if (isNaN(formData.delivery.baseCost) || formData.delivery.baseCost < 0) {
            errors.push("El costo de envío fijo debe ser un número no negativo.");
          }
        }
        if (isNaN(formData.delivery.freeDeliveryMinAmount) || formData.delivery.freeDeliveryMinAmount < 0) {
          errors.push("El pedido mínimo para envío gratis debe ser un número no negativo.");
        }
      }
    }
    if (currentStep === 4) {
      // Validaciones para mensajes si es necesario
      if (!formData.messages.welcome.trim()) {
        errors.push("El mensaje de bienvenida es obligatorio.");
      }
    }
    return errors;
  };
  // --------------------

  const handleNext = () => {
    const errors = validateStep(step);
    if (errors.length > 0) {
      showAlert(errors.join(" "), 'error'); // Usar showAlert
      return;
    }
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    // Validar el paso actual (paso 4) antes de enviar
    const errors = validateStep(step);
    if (errors.length > 0) {
      showAlert(errors.join(" "), 'error'); // Usar showAlert
      return;
    }

    if (!auth.currentUser) return;

    setLoading(true);
    showAlert('', 'error'); // Limpiar alerta anterior
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const restaurantId = userDoc.data().restaurantId;

      const restaurantRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(restaurantRef, {
        ...formData,
        setupCompleted: true
      });

      setSetupCompleted(true);
      showAlert('✅ Configuración inicial completada exitosamente.', 'success'); // Mostrar éxito
      setTimeout(() => navigate('/'), 2000); // Redirigir después de 2 segundos

    } catch (err) {
      showAlert('Error al guardar la configuración: ' + err.message, 'error'); // Usar showAlert
    } finally {
      setLoading(false);
    }
  };

  const dayNames = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  if (setupCompleted) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #ffe4c4 0%, #ffe7de 40%, #ffd3c3 70%, rgba(255, 127, 80, 0.4) 100%)'
      }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-[#ff7f50] mx-auto mb-4" />
          <p className="text-[#ff7f50] text-lg font-semibold">Configuración completada. Redirigiendo...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #ffe4c4 0%, #ffe7de 40%, #ffd3c3 70%, rgba(255, 127, 80, 0.4) 100%)'
    }}>
      {/* Modal de Selección de Mapa */}
      <MapSelectorModal
        isOpen={isMapModalOpen}
        onClose={closeMapModal}
        onSelectLocation={handleSelectLocation}
        initialLocation={
          formData.info.location &&
          typeof formData.info.location.lat === 'number' &&
          typeof formData.info.location.lng === 'number'
            ? formData.info.location
            : null
        }
      />

      {/* --- TOAST DE ALERTA (Sticky Top Center, Estilo Bonito) --- */}
      {alert.isVisible && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 50%, #fca5a5 100%)'
            }}
          >
            {/* Animación de fondo ondulante */}
            <motion.div
              className="absolute inset-0 opacity-20"
              style={{
                background: 'radial-gradient(circle at 20% 50%, #dc2626 0%, transparent 50%)'
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.3, 0.2]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Borde superior animado */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: 'linear-gradient(90deg, #dc2626, #ef4444, #dc2626)'
              }}
              animate={{
                backgroundPosition: ['0% 0%', '100% 0%', '0% 0%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />

            <div className="relative p-4 border-2 border-red-300/50">
              <div className="flex items-start gap-4">
                {/* Ícono animado */}
                <motion.div
                  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center relative"
                  style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                  }}
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(220, 38, 38, 0.4)',
                      '0 0 0 10px rgba(220, 38, 38, 0)',
                      '0 0 0 0 rgba(220, 38, 38, 0)'
                    ]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                >
                  <motion.div
                    animate={{
                      rotate: [0, -10, 10, -10, 0],
                      scale: [1, 1.1, 1, 1.1, 1]
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                  >
                    <AlertTriangle className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </motion.div>
                </motion.div>

                {/* Contenido */}
                <div className="flex-1 min-w-0 pt-1">
                  <motion.h4
                    className="text-base font-bold text-red-900 mb-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    ¡Error!
                  </motion.h4>
                  <motion.p
                    className="text-sm text-red-800 font-medium leading-relaxed"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {alert.message}
                  </motion.p>
                </div>

                {/* Botón de cerrar mejorado */}
                <motion.button
                  onClick={hideAlert}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-red-500/20 border border-red-500/40 text-red-700 transition-all duration-200 cursor-pointer"
                  whileHover={{
                    scale: 1.1,
                    backgroundColor: 'rgba(220, 38, 38, 0.3)',
                    borderColor: 'rgba(220, 38, 38, 0.6)'
                  }}
                  whileTap={{ scale: 0.9 }}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <X size={16} strokeWidth={2.5} />
                </motion.button>
              </div>

              {/* Barra de progreso de auto-cierre (opcional) */}
              {alert.autoClose && (
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-red-600 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: alert.duration || 5, ease: "linear" }}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
      {/* ---------------------- */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl"
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          
          {/* Header Optimizado */}
          <motion.div
            className="p-5 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(120deg, #ffae91 30%, #ff7f50 88%, #ffe4c4 40%, #ffb9a0 78%)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
              transition={{ duration: 10, repeat: Infinity }}
            />
            <motion.div
              className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"
              animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <Sparkles className="w-10 h-10 text-white mx-auto mb-3" />
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                Configuración Inicial
              </h1>
              <p className="text-white/95 text-base">
                Completa estos pasos para comenzar tu aventura
              </p>
            </div>
          </motion.div>

          <div className="p-6 sm:p-8">
            {/* Indicadores de Paso */}
            <WizardComponents.WizardStepIndicator steps={[1, 2, 3, 4]} currentStep={step} />

            {/* Contenido Principal */}
            <motion.div
              className="bg-white rounded-xl shadow-lg border-2 border-[#ffe4c4] overflow-hidden"
              layout
            >
              <div className="p-6 sm:p-8">
                
                {/* Cabecera de Paso Mejorada */}
                <motion.div
                  className="bg-gradient-to-r from-[#ffe4c4]/50 to-[#ffd3c3]/50 rounded-xl px-5 py-4 mb-6"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[#ff7f50]">
                      Paso {step} de 4
                    </h2>
                    <span className="text-sm text-gray-600 font-medium">
                      {Math.round((step / 4) * 100)}% completado
                    </span>
                  </div>
                </motion.div>

                {/* Barra de Progreso */}
                <WizardComponents.WizardProgressBar current={step} total={4} />

                {/* Contenido del Paso */}
                <div className="min-h-[400px]">
                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <WizardComponents.WizardSectionHeader icon={Store} title="Información Básica" />

                        <WizardComponents.WizardInputField
                          label="Nombre del Restaurante *"
                          value={formData.info.name}
                          onChange={(e) => handleChange('info', 'name', e.target.value)}
                          placeholder="Ej: Restaurante El Sabor"
                          required
                          icon={Store}
                        />

                        <WizardComponents.WizardTextAreaField
                          label="Descripción"
                          value={formData.info.description}
                          onChange={(e) => handleChange('info', 'description', e.target.value)}
                          placeholder="Describe tu restaurante en pocas palabras..."
                          rows={3}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <WizardComponents.WizardInputField
                            label="Teléfono *"
                            type="tel"
                            value={formData.info.phone}
                            onChange={(e) => handleChange('info', 'phone', e.target.value)}
                            placeholder="+52 961 123 4567"
                            required
                            icon={Phone}
                          />
                          
                          {/* --- SECCIÓN DE UBICACIÓN EN MAPA --- */}
                          <div className="form-control w-full">
                            <label className="label pb-1">
                              <span className="label-text text-sm font-medium text-gray-700">
                                Ubicación del Restaurante *
                                <span className="text-error ml-1">*</span>
                              </span>
                            </label>
                            <button
                              type="button"
                              className="btn btn-outline btn-primary w-full flex items-center justify-center gap-2"
                              onClick={openMapModal}
                            >
                              <MapPinIcon className="w-5 h-5" />
                              Seleccionar en el Mapa
                            </button>
                            
                            {/* Mostrar feedback de la ubicación seleccionada */}
                            {formData.info.location?.lat && formData.info.location?.lng ? (
                              <div className="mt-2 p-3 bg-base-200 rounded-lg text-xs">
                                <p className="font-medium text-success">Ubicación seleccionada:</p>
                                <p className="truncate ...">
                                  <span className="font-semibold">Coords:</span> {formData.info.location.lat.toFixed(6)}, {formData.info.location.lng.toFixed(6)}
                                </p>
                                {formData.info.location.formatted_address && (
                                  <p className="truncate ...">
                                    <span className="font-semibold">Dirección:</span> {formData.info.location.formatted_address}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-error mt-1">
                                Debes seleccionar una ubicación en el mapa.
                              </p>
                            )}
                          </div>
                          {/* ---------------------------------------- */}
                        </div>

                        {/* --- SECCIÓN DEDICADA AL TOKEN DE TELEGRAM (OBLIGATORIO) --- */}
                        <div className="mt-8 pt-6 border-t border-[#ffe4c4]">
                          <div className="flex items-center gap-2 mb-4">
                            <Bot className="w-5 h-5 text-[#ff7f50]" />
                            <h3 className="text-lg font-semibold text-[#ff7f50]">Integración con Telegram *</h3>
                          </div>
                          <WizardComponents.WizardInputField
                            label="Token de Bot de Telegram *"
                            value={formData.info.telegramToken}
                            onChange={(e) => handleChange('info', 'telegramToken', e.target.value)}
                            placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                            type="password"
                            required
                            icon={Bot}
                          />
                          {formData.info.telegramToken && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="flex items-start gap-3 p-3 mt-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm"
                            >
                              <Shield size={18} className="flex-shrink-0 mt-0.5" />
                              <span>Este token se guardará de forma segura. Es obligatorio para recibir pedidos.</span>
                            </motion.div>
                          )}
                        </div>
                        {/* -------------------------------------------------------------------- */}
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <WizardComponents.WizardSectionHeader icon={Clock} title="Horarios y Disponibilidad" />

                        <WizardComponents.WizardSelectField
                          label="Modo de Disponibilidad"
                          value={formData.availabilitySettings.mode}
                          onChange={(e) => handleChange('availabilitySettings', 'mode', e.target.value)}
                          icon={Clock}
                          tooltipText="Elige cómo quieres gestionar la disponibilidad de tu restaurante"
                          tooltipId="availability-mode"
                        >
                          <option value="fixed_hours">Horarios Fijos</option>
                          <option value="always_open">Siempre Abierto</option>
                          <option value="manual_control">Control Manual</option>
                          <option value="hybrid">Híbrido (Recomendado)</option>
                        </WizardComponents.WizardSelectField>

                        {formData.availabilitySettings.mode === 'hybrid' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-3 mb-6"
                          >
                            <WizardComponents.WizardCheckboxField
                              label="Usar horarios como base para recordatorios"
                              checked={formData.availabilitySettings.useScheduledHours}
                              onChange={(e) => handleChange('availabilitySettings', 'useScheduledHours', e.target.checked)}
                            />
                            <WizardComponents.WizardCheckboxField
                              label="Recibir recordatorios si olvido abrir"
                              checked={formData.availabilitySettings.remindersEnabled}
                              onChange={(e) => handleChange('availabilitySettings', 'remindersEnabled', e.target.checked)}
                            />
                          </motion.div>
                        )}

                        <div className="flex items-center gap-3 my-6">
                          <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-[#ffb9a0] to-transparent"></div>
                          <span className="text-sm font-semibold text-[#ff7f50]">Horarios por Día</span>
                          <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-[#ffb9a0] to-transparent"></div>
                        </div>

                        <div className="space-y-3">
                          {Object.entries(formData.hours).map(([day, schedule], index) => (
                            <motion.div
                              key={day}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex flex-wrap items-center gap-3 p-4 bg-gradient-to-r from-[#ffe4c4]/30 to-[#ffd3c3]/30 rounded-xl border border-[#ffb9a0]/30 hover:border-[#ffb9a0] transition-all duration-300"
                            >
                              <span className="font-bold text-sm w-24 capitalize text-[#ff7f50]">
                                {dayNames[day]}
                              </span>
                              <label className="cursor-pointer label p-0 flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={schedule.closed}
                                  onChange={(e) => handleHourChange(day, 'closed', e.target.checked)}
                                  className="checkbox checkbox-sm checkbox-primary"
                                  style={{ accentColor: '#ff7f50' }}
                                />
                                <span className="label-text text-xs font-medium text-gray-700">Cerrado</span>
                              </label>
                              {!schedule.closed && (
                                <motion.div
                                  initial={{ opacity: 0, width: 0 }}
                                  animate={{ opacity: 1, width: 'auto' }}
                                  className="flex items-center gap-2 flex-1 justify-end"
                                >
                                  <input
                                    type="time"
                                    value={schedule.open}
                                    onChange={(e) => handleHourChange(day, 'open', e.target.value)}
                                    className="h-9 w-24 px-2 text-xs font-medium bg-white border-2 border-[#ffe4c4] rounded-lg outline-none focus:border-[#ff7f50] transition-colors"
                                  />
                                  <span className="text-xs font-bold text-[#ff7f50]">—</span>
                                  <input
                                    type="time"
                                    value={schedule.close}
                                    onChange={(e) => handleHourChange(day, 'close', e.target.value)}
                                    className="h-9 w-24 px-2 text-xs font-medium bg-white border-2 border-[#ffe4c4] rounded-lg outline-none focus:border-[#ff7f50] transition-colors"
                                  />
                                </motion.div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <WizardComponents.WizardSectionHeader icon={Bike} title="Opciones de Pedido" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

                        {formData.features.deliveryEnabled && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                          >
                            <div className="flex items-center gap-3 my-6">
                              <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-[#ffb9a0] to-transparent"></div>
                              <span className="text-sm font-semibold text-[#ff7f50]">Configuración de Delivery</span>
                              <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-[#ffb9a0] to-transparent"></div>
                            </div>

                            <WizardComponents.WizardSelectField
                              label="Tipo de Cálculo"
                              value={formData.delivery.type}
                              onChange={(e) => handleChange('delivery', 'type', e.target.value)}
                              icon={Truck}
                              tooltipText="Elige cómo se calculará el costo del envío"
                              tooltipId="delivery-type"
                            >
                              <option value="distance_based">Por Distancia (Km)</option>
                              <option value="zone_based">Por Zonas</option>
                              <option value="fixed">Costo Fijo</option>
                            </WizardComponents.WizardSelectField>

                            {formData.delivery.type === 'distance_based' && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                              >
                                <WizardComponents.WizardInputField
                                  label="Costo por Km ($)"
                                  type="number"
                                  value={formData.delivery.costPerKm}
                                  onChange={(e) => handleChange('delivery', 'costPerKm', Number(e.target.value) || 0)}
                                  min="0"
                                  step="0.01"
                                />
                                <WizardComponents.WizardInputField
                                  label="Distancia Máxima (Km)"
                                  type="number"
                                  value={formData.delivery.maxDistance}
                                  onChange={(e) => handleChange('delivery', 'maxDistance', Number(e.target.value) || 0)}
                                  min="0"
                                  step="0.1"
                                />
                              </motion.div>
                            )}

                            {formData.delivery.type === 'fixed' && (
                              <WizardComponents.WizardInputField
                                label="Costo de Envío Fijo ($)"
                                type="number"
                                value={formData.delivery.baseCost}
                                onChange={(e) => handleChange('delivery', 'baseCost', Number(e.target.value) || 0)}
                                min="0"
                                step="0.01"
                              />
                            )}

                            <WizardComponents.WizardInputField
                              label="Pedido Mínimo para Envío Gratis ($)"
                              type="number"
                              value={formData.delivery.freeDeliveryMinAmount}
                              onChange={(e) => handleChange('delivery', 'freeDeliveryMinAmount', Number(e.target.value) || 0)}
                              min="0"
                              placeholder="0 para desactivar"
                              step="0.01"
                            />
                          </motion.div>
                        )}

                        <div className="flex items-center gap-3 my-6">
                          <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-[#ffb9a0] to-transparent"></div>
                          <span className="text-sm font-semibold text-[#ff7f50]">Métodos de Pago</span>
                          <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-[#ffb9a0] to-transparent"></div>
                        </div>

                        <div className="space-y-3">
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
                      </motion.div>
                    )}

                    {step === 4 && (
                      <motion.div
                        key="step4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <WizardComponents.WizardSectionHeader icon={MessageCircle} title="Mensajes Personalizados" />

                        <WizardComponents.WizardTextAreaField
                          label="Mensaje de Bienvenida *"
                          value={formData.messages.welcome}
                          onChange={(e) => handleChange('messages', 'welcome', e.target.value)}
                          placeholder="¡Hola {nombre}! Bienvenido a {restaurante}"
                          required
                        />
                        <p className="text-xs text-gray-500 -mt-2 mb-4 pl-1">
                          Variables disponibles: <code className="px-1.5 py-0.5 bg-[#ffe4c4]/50 rounded text-[#ff7f50] font-mono">{'{nombre}'}</code>, <code className="px-1.5 py-0.5 bg-[#ffe4c4]/50 rounded text-[#ff7f50] font-mono">{'{restaurante}'}</code>
                        </p>

                        <WizardComponents.WizardTextAreaField
                          label="Introducción al Menú"
                          value={formData.messages.menu_intro}
                          onChange={(e) => handleChange('messages', 'menu_intro', e.target.value)}
                          placeholder="Este es nuestro menú:"
                        />

                        <WizardComponents.WizardTextAreaField
                          label="Preguntar Delivery o Recoger"
                          value={formData.messages.ask_delivery_or_pickup}
                          onChange={(e) => handleChange('messages', 'ask_delivery_or_pickup', e.target.value)}
                          placeholder="¿Cómo deseas tu pedido?"
                        />

                        <WizardComponents.WizardTextAreaField
                          label="Solicitar Ubicación"
                          value={formData.messages.ask_location}
                          onChange={(e) => handleChange('messages', 'ask_location', e.target.value)}
                          placeholder="Por favor, comparte tu ubicación para calcular el envío."
                        />

                        <motion.div
                          className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 mt-6 shadow-sm"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            <p className="font-bold text-blue-900">Vista Previa</p>
                          </div>
                          <div className="text-sm italic text-blue-800 bg-white/70 p-4 rounded-lg border border-blue-200">
                            {formData.messages.welcome
                              .replace('{nombre}', 'Juan')
                              .replace('{restaurante}', formData.info.name || 'tu restaurante')}
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Botones de Navegación */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-10 pt-8 border-t-2 border-[#ffe4c4]">
                  <motion.button
                    onClick={handleBack}
                    disabled={step === 1}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                      step === 1 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-white border-2 border-[#ff7f50] text-[#ff7f50] hover:bg-[#ff7f50] hover:text-white shadow-md hover:shadow-lg'
                    }`}
                    whileHover={step !== 1 ? { scale: 1.05 } : {}}
                    whileTap={step !== 1 ? { scale: 0.95 } : {}}
                  >
                    <ChevronLeft size={18} /> Anterior
                  </motion.button>

                  <MiniDots steps={[1, 2, 3, 4]} currentStep={step} />

                  {step < 4 ? (
                    <motion.button
                      onClick={handleNext}
                      className="px-6 py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                      style={{
                        background: 'linear-gradient(120deg, #ffae91 30%, #ff7f50 88%, #ffe4c4 40%, #ffb9a0 78%)'
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Siguiente <ChevronRight size={18} />
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="px-8 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 min-w-[160px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(120deg, #ffae91 30%, #ff7f50 88%, #ffe4c4 40%, #ffb9a0 78%)'
                      }}
                      whileHover={!loading ? { scale: 1.05 } : {}}
                      whileTap={!loading ? { scale: 0.95 } : {}}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin h-5 w-5" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Check size={18} /> Finalizar
                        </>
                      )}
                    </motion.button>
                  )}
                </div>

                {/* WizardErrorBox reemplazado por el toast */}
                {/* <WizardComponents.WizardErrorBox error={error} onDismiss={() => setError('')} /> */}
              </div>
            </motion.div>

            {/* Footer Tip */}
            <motion.div
              className="text-center mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <p className="text-sm text-[#ff7f50] font-medium flex items-center justify-center gap-2">
                <Sparkles size={16} />
                Podrás modificar esta configuración más tarde desde el panel
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}