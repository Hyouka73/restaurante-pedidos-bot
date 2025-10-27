import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Menu, ShoppingCart, MessageSquare, 
  Settings, LogOut, X, Store, ChevronRight, Bot,
  Settings2, ScreenShare, Power, Minimize, BadgePercent
} from 'lucide-react';
import { useAlert, AlertContainer } from '../components/ui/CustomAlert';
import Loader from '../components/ui/Loader';
import { useRestaurant } from '../context/RestaurantContext';
import { useBot } from '../context/BotContext';
import CustomTooltip from './ui/CustomTooltip';

// --- Sub-components ---

const StoreSwitch = ({ handleToggleStore, showLabel = true }) => {
  const { data: restaurant } = useRestaurant();
  const isOpen = restaurant?.availability?.status === 'open';
  const availabilityMode = restaurant?.availabilitySettings?.mode || 'hybrid';
  const isDisabled = availabilityMode === 'fixed' || availabilityMode === 'always_open';
  let tooltipContent = '';
  if (availabilityMode === 'fixed') tooltipContent = 'En modo "Horarios Fijos", la tienda abre y cierra automáticamente.';
  if (availabilityMode === 'always_open') tooltipContent = 'Tu tienda está en modo "Siempre Abierto" 24/7.';

  const switchComponent = (
    <div className="flex items-center">
      {showLabel && <span className="text-sm font-medium mr-2">Tienda</span>}
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={isOpen} onChange={handleToggleStore} className="sr-only peer" disabled={isDisabled} />
        <div className={`w-11 h-6 rounded-full peer peer-focus:ring-4 peer-focus:ring-orange-300 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isDisabled ? (isOpen ? 'bg-green-400' : 'bg-gray-300') : (isOpen ? 'bg-orange-500' : 'bg-gray-200')} ${!isDisabled && isOpen ? 'peer-checked:after:translate-x-full' : ''}`}></div>
      </label>
    </div>
  );

  return isDisabled ? <CustomTooltip content={tooltipContent}>{switchComponent}</CustomTooltip> : switchComponent;
};

const BotSwitch = ({ handleToggleBot, showLabel = true }) => {
  const { status: botStatus, loading: botLoading } = useBot();
  const { data: restaurant } = useRestaurant();
  const isRestaurantOpen = restaurant?.availability?.status === 'open';
  const isDisabled = botLoading || isRestaurantOpen;

  const switchComponent = (
    <div className="flex items-center">
      {showLabel && <span className="text-sm font-medium mr-2">Bot</span>}
      <label className={`relative inline-flex items-center ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <input 
          type="checkbox" 
          checked={botStatus?.enabled || false} 
          onChange={handleToggleBot} 
          disabled={isDisabled} 
          className="sr-only peer" 
        />
        <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-green-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${botStatus?.enabled ? (isRestaurantOpen ? 'bg-green-600/40' : 'bg-green-600') : 'bg-gray-200'}`}></div>
      </label>
    </div>
  );

  return isDisabled && isRestaurantOpen ? (
    <CustomTooltip content="No se puede apagar el bot mientras la tienda está abierta.">
      {switchComponent}
    </CustomTooltip>
  ) : switchComponent;
};

