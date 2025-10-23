import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, updateDoc, doc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase';
import { useRestaurant } from '../context/RestaurantContext';
import { api } from '../services/api';
import { useAlert, AlertContainer } from '../components/ui/CustomAlert';

export default function OrdersManager() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate(); // Para redirigir si no está autenticado
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'
  const [isFullscreen, setIsFullscreen] = useState(document.fullscreenElement !== null);
  const { showAlert, alerts, hideAlert } = useAlert();

  const { data: restaurantData, loading: restaurantLoading } = useRestaurant();

  // Manejar cambios en el estado de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
      showAlert('Error al cambiar el modo de pantalla completa', 'error', 3000);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'preparing', label: 'En preparación' },
    { value: 'ready', label: 'Listo' },
    { value: 'delivered', label: 'Entregado' },
    { value: 'cancelled', label: 'Cancelado' }
  ];

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Debemos tener restaurantData (proporcionado por RestaurantContext) para suscribirnos
    if (!restaurantData?.id) {
      // Esperar hasta que restaurantData esté listo
      return;
    }

    const restaurantId = restaurantData.id;
    setLoading(true);

    let ordersQuery;
    if (statusFilter === 'all') {
      ordersQuery = query(collection(db, 'restaurants', restaurantId, 'orders'), orderBy('createdAt', 'desc'));
    } else {
      ordersQuery = query(collection(db, 'restaurants', restaurantId, 'orders'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const list = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      setOrders(list);
      setLoading(false);
    }, (err) => {
      console.error('Error escuchando pedidos:', err);
      setError('Error al escuchar pedidos: ' + err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, navigate, statusFilter, restaurantData]);

  const updateOrderStatus = async (orderId, newStatus) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      const restaurantId = restaurantData?.id;
      if (!restaurantId) {
        showAlert('RestaurantId no disponible', 'error', 3000);
        return;
      }

      await updateDoc(doc(db, 'restaurants', restaurantId, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date()
      });
      // Actualizar localmente
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus, updatedAt: new Date() } : order
      ));
      showAlert(`✅ Pedido #${orderId} actualizado a ${newStatus}`, 'success', 3000);
    } catch (err) {
      showAlert('Error al actualizar el pedido: ' + err.message, 'error', 4000);
    }
  };

  const handleCloseStore = async () => {
    if (!restaurantData?.id) {
      showAlert('RestaurantId no disponible', 'error', 3000);
      return;
    }
    if (!window.confirm('¿Quieres cerrar la tienda manualmente? Esto evitará que se acepten nuevos pedidos.')) return;
    try {
      await api.put(`/config/${restaurantData.id}/availability`, { status: 'closed_by_owner', reason: 'Cerrado por el dueño' });
      showAlert('Tienda cerrada manualmente', 'success', 3000);
    } catch (err) {
      console.error('Error cerrando tienda:', err);
      showAlert('Error al cerrar la tienda: ' + err.message, 'error', 4000);
    }
  };

  if (loading || restaurantLoading) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><span className="loading loading-spinner loading-lg"></span></div></div>;
  if (error) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><div className="max-w-md"><h1 className="text-2xl font-bold">Error</h1><p>{error}</p></div></div></div>;

  return (
    <div className="container mx-auto p-4">
      <AlertContainer alerts={alerts} onClose={hideAlert} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>
        <button 
          className={`btn ${isFullscreen ? 'btn-error' : 'btn-primary'}`}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? '❌ Salir Pantalla Completa' : '🔲 Pantalla Completa'}
        </button>
      </div>

      <div className="mb-4 flex gap-2 items-center">
        <button className="btn btn-warning" onClick={handleCloseStore}>Cerrar Tienda</button>
        <div className="badge badge-info">Estado: {restaurantData?.availabilityComputed?.status || restaurantData?.availability?.status || 'N/A'}</div>
      </div>
      <div className="mb-4">
        <label className="label">Filtrar por estado:</label>
        <select
          className="select select-bordered w-full max-w-xs"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Canal</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan="7" className="text-center">No hay pedidos.</td></tr>
            ) : (
              orders.map(order => (
                <tr key={order.id}>
                  <td>#{order.id.substring(0, 8)}</td>
                  <td>{order.customer?.name || 'Desconocido'}</td>
                  <td>${order.total}</td>
                  <td>
                    <span className={`badge ${
                      order.status === 'pending' ? 'badge-warning' :
                      order.status === 'confirmed' ? 'badge-info' :
                      order.status === 'preparing' ? 'badge-primary' :
                      order.status === 'ready' ? 'badge-success' :
                      order.status === 'delivered' ? 'badge-neutral' : 'badge-error'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.channel}</td>
                  <td>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'N/A'}</td>
                  <td>
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <select
                        className="select select-bordered select-xs"
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      >
                        {statusOptions.filter(opt => opt.value !== 'all' && opt.value !== order.status).map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}