import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ConfigMessages from './pages/ConfigMessages';
import SetupWizard from './pages/SetupWizard';
import MenuManager from './pages/MenuManager';
import OrdersManager from './pages/OrdersManager';

// Componente para verificar setup y redirigir
function RequireSetup({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const restaurantId = userDoc.data().restaurantId;
            const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
            if (restaurantDoc.exists()) {
              const setupCompleted = restaurantDoc.data().setupCompleted;
              if (!setupCompleted) {
                // Si está en cualquier ruta que no sea /setup, redirigir
                if (location.pathname !== '/setup') {
                  setNeedsSetup(true);
                  navigate('/setup');
                } else {
                  setNeedsSetup(true); // Aún necesita setup, pero está en la ruta correcta
                }
              } else {
                // Si setup está completo y está en /setup, redirigir al dashboard
                if (location.pathname === '/setup') {
                  navigate('/');
                }
              }
            }
          }
        } catch (error) {
          console.error("Error verificando setup:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate, location]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (needsSetup && location.pathname !== '/setup') {
    // Si necesita setup pero no está en la ruta de setup, redirigir (esto se maneja en el useEffect)
    return null; // El Navigate en el useEffect ya se encarga de la redirección
  }

  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Navigate to="/" />} />
        <Route path="/setup" element={
          user ? (
            <RequireSetup>
              <SetupWizard />
            </RequireSetup>
          ) : <Navigate to="/login" />
        } />
        <Route path="/" element={
          user ? (
            <RequireSetup>
              <Layout />
            </RequireSetup>
          ) : <Navigate to="/login" />
        }>
          <Route index element={<Dashboard />} />
          <Route path="config/messages" element={<ConfigMessages />} />
          <Route path="menu" element={<MenuManager />} />
          <Route path="orders" element={<OrdersManager />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;