const DefaultLayout = ({ children, sidebarOpen, setSidebarOpen, handleLogout, handleToggleStore, handleToggleBot, isFullscreen, toggleFullscreen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: restaurant } = useRestaurant();
  const { status: botStatus } = useBot();
  const [user] = useAuthState(auth);
  const isOpen = restaurant?.availability?.status === 'open';
  const isOrdersView = isOpen && location.pathname === '/orders';

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/menu', label: 'Menú', icon: Menu },
    { path: '/discount-rules', label: 'Reglas de Descuento', icon: BadgePercent },
    { path: '/orders', label: 'Pedidos', icon: ShoppingCart },
    { type: 'divider', label: 'Configuración' },
    { path: '/config/messages', label: 'Mensajes Bot', icon: MessageSquare },
    { path: '/config/general', label: 'Configuración General', icon: Settings2 },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-red-100 flex flex-col lg:flex-row">
        {/* Unified Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg shadow-md">
            <div className="flex items-center justify-between p-3 sm:p-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                        <Menu size={24} />
                    </button>
                    {isOrdersView ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                                <ShoppingCart size={22} className="text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-gray-800 text-sm sm:text-base">Centro de Pedidos</h1>
                                <p className="text-xs text-green-500 font-semibold">Tienda Abierta</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                                <span className="text-xl">🍽️</span>
                            </div>
                            <div>
                                <h1 className="font-bold text-gray-800 text-sm">{restaurant?.info?.name || 'RestBot'}</h1>
                                <p className="text-xs text-gray-500">Admin Panel</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                    {isOrdersView && (
                        <CustomTooltip content={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}>
                            <button onClick={toggleFullscreen} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                                {isFullscreen ? <Minimize size={20} /> : <ScreenShare size={20} />}
                            </button>
                        </CustomTooltip>
                    )}
                    <CustomTooltip content="Cerrar Sesión">
                        <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                            <LogOut size={20} className="text-gray-600"/>
                        </button>
                    </CustomTooltip>
                </div>
            </div>
        </header>

        {/* Sidebar */}
        <AnimatePresence>
            {(sidebarOpen || window.innerWidth >= 1024) && (
            <>
                {sidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 lg:hidden" />}
                <motion.div key="sidebar" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25 }} className="fixed lg:sticky top-0 left-0 h-screen w-72 bg-white shadow-2xl z-50 flex flex-col">
                    <div className="p-6 border-b border-gray-100">
                        <button onClick={() => navigate('/')} className="flex items-center gap-3 mb-2 w-full text-left hover:opacity-80 transition-opacity">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg"><span className="text-2xl">🍽️</span></div>
                            <div className="flex-1 min-w-0">
                                <h2 className="font-bold text-gray-800 truncate">{restaurant?.info?.name || 'RestBot Admin'}</h2>
                                <p className="text-xs text-gray-500">Panel de Control</p>
                            </div>
                        </button>
                        {user && <div className="mt-3 p-3 bg-orange-50 rounded-xl"><p className="text-xs text-gray-600 mb-1">Usuario activo</p><p className="text-sm font-semibold text-gray-800 truncate">{user.displayName || user.email}</p></div>}
                    </div>
                    
                    <div className="p-4 space-y-2">
                        <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Controles</p>
                        <div className="flex items-center justify-between gap-3 p-3 bg-gray-100 rounded-xl">
                            <div className="flex items-center gap-3"><Store size={20} className={isOpen ? 'text-orange-500' : 'text-gray-400'} /> <span className="font-medium text-sm">Tienda</span></div>
                            <StoreSwitch handleToggleStore={handleToggleStore} showLabel={false} />
                        </div>
                        <div className="flex items-center justify-between gap-3 p-3 bg-gray-100 rounded-xl">
                            <div className="flex items-center gap-3"><Bot size={20} className={botStatus?.enabled ? (isOpen ? 'text-green-600/40' : 'text-green-600') : 'text-gray-400'} /> <span className="font-medium text-sm">Bot</span></div>
                            <BotSwitch handleToggleBot={handleToggleBot} showLabel={false} />
                        </div>
                    </div>

                    {!isOpen && (
                        <nav className="flex-1 p-4 overflow-y-auto">
                            <div className="space-y-1">
                                {menuItems.map((item, index) => {
                                    if (item.type === 'divider') return <div key={`divider-${index}`} className="pt-4 pb-2"><p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.label}</p></div>;
                                    const Icon = item.icon;
                                    const active = isActive(item.path);
                                    return (
                                        <motion.button key={item.path} onClick={() => { navigate(item.path); setSidebarOpen(false); }} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${active ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'}`}>
                                            <Icon size={20} />
                                            <span className="flex-1 text-left">{item.label}</span>
                                            {active && <ChevronRight size={16} />}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </nav>
                    )}
                    
                    {isOpen && <div className="flex-1"></div>}

                    <div className="p-4 border-t border-gray-100">
                        <motion.button onClick={handleLogout} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 font-medium transition-all duration-200">
                            <LogOut size={20} />
                            <span>Cerrar Sesión</span>
                        </motion.button>
                    </div>
                </motion.div>
            </>
            )}
        </AnimatePresence>
        <div className={`flex-1 flex flex-col min-w-0 overflow-x-hidden ${isOrdersView ? 'lg:ml-0' : ''}`}>
            {children}
        </div>
    </div>
  );
};


export default function Layout() {
  const [user, loadingAuth] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { alerts, showAlert, hideAlert } = useAlert();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const layoutRef = useRef(null);

  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const { data: restaurant, loading: loadingRestaurant, updateAvailability } = useRestaurant();
  const { status: botStatus, startBot, stopBot, refetch: refetchBotStatus } = useBot();

  const isOpen = restaurant?.availability?.status === 'open';

  useEffect(() => {
    if (loadingRestaurant || !restaurant || !user) return;

    if (restaurant.setupCompleted === false && location.pathname !== '/setup') {
      showAlert('Por favor completa la configuración inicial', 'warning', 3000);
      navigate('/setup', { replace: true });
    } else if (restaurant.setupCompleted === true && location.pathname === '/setup') {
      navigate('/', { replace: true });
    } else if (isOpen && location.pathname !== '/orders') {
      navigate('/orders', { replace: true });
    }
  }, [restaurant, loadingRestaurant, user, navigate, location.pathname, isOpen]);


  useEffect(() => {
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        if (user && isOpen) { 
          showAlert('Sesión cerrada por inactividad para proteger la operación.', 'warning', 5000);
          setTimeout(() => handleLogout(true), 1000); // Pass true to avoid confirmation
        }
      }, 30 * 60 * 1000); // 30 minutes
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user, isOpen]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isOpen) {
        e.preventDefault();
        e.returnValue = '¿Seguro que quieres salir? La tienda está abierta y dejarás de recibir pedidos.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen]);

  const handleLogout = useCallback((force = false) => {
    const logoutAction = async () => {
      try {
        await signOut(auth);
        showAlert('Sesión cerrada exitosamente', 'success', 2000);
        setTimeout(() => navigate('/login'), 500);
      } catch (error) {
        showAlert('Error al cerrar sesión', 'error', 3000);
        setModalState({ isOpen: false });
      }
    };

    if (force) {
      logoutAction();
      return;
    }

    setModalState({
      isOpen: true,
      title: 'Confirmar Cierre de Sesión',
      message: '¿Estás seguro de que deseas cerrar la sesión?',
      onConfirm: logoutAction
    });
  }, [navigate, showAlert, setModalState]);

  const isWithinSchedule = () => {
    if (!restaurant?.hours) return false;
    const now = new Date();
    const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const schedule = restaurant.hours[dayKey];
    if (!schedule || schedule.closed) return false;
    const currentTime = now.toTimeString().substring(0, 5);
    return currentTime >= schedule.open && currentTime < schedule.close;
  };

  const handleToggleStore = async () => {
    if (isOpen) {
      setModalState({
        isOpen: true,
        title: 'Confirmar Cierre de Tienda',
        message: '¿Estás seguro? Los clientes no podrán hacer nuevos pedidos y saldrás del modo de pantalla completa.',
        onConfirm: async () => {
          const result = await updateAvailability('closed', 'Cerrado manualmente');
          if (result.success) {
            showAlert('Tienda cerrada', 'success');
            if (document.fullscreenElement) document.exitFullscreen();
            navigate('/');
          } else showAlert(`Error: ${result.error}`, 'error');
          setModalState({ isOpen: false });
        }
      });
    } else {
      let modalConfig = {
        isOpen: true,
        title: 'Confirmar Apertura de Tienda',
        message: '¿Deseas abrir la tienda para empezar a recibir pedidos?',
        onConfirm: async () => {
          const result = await updateAvailability('open');
          if (result.success) {
            showAlert('¡Tienda abierta! Bienvenido al centro de pedidos.', 'success');
            refetchBotStatus(); 
            navigate('/orders');
          } else showAlert(`Error: ${result.error}`, 'error');
          setModalState({ isOpen: false });
        }
      };

      if (restaurant?.availabilitySettings?.mode === 'hybrid' && !isWithinSchedule()) {
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
        showAlert('Bot deshabilitado', 'success');
      } else {
        await startBot();
        showAlert('Bot habilitado', 'success');
      }
    } catch (err) {
      showAlert('Error al cambiar estado del bot: ' + err.message, 'error');
    }
  };

  const toggleFullscreen = () => {
    const element = layoutRef.current;
    if (!document.fullscreenElement) {
      if (element) {
        element.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  if (loadingAuth || loadingRestaurant) {
    return <Loader variant="full" message="Cargando dashboard..." fullScreen />;
  }
  if (!user) return null;

  const isOrdersView = isOpen && location.pathname === '/orders';

  return (
    <>
      <AlertContainer alerts={alerts} onClose={hideAlert} />
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-4">{modalState.title}</h3>
            <p className="text-gray-600 mb-6">{modalState.message}</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors" onClick={() => setModalState({ isOpen: false })}>Cancelar</button>
              <button className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors" onClick={modalState.onConfirm}>Confirmar</button>
            </div>
          </motion.div>
        </div>
      )}

      <div ref={layoutRef} className={`flex flex-col h-screen bg-gray-50 ${isOrdersView ? 'is-orders-view' : ''}`}>
        <DefaultLayout 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
          handleToggleStore={handleToggleStore}
          handleToggleBot={handleToggleBot}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
        >
            <main className={`flex-1 ${isOrdersView ? 'overflow-y-auto' : 'p-4 sm:p-6 lg:p-8'}`}>
                <motion.div key={location.pathname} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                    <Outlet />
                </motion.div>
            </main>
            {!isOrdersView && (
              <footer className="p-4 text-center text-sm text-gray-600 bg-white/50">
                  <p>© 2024 RestBot Admin. Todos los derechos reservados.</p>
              </footer>
            )}
        </DefaultLayout>
      </div>
    </>
  );
}