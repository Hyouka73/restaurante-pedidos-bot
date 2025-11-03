import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase';
import { useRestaurant } from '../context/RestaurantContext'; // <-- 1. Importar hook
import { api } from '../services/api';
import { useAlert } from '../components/ui/CustomAlert';
import { WizardCard, WizardSectionHeader, WizardErrorBox } from '../components/ui/WizardComponents';
import { ButtonLoader } from '../components/ui/Loader';
import { Settings } from 'lucide-react';
import BasicInfoForm from '../components/config/BasicInfoForm';
import HoursForm from '../components/config/HoursForm';
import DeliveryForm from '../components/config/DeliveryForm';
import FeaturesForm from '../components/config/FeaturesForm';
import PaymentMethodsForm from '../components/config/PaymentMethodsForm';
import CommandsForm from '../components/config/CommandsForm';

export default function ConfigGeneral() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  // ✅ Usamos el estado de carga y los datos directamente del contexto
  const { data: config, loading: loadingConfig } = useRestaurant(); 
  const [error, setError] = useState('');
  const { showAlert } = useAlert();
  const [currentTab, setCurrentTab] = useState('info');

  // ❌ El estado local y el fetch son redundantes, se eliminan.
  const [botTokenInput, setBotTokenInput] = useState('');
  const [updatingToken, setUpdatingToken] = useState(false);
  const [validatingConnection, setValidatingConnection] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // La lógica de carga ahora es manejada por RestaurantContext.
    // Si no hay datos después de cargar, podría ser un error real.
    if (!loadingConfig && !config) {
      setError('No se pudieron cargar los datos del restaurante. Revisa la consola.');
    }
  }, [user, navigate, config, loadingConfig]);

  const handleUpdateBotToken = async () => {
    if (!user || !config?.id) return navigate('/login');
    if (!botTokenInput || botTokenInput.trim().length === 0) {
      return showAlert('Ingresa el token antes de actualizar', 'warning', 3000);
    }
    setUpdatingToken(true);
    try {
      const restaurantId = config.id;
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

  const handleValidateBotToken = async () => {
    if (!user || !config?.id) return navigate('/login');
    setValidatingConnection(true);
    try {
      const restaurantId = config.id;
      const res = await api.post(`/config/${restaurantId}/validate-bot-token`, {});
      if (res && res.botInfo) {
        const info = res.botInfo;
        showAlert(`Conectado: @${info.username || info.first_name} (id: ${info.id})`, 'success', 4000);
      } else {
        showAlert('Conexión exitosa', 'success', 3000);
      }
    } catch (err) {
      console.error('Error validando token:', err);
      showAlert('Error validando token: ' + (err.message || err), 'error', 5000);
    } finally {
      setValidatingConnection(false);
    }
  };

  // ✅ Usar el estado de carga del contexto
  if (loadingConfig || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ButtonLoader size="lg" message="Cargando configuración..." />
      </div>
    );
  }

  const tabs = [
    { id: 'info', label: 'Info. Básica' },
    { id: 'hours', label: 'Horarios' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'features', label: 'Características' },
    { id: 'payments', label: 'Métodos Pago' },
    { id: 'commands', label: 'Comandos' },
    { id: 'bot', label: 'Bot / Token' }
  ];

  const renderCurrentTab = () => {
    switch (currentTab) {
      case 'info':
        return <BasicInfoForm initialData={config} />;
      case 'hours':
        return <HoursForm initialData={config} />;
      case 'delivery':
        return <DeliveryForm initialData={config} />;
      case 'features':
        return <FeaturesForm initialData={config} />;
      case 'payments':
        return <PaymentMethodsForm initialData={config} />;
      case 'commands':
        return <CommandsForm initialData={config} />;
      case 'bot':
        return (
          <WizardCard className="p-4">
            <div className="mt-2 p-2">
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
                <button type="button" className="btn btn-primary" onClick={handleUpdateBotToken} disabled={updatingToken}>
                  {updatingToken ? <ButtonLoader size="sm" /> : 'Actualizar Token'}
                </button>
                <button type="button" className="btn btn-outline" onClick={handleValidateBotToken} disabled={validatingConnection}>
                  {validatingConnection ? <ButtonLoader size="sm" /> : 'Probar Conexión'}
                </button>
              </div>
            </div>
          </WizardCard>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-2 sm:p-4 max-w-6xl mx-auto">
      <WizardCard>
        <WizardSectionHeader icon={Settings} title="Configuración General" subtitle="Gestiona la información y opciones de tu restaurante" />
        {error && <WizardErrorBox error={error} onDismiss={() => setError('')} />}

        <div className="mt-4">
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="inline-flex gap-2">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setCurrentTab(t.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium focus:outline-none transition-shadow ${currentTab === t.id ? 'bg-gradient-to-r from-[#ff7f50] to-[#ff6347] text-white shadow-lg' : 'bg-white/90 text-gray-700 border'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            {renderCurrentTab()}
          </div>
        </div>
      </WizardCard>
    </div>
  );
}