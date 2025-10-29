// ============================================
// App.jsx - Versión Optimizada
// ============================================
import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import Login from './components/Login';
import Layout from './components/Layout';
import { useAlert, AlertContainer } from './components/ui/CustomAlert';
import { configureAlerts } from './services/api';
import ConfigMessages from './pages/ConfigMessages';
import ConfigGeneral from './pages/ConfigGeneral';
import SetupWizard from './pages/SetupWizard';
import Menu from './pages/Menu';
import OrdersManager from './pages/OrdersManager';
import DiscountRules from './pages/DiscountRules';
import Dashboard from './pages/Dashboard';
import Loader from './components/ui/Loader';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { alerts, showAlert, hideAlert } = useAlert();

  // ✅ Configurar alertas solo una vez
  useEffect(() => {
    configureAlerts(showAlert);
  }, []); // ✅ Array vacío - solo se ejecuta al montar

  // ✅ Listener de autenticación - solo se ejecuta al montar
  useEffect(() => {
    console.log('[App] Configurando listener de autenticación');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('[App] Estado de autenticación:', user ? `Autenticado (${user.uid})` : 'No autenticado');
      setUser(user);
      setLoading(false);
    });

    return () => {
      console.log('[App] Limpiando listener de autenticación');
      unsubscribe();
    };
  }, []); // ✅ Array vacío - solo se ejecuta al montar

  // ✅ Memoizar el estado de loading para evitar re-renders innecesarios
  const isLoading = useMemo(() => loading, [loading]);

  if (isLoading) {
    return <Loader variant="full" message="Cargando aplicación..." fullScreen />;
  }

  return (
    <>
      <AlertContainer alerts={alerts} onClose={hideAlert} />
      <Router>
        <Routes>
          {/* Ruta de Login */}
          <Route 
            path="/login"  
            element={!user ? <Login /> : <Navigate to="/" replace />} 
          />

          {/* Ruta de Setup - Independiente del Layout */}
          <Route 
            path="/setup" 
            element={user ? <SetupWizard /> : <Navigate to="/login" replace />} 
          />

          {/* Rutas protegidas con Layout */}
          <Route 
            path="/" 
            element={user ? <Layout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<Dashboard />} />
            <Route path="config/messages" element={<ConfigMessages />} />
            <Route path="config/general" element={<ConfigGeneral />} />
            <Route path="menu" element={<Menu />} />
            <Route path="discount-rules" element={<DiscountRules />} />
            <Route path="orders" element={<OrdersManager />} />
          </Route>

          {/* Ruta 404 - Redirigir al inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;