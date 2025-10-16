import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase';

export default function OrdersManager() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate(); // Para redirigir si no está autenticado
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'

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

    const fetchOrders = async () => {
      try {
        setLoading(true);
        // Obtener restaurantId del usuario
        const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          const restaurantId = userData.restaurantId;

          let q = query(collection(db, 'restaurants', restaurantId, 'orders'));
          if (statusFilter !== 'all') {
            q = query(q, where('status', '==', statusFilter));
          }
          // Ordenar por fecha de creación, descendente (más recientes primero)
          // q = query(q, orderBy('createdAt', 'desc')); // Asegúrate de tener un índice en Firestore si usas orderBy

          const querySnapshot = await getDocs(q);
          const ordersList = [];
          querySnapshot.forEach((doc) => {
            ordersList.push({ id: doc.id, ...doc.data() });
          });
          setOrders(ordersList);
        } else {
          setError('Usuario no encontrado en la base de datos.');
        }
      } catch (err) {
        setError('Error al cargar los pedidos: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, navigate, statusFilter]);

  const updateOrderStatus = async (orderId, newStatus) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!window.confirm(`¿Estás seguro de cambiar el estado del pedido #${orderId} a "${newStatus}"?`)) return;

    try {
      // Obtener restaurantId del usuario
      const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
      if (userDoc.empty) {
        setError('Usuario no encontrado.');
        return;
      }
      const userData = userDoc.docs[0].data();
      const restaurantId = userData.restaurantId;

      await updateDoc(doc(db, 'restaurants', restaurantId, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date()
      });
      // Actualizar localmente
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus, updatedAt: new Date() } : order
      ));
      alert(`✅ Pedido #${orderId} actualizado a ${newStatus}`);
    } catch (err) {
      setError('Error al actualizar el pedido: ' + err.message);
    }
  };

  if (loading) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><span className="loading loading-spinner loading-lg"></span></div></div>;
  if (error) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><div className="max-w-md"><h1 className="text-2xl font-bold">Error</h1><p>{error}</p></div></div></div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Gestión de Pedidos</h1>

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