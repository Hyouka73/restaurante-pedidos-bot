import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, updateDoc, doc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase';
import { useRestaurant } from '../context/RestaurantContext';
import { Package, Clock, CheckCircle, XCircle, ChefHat, Store, Truck, Phone, MapPin, DollarSign, RefreshCw } from 'lucide-react';

export default function OrdersManager() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const { data: restaurantData } = useRestaurant();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!restaurantData?.id) return;

    const restaurantId = restaurantData.id;
    setLoading(true);

    let ordersQuery;
    
    if (statusFilter === 'active') {
      ordersQuery = query(
        collection(db, 'restaurants', restaurantId, 'orders'),
        where('status', 'in', ['pending', 'confirmed', 'preparing', 'ready']),
        orderBy('createdAt', 'desc')
      );
    } else if (statusFilter === 'completed') {
      ordersQuery = query(
        collection(db, 'restaurants', restaurantId, 'orders'),
        where('status', 'in', ['delivered', 'cancelled']),
        orderBy('createdAt', 'desc')
      );
    } else {
      ordersQuery = query(
        collection(db, 'restaurants', restaurantId, 'orders'),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const list = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      setOrders(list);
      setLoading(false);
    }, (err) => {
      console.error('Error escuchando pedidos:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, navigate, statusFilter, restaurantData]);

  const updateOrderStatus = async (orderId, newStatus) => {
    if (!user || !restaurantData?.id) return;
    
    setUpdatingOrder(orderId);
    try {
      await updateDoc(doc(db, 'restaurants', restaurantData.id, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error('Error actualizando pedido:', err);
      alert('Error al actualizar el pedido');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        label: 'Pendiente',
        icon: Clock,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        nextStatus: 'confirmed',
        nextLabel: 'Confirmar'
      },
      confirmed: {
        label: 'Confirmado',
        icon: CheckCircle,
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        nextStatus: 'preparing',
        nextLabel: 'Preparar'
      },
      preparing: {
        label: 'En Preparación',
        icon: ChefHat,
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        nextStatus: 'ready',
        nextLabel: 'Listo'
      },
      ready: {
        label: 'Listo',
        icon: Package,
        color: 'bg-green-100 text-green-800 border-green-300',
        nextStatus: 'delivered',
        nextLabel: 'Entregar'
      },
      delivered: {
        label: 'Entregado',
        icon: CheckCircle,
        color: 'bg-gray-100 text-gray-600 border-gray-300',
        nextStatus: null,
        nextLabel: null
      },
      cancelled: {
        label: 'Cancelado',
        icon: XCircle,
        color: 'bg-red-100 text-red-800 border-red-300',
        nextStatus: null,
        nextLabel: null
      }
    };
    return configs[status] || configs.pending;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
      {/* Header Sticky */}
      <div className="sticky top-0 z-10 bg-white shadow-md">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-500" />
              Pedidos
            </h1>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
              {orders.length}
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

      {/* Lista de Pedidos */}
      <div className="px-4 py-4 space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No hay pedidos {statusFilter === 'active' ? 'activos' : statusFilter === 'completed' ? 'completados' : ''}
            </h3>
            <p className="text-gray-500">Los nuevos pedidos aparecerán aquí automáticamente</p>
          </div>
        ) : (
          orders.map(order => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Header del pedido */}
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

                {/* Contenido del pedido */}
                <div className="p-4 space-y-3">
                  {/* Cliente */}
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
                      {order.customer?.address && (
                        <p className="flex items-start gap-1 text-gray-600 mt-1">
                          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="break-words">{order.customer.address}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="border-t pt-3 space-y-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          <span className="font-semibold">{item.quantity}x</span> {item.name}
                        </span>
                        <span className="font-semibold text-gray-800">${item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t pt-3 space-y-1">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>${order.subtotal || order.total}</span>
                    </div>
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Envío</span>
                        <span>${order.deliveryFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-gray-800 pt-1">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-5 h-5" />
                        Total
                      </span>
                      <span>${order.total}</span>
                    </div>
                  </div>

                  {/* Botones de acción */}
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
}