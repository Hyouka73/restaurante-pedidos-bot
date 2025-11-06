import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useAlert, AlertContainer } from '../components/ui/CustomAlert';
import { useRestaurant } from '../context/RestaurantContext';
import Loader from '../components/ui/Loader';

export default function ConfigMessages() {
  const { user, loading: loadingAuth } = useAuth();
  const navigate = useNavigate();
  const { data: restaurantData, loading: loadingRestaurant } = useRestaurant();
  const restaurantId = restaurantData?.id;
  
  const [messages, setMessages] = useState({
    welcome: '',
    menu_intro: '',
    ask_delivery: '',
    order_confirmed: '',
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { showAlert, alerts, hideAlert } = useAlert();

  // ✅ Validar autenticación
  useEffect(() => {
    if (!loadingAuth && !user) {
      navigate('/login');
    }
  }, [user, loadingAuth, navigate]);

  // ✅ Cargar mensajes cuando tengamos restaurantId
  useEffect(() => {
    if (!restaurantId) {
      console.log('[ConfigMessages] Esperando restaurantId...', { 
        loadingRestaurant, 
        hasRestaurantData: !!restaurantData 
      });
      return;
    }
    
    console.log('[ConfigMessages] 🔵 Iniciando carga de mensajes para:', restaurantId);
    
    const fetchMessages = async () => {
      try {
        setInitialLoading(true);
        console.log('[ConfigMessages] 📡 Llamando a API:', `/config/${restaurantId}/messages`);
        
        const data = await api.get(`/config/${restaurantId}/messages`);
        
        console.log('[ConfigMessages] ✅ Mensajes recibidos:', data);
        setMessages(data || {
          welcome: '',
          menu_intro: '',
          ask_delivery: '',
          order_confirmed: '',
        });
      } catch (error) {
        console.error('[ConfigMessages] ❌ Error al cargar mensajes:', error);
        showAlert('Error al cargar mensajes: ' + error.message, 'error', 4000);
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchMessages();
  }, [restaurantId, showAlert]);

  const handleSave = async () => {
    if (!restaurantId) {
      showAlert('No hay restaurante seleccionado', 'error', 3000);
      return;
    }
    
    console.log('[ConfigMessages] 💾 Guardando mensajes...', messages);
    setLoading(true);
    
    try {
      await api.put(`/config/${restaurantId}/messages`, messages);
      console.log('[ConfigMessages] ✅ Mensajes guardados exitosamente');
      showAlert('✅ Mensajes actualizados', 'success', 3000);
    } catch (error) {
      console.error('[ConfigMessages] ❌ Error al guardar:', error);
      showAlert('❌ Error: ' + error.message, 'error', 4000);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Mostrar loader mientras carga
  if (loadingAuth || loadingRestaurant || initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader variant="dots" size="lg" message="Cargando mensajes..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      <AlertContainer alerts={alerts} onClose={hideAlert} />
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-6">Configurar Mensajes del Bot</h1>

        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Mensaje de Bienvenida</span>
            </label>
            <textarea 
              className="textarea textarea-bordered h-24"
              value={messages.welcome || ''}
              onChange={(e) => setMessages({...messages, welcome: e.target.value})}
              placeholder="¡Hola! Bienvenido a {restaurante}"
            />
            <label className="label">
              <span className="label-text-alt">Variables: {'{nombre}'}, {'{restaurante}'}</span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Introducción al Menú</span>
            </label>
            <textarea 
              className="textarea textarea-bordered h-24"
              value={messages.menu_intro || ''}
              onChange={(e) => setMessages({...messages, menu_intro: e.target.value})}
              placeholder="Aquí está nuestro menú..."
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Preguntar por Delivery</span>
            </label>
            <textarea 
              className="textarea textarea-bordered h-24"
              value={messages.ask_delivery || ''}
              onChange={(e) => setMessages({...messages, ask_delivery: e.target.value})}
              placeholder="¿Deseas delivery o recoger en tienda?"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Confirmación de Pedido</span>
            </label>
            <textarea 
              className="textarea textarea-bordered h-24"
              value={messages.order_confirmed || ''}
              onChange={(e) => setMessages({...messages, order_confirmed: e.target.value})}
              placeholder="¡Pedido confirmado! Gracias por tu compra..."
            />
          </div>

          <button 
            className="btn btn-primary w-full"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="loading loading-spinner loading-sm"></span>
                Guardando...
              </span>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>

        <div className="alert alert-info mt-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>💡 Los cambios se reflejarán inmediatamente en el bot</span>
        </div>
      </div>
    </div>
  );
}