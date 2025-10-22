import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, PartyPopper } from 'lucide-react';
import Wizard from '../components/ui/Wizard';
import { useAlert, AlertContainer } from '../components/ui/CustomAlert';
import StepBasicInfo from '../components/setup-wizard/StepBasicInfo';
import StepHoursAvailability from '../components/setup-wizard/StepHoursAvailability';
import StepOrderOptions from '../components/setup-wizard/StepOrderOptions';
import StepMessages from '../components/setup-wizard/StepMessages';

export default function SetupWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupCompleted, setSetupCompleted] = useState(false);
  
  const { alerts, showAlert, hideAlert } = useAlert();

  const [formData, setFormData] = useState({
    info: {
      name: '',
      description: '',
      phone: '',
      address: '',
      location: null,
      telegramToken: ''
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

  // --- useEffect para verificar estado inicial ---
  useEffect(() => {
    const checkSetupStatus = async () => {
      if (!auth.currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (!userDoc.exists()) {
          setError('Usuario no encontrado.');
          showAlert('Usuario no encontrado', 'error', 4000);
          return;
        }
        const restaurantId = userDoc.data().restaurantId;

        const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
        if (!restaurantDoc.exists()) {
          setError('Restaurante no encontrado.');
          showAlert('Restaurante no encontrado', 'error', 4000);
          return;
        }
        const restaurantData = restaurantDoc.data();

        setSetupCompleted(restaurantData.setupCompleted || false);

        if (restaurantData.setupCompleted) {
          showAlert('Configuración ya completada', 'info', 2000);
          navigate('/');
          return;
        }

        if (restaurantData.info) {
          setFormData(prev => ({ ...prev, ...restaurantData }));
        }

      } catch (err) {
        const errorMsg = 'Error: ' + err.message;
        setError(errorMsg);
        showAlert(errorMsg, 'error', 5000);
      }
    };

    checkSetupStatus();
  }, [navigate]);

  // --- useEffect para redirección después de completar setup ---
  useEffect(() => {
    let redirectTimer;
    if (setupCompleted) {
      console.log("[SetupWizard] Setup completado, redirigiendo en 2s");
      redirectTimer = setTimeout(() => {
        console.log("[SetupWizard] Redirigiendo a dashboard");
        navigate('/');
      }, 2000);
    }

    return () => {
      if (redirectTimer) {
        console.log("[SetupWizard] Limpiando timeout de redirección");
        clearTimeout(redirectTimer);
      }
    };
  }, [setupCompleted, navigate]);

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

  const handleSelectLocation = (selectedLocation) => {
    handleChange('info', 'location', selectedLocation);
    showAlert('Ubicación seleccionada', 'success', 2000);
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.info.name.trim()) {
          showAlert('Ingresa el nombre del restaurante', 'warning', 3000);
          return false;
        }
        if (!formData.info.phone.trim()) {
          showAlert('Ingresa un teléfono', 'warning', 3000);
          return false;
        }
        if (!formData.info.location || !formData.info.location.lat) {
          showAlert('Selecciona la ubicación en el mapa', 'warning', 3000);
          return false;
        }
        if (!formData.info.telegramToken.trim()) {
          showAlert('El token de Telegram es obligatorio', 'error', 3000);
          return false;
        }
        break;
      case 2:
        const hasOpenDay = Object.values(formData.hours).some(day => !day.closed);
        if (!hasOpenDay) {
          showAlert('Debe haber al menos un día abierto', 'warning', 3000);
          return false;
        }
        break;
      case 3:
        if (!formData.features.deliveryEnabled && !formData.features.pickupEnabled) {
          showAlert('Habilita al menos un método de entrega', 'warning', 3000);
          return false;
        }
        const hasEnabledPayment = formData.paymentMethods.some(method => method.enabled);
        if (!hasEnabledPayment) {
          showAlert('Habilita al menos un método de pago', 'warning', 3000);
          return false;
        }
        break;
      case 4:
        if (!formData.messages.welcome.trim()) {
          showAlert('El mensaje de bienvenida es obligatorio', 'warning', 3000);
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step < 4) {
        setStep(step + 1);
        // Removed navigation alert - only show validation errors
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      // Removed navigation alert - only show validation errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    if (!auth.currentUser) {
      showAlert('No hay usuario autenticado', 'error', 3000);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const restaurantId = userDoc.data().restaurantId;

      const restaurantRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(restaurantRef, {
        ...formData,
        setupCompleted: true
      });

      showAlert('¡Configuración guardada!', 'success', 3000);
      setSetupCompleted(true); // Esto activará el useEffect de redirección

    } catch (err) {
      const errorMsg = 'Error al guardar: ' + err.message;
      setError(errorMsg);
      showAlert(errorMsg, 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissError = () => {
    setError('');
  };

  if (setupCompleted) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4" 
        style={{
          background: 'linear-gradient(135deg, #ffe4c4 0%, #ffe7de 40%, #ffd3c3 70%, rgba(255, 127, 80, 0.4) 100%)'
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md mx-auto"
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 10, 0],
              scale: [1, 1.1, 1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 0.5
            }}
            className="inline-block mb-6"
          >
            <PartyPopper className="w-16 h-16 sm:w-20 sm:h-20 text-[#ff7f50]" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#ff7f50] mb-4">
            ¡Configuración Completada!
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">Redirigiendo al panel...</p>
          <Loader2 className="w-8 h-8 animate-spin text-[#ff7f50] mx-auto" />
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <AlertContainer alerts={alerts} onClose={hideAlert} />

      <div 
        className="min-h-screen flex items-center justify-center p-3 sm:p-4" 
        style={{
          background: 'linear-gradient(135deg, #ffe4c4 0%, #ffe7de 40%, #ffd3c3 70%, rgba(255, 127, 80, 0.4) 100%)'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl"
        >
          {/* Hero Header */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8 text-center mb-4 sm:mb-6 border-2 border-[#ffe4c4]">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="inline-block mb-3 sm:mb-4"
            >
              <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-[#ff7f50]" />
            </motion.div>
            <h1 className="text-2xl sm:text-4xl font-bold text-[#ff7f50] mb-2">
              Configuración Inicial
            </h1>
            <p className="text-sm sm:text-lg text-gray-600">
              Completa estos pasos para comenzar
            </p>
          </div>

          {/* Wizard */}
          <Wizard
            steps={[1, 2, 3, 4]}
            currentStep={step}
            onNext={handleNext}
            onBack={handleBack}
            onSubmit={handleSubmit}
            isSubmitting={loading}
            submitLabel="🎉 Finalizar"
            error={error}
            onDismissError={handleDismissError}
          >
            <AnimatePresence mode="wait">
              {step === 1 && (
                <StepBasicInfo
                  key="step1"
                  formData={formData}
                  setFormData={setFormData}
                  handleChange={handleChange}
                  handleSelectLocation={handleSelectLocation}
                />
              )}
              {step === 2 && (
                <StepHoursAvailability
                  key="step2"
                  formData={formData}
                  setFormData={setFormData}
                  handleChange={handleChange}
                  handleHourChange={handleHourChange}
                />
              )}
              {step === 3 && (
                <StepOrderOptions
                  key="step3"
                  formData={formData}
                  setFormData={setFormData}
                  handleChange={handleChange}
                />
              )}
              {step === 4 && (
                <StepMessages
                  key="step4"
                  formData={formData}
                  setFormData={setFormData}
                  handleChange={handleChange}
                />
              )}
            </AnimatePresence>
          </Wizard>

          {/* Footer Info */}
          <motion.div
            className="text-center mt-4 sm:mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 inline-block shadow-lg border border-[#ffe4c4]">
              <p className="text-xs sm:text-sm text-[#ff7f50] font-semibold flex items-center justify-center gap-2 flex-wrap">
                <Sparkles size={14} className="sm:w-4 sm:h-4" />
                <span>Podrás modificar esto después</span>
                <Sparkles size={14} className="sm:w-4 sm:h-4" />
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}