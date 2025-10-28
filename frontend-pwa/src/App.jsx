// frontend-pwa/src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import { BotProvider } from './context/BotContext';
import { useAlert, AlertContainer } from './components/ui/CustomAlert';
import { configureAlerts } from './services/api';
import ConfigMessages from './pages/ConfigMessages';
import ConfigGeneral from './pages/ConfigGeneral';
import SetupWizard from './pages/SetupWizard';
import Menu from './pages/Menu';
import OrdersManager from './pages/OrdersManager';
import DiscountRules from './pages/DiscountRules';
import Loader from './components/ui/Loader';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mover useAlert aquí para que los hooks se llamen en el mismo orden en cada render
  const { alerts, showAlert, hideAlert } = useAlert();
  // Configurar de forma sincrónica alertFunction para que esté disponible
  // antes de que los providers/efectos hijos (p. ej. BotProvider) se ejecuten.
  configureAlerts(showAlert);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('[App] Estado de autenticación:', user ? 'Autenticado' : 'No autenticado');
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <Loader variant="full" message="Cargando aplicación..." fullScreen />;
  }

  return (
    <>
      <AlertContainer alerts={alerts} onClose={hideAlert} />
      <BotProvider showAlert={showAlert}>
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
          <Route path="discount-rules" element={<DiscountRules />} /> {/* Asegúrate de que este componente exista */}
          <Route path="orders" element={<OrdersManager />} />
        </Route>

        {/* Ruta 404 - Redirigir al inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </BotProvider>
    </>
  );
}

export default App;