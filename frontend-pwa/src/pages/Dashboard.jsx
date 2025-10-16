// frontend-pwa/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function Dashboard() {
  const [user, loadingAuth] = useAuthState(auth);
  const navigate = useNavigate();
  const [restaurantData, setRestaurantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    revenue: 0,
    avgOrderValue: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        console.log("[Dashboard] No hay usuario autenticado, no se cargan datos.");
        setLoading(false);
        return;
      }

      try {
        console.log("[Dashboard] Usuario autenticado, obteniendo restaurantId...");
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        console.log("[Dashboard] Doc de usuario obtenido:", userDoc.exists());
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log("[Dashboard] Datos de usuario:", userData);
          const restaurantId = userData.restaurantId;
          console.log("[Dashboard] RestaurantId obtenido:", restaurantId);
          if (restaurantId) {
            const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
            if (restaurantDoc.exists()) {
              setRestaurantData(restaurantDoc.data());
            }

            const ordersQuery = query(
              collection(db, 'restaurants', restaurantId, 'orders'),
              orderBy('createdAt', 'desc')
            );
            const ordersSnapshot = await getDocs(ordersQuery);
            const ordersList = [];
            let totalRevenue = 0;
            let pendingCount = 0;

            ordersSnapshot.forEach((doc) => {
              const data = doc.data();
              ordersList.push({ id: doc.id, ...data });
              totalRevenue += data.total || 0;
              if (data.status === 'pending') pendingCount++;
            });

            setRecentOrders(ordersList.slice(0, 5));

            const totalOrders = ordersList.length;
            const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

            setMetrics({
              totalOrders,
              pendingOrders: pendingCount,
              revenue: totalRevenue.toFixed(2),
              avgOrderValue
            });
          } else {
            console.error("[Dashboard] No se encontró restaurantId en el doc de usuario para UID:", user.uid);
          }
        } else {
          console.error("[Dashboard] Documento de usuario no encontrado para UID:", user.uid);
        }
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  if (loadingAuth || (user && loading)) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div>Redirigiendo...</div>;
  }

  const { totalOrders, pendingOrders, revenue, avgOrderValue } = metrics;

  return (
    <div className="space-y-6">
      <div className="hero bg-base-200 rounded-box p-6">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
            <p className="py-3">
              Bienvenido, <strong>{user?.displayName || user?.email}</strong>!<br />
              {restaurantData?.info?.name ? `Gestionando: ${restaurantData.info.name}` : 'Restaurante no configurado.'}
            </p>
            {!restaurantData?.setupCompleted && (
              <div className="alert alert-warning mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                <span>¡Tu configuración inicial no está completa!</span>
                <button className="btn btn-sm btn-primary ml-2" onClick={() => navigate('/setup')}>Completar Ahora</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-100 shadow">
          <div className="stat-figure text-primary">
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-16">
                <span className="text-3xl">🛒</span>
              </div>
            </div>
          </div>
          <div className="stat-title">Pedidos Totales</div>
          <div className="stat-value">{totalOrders}</div>
          <div className="stat-desc">Desde que iniciaste</div>
        </div>

        <div className="stat bg-base-100 shadow">
          <div className="stat-figure text-warning">
            <div className="avatar placeholder">
              <div className="bg-warning text-warning-content rounded-full w-16">
                <span className="text-3xl">⏳</span>
              </div>
            </div>
          </div>
          <div className="stat-title">Pendientes</div>
          <div className="stat-value">{pendingOrders}</div>
          <div className="stat-desc">Esperando confirmación</div>
        </div>

        <div className="stat bg-base-100 shadow">
          <div className="stat-figure text-success">
            <div className="avatar placeholder">
              <div className="bg-success text-success-content rounded-full w-16">
                <span className="text-3xl">💰</span>
              </div>
            </div>
          </div>
          <div className="stat-title">Ingresos</div>
          <div className="stat-value">${revenue}</div>
          <div className="stat-desc">Total acumulado</div>
        </div>

        <div className="stat bg-base-100 shadow">
          <div className="stat-figure text-info">
            <div className="avatar placeholder">
              <div className="bg-info text-info-content rounded-full w-16">
                <span className="text-3xl">📊</span>
              </div>
            </div>
          </div>
          <div className="stat-title">Prom. Pedido</div>
          <div className="stat-value">${avgOrderValue}</div>
          <div className="stat-desc">Valor promedio</div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Últimos Pedidos</h2>
          {recentOrders.length === 0 ? (
            <p className="text-center text-gray-500">No hay pedidos recientes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
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
                      <td>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="card-actions justify-end mt-4">
            <button className="btn btn-primary" onClick={() => navigate('/orders')}>Ver Todos</button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="btn btn-outline" onClick={() => navigate('/menu')}>
              📋 Gestionar Menú
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/orders')}>
              🛒 Ver Pedidos
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/config/messages')}>
              💬 Configurar Mensajes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}