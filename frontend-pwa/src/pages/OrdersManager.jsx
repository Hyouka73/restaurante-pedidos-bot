import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase';
import { useRestaurant } from '../context/RestaurantContext';
import { api, API_BASE } from '../services/api';
import { 
  Package, Clock, CheckCircle, XCircle, ChefHat, Store, Truck, 
  Phone, MapPin, DollarSign, RefreshCw 
} from 'lucide-react';
import { ButtonLoader } from '../components/ui/Loader';
import { WizardErrorBox } from '../components/ui/WizardComponents';

// 🔥 NUEVO: Componente OrderCard optimizado
// (Lo saqué de OrdersManager para que el código sea más limpio)
// Ahora recibe 'isUpdating' del padre para saber si debe deshabilitarse
const OrderCard = ({ order, onUpdateStatus, isUpdating }) => {
  const statusConfigs = {
    pending: { label: 'Pendiente', icon: Clock, color: 'text-yellow-600 bg-yellow-100 border-yellow-300', nextStatus: 'confirmed', nextLabel: 'Confirmar' },
    confirmed: { label: 'Confirmado', icon: CheckCircle, color: 'text-blue-600 bg-blue-100 border-blue-300', nextStatus: 'preparing', nextLabel: 'Preparar' },
    preparing: { label: 'En Preparación', icon: ChefHat, color: 'text-purple-600 bg-purple-100 border-purple-300', nextStatus: 'ready', nextLabel: 'Marcar como Listo' },
    ready: { label: 'Listo', icon: Package, color: 'text-green-600 bg-green-100 border-green-300', nextStatus: 'delivering', nextLabel: 'Enviar Pedido' },
    delivering: { label: 'En Reparto', icon: Truck, color: 'text-cyan-600 bg-cyan-100 border-cyan-300', nextStatus: 'delivered', nextLabel: 'Marcar como Entregado' },
    delivered: { label: 'Entregado', icon: CheckCircle, color: 'text-gray-600 bg-gray-100 border-gray-300', nextStatus: null, nextLabel: null },
    cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-red-600 bg-red-100 border-red-300', nextStatus: null, nextLabel: null }
  };

  const getStatusConfig = (order) => {
    const config = statusConfigs[order.status] || statusConfigs.pending;
    // Ajuste para 'Recoger en Tienda'
    if (order.status === 'ready' && order.deliveryType === 'pickup') {
      return { ...config, nextStatus: 'delivered', nextLabel: 'Marcar como Recogido' };
    }
    return config;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    let date;
    if (timestamp?.toDate) date = timestamp.toDate();
    else if (timestamp?.seconds) date = new Date(timestamp.seconds * 1000);
    else date = new Date(timestamp);
    
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutos
    
    if (diff < 1) return 'Ahora mismo';
    if (diff < 60) return `Hace ${diff} min`;
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)} h`;
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  };

  const statusConfig = getStatusConfig(order);
  const StatusIcon = statusConfig.icon;

  return (
    // Tarjeta individual
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      {/* Encabezado con color */}
      <div className={`px-4 py-3 border-l-4 ${statusConfig.color.replace('bg-', 'border-').replace('100', '500')}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-800">
              #{order.orderNumber || order.id.substring(0, 6).toUpperCase()}
            </span>
            {order.deliveryType === 'delivery' ? (
              <Truck className="w-5 h-5 text-blue-500" title="A Domicilio" />
            ) : (
              <Store className="w-5 h-5 text-green-500" title="Recoger en Tienda" />
            )}
          </div>
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${statusConfig.color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusConfig.label}
          </span>
        </div>
        <p className="text-sm text-gray-500 flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {formatTime(order.createdAt)}
        </p>
      </div>

      {/* Cuerpo de la tarjeta */}
      <div className="p-4 space-y-3">
        {/* Info del Cliente */}
        <div className="flex items-start gap-3 text-sm">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold flex-shrink-0">
            {order.customer?.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate">{order.customer?.name || 'Cliente'}</p>
            {order.customer?.phone && (
              <a href={`tel:${order.customer.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                <Phone className="w-3 h-3" />
                {order.customer.phone}
              </a>
            )}
            {(order.info?.location?.formatted_address || order.customer?.address) && (
              <p className="flex items-start gap-1 text-gray-600 mt-1">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="break-words">{order.info?.location?.formatted_address || order.customer.address}</span>
              </p>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="border-t pt-3 space-y-2">
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-700 break-words pr-2">
                <span className="font-semibold">{item.quantity}x</span> {item.name}
              </span>
              <span className="font-semibold text-gray-800 whitespace-nowrap">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t pt-3 space-y-1">
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>${order.subtotal?.toFixed(2)}</span>
            </div>
          )}
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Envío</span>
              <span>${order.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-gray-800 pt-1">
            <span className="flex items-center gap-1">
              <DollarSign className="w-5 h-5" />
              Total
            </span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Botones de Acción */}
        {statusConfig.nextStatus && (
          <div className="pt-3 space-y-2">
            <button
              onClick={() => onUpdateStatus(order.id, statusConfig.nextStatus)}
              disabled={isUpdating}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Actualizando...
                </span>
              ) : (
                statusConfig.nextLabel
              )}
            </button>
            
            {order.status === 'pending' && (
              <button
                onClick={() => {
                  if (window.confirm('¿Estás seguro de cancelar este pedido?')) {
                    onUpdateStatus(order.id, 'cancelled');
                  }
                }}
                disabled={isUpdating}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancelar Pedido
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


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
      const orders = await api.get(`/orders/${restaurantId}`);
      // Convertir timestamps de Firestore a objetos Date
      const ordersWithDates = orders.map(o => ({
        ...o,
        createdAt: o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt)
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
  }, [user, navigate, restaurantId, fetchOrders]); // fetchOrders está en dependencias

  // --- 🔥 SSE MEJORADO (CON LÓGICA DE ESTADO LOCAL) ---
  useEffect(() => {
    if (!restaurantId) return;

    console.log('[OrdersManager] 📡 Conectando SSE...');
    const eventSource = new EventSource(`${API_BASE}/events`);
    
    eventSource.onopen = () => {
      console.log('[OrdersManager] ✅ SSE conectado');
      // Opcional: recargar por si perdimos algo mientras estábamos desconectados
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

        const newOrder = {
          ...eventData.payload,
          createdAt: eventData.payload.createdAt?.seconds ? new Date(eventData.payload.createdAt.seconds * 1000) : new Date(eventData.payload.createdAt)
        };

        if (eventData.type === 'order_new') {
          console.log('[OrdersManager] ✨ Recibido nuevo pedido:', newOrder.id);
          setAllOrders(prevOrders => {
            // Prevenir duplicados
            if (prevOrders.find(o => o.id === newOrder.id)) return prevOrders;
            return [newOrder, ...prevOrders];
          });
          // Aquí puedes añadir sonido de notificación
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
      console.error('[OrdersManager] ❌ Error en SSE, Vercel cerró la conexión. Reconectando...', err);
      // No cerramos, EventSource intentará reconectar automáticamente.
      // Aquí es donde veías el error, es "normal" en serverless.
    };

    return () => {
      console.log('[OrdersManager] 🔌 Cerrando conexión SSE');
      eventSource.close();
    };
  }, [restaurantId, fetchOrders]); // fetchOrders está en dependencias

  // --- 🔥 ACTUALIZACIÓN DE ESTADO OPTIMISTA ---
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
      await api.put(`/orders/${restaurantData.id}/${orderId}/status`, {
        newStatus: newStatus
      });
      // El backend publicará en Redis, y el SSE nos enviará la
      // confirmación (aunque visualmente ya lo hayamos actualizado).
      console.log('[OrdersManager] ✅ Pedido actualizado en backend:', orderId);
    } catch (err) {
      console.error('[OrdersManager] ❌ Error actualizando pedido:', err);
      // 3. Reversión (Rollback)
      // Si la API falla, revertimos el cambio en el frontend
      // y mostramos un error.
      alert('Error al actualizar el pedido. Reintentando...');
      fetchOrders(); // Recargamos todo para estar seguros
    } finally {
      setUpdatingOrder(null); // Desbloquear botones
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    // Fondo degradado y padding, como en Menu.jsx
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 pb-20">
      <AlertContainer /> {/* Asegúrate de tener esto si usas showAlert */}
      
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
            <AnimatePresence>
              {filteredOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onUpdateStatus={updateOrderStatus}
                  isUpdating={updatingOrder === order.id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}