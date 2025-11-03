import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase';
import { useRestaurant } from '../context/RestaurantContext';
import { api, API_BASE } from '../services/api';
import { 
  Package, Clock, CheckCircle, XCircle, ChefHat, Store, Truck, 
  RefreshCw 
} from 'lucide-react';
// 🔥 1. IMPORTAMOS LOS COMPONENTES DE ALERTA QUE FALTABAN
import { useAlert, AlertContainer } from '../components/ui/CustomAlert';
import { ButtonLoader } from '../components/ui/Loader'; // <-- SÍ se usa en el loader de página
import OrderCard from '../components/orders/OrderCard'; // Componente extraído
import { WizardErrorBox } from '../components/ui/WizardComponents'; // Para mostrar errores

// --- Componente Principal ---
export default function OrdersManager() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const { data: restaurantData } = useRestaurant();
  const restaurantId = restaurantData?.id;
  
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [updatingOrder, setUpdatingOrder] = useState(null); // ID del pedido que se está actualizando
  const [error, setError] = useState(null);
  
  // 🔥 Importamos las alertas
  const { showAlert, alerts, hideAlert } = useAlert();

  // Filtrado en memoria
  const filteredOrders = useMemo(() => {
    let filtered = allOrders;
    
    if (statusFilter === 'active') {
      filtered = allOrders.filter(order => 
        ['pending', 'confirmed', 'preparing', 'ready', 'delivering'].includes(order.status)
      );
    } else if (statusFilter === 'completed') {
      filtered = allOrders.filter(order => 
        ['delivered', 'cancelled'].includes(order.status)
      );
    }
    
    // Ordenar por fecha
    return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allOrders, statusFilter]);


  // Función de carga inicial
  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;
    console.log('[OrdersManager] 📡 Cargando pedidos iniciales...');
    try {
      setLoading(true);
      setError(null);
      const orders = await api.get(`/orders/${restaurantId}`);
      
      // 🔥 CORRECCIÓN FECHA: Función robusta para convertir timestamps
      const parseTimestamp = (ts) => {
        if (!ts) return new Date(); // Fallback
        if (ts._seconds) return new Date(ts._seconds * 1000); // Formato de API
        if (ts.seconds) return new Date(ts.seconds * 1000); // Formato de Firestore SDK
        return new Date(ts); // Fallback para strings ISO
      };
      const ordersWithDates = (Array.isArray(orders) ? orders : []).map(order => ({
        ...order,
        createdAt: parseTimestamp(order.createdAt)
      }));
      setAllOrders(ordersWithDates);
    } catch (error) {
      console.error('[OrdersManager] ❌ Error cargando pedidos:', error);
      setError('Error al cargar pedidos.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // Carga inicial al montar
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (restaurantId) {
      fetchOrders();
    }
  }, [user, navigate, restaurantId, fetchOrders]);


  // --- 🔥 3. SSE CORREGIDO (LÓGICA LOCAL) ---
  useEffect(() => {
    if (!restaurantId) return;

    console.log('[OrdersManager] 📡 Conectando SSE...');
    const eventSource = new EventSource(`${API_BASE}/events`);
    
    eventSource.onopen = () => {
      console.log('[OrdersManager] ✅ SSE conectado');
      // Al (re)conectar, recargamos por si perdimos algo
      fetchOrders(); 
    };
    
    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        console.log('[OrdersManager] 📨 Evento SSE recibido:', eventData.type);
        
        if (eventData.type === 'connected') {
          console.log('[OrdersManager] 🎉 Conexión SSE confirmada');
          return;
        }

        // 🔥 CORRECCIÓN FECHA: Usar la misma lógica de parseo que en fetchOrders
        const parseTimestamp = (ts) => {
            if (!ts) return new Date();
            if (ts._seconds) return new Date(ts._seconds * 1000);
            return new Date(ts);
        };
        const newOrder = {
          ...eventData.payload,
          createdAt: parseTimestamp(eventData.payload.createdAt)
        };

        // --- ESTA ES LA LÓGICA QUE FALTABA ---
        if (eventData.type === 'order_new') {
          console.log('[OrdersManager] ✨ Recibido nuevo pedido:', newOrder.id);
          showAlert('¡Nuevo pedido recibido!', 'success');
          // Aquí puedes añadir sonido
          
          setAllOrders(prevOrders => {
            // Prevenir duplicados
            if (prevOrders.find(o => o.id === newOrder.id)) return prevOrders;
            // Añadir al inicio de la lista
            return [newOrder, ...prevOrders];
          });
        }
        
        if (eventData.type === 'order_update') {
          console.log('[OrdersManager] 🔄 Actualizando pedido:', newOrder.id);
          setAllOrders(prevOrders => 
            prevOrders.map(order => 
              order.id === newOrder.id ? newOrder : order
            )
          );
        }
      } catch (err) {
        console.error('[OrdersManager] ❌ Error parseando evento SSE:', err);
      }
    };

    eventSource.onerror = (err) => {
      // ESTE ES EL ERROR "NORMAL" DE TIMEOUT DE VERCEL
      console.error('[OrdersManager] ❌ Error en SSE (conexión cerrada por Vercel), reconectando...', err);
      // NO cerramos la conexión (eventSource.close())
      // El navegador intentará reconectar automáticamente por defecto.
    };

    return () => {
      console.log('[OrdersManager] 🔌 Cerrando conexión SSE');
      eventSource.close();
    };
  }, [restaurantId, fetchOrders, showAlert]); // <-- Añadimos showAlert


  // --- 🔥 4. ACTUALIZACIÓN DE ESTADO OPTIMISTA ---
  const updateOrderStatus = async (orderId, newStatus) => {
    if (!user || !restaurantId) return;
    
    setUpdatingOrder(orderId); // Bloquear botones de esta tarjeta

    // 1. Actualización Optimista (Frontend)
    // Actualizamos el estado local *inmediatamente*
    setAllOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    
    try {
      // 2. Llamada a la API (Backend)
      // Esta llamada ahora SÓLO notifica al backend, no esperamos
      // a que termine para actualizar la UI.
      await api.put(`/orders/${restaurantId}/${orderId}/status`, {
        newStatus: newStatus
      });
      // El backend publicará en Redis, y el SSE nos enviará la
      // confirmación (actualizando el estado con la data más reciente).
      console.log('[OrdersManager] ✅ Pedido actualizado en backend:', orderId);
    } catch (err) {
      console.error('[OrdersManager] ❌ Error actualizando pedido:', err);
      // 3. Reversión (Rollback)
      showAlert('Error al actualizar. Revirtiendo...', 'error');
      // Recargamos todo para estar seguros
      fetchOrders(); 
    } finally {
      // Desbloqueamos el botón después de un segundo para
      // dar tiempo a que el SSE refresque el estado.
      setTimeout(() => setUpdatingOrder(null), 1000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          {/* Usamos el ButtonLoader que SÍ se importa */}
          <ButtonLoader size="lg" message="Cargando pedidos..." />
        </div>
      </div>
    );
  }

  return (
    // Fondo degradado y padding, como en Menu.jsx
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 pb-20">
      {/* 🔥 5. AÑADIMOS EL CONTENEDOR DE ALERTA */}
      <AlertContainer alerts={alerts} onClose={hideAlert} />
      
      {/* Encabezado Fijo (como en Menu.jsx) */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Package className="w-8 h-8 text-orange-500" />
              Pedidos
            </h1>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
              {filteredOrders.length} {statusFilter === 'active' ? 'Activos' : ''}
            </span>
          </div>
          
          {/* Filtros */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {[
              { value: 'active', label: 'Activos', icon: Clock },
              { value: 'all', label: 'Todos', icon: Package },
              { value: 'completed', label: 'Completados', icon: CheckCircle }
            ].map(filter => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    statusFilter === filter.value
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{filter.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid de Pedidos */}
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {error && <WizardErrorBox error={error} onDismiss={() => setError(null)} />}
        
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No hay pedidos {statusFilter === 'active' ? 'activos' : statusFilter === 'completed' ? 'completados' : ''}
            </h3>
            <p className="text-gray-500">Los nuevos pedidos aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          // Grid responsivo, como en Menu.jsx
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 🔥 6. USAMOS EL NUEVO COMPONENTE OrderCard */}
            {filteredOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onUpdateStatus={updateOrderStatus}
                isUpdating={updatingOrder === order.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}