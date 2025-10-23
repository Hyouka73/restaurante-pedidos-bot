// frontend-pwa/src/context/BotContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { api } from '../services/api';

const BotContext = createContext();

export function BotProvider({ children, showAlert }) {
  const [user] = useAuthState(auth);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const restaurantId = userDoc.data().restaurantId;
      const status = await api.get(`/bot/${restaurantId}/status`);
      setStatus(status);
      setError(null);
    } catch (err) {
      console.error('Error obteniendo estado del bot:', err);
      const msg = err?.message || 'Error desconocido al obtener estado del bot';
      setError(msg);
      // Mostrar alerta si la función fue pasada
      if (typeof showAlert === 'function') showAlert(msg, 'error', 4000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStatus();
      // Actualizar cada 30 segundos
      const interval = setInterval(fetchStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const startBot = async () => {
    if (!user) return { success: false, error: 'Usuario no autenticado' };
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const restaurantId = userDoc.data().restaurantId;
      await api.post(`/bot/${restaurantId}/start`);
      await fetchStatus(); // Actualizar estado
      return { success: true };
    } catch (err) {
      const msg = err?.message || 'Error desconocido al iniciar el bot';
      setError(msg);
      if (typeof showAlert === 'function') showAlert(msg, 'error', 4000);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const stopBot = async () => {
    if (!user) return { success: false, error: 'Usuario no autenticado' };
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const restaurantId = userDoc.data().restaurantId;
      await api.post(`/bot/${restaurantId}/stop`);
      await fetchStatus(); // Actualizar estado
      return { success: true };
    } catch (err) {
      const msg = err?.message || 'Error desconocido al detener el bot';
      setError(msg);
      if (typeof showAlert === 'function') showAlert(msg, 'error', 4000);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    status,
    loading,
    error,
    startBot,
    stopBot,
    refetch: fetchStatus
  };

  return (
    <BotContext.Provider value={value}>
      {children}
    </BotContext.Provider>
  );
}

export const useBot = () => {
  const context = useContext(BotContext);
  if (!context) {
    throw new Error('useBot debe usarse dentro de un BotProvider');
  }
  return context;
};