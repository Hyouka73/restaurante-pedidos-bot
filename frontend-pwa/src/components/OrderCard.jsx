// frontend-pwa/src/components/OrderCard.jsx
import { useNavigate } from 'react-router-dom';

export default function OrderCard({ order }) {
  const navigate = useNavigate();

  const handleViewDetail = () => {
    // Navegar a la página de detalle del pedido, por ejemplo:
    // /orders/detail/:orderId
    navigate(`/orders/detail/${order.id}`);
  };

  // Función para formatear la fecha si es un objeto Timestamp de Firestore
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Asumiendo que es un objeto con método toDate() como en Firestore
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    // Si es una cadena ISO o número, usar Date normalmente
    return new Date(timestamp).toLocaleString();
  };

  // Función para obtener el badge class según el estado
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
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
      <div className="card-body p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg truncate max-w-[70%]">Pedido #{order.id?.substring(0, 8) || 'N/A'}</h3>
            <p className="text-gray-500 text-sm">Cliente: {order.customer?.name || 'Desconocido'}</p>
            <p className="text-gray-500 text-sm">Canal: {order.channel || 'Desconocido'}</p>
          </div>
          <div className="flex flex-col items-end">
            <span className={`badge ${getStatusClass(order.status)}`}>{order.status}</span>
            <span className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</span>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">${order.total?.toFixed(2) || '0.00'}</span>
            <div className="flex space-x-2">
              {/* Botón para ver detalle */}
              <button
                className="btn btn-xs btn-outline"
                onClick={handleViewDetail}
              >
                Ver Detalle
              </button>
              {/* Aquí podrían ir otros botones de acción según el estado */}
              {/* Ej: Cambiar estado, re-imprimir, etc. */}
            </div>
          </div>
        </div>

        {/* Mini resumen de items (opcional, truncar si hay muchos) */}
        {order.items && order.items.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            <p className="truncate">
              {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}