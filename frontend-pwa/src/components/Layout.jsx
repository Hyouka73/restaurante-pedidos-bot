
import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Menu, ShoppingCart, MessageSquare, 
  Settings, LogOut, X, Store, ChevronRight, Bot,
  Settings2
} from 'lucide-react';
import { useAlert, AlertContainer } from '../components/ui/CustomAlert';
import Loader from '../components/ui/Loader';
import { useRestaurant } from '../context/RestaurantContext';
import { useBot } from '../context/BotContext';
import CustomTooltip from './ui/CustomTooltip';

export default function Layout() {
  const [user, loadingAuth] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { alerts, showAlert, hideAlert } = useAlert();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const { data: restaurant, loading: loadingRestaurant, updateAvailability } = useRestaurant();
  const { status: botStatus, startBot, stopBot, loading: botLoading } = useBot();

  const availabilityMode = restaurant?.availabilitySettings?.mode || 'hybrid';
  const availabilityStatus = restaurant?.availability?.status;
  const hours = restaurant?.hours;
  const isOpen = availabilityStatus === 'open';

  useEffect(() => {
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        if (user) {
          showAlert('Sesión cerrada por inactividad', 'warning', 3000);
          setTimeout(() => handleLogout(), 1000);
        }
      }, 15 * 60 * 1000);
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (loadingRestaurant || !restaurant) return;

    if (restaurant.setupCompleted === false && location.pathname !== '/setup') {
      showAlert('Por favor completa la configuración inicial', 'warning', 3000);
      navigate('/setup', { replace: true });
    } else if (restaurant.setupCompleted === true && location.pathname === '/setup') {
      navigate('/', { replace: true });
    }
  }, [restaurant, loadingRestaurant, user, navigate, location.pathname]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isOpen) {
        e.preventDefault();
        e.returnValue = '¿Seguro que quieres salir? La tienda está abierta.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && location.pathname === '/orders') {
      const enterFullscreen = async () => {
        try {
          if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        } catch (err) {
          console.error('Error al activar pantalla completa:', err);
        }
      };
      enterFullscreen();
    }
  }, [isOpen, location.pathname]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      showAlert('Sesión cerrada exitosamente', 'success', 2000);
      setTimeout(() => navigate('/login'), 500);
    } catch (error) {
      showAlert('Error al cerrar sesión', 'error', 3000);
    }
  }, [navigate, showAlert]);

  const isWithinSchedule = () => {
    if (!hours) return false;
    const now = new Date();
    const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const schedule = hours[dayKey];
    if (!schedule || schedule.closed) return false;
    const currentTime = now.toTimeString().substring(0, 5);
    return currentTime >= schedule.open && currentTime < schedule.close;
  };

  const handleToggleStore = async () => {
    if (isOpen) {
      setModalState({
        isOpen: true,
        title: 'Confirmar Cierre',
        message: '¿Estás seguro de que quieres cerrar la tienda? Los clientes no podrán hacer nuevos pedidos.',
        onConfirm: async () => {
          const result = await updateAvailability('closed', 'Cerrado manualmente');
          if (result.success) {
            showAlert('Tienda cerrada exitosamente', 'success');
            if (document.fullscreenElement) document.exitFullscreen();
            navigate('/');
          } else showAlert(`Error: ${result.error}`, 'error');
          setModalState({ isOpen: false });
        }
      });
    } else {
      let modalConfig = {
        isOpen: true,
        title: 'Confirmar Apertura',
        message: '¿Deseas abrir la tienda ahora para empezar a recibir pedidos?',
        onConfirm: async () => {
          const result = await updateAvailability('open');
          if (result.success) {
            showAlert('¡Tienda abierta!', 'success');
            navigate('/orders');
          } else showAlert(`Error: ${result.error}`, 'error');
          setModalState({ isOpen: false });
        }
      };

      if (availabilityMode === 'hybrid' && !isWithinSchedule()) {
        modalConfig.title = 'Abrir Fuera de Horario';
        modalConfig.message = 'Estás fuera del horario de atención programado. ¿Realmente deseas abrir la tienda ahora?';
      }
      
      setModalState(modalConfig);
    }
  };

  const handleToggleBot = async () => {
    try {
      if (botStatus?.enabled) {
        await stopBot();
        showAlert('Bot deshabilitado correctamente', 'success', 3000);
      } else {
        await startBot();
        showAlert('Bot habilitado correctamente', 'success', 3000);
      }
    } catch (err) {
      showAlert('Error al cambiar estado del bot: ' + err.message, 'error', 5000);
    }
  };

  if (loadingAuth || loadingRestaurant) {
    return <Loader variant="full" message="Cargando dashboard..." fullScreen />;
  }
  if (!user) return null;

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/menu', label: 'Menú', icon: Menu },
    { path: '/orders', label: 'Pedidos', icon: ShoppingCart },
    { type: 'divider', label: 'Configuración' },
    { path: '/config/messages', label: 'Mensajes Bot', icon: MessageSquare },
    { path: '/config/general', label: 'Configuración General', icon: Settings2 },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (item.path === '/setup' && restaurant?.setupCompleted) return false;
    if (item.path === '/orders' && isOpen) return false;
    return true;
  });
  
  const isActive = (path) => location.pathname === path;

  const StoreSwitch = () => {
    const isDisabled = availabilityMode === 'fixed' || availabilityMode === 'always_open';
    let tooltipContent = '';
    if (availabilityMode === 'fixed') tooltipContent = 'En modo "Horarios Fijos", la tienda abre y cierra automáticamente.';
    if (availabilityMode === 'always_open') tooltipContent = 'Tu tienda está en modo "Siempre Abierto" 24/7.';

    const switchComponent = (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Tienda</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isOpen}
            onChange={handleToggleStore}
            className="sr-only peer"
            disabled={isDisabled}
          />
          <div className={`
            w-11 h-6 rounded-full peer 
            peer-focus:ring-4 peer-focus:ring-[#ff7f50]/20
            after:content-[''] after:absolute after:top-0.5 after:left-[2px] 
            after:bg-white after:border-gray-300 after:border after:rounded-full 
            after:h-5 after:w-5 after:transition-all
            ${isDisabled 
              ? (isOpen ? 'bg-green-400' : 'bg-gray-300')
              : (isOpen ? 'bg-[#ff7f50]' : 'bg-gray-200')
            }
            ${!isDisabled && isOpen ? 'peer-checked:after:translate-x-full' : ''}
          `}></div>
        </label>
      </div>
    );

    return isDisabled ? (
      <CustomTooltip content={tooltipContent}>
        {switchComponent}
      </CustomTooltip>
    ) : switchComponent;
  };

  const BotSwitch = () => (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Bot</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={botStatus?.enabled || false}
          onChange={handleToggleBot}
          disabled={botLoading}
          className="sr-only peer"
        />
        <div className={`
          w-11 h-6 bg-gray-200 rounded-full peer
          peer-focus:ring-4 peer-focus:ring-green-300
          peer-checked:after:translate-x-full
          peer-checked:after:border-white
          after:content-[''] after:absolute after:top-0.5 after:left-[2px] 
          after:bg-white after:border-gray-300 after:border after:rounded-full 
          after:h-5 after:w-5 after:transition-all
          ${botStatus?.enabled ? 'bg-green-600' : 'bg-gray-200'}
        `}></div>
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffe4c4] via-[#ffd3c3] to-[#ffb8a1] flex flex-col lg:flex-row">
      <AlertContainer alerts={alerts} onClose={hideAlert} />

      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
          >
            <h3 className="text-xl font-bold mb-4">{modalState.title}</h3>
            <p className="text-gray-600 mb-6">{modalState.message}</p>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-ghost"
                onClick={() => setModalState({ isOpen: false })}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={modalState.onConfirm}
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="lg:hidden sticky top-0 z-30 bg-white shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#ff7f50] to-[#ff6347] rounded-xl flex items-center justify-center">
              <span className="text-xl">🍽️</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-sm">
                {restaurant?.info?.name || 'RestBot'}
              </h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StoreSwitch />
            <BotSwitch />
            {!isOpen && (
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

      <AnimatePresence>
        {(sidebarOpen || window.innerWidth >= 1024) && !isOpen && (
          <>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              />
            )}

            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed lg:sticky top-0 left-0 h-screen w-72 bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-gray-100">
                <button 
                  onClick={() => navigate('/')}
                  className="flex items-center gap-3 mb-2 w-full text-left hover:opacity-80 transition-opacity"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-[#ff7f50] to-[#ff6347] rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl">🍽️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-800 truncate">
                      {restaurant?.info?.name || 'RestBot Admin'}
                    </h2>
                    <p className="text-xs text-gray-500">Panel de Control</p>
                  </div>
                </button>
                {user && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-[#ffe4c4]/30 to-[#ffd3c3]/30 rounded-xl">
                    <p className="text-xs text-gray-600 mb-1">Usuario activo</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {user.displayName || user.email}
                    </p>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl">
                    <Store size={20} className={isOpen ? 'text-[#ff7f50]' : 'text-gray-400'} />
                    <StoreSwitch />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl">
                    <Bot size={20} className={botStatus?.enabled ? 'text-green-600' : 'text-gray-400'} />
                    <BotSwitch />
                  </div>
                </div>
              </div>

              <nav className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-1">
                  {filteredMenuItems.map((item, index) => {
                    if (item.type === 'divider') {
                      return (
                        <div key={`divider-${index}`} className="pt-4 pb-2">
                          <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {item.label}
                          </p>
                        </div>
                      );
                    }

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

        {!isOpen && (
          <footer className="p-4 text-center text-sm text-gray-600 bg-white/50">
            <p>© 2024 RestBot Admin. Todos los derechos reservados.</p>
          </footer>
        )}
      </div>
    </div>
  );
}
