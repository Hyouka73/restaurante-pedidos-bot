// frontend-pwa/src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ConfigMessages from './pages/ConfigMessages';
import SetupWizard from './pages/SetupWizard';
import MenuManager from './pages/MenuManager';
import OrdersManager from './pages/OrdersManager';
import Loader from './components/ui/Loader';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
          <Route path="menu" element={<MenuManager />} />
          <Route path="orders" element={<OrdersManager />} />
        </Route>

        {/* Ruta 404 - Redirigir al inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;