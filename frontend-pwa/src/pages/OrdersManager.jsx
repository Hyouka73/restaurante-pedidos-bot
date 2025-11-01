import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useRestaurant } from '../context/RestaurantContext';
import Loader from '../components/ui/Loader';
import { WizardErrorBox } from '../components/ui/WizardComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Edit } from 'lucide-react';
import { useAlert } from '../components/ui/CustomAlert';
// 🔥 1. Importar la nueva librería
import { fetchEventSource } from '@microsoft/fetch-event-source';

// Componente individual para una orden (para mejor organización)
const OrderCard = ({ order, onUpdateStatus }) => {
  // ... (Este componente interno no necesita cambios)
  const [showDetails, setShowDetails] = useState(false);
  const [newStatus, setNewStatus] = useState(order.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusOptions = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-indigo-100 text-indigo-800',
    ready: 'bg-cyan-100 text-cyan-800',
    delivering: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const handleUpdate = async () => {
    if (newStatus === order.status) return;
    setIsUpdating(true);
    await onUpdateStatus(order.id, newStatus);
    setIsUpdating(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
    >
      <div 
        className={`p-4 flex flex-col sm:flex-row justify-between items-center cursor-pointer ${statusColors[order.status]}`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="mb-2 sm:mb-0">
          <span className="font-bold text-lg">Orden #{order.orderNumber}</span>
          <span className="text-sm ml-2">({new Date(order.createdAt.seconds * 1000).toLocaleTimeString()})</span> {/* Asumiendo timestamp de Firestore */}
        </div>
        <div className="font-semibold text-lg">${order.total.toFixed(2)}</div>
      </div>
      
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-gray-200">
              {/* ... (Detalles del cliente, items, y selector de estado) ... */}
              <h5 className="font-bold mt-4 mb-2">Actualizar Estado:</h5>
              <div className="flex gap-2">
                <select 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-lg"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <button 
                  onClick={handleUpdate}
                  disabled={isUpdating || newStatus === order.status}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {isUpdating ? '...' : 'Actualizar'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


// --- Componente Principal de OrdersManager ---
const OrdersManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { data: restaurantData, loading: loadingRestaurant } = useRestaurant();
  const restaurantId = restaurantData?.id;
  const { showAlert } = useAlert();

  // Función para cargar pedidos (solo se usa al inicio)
  const fetchOrders = async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const data = await api.get(`/orders/${restaurantId}`);
      // Asegurarse de que createdAt es un Date para ordenar
      const sortedData = (Array.isArray(data) ? data : []).map(o => ({
        ...o,
        createdAt: o.createdAt.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt)
      })).sort((a, b) => b.createdAt - a.createdAt);
      
      setOrders(sortedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial de pedidos
  useEffect(() => {
    if (restaurantId) {
      fetchOrders();
    }
  }, [restaurantId]);


  // --- 🔥 2. CONEXIÓN SSE (AHORA ROBUSTA) ---
  useEffect(() => {
    if (!restaurantId) return;

    const eventSourceUrl = `${api.defaults.baseURL}/events`;
    console.log(`[OrdersManager] 🔌 Conectando a SSE en: ${eventSourceUrl}`);
    
    // AbortController para poder cancelar la conexión
    const ctrl = new AbortController();

    fetchEventSource(eventSourceUrl, {
      signal: ctrl.signal,
      
      onopen(response) {
        if (response.ok) {
          console.log('[OrdersManager] ✅ Conexión SSE abierta');
          // Conexión exitosa, recargamos por si perdimos algo
          fetchOrders();
        } else {
          console.error('[OrdersManager] ❌ Fallo al abrir conexión SSE:', response.statusText);
        }
      },
      
      onmessage(event) {
        const data = JSON.parse(event.data);
        console.log('[OrdersManager] 📨 Evento SSE recibido:', data.type);

        if (data.type === 'connected') {
          console.log('[OrdersManager] Conexión SSE confirmada por el servidor.');
          return;
        }

        if (data.type === 'order_new') {
          setOrders(prevOrders => {
            // Prevenir duplicados
            if (prevOrders.find(o => o.id === data.payload.id)) return prevOrders;
            const newOrder = {
              ...data.payload,
              createdAt: data.payload.createdAt.seconds ? new Date(data.payload.createdAt.seconds * 1000) : new Date(data.payload.createdAt)
            };
            return [newOrder, ...prevOrders];
          });
          showAlert('¡Nuevo pedido recibido!', 'success');
          // playNotificationSound();
        }
        
        if (data.type === 'order_update') {
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order.id === data.payload.id ? { ...data.payload, createdAt: new Date(data.payload.createdAt.seconds * 1000) } : order
            )
          );
        }
      },
      
      onclose() {
        // Esto solo se llama si nosotros cerramos la conexión (ctrl.abort())
        console.log('[OrdersManager] 🔌 Conexión SSE cerrada limpiamente');
      },
      
      onerror(err) {
        // ESTE ES EL MANEJO CLAVE
        console.error('[OrdersManager] ❌ Error en SSE, reintentando...', err);
        // La librería reintentará automáticamente.
        // Si el error es fatal (ej. 404), debemos detenerla.
        if (err.status && err.status >= 400 && err.status < 500) {
          console.error('[OrdersManager] ❌ Error fatal de SSE, deteniendo reintentos.', err);
          ctrl.abort(); // Detener reintentos
          setError('No se pudo conectar al servidor de eventos.');
        }
        // Si es un error de Vercel (timeout), la librería lo manejará y reconectará.
      }
    });

    // Limpiar la conexión al desmontar
    return () => {
      console.log('[OrdersManager] 🔌 Abortando conexión SSE');
      ctrl.abort();
    };

  }, [restaurantId, showAlert]); // Dependencias correctas


  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${restaurantId}/${orderId}/status`, { newStatus });
      showAlert('Estado actualizado', 'success');
      // No necesitamos actualizar el estado localmente,
      // el backend publicará en Redis y el SSE 'onmessage' lo capturará.
    } catch (err) {
      showAlert(`Error al actualizar: ${err.message}`, 'error');
    }
  };

  if (loading || loadingRestaurant) {
    return <Loader message="Cargando pedidos..." />;
  }

  // Separar pedidos
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* ... (Encabezado de la página) ... */}
      <div className="flex items-center gap-3 pb-4 mb-6 border-b">
        {/* ... */}
      </div>
      
      {error && <WizardErrorBox error={error} onDismiss={() => setError(null)} />}

      {/* Pedidos Activos */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-700 mb-4">Pedidos Activos ({activeOrders.length})</h2>
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {activeOrders.length === 0 ? (
              <p className="text-gray-500 md:col-span-3">No hay pedidos activos.</p>
            ) : (
              activeOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onUpdateStatus={handleUpdateStatus} 
                />
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Pedidos Completados */}
      <section>
        {/* ... (renderizado de pedidos completados) ... */}
      </section>
    </div>
  );
};

export default OrdersManager;
  
  // ✅ CAMBIO: allOrders contiene TODOS los pedidos (se carga 1 sola vez)
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [updatingOrder, setUpdatingOrder] = useState(null);

  console.log('[OrdersManager] 🔄 Render:', {
    hasUser: !!user,
    hasRestaurant: !!restaurantData?.id,
    allOrdersCount: allOrders.length,
    statusFilter,
    loading
  });

  // ✅ OPTIMIZACIÓN: Filtrar en memoria sin recargar
  const filteredOrders = useMemo(() => {
    console.log('[OrdersManager] 🔍 Filtrando pedidos...', { 
      total: allOrders.length, 
      filter: statusFilter 
    });
    
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
    
    // Ordenar por fecha (más recientes primero)
    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.createdAt?.seconds || a.createdAt?.toDate?.() || new Date(a.createdAt);
      const dateB = b.createdAt?.seconds || b.createdAt?.toDate?.() || new Date(b.createdAt);
      return new Date(dateB) - new Date(dateA);
    });
    
    console.log('[OrdersManager] ✅ Filtrados:', sorted.length);
    return sorted;
  }, [allOrders, statusFilter]);

  // ✅ Cargar pedidos 1 sola vez
  const fetchOrders = useCallback(async () => {
    if (!restaurantData?.id) {
      console.log('[OrdersManager] ⚠️ No hay restaurantId, esperando...');
      return;
    }
    
    console.log('[OrdersManager] 📡 Cargando pedidos para:', restaurantData.id);
    
    try {
      setLoading(true);
      const orders = await api.get(`/orders/${restaurantData.id}`);
      console.log('[OrdersManager] ✅ Pedidos recibidos:', orders.length);
      setAllOrders(orders);
    } catch (error) {
      console.error('[OrdersManager] ❌ Error cargando pedidos:', error);
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }, [restaurantData?.id]);

  // ✅ Cargar pedidos al montar (solo si hay restaurantId)
  useEffect(() => {
    if (!user) {
      console.log('[OrdersManager] ⚠️ No hay usuario, redirigiendo...');
      navigate('/login');
      return;
    }
    
    if (restaurantData?.id) {
      console.log('[OrdersManager] 🎯 Usuario y restaurante listos, cargando pedidos...');
      fetchOrders();
    } else {
      console.log('[OrdersManager] ⏳ Esperando restaurantId...');
    }
  }, [user, navigate, restaurantData?.id, fetchOrders]);

  // ✅ SSE para actualizaciones en tiempo real
  useEffect(() => {
    if (!restaurantData?.id) return;

    console.log('[OrdersManager] 📡 Conectando SSE...');
    const eventSource = new EventSource(`${API_BASE}/events`);
    
    eventSource.onopen = () => {
      console.log('[OrdersManager] ✅ SSE conectado');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        console.log('[OrdersManager] 📨 Evento SSE recibido:', eventData.type);
        
        if (eventData.type === 'order_update') {
          console.log('[OrdersManager] 🔄 Actualizando pedidos por SSE...');
          fetchOrders();
        } else if (eventData.type === 'connected') {
          console.log('[OrdersManager] 🎉 Conexión SSE establecida, clientId:', eventData.clientId);
        }
      } catch (err) {
        console.error('[OrdersManager] ❌ Error parseando evento SSE:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[OrdersManager] ❌ Error en SSE:', err);
      eventSource.close();
    };

    return () => {
      console.log('[OrdersManager] 🔌 Cerrando conexión SSE');
      eventSource.close();
    };
  }, [restaurantData?.id, fetchOrders]);

  // ✅ Actualizar estado de pedido
  const updateOrderStatus = async (orderId, newStatus) => {
    if (!user || !restaurantData?.id) return;
    
    console.log('[OrdersManager] 📝 Actualizando pedido:', orderId, '→', newStatus);
    setUpdatingOrder(orderId);
    
    try {
      await api.put(`/orders/${restaurantData.id}/${orderId}/status`, {
        newStatus: newStatus
      });
      
      console.log('[OrdersManager] ✅ Pedido actualizado, recargando...');
      await fetchOrders();
    } catch (err) {
      console.error('[OrdersManager] ❌ Error actualizando pedido:', err);
    } finally {
      setUpdatingOrder(null);
    }
  };

  const getStatusConfig = (order) => {
    const { status, deliveryType } = order;
    const configs = {
      pending: { label: 'Pendiente', icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-300', nextStatus: 'confirmed', nextLabel: 'Confirmar' },
      confirmed: { label: 'Confirmado', icon: CheckCircle, color: 'bg-blue-100 text-blue-800 border-blue-300', nextStatus: 'preparing', nextLabel: 'Preparar' },
      preparing: { label: 'En Preparación', icon: ChefHat, color: 'bg-purple-100 text-purple-800 border-purple-300', nextStatus: 'ready', nextLabel: 'Marcar como Listo' },
      ready: { label: 'Listo', icon: Package, color: 'bg-green-100 text-green-800 border-green-300', nextStatus: 'delivering', nextLabel: 'Enviar Pedido' },
      delivering: { label: 'En Reparto', icon: Truck, color: 'bg-cyan-100 text-cyan-800 border-cyan-300', nextStatus: 'delivered', nextLabel: 'Marcar como Entregado' },
      delivered: { label: 'Entregado', icon: CheckCircle, color: 'bg-gray-100 text-gray-600 border-gray-300', nextStatus: null, nextLabel: null },
      cancelled: { label: 'Cancelado', icon: XCircle, color: 'bg-red-100 text-red-800 border-red-300', nextStatus: null, nextLabel: null }
    };

    if (status === 'ready' && deliveryType === 'pickup') {
      configs.ready.nextStatus = 'delivered';
      configs.ready.nextLabel = 'Marcar como Recogido';
    }
    
    return configs[status] || configs.pending;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    // Manejar diferentes formatos de timestamp
    let date;
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);
    
    if (diff < 1) return 'Ahora mismo';
    if (diff < 60) return `Hace ${diff} min`;
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)} hrs`;
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 pb-20">
      <div className="sticky top-0 z-10 bg-white shadow-md">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-500" />
              Pedidos
            </h1>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
              {filteredOrders.length}
            </span>
          </div>
          
          {/* ✅ Filtros: Solo cambian el estado, NO recargan datos */}
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
                  onClick={() => {
                    console.log('[OrdersManager] 🔄 Cambiando filtro a:', filter.value);
                    setStatusFilter(filter.value);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    statusFilter === filter.value
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{filter.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No hay pedidos {statusFilter === 'active' ? 'activos' : statusFilter === 'completed' ? 'completados' : ''}
            </h3>
            <p className="text-gray-500">Los nuevos pedidos aparecerán aquí automáticamente</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const statusConfig = getStatusConfig(order);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className={`px-4 py-3 border-l-4 ${statusConfig.color.replace('bg-', 'border-').split(' ')[0].replace('100', '500')}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-800">
                        #{order.orderNumber || order.id.substring(0, 6).toUpperCase()}
                      </span>
                      {order.deliveryType === 'delivery' ? (
                        <Truck className="w-5 h-5 text-blue-500" />
                      ) : (
                        <Store className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${statusConfig.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      {statusConfig.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(order.createdAt)}
                  </p>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {order.customer?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{order.customer?.name || 'Cliente'}</p>
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

                  <div className="border-t pt-3 space-y-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          <span className="font-semibold">{item.quantity}x</span> {item.name}
                        </span>
                        <span className="font-semibold text-gray-800">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 space-y-1">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>${order.subtotal?.toFixed(2) || order.total?.toFixed(2)}</span>
                    </div>
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

                  {statusConfig.nextStatus && (
                    <div className="pt-3 space-y-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, statusConfig.nextStatus)}
                        disabled={updatingOrder === order.id}
                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatingOrder === order.id ? (
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
                              updateOrderStatus(order.id, 'cancelled');
                            }
                          }}
                          disabled={updatingOrder === order.id}
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
          })
        )}
      </div>
    </div>
  );
