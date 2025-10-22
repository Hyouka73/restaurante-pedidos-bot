// frontend-pwa/src/components/Layout.jsx
import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function Layout() {
  const [user, loadingAuth] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [restaurantData, setRestaurantData] = useState(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (!user) {       
        setLoadingRestaurant(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const restaurantId = userData.restaurantId;
          if (restaurantId) {
            const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
            if (restaurantDoc.exists()) {
              const data = restaurantDoc.data();
              setRestaurantData(data);

              // --- VERIFICACIÓN CRÍTICA Y REDIRECCIÓN ---
              // Esta lógica se ejecuta inmediatamente después de cargar los datos
              if (data.setupCompleted === false && location.pathname !== '/setup') {
                // Usamos navigate con { replace: true } para evitar historial roto
                navigate('/setup', { replace: true });
                // Retornamos para evitar que el resto del useEffect se ejecute
                // y que el componente intente renderizar el Outlet o Dashboard
                return;
              } else if (data.setupCompleted === true && location.pathname === '/setup') {
                 navigate('/', { replace: true });
                 return;
              }
              // Si setupCompleted es true y no estamos en /setup, continuamos normalmente
              // --------------------------------------------
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
      } finally {
        setLoadingRestaurant(false);
      }
    };

    fetchRestaurantData();
  }, [user, navigate, location]); // Dependencias críticas

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/menu', label: 'Menú', icon: '📋' },
    { path: '/orders', label: 'Pedidos', icon: '🛒' },
    { path: '/config/messages', label: 'Mensajes', icon: '💬' },
    { path: '/setup', label: 'Configurar', icon: '⚙️' },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (item.path === '/setup' && restaurantData?.setupCompleted) {
      return false;
    }
    return true;
  });

  // Mostrar un spinner si está cargando autenticación O restaurantData (y hay un usuario)
  if (loadingAuth || (user && loadingRestaurant)) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Si no hay usuario (después de cargar), redirigir al login
  if (!user) {
    return <div>Redirigiendo...</div>; // O manejar con ProtectedRoute
  }

  // El resto del JSX del Layout va aquí
  return (
    <div className="min-h-screen bg-base-100 flex flex-col lg:flex-row">
      {/* Botón para abrir el sidebar en móvil */}
      <div className="lg:hidden navbar bg-base-300 sticky top-0 z-10">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl" onClick={() => navigate('/')}>
            {restaurantData?.info?.name || 'RestBot Admin'}
          </a>
        </div>
        <div className="flex-none">
          <button
            className="btn btn-square btn-ghost"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar - Se oculta en móvil a menos que esté abierto, y es fijo en escritorio */}
      <div className={`fixed lg:static inset-y-0 left-0 z-20 w-64 bg-base-200 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        {/* Contenido del sidebar */}
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center justify-center mb-5 px-4">
            <span className="text-xl font-bold">{restaurantData?.info?.name || 'RestBot'}</span>
          </div>
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {filteredMenuItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive(item.path)
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                  setSidebarOpen(false); // Cierra el sidebar en móvil después de hacer clic
                }}
              >
                <span className="mr-3">{item.icon}</span> {item.label}
              </a>
            ))}
            <a
              onClick={handleLogout}
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
            >
              <span className="mr-3">🚪</span> Salir
            </a>
          </nav>
        </div>
      </div>

      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pb-8">
          <div className="px-4 sm:px-6 lg:px-8">
            {/* Outlet renderiza Dashboard o cualquier otra página hija de / */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}