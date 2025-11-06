import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext'; // Importar el nuevo hook
import api from '../services/api';

const RestaurantContext = createContext();

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant debe usarse dentro de RestaurantProvider');
  }
  return context;
};

export const RestaurantProvider = ({ children }) => {
  const { user, loading: loadingAuth } = useAuth(); // Usar el nuevo hook de autenticación
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const uid = user?.uid; // El objeto user ahora viene de AuthContext

  // ✅ Fetch simple - api.get ya maneja headers automáticamente
  const fetchRestaurant = useCallback(async () => {
    if (!uid) {
      console.log('[RestaurantContext] No user, skipping fetch');
      setData(null);
      setLoading(false);
      return;
    }

    console.log('[RestaurantContext] 🔵 Fetching restaurant data for user:', uid);
    setLoading(true);
    setError(null);

    try {
      // ✅ api.get ya incluye el token automáticamente
      const response = await api.get(`/config/${uid}/general`);

      console.log('[RestaurantContext] ✅ Datos recibidos:', response);
      setData(response);
      setError(null);
    } catch (err) {
      console.error('[RestaurantContext] ❌ Error:', err);
      setError(err.message || 'Error al cargar datos del restaurante');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  // Fetch cuando cambia el usuario
  useEffect(() => {
    console.log('[RestaurantContext] useEffect triggered. loadingAuth:', loadingAuth, 'uid:', uid);
    
    if (loadingAuth) {
      console.log('[RestaurantContext] Esperando autenticación...');
      return;
    }

    if (!uid) {
      console.log('[RestaurantContext] No hay usuario, limpiando datos');
      setData(null);
      setLoading(false);
      return;
    }

    console.log('[RestaurantContext] Usuario detectado, iniciando fetch');
    fetchRestaurant();
  }, [uid, loadingAuth, fetchRestaurant]);

  // Función para actualizar disponibilidad
  const updateAvailability = useCallback(async (status, reason = null) => {
    if (!user || !data?.id) {
      return { success: false, error: 'No hay usuario o restaurante' };
    }

    try {
      const payload = {
        availability: {
          status,
          reason,
          lastUpdated: new Date().toISOString()
        }
      };

      // ✅ api.put ya incluye el token automáticamente
      await api.put(`/config/${data.id}/general`, payload);

      // Actualizar estado local
      setData(prev => ({
        ...prev,
        availability: payload.availability
      }));

      console.log('✅ Disponibilidad actualizada');
      return { success: true };
    } catch (err) {
      console.error('❌ Error actualizando disponibilidad:', err);
      return { success: false, error: err.message };
    }
  }, [user, data?.id]);

  // Refetch manual
  const refetch = useCallback(() => {
    console.log('🔄 Refetch manual solicitado');
    return fetchRestaurant();
  }, [fetchRestaurant]);

  const value = {
    data,
    loading,
    error,
    updateAvailability,
    refetch
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
};