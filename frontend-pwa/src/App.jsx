import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AlertContainer, useAlert } from './components/ui/CustomAlert';
import { configureAlerts } from './services/api';
import ConfigMessages from './pages/ConfigMessages';
import ConfigGeneral from './pages/ConfigGeneral';
import SetupWizard from './pages/SetupWizard';
import Menu from './pages/Menu';
import OrdersManager from './pages/OrdersManager';
import DiscountRules from './pages/DiscountRules';
import Dashboard from './pages/Dashboard';
import { useEffect } from 'react';

function App() {
  const { alerts, showAlert, hideAlert } = useAlert();

  useEffect(() => {
    configureAlerts(showAlert);
  }, [showAlert]);

  return (
    <>
      <AlertContainer alerts={alerts} onClose={hideAlert} />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<ProtectedRoute><SetupWizard /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="config/messages" element={<ConfigMessages />} />
              <Route path="config/general" element={<ConfigGeneral />} />
              <Route path="menu" element={<Menu />} />
              <Route path="discount-rules" element={<DiscountRules />} />
              <Route path="orders-manager" element={<OrdersManager />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </>
  );
}

export default App;