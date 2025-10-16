// frontend-pwa/src/components/OrderDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { api } from '../services/api';

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const statusOptions = [
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
    if (!orderId) {
      setError('ID de pedido no válido.');
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        // Obtener restaurantId del usuario
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists) {
          setError('Usuario no encontrado.');
          return;
        }
        const restaurantId = userDoc.data().restaurantId;

        // Obtener pedido específico
        // Este endpoint debe verificar que el pedido pertenece al restaurante del usuario
        const data = await api.get(`/orders/${restaurantId}/${orderId}`);
        setOrder(data);
        setNewStatus(data.status); // Inicializar el select con el estado actual
      } catch (err) {
        setError('Error al cargar el pedido: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [user, navigate, orderId]);

  const handleStatusChange = async () => {
    if (!user || !order) return;
    if (newStatus === order.status) {
      alert('El estado no ha cambiado.');
      return;
    }
    if (!window.confirm(`¿Estás seguro de cambiar el estado del pedido #${orderId} a "${newStatus}"?`)) {
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const restaurantId = userDoc.data().restaurantId;

      await api.put(`/orders/${restaurantId}/${orderId}/status`, {
        newStatus: newStatus
      });

      // Actualizar localmente
      setOrder(prev => ({ ...prev, status: newStatus }));
      alert(`✅ Pedido #${orderId} actualizado a ${newStatus}`);
    } catch (err) {
      setError('Error al actualizar el pedido: ' + err.message);
      // Revertir el estado en caso de error
      setNewStatus(order.status);
    }
  };

  if (loading) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><span className="loading loading-spinner loading-lg"></span></div></div>;
  if (error) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><div className="max-w-md"><h1 className="text-2xl font-bold">Error</h1><p>{error}</p></div></div></div>;
  if (!order) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><p>Pedido no encontrado.</p></div></div>;

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'confirmed': return 'badge-info';
      case 'preparing': return 'badge-primary';
      case 'ready': return 'badge-success';
      case 'delivered': return 'badge-neutral';
      case 'cancelled': return 'badge-error';
      default: return 'badge-ghost';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Detalle del Pedido</h1>
        <button className="btn btn-sm" onClick={() => navigate('/orders')}>← Volver a Pedidos</button>
      </div>

      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 card bg-base-100 shadow-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Pedido #{order.id}</h2>
              <p className="text-gray-500">Canal: {order.channel}</p>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-xl font-bold ${order.status === 'delivered' || order.status === 'cancelled' ? 'line-through' : ''}`}>
                ${order.total?.toFixed(2) || '0.00'}
              </span>
              <span className={`badge ${getStatusClass(order.status)} mt-1`}>
                {order.status}
              </span>
            </div>
          </div>

          <div className="divider"></div>

          <h3 className="text-lg font-semibold mb-2">Cliente</h3>
          <p><strong>Nombre:</strong> {order.customer?.name || 'No proporcionado'}</p>
          <p><strong>ID Telegram:</strong> {order.customer?.telegramId || 'No disponible'}</p>

          <div className="divider"></div>

          <h3 className="text-lg font-semibold mb-2">Artículos</h3>
          <ul className="space-y-2">
            {order.items?.map((item, index) => (
              <li key={index} className="flex justify-between border-b pb-1">
                <span>{item.quantity}x {item.name}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>

          <div className="divider"></div>

          <h3 className="text-lg font-semibold mb-2">Resumen</h3>
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${order.total?.toFixed(2) || '0.00'}</span>
          </div>
          {/* Aquí podrían ir otros cálculos como envío, descuentos, etc. si se almacenan */}
        </div>

        {/* Detalles y Acciones */}
        <div className="card bg-base-100 shadow-xl p-4">
          <h3 className="text-lg font-semibold mb-4">Detalles del Pedido</h3>
          <p><strong>Fecha de Creación:</strong> {formatDate(order.createdAt)}</p>
          <p><strong>Última Actualización:</strong> {formatDate(order.updatedAt)}</p>

          {/* Historial de Estados */}
          <div className="divider"></div>
          <h3 className="text-lg font-semibold mb-2">Historial de Estados</h3>
          <ul className="space-y-1 text-sm">
            {order.statusHistory?.map((historyItem, index) => (
              <li key={index} className="flex justify-between border-b pb-1">
                <span className={`badge ${getStatusClass(historyItem.status)}`}>{historyItem.status}</span>
                <span>{formatDate(historyItem.timestamp)}</span>
                {historyItem.notes && <span className="text-gray-500 ml-2">{historyItem.notes}</span>}
              </li>
            ))}
          </ul>

          {/* Cambiar Estado */}
          <div className="divider"></div>
          <h3 className="text-lg font-semibold mb-2">Actualizar Estado</h3>
          <div className="flex space-x-2">
            <select
              className="select select-bordered select-sm flex-grow"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleStatusChange}
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}