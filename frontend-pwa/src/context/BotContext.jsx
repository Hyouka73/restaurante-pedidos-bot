import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const BotContext = createContext();

export const useBot = () => {
  const context = useContext(BotContext);
  if (!context) {
    throw new Error('useBot debe usarse dentro de BotProvider');
  }
  return context;
};

export const BotProvider = ({ children }) => {
  const { user, loading: loadingAuth } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Fetch simple - api.get ya maneja headers automáticamente
  const fetchBotStatus = useCallback(async () => {
    if (!user) {
      console.log('[BotContext] No user, skipping fetch');
      setStatus(null);
      setLoading(false);
      return;
    }

    console.log('[BotContext] 🔵 Fetching bot status for user:', user.uid);
    setLoading(true);
    setError(null);

    try {
      // ✅ api.get ya incluye el token automáticamente
      const response = await api.get(`/bot/${user.uid}/status`);

      console.log('[BotContext] ✅ Status recibido:', response);
      setStatus(response);
      setError(null);
    } catch (err) {
      console.error('[BotContext] ❌ Error:', err);
      setError(err.message || 'Error al cargar estado del bot');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch cuando cambia el usuario
  useEffect(() => {
    console.log('[BotContext] useEffect triggered. loadingAuth:', loadingAuth, 'user:', user?.uid);
    
    if (loadingAuth) {
      console.log('[BotContext] Esperando autenticación...');
      return;
    }

    if (!user) {
      console.log('[BotContext] No hay usuario, limpiando datos');
      setStatus(null);
      setLoading(false);
      return;
    }

    console.log('[BotContext] Usuario detectado, iniciando fetch');
    fetchBotStatus();
  }, [user, loadingAuth, fetchBotStatus]);

  // Iniciar bot
  const startBot = useCallback(async () => {
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    try {
      // ✅ api.post ya incluye el token automáticamente
      const response = await api.post(`/bot/${user.uid}/start`, {});

      // Actualizar estado local
      setStatus(prev => ({
        ...prev,
        enabled: true,
        lastUpdated: new Date().toISOString()
      }));

      console.log('✅ Bot iniciado');
      return response;
    } catch (err) {
      console.error('❌ Error al iniciar bot:', err);
      throw err;
    }
  }, [user]);

  // Detener bot
  const stopBot = useCallback(async () => {
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    try {
      // ✅ api.post ya incluye el token automáticamente
      const response = await api.post(`/bot/${user.uid}/stop`, {});

      // Actualizar estado local
      setStatus(prev => ({
        ...prev,
        enabled: false,
        lastUpdated: new Date().toISOString()
      }));

      console.log('✅ Bot detenido');
      return response;
    } catch (err) {
      console.error('❌ Error al detener bot:', err);
      throw err;
    }
  }, [user]);

  // Refetch manual
  const refetch = useCallback(() => {
    console.log('🔄 Refetch manual solicitado');
    return fetchBotStatus();
  }, [fetchBotStatus]);

  const value = {
    status,
    loading,
    error,
    startBot,
    stopBot,
    refetch
  };

  return (
    <BotContext.Provider value={value}>
      {children}
    </BotContext.Provider>
  );
};