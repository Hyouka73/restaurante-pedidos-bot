// frontend-pwa/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRestaurant } from '../context/RestaurantContext';
import api from '../services/api'; // <-- 1. Importar api
import { motion } from 'framer-motion';
import { 
  Store, ShoppingCart, Clock, DollarSign, TrendingUp, 
  Package, AlertCircle, ArrowRight, Sparkles
} from 'lucide-react';
import Loader from '../components/ui/Loader';
import SalesProjectionChart from '../components/SalesProjectionChart';

export default function Dashboard() {
  const { user, loading: loadingAuth } = useAuth();
  const navigate = useNavigate();
  const { data: restaurantData } = useRestaurant(); // <-- 2. Usar el contexto del restaurante
  const [loadingStats, setLoadingStats] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!restaurantData?.id) {
        return;
      }

      try {
        setLoadingStats(true);
        setError(null);
        const restaurantId = restaurantData.id;
        
        const response = await api.get(`/dashboard/${restaurantId}/stats`);
        
        if (response && response.metrics) {
          setMetrics(response.metrics);
          setRecentOrders(response.recentOrders || []);
        } else {
          throw new Error("La respuesta del servidor no tiene el formato esperado.");
        }

      } catch (err) {
        console.error("Error al cargar datos del dashboard:", err);
        setError(err.message);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchData();
  }, [user, restaurantData, navigate]); // <-- 5. Depender de restaurantData

  if (loadingAuth || (user && !restaurantData)) {
    return <Loader variant="dots" size="lg" message="Cargando dashboard..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#ffe4c4] via-[#ffd3c3] to-[#ffb8a1] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 text-red-500">
            <h1 className="text-2xl font-bold">Error al cargar el dashboard</h1>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div>Redirigiendo...</div>;
  }

  const { totalOrders, pendingOrders, revenue, avgOrderValue } = metrics || {};

  const statCards = metrics ? [
    {
      title: 'Pedidos Totales',
      value: totalOrders,
      desc: 'Desde que iniciaste',
      icon: ShoppingCart,
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
    },
    {
      title: 'Promedio Diario',
      value: (totalOrders / 30).toFixed(1),
      desc: 'Últimos 30 días',
      icon: Clock,
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-50 to-orange-50',
    },
    {
      title: 'Ingresos',
      value: `$${revenue.toFixed(2)}`,
      desc: 'Total acumulado',
      icon: DollarSign,
      gradient: 'from-emerald-500 to-green-600',
      bgGradient: 'from-emerald-50 to-green-50',
    },
    {
      title: 'Prom. Pedido',
      value: `$${avgOrderValue.toFixed(2)}`,
      desc: 'Valor promedio',
      icon: TrendingUp,
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 to-pink-50',
    },
  ] : [];

  const quickActions = [
    { label: 'Gestionar Menú', icon: Package, path: '/menu', color: 'from-blue-500 to-indigo-600' },
    { label: 'Configurar Mensajes', icon: Sparkles, path: '/config/messages', color: 'from-purple-500 to-pink-600' },
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pendiente', class: 'bg-amber-100 text-amber-700 border-amber-200' },
      confirmed: { label: 'Confirmado', class: 'bg-blue-100 text-blue-700 border-blue-200' },
      preparing: { label: 'Preparando', class: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
      ready: { label: 'Listo', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      delivered: { label: 'Entregado', class: 'bg-gray-100 text-gray-700 border-gray-200' },
      cancelled: { label: 'Cancelado', class: 'bg-red-100 text-red-700 border-red-200' },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.class}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffe4c4] via-[#ffd3c3] to-[#ffb8a1] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-6 sm:p-8"
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
                ¡Bienvenido! 👋
              </h1>
              <p className="text-gray-600 text-lg">
                {user?.displayName || user?.email}
              </p>
              <p className="text-[#ff7f50] font-semibold mt-1 flex items-center gap-2">
                <Store size={18} />
                {restaurantData?.info?.name || 'Restaurante no configurado'}
              </p>
            </div>
            
            {!restaurantData?.setupCompleted && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 max-w-md"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-amber-600 flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="font-bold text-amber-800 mb-1">
                      ¡Configuración Pendiente!
                    </h3>
                    <p className="text-sm text-amber-700 mb-3">
                      Completa la configuración inicial para comenzar a recibir pedidos.
                    </p>
                    <button
                      onClick={() => navigate('/setup')}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      Completar Ahora
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-gradient-to-br ${stat.bgGradient} rounded-2xl shadow-lg p-6 border-2 border-white/50`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="text-white" size={24} />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-600 mb-1">
                  {stat.title}
                </h3>
                <p className="text-3xl font-bold text-gray-800 mb-1">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500">
                  {stat.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-3xl shadow-xl p-6 sm:p-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Sparkles className="text-[#ff7f50]" size={28} />
            Acciones Rápidas
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.path}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(action.path)}
                  className={`
                    p-6 rounded-2xl bg-gradient-to-br ${action.color}
                    text-white font-semibold shadow-lg hover:shadow-xl
                    transition-all duration-300
                    flex flex-col items-center gap-3
                  `}
                >
                  <Icon size={32} />
                  <span>{action.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-3xl shadow-xl p-6 sm:p-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp className="text-[#ff7f50]" size={28} />
            Proyección de Ventas
          </h2>
          <SalesProjectionChart />
        </motion.div>
      </div>
    </div>
  );
}
