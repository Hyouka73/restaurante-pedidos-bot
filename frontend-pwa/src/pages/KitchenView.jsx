// frontend-pwa/src/pages/KitchenView.jsx
// Vista enfocada en los pedidos para el personal de cocina
// Muestra pedidos en estados como 'confirmed', 'preparing', 'ready'
// Puede incluir timers, indicadores de carga, etc.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../config/firebase';
import { collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useRestaurant } from '../context/RestaurantContext'; // Usar el contexto para restaurantId

export default function KitchenView() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const {  loading: loadingContext, error: contextError } = useRestaurant();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('preparing'); // Por defecto, en preparación

  // Estados relevantes para cocina
  const kitchenStatuses = ['confirmed', 'preparing', 'ready'];

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (loadingContext || contextError) {
      // Aún cargando el contexto o hubo un error, no proceder
      setLoading(loadingContext);
      setError(contextError);
      return;
    }

    // Usar onSnapshot para actualizaciones en tiempo real
    // Filtrar por restaurantId del contexto y por estados de cocina
    const q = query(
      collection(db, 'restaurants',  'orders'),
      where('status', 'in', kitchenStatuses),
      orderBy('createdAt', 'asc') // Mostrar los más antiguos primero
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersList = [];
      querySnapshot.forEach((doc) => {
        ordersList.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersList);
      setLoading(false);
    }, (err) => {
      console.error('Error en tiempo real de cocina:', err);
      setError('Error al escuchar los pedidos en tiempo real.');
      setLoading(false);
    });

    return () => unsubscribe(); // Limpiar listener al desmontar
  }, [user, navigate, loadingContext, contextError, ]);

  // Función para calcular tiempo estimado (simplificada)
  // Usando prepTime de items y complejidad
  const calculateEstimatedTime = (orderItems) => {
    if (!orderItems || orderItems.length === 0) return 0;
    // Supongamos una base de 5 min + complejidad * factor
    const baseTime = 5;
    const complexityFactor = 1; // Ajustable
    let totalTime = 0;
    orderItems.forEach(item => {
      // Buscar el item real en el menú para obtener prepTime y complexity
      // Esto es complicado sin tener el menú aquí. Se podría traer en la consulta o asumir valores medios.
      // Por ahora, asumimos un valor promedio o se ignora.
      totalTime += baseTime; // Simplificado
    });
    return totalTime;
  };

  // Función para avanzar estado del pedido
  const advanceOrderStatus = async (orderId, currentStatus) => {
    if (!user) {
      navigate('/login');
      return;
    }
    let newStatus = currentStatus;
    if (currentStatus === 'confirmed') newStatus = 'preparing';
    else if (currentStatus === 'preparing') newStatus = 'ready';
    else return; // No avanzar si ya está ready

    if (!window.confirm(`¿Estás seguro de marcar el pedido #${orderId} como "${newStatus}"?`)) return;

    try {
      // Usar la API para actualizar el estado
      // const response = await api.put(`/orders/${restaurantId}/${orderId}/status`, { newStatus });
      // Para tiempo real, podríamos usar Firestore directamente o una Function
      // Por simplicidad en este ejemplo, no implementamos la API call real aquí.
      // Se debería llamar a la API o Cloud Function para manejar la lógica de negocio y triggers.
      console.log(`Actualizar pedido ${orderId} a ${newStatus} via API/Function`);
      alert(`Pedido #${orderId} marcado como ${newStatus} (simulado).`);
    } catch (err) {
      setError('Error al actualizar el pedido: ' + err.message);
    }
  };

  if (loading || loadingContext) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><span className="loading loading-spinner loading-lg"></span></div></div>;
  if (error || contextError) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><div className="max-w-md"><h1 className="text-2xl font-bold">Error</h1><p>{error || contextError}</p></div></div></div>;

  const filteredOrders = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vista de Cocina</h1>
        <div className="flex items-center space-x-4">
          {/* Selector de estado para filtrar */}
          <select
            className="select select-bordered select-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="confirmed">Confirmados</option>
            <option value="preparing">En Preparación</option>
            <option value="ready">Listos</option>
          </select>
          {/* Indicador de carga general o botón de refresco si es necesario */}
        </div>
      </div>

      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No hay pedidos {statusFilter ? `en estado "${statusFilter}"` : 'para cocina'}.
          </div>
        ) : (
          filteredOrders.map(order => (
            <div
              key={order.id}
              className={`card shadow-lg ${
                order.status === 'confirmed' ? 'bg-blue-50 border-l-4 border-blue-500' :
                order.status === 'preparing' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
                'bg-green-50 border-l-4 border-green-500'
              }`}
            >
              <div className="card-body p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">#{order.id.substring(0, 8)}</h3>
                    <p className="text-gray-500 text-sm">Cliente: {order.customer?.name || 'Desconocido'}</p>
                  </div>
                  <span className={`badge ${
                    order.status === 'confirmed' ? 'badge-info' :
                    order.status === 'preparing' ? 'badge-warning' : 'badge-success'
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="mt-3">
                  <ul className="text-sm space-y-1">
                    {order.items?.map((item, idx) => (
                      <li key={idx}>{item.quantity}x {item.name}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  {/* Timer o cálculo de tiempo estimado aquí */}
                  {/* <div className="countdown">
                    <span style={{"--value": 15}}></span> min
                  </div> */}
                  <p>Tiempo estimado: ~{calculateEstimatedTime(order.items)} min</p>
                </div>

                <div className="card-actions justify-end mt-4">
                  {/* Botón para avanzar estado */}
                  {(order.status === 'confirmed' || order.status === 'preparing') && (
                    <button
                      className="btn btn-xs btn-primary"
                      onClick={() => advanceOrderStatus(order.id, order.status)}
                    >
                      Marcar como {order.status === 'confirmed' ? 'En Preparación' : 'Listo'}
                    </button>
                  )}
                  {/* Botón para ver detalle completo */}
                  <button
                    className="btn btn-xs btn-outline"
                    onClick={() => navigate(`/orders/detail/${order.id}`)}
                  >
                    Ver Detalle
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}