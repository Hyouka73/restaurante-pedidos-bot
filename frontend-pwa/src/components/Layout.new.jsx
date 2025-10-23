import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Menu, ShoppingCart, MessageSquare, 
  Settings, LogOut, X, Store, ChevronRight
} from 'lucide-react';
import { useAlert, AlertContainer } from '../components/ui/CustomAlert';
import { useRestaurant } from '../context/RestaurantContext';
import Loader from '../components/ui/Loader';
import { api } from '../services/api';

export default function Layout() {
  const [user, loadingAuth] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [restaurantData, setRestaurantData] = useState(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const { data: ctxData, refetch, openStore, closeStore } = useRestaurant();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { alerts, showAlert, hideAlert } = useAlert();
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState(null);

  // Sistema de timeout de sesión (15 minutos de inactividad)
  useEffect(() => {
    let inactivityTimer;
    
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        if (user) {
          showAlert('Sesión cerrada por inactividad', 'warning', 3000);
          setTimeout(() => {
            handleLogout();
          }, 1000);
        }
      }, 15 * 60 * 1000); // 15 minutos
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer(); // Iniciar el timer

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [user]);

  // Cargar datos del restaurante y verificar setup
  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (!user) {       
        setLoadingRestaurant(false);
        return;
      }

      try {
        console.log('[Layout] Cargando datos del restaurante...');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const restaurantId = userData.restaurantId;
          
          if (restaurantId) {
            const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
            
            if (restaurantDoc.exists()) {
              const data = restaurantDoc.data();
              setRestaurantData(data);
              console.log('[Layout] Datos del restaurante cargados:', data);

              // Mantener sincronía con RestaurantContext: refetch para que el contexto tenga los datos
              refetch();

              // Verificar si necesita completar el setup
              if (data.setupCompleted === false && location.pathname !== '/setup') {
                console.log('[Layout] Setup incompleto, redirigiendo a /setup');
                showAlert('Por favor completa la configuración inicial', 'warning', 3000);
                navigate('/setup', { replace: true });
                return;
              } else if (data.setupCompleted === true && location.pathname === '/setup') {
                console.log('[Layout] Setup completo, redirigiendo a dashboard');
                navigate('/', { replace: true });
                return;
              }
            } else {
              console.error(`[Layout] Documento de restaurante ${restaurantId} no encontrado.`);
            }
          } else {
            console.error(`[Layout] No se encontró restaurantId en el doc de usuario ${user.uid}.`);
          }
        } else {
          console.error(`[Layout] Documento de usuario ${user.uid} no encontrado.`);
        }
      } catch (error) {
        console.error("[Layout] Error obteniendo datos del restaurante:", error);
        showAlert('Error al cargar datos del restaurante', 'error', 3000);
      } finally {
        setLoadingRestaurant(false);
      }
    };

    fetchRestaurantData();
  }, [user, navigate, location.pathname]);

  // Bloquear navegación cuando la tienda está abierta (usando ctxData)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (ctxData?.availabilityComputed?.status === 'open' || ctxData?.availability?.status === 'open') {
        e.preventDefault();
        e.returnValue = '¿Seguro que quieres salir? La tienda está abierta.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [ctxData]);

  // Forzar pantalla completa en /orders cuando la tienda está abierta
  useEffect(() => {
    const isOpen = ctxData?.availabilityComputed?.status === 'open' || ctxData?.availability?.status === 'open';
    if (isOpen && location.pathname === '/orders') {
      const enterFullscreen = async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } catch (err) {
          console.error('Error al activar pantalla completa:', err);
        }
      };
      enterFullscreen();
    }
  }, [ctxData, location.pathname]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      showAlert('Sesión cerrada exitosamente', 'success', 2000);
      setTimeout(() => {
        navigate('/login');
      }, 500);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      showAlert('Error al cerrar sesión', 'error', 3000);
    }
  }, [navigate, showAlert]);

  const handleToggleStore = async () => {
    const isOpen = ctxData?.availabilityComputed?.status === 'open' || ctxData?.availability?.status === 'open';
    if (!isOpen) {
      try {
        const response = await api.get(`/config/${restaurantData.id}/today-schedule`);
        setTodaySchedule(response);
        setIsConfirmOpen(true);
      } catch (error) {
        showAlert('Error al obtener horario: ' + error.message, 'error', 3000);
      }
    } else {
      // Cerrar tienda via context
      try {
        await closeStore(restaurantData.id, 'Cerrado manualmente por el dueño');
        refetch();
        navigate('/');
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        showAlert('Tienda cerrada exitosamente', 'success', 3000);
      } catch (error) {
        showAlert('Error al cerrar tienda: ' + error.message, 'error', 3000);
      }
    }
  };

  const handleConfirmOpen = async () => {
    try {
      await openStore(restaurantData.id);
      refetch();
      setIsConfirmOpen(false);
      navigate('/orders');
      // Forzar pantalla completa
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.error('Error al activar pantalla completa:', err);
      }
      showAlert('Tienda abierta exitosamente', 'success', 3000);
    } catch (error) {
      showAlert('Error al abrir tienda: ' + error.message, 'error', 3000);
    }
  };

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/menu', label: 'Menú', icon: Menu },
    { path: '/orders', label: 'Pedidos', icon: ShoppingCart },
    { path: '/config/messages', label: 'Mensajes', icon: MessageSquare },
    { path: '/setup', label: 'Configuración', icon: Settings },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    // Ocultar el botón de Setup si ya está completo
    if (item.path === '/setup' && restaurantData?.setupCompleted) {
      return false;
    }
    // No mostrar el link a /orders cuando la tienda está abierta
    if (item.path === '/orders' && isStoreOpen) {
      return false;
    }
    return true;
  });

  // Mostrar loader mientras carga
  if (loadingAuth || (user && loadingRestaurant)) {
    return <Loader variant="full" message="Cargando dashboard..." fullScreen />;
  }

  // Si no hay usuario, no renderizar nada (App.jsx se encarga de redirigir)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffe4c4] via-[#ffd3c3] to-[#ffb8a1] flex flex-col lg:flex-row">
      <AlertContainer alerts={alerts} onClose={hideAlert} />

      {/* Modal de confirmación */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Confirmar Apertura</h3>
            <div className="space-y-4">
              <p>Horario de hoy ({todaySchedule?.dayName}):</p>
              {todaySchedule?.schedule?.closed ? (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg">
                  El local está configurado como cerrado hoy.
                </div>
              ) : (
                <div className="bg-green-100 text-green-700 p-3 rounded-lg">
                  Abierto: {todaySchedule?.schedule?.open} - {todaySchedule?.schedule?.close}
                </div>
              )}
              <p className="text-sm text-gray-600">
                Hora actual: {todaySchedule?.currentTime}
              </p>
              <p>¿Deseas abrir la tienda ahora?</p>
              <div className="flex justify-end gap-3">
                <button
                  className="btn btn-ghost"
                  onClick={() => setIsConfirmOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmOpen}
                  disabled={todaySchedule?.schedule?.closed}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header móvil */}
      <div className="lg:hidden sticky top-0 z-30 bg-white shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#ff7f50] to-[#ff6347] rounded-xl flex items-center justify-center">
              <span className="text-xl">🍽️</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-sm">
                {restaurantData?.info?.name || 'RestBot'}
              </h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Tienda</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStoreOpen}
                  onChange={handleToggleStore}
                  className="sr-only peer"
                  disabled={location.pathname === '/orders' && isStoreOpen}
                />
                <div className={`
                  w-11 h-6 bg-gray-200 rounded-full peer 
                  peer-focus:ring-4 peer-focus:ring-[#ff7f50]/20
                  dark:peer-focus:ring-[#ff7f50]/20 
                  peer-checked:after:translate-x-full 
                  peer-checked:after:border-white 
                  after:content-[''] 
                  after:absolute 
                  after:top-0.5 
                  after:left-[2px] 
                  after:bg-white 
                  after:border-gray-300 
                  after:border 
                  after:rounded-full 
                  after:h-5 
                  after:w-5 
                  after:transition-all
                  peer-checked:bg-[#ff7f50]
                `}></div>
              </label>
            </div>
            {!isStoreOpen && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || window.innerWidth >= 1024) && !isStoreOpen && (
          <>
            {/* Overlay móvil */}
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              />
            )}

            {/* Sidebar content */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed lg:sticky top-0 left-0 h-screen w-72 bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Header del sidebar */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#ff7f50] to-[#ff6347] rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl">🍽️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-800 truncate">
                      {restaurantData?.info?.name || 'RestBot Admin'}
                    </h2>
                    <p className="text-xs text-gray-500">Panel de Control</p>
                  </div>
                </div>
                {user && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-[#ffe4c4]/30 to-[#ffd3c3]/30 rounded-xl">
                    <p className="text-xs text-gray-600 mb-1">Usuario activo</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {user.displayName || user.email}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3 p-3 bg-gray-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Tienda</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isStoreOpen}
                        onChange={handleToggleStore}
                        className="sr-only peer"
                        disabled={location.pathname === '/orders' && isStoreOpen}
                      />
                      <div className={`
                        w-11 h-6 bg-gray-200 rounded-full peer 
                        peer-focus:ring-4 peer-focus:ring-[#ff7f50]/20
                        dark:peer-focus:ring-[#ff7f50]/20 
                        peer-checked:after:translate-x-full 
                        peer-checked:after:border-white 
                        after:content-[''] 
                        after:absolute 
                        after:top-0.5 
                        after:left-[2px] 
                        after:bg-white 
                        after:border-gray-300 
                        after:border 
                        after:rounded-full 
                        after:h-5 
                        after:w-5 
                        after:transition-all
                        peer-checked:bg-[#ff7f50]
                      `}></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Menú de navegación */}
              <nav className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-1">
                  {filteredMenuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    
                    return (
                      <motion.button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 rounded-xl
                          font-medium transition-all duration-200
                          ${active 
                            ? 'bg-gradient-to-r from-[#ff7f50] to-[#ff6347] text-white shadow-lg' 
                            : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                      >
                        <Icon size={20} />
                        <span className="flex-1 text-left">{item.label}</span>
                        {active && <ChevronRight size={16} />}
                      </motion.button>
                    );
                  })}
                </div>
              </nav>

              {/* Footer del sidebar */}
              <div className="p-4 border-t border-gray-100">
                <motion.button
                  onClick={handleLogout}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    text-red-600 hover:bg-red-50 font-medium
                    transition-all duration-200
                  "
                >
                  <LogOut size={20} />
                  <span>Cerrar Sesión</span>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>

        {/* Footer */}
        {!isStoreOpen && (
          <footer className="p-4 text-center text-sm text-gray-600 bg-white/50">
            <p>© 2024 RestBot Admin. Todos los derechos reservados.</p>
          </footer>
        )}
      </div>
    </div>
  );
}