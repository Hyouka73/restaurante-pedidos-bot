// frontend-pwa/src/pages/ConfigGeneral.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { api } from '../services/api';
import { useAlert } from '../components/ui/CustomAlert';
import { WizardCard, WizardSectionHeader, WizardErrorBox } from './SetupWizard'; // Reutilizamos componentes del wizard
import { ButtonLoader } from '../components/ui/Loader';
import { Settings, CheckCircle } from 'lucide-react';
import BasicInfoForm from '../components/config/BasicInfoForm';
import HoursForm from '../components/config/HoursForm';
import DeliveryForm from '../components/config/DeliveryForm';
import FeaturesForm from '../components/config/FeaturesForm';
import PaymentMethodsForm from '../components/config/PaymentMethodsForm';
import CommandsForm from '../components/config/CommandsForm';

export default function ConfigGeneral() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState({
    info: {
      name: '',
      description: '',
      phone: '',
      address: '',
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
      { id: "cash", name: "Efectivo", enabled: true },
      { id: "card", name: "Tarjeta", enabled: true },
      { id: "transfer", name: "Transferencia", enabled: false }
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
    commands: {
      start: { enabled: true, description: "Iniciar conversación" },
      menu: { enabled: true, description: "Ver menú completo" },
      pedido: { enabled: true, description: "Hacer un pedido" },
      estado: { enabled: true, description: "Ver estado de mi pedido" },
      ayuda: { enabled: true, description: "Obtener ayuda" },
      reclamar: { enabled: true, description: "Enviar un comentario o reclamo" }
    }
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError('');

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists) {
          setError('Usuario no encontrado.');
          return;
        }
        const restaurantId = userDoc.data().restaurantId;

        const data = await api.get(`/config/${restaurantId}/general`);
        setConfig(data);
      } catch (err) {
        console.error('Error al cargar la configuración:', err);
        setError('Error al cargar la configuración: ' + err.message);
        showAlert('Error al cargar la configuración.', 'error', 4000);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [user, navigate, showAlert]);

  const handleChange = (section, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: Array.isArray(prev[section]) ? value : { // Para manejar el array de paymentMethods
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const restaurantId = userDoc.data().restaurantId;

      await api.put(`/config/${restaurantId}/general`, config);
      showAlert('✅ Configuración guardada exitosamente.', 'success', 2000);
    } catch (err) {
      console.error('Error al guardar la configuración:', err);
      setError('Error al guardar la configuración: ' + err.message);
      showAlert('Error al guardar la configuración.', 'error', 4000);
    } finally {
      setSaving(false);
    }
  };

  // Nuevo: token de Telegram (no mostrar nunca el token actual, solo permitir actualizar)
  const [botTokenInput, setBotTokenInput] = useState('');
  const [updatingToken, setUpdatingToken] = useState(false);

  const handleUpdateBotToken = async () => {
    if (!user) return navigate('/login');
    if (!botTokenInput || botTokenInput.trim().length === 0) return showAlert('Ingresa el token antes de actualizar', 'warning', 3000);

    setUpdatingToken(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const restaurantId = userDoc.data().restaurantId;
      await api.put(`/config/${restaurantId}/bot-token`, { token: botTokenInput.trim() });
      setBotTokenInput('');
      showAlert('Token actualizado correctamente', 'success', 3000);
    } catch (err) {
      console.error('Error actualizando token:', err);
      showAlert('Error actualizando token: ' + err.message, 'error', 5000);
    } finally {
      setUpdatingToken(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <ButtonLoader size="lg" />
    </div>
  );

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <WizardCard>
        <WizardSectionHeader icon={Settings} title="Configuración General" subtitle="Gestiona la información y opciones de tu restaurante" />
        {error && <WizardErrorBox error={error} onDismiss={() => setError('')} />}

        <form onSubmit={handleSubmit} className="space-y-6">
          <BasicInfoForm config={config} onChange={handleChange} />
          <HoursForm config={config} onChange={handleChange} />
          <DeliveryForm config={config} onChange={handleChange} />
          <FeaturesForm config={config} onChange={handleChange} />
          <PaymentMethodsForm config={config} onChange={handleChange} />
          <CommandsForm config={config} onChange={handleChange} />

          {/* Actualizar token del bot (no mostrar el token actual) */}
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-semibold mb-2">Actualizar Token de Telegram</h4>
            <p className="text-sm text-gray-600 mb-3">Por seguridad el token nunca se muestra. Puedes reemplazarlo aquí si necesitas actualizarlo.</p>
            <div className="flex gap-2 items-center">
              <input
                type="password"
                placeholder="Nuevo token de Telegram"
                className="input input-bordered w-full"
                value={botTokenInput}
                onChange={(e) => setBotTokenInput(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUpdateBotToken}
                disabled={updatingToken}
              >
                {updatingToken ? <ButtonLoader size="sm" /> : 'Actualizar Token'}
              </button>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-[#ff7f50] to-[#ff6347] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? (
                <>
                  <ButtonLoader size="sm" /> Guardando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} /> Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </WizardCard>
    </div>
  );
}