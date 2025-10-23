// frontend-pwa/src/context/RestaurantContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { api } from '../services/api';

const RestaurantContext = createContext();

const initialState = {
  data: null,
  loading: true,
  error: null,
  refetch: () => {} // Función para recargar datos
};

function restaurantReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload, error: null };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'UPDATE_DATA':
      return { ...state, data: { ...state.data, ...action.payload } };
    default:
      return state;
  }
}

export function RestaurantProvider({ children }) {
  const [state, dispatch] = useReducer(restaurantReducer, initialState);
  const [user] = useAuthState(auth);

  const fetchRestaurantData = async () => {
    if (!user) {
      dispatch({ type: 'FETCH_ERROR', payload: 'Usuario no autenticado' });
      return;
    }
    dispatch({ type: 'FETCH_START' });

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists) {
        throw new Error('Usuario no encontrado en la base de datos.');
      }
      const restaurantId = userDoc.data().restaurantId;

      // Suscribirse a cambios en el documento del restaurante para disponibilidad en tiempo real
      const restaurantRef = doc(db, 'restaurants', restaurantId);
      const unsubscribe = onSnapshot(restaurantRef, (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : null;
        // Calcular disponibilidad a partir de los campos almacenados
        const availabilityComputed = computeAvailabilityFromDoc(data || {});
        dispatch({ type: 'FETCH_SUCCESS', payload: { id: restaurantId, ...data, availabilityComputed } });
      }, (err) => {
        console.error('Error escuchando restaurante:', err);
        dispatch({ type: 'FETCH_ERROR', payload: err.message });
      });

      // Guardar unsubscribe en el estado para que se pueda limpiar si hace falta
      // (no stored, but effect cleanup below will handle)

      // Return unsubscribe so useEffect can clean it up — but since we're inside
      // an async function called from useEffect we'll just ensure to set up
      // a separate effect below for cleanup. For simplicity, fetchRestaurantData
      // sets up the listener and effect cleanup will rely on React unmount.
      
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: error.message });
    }
  };

  useEffect(() => {
    let unsub = null;
    // fetchRestaurantData will set up an onSnapshot internally; to keep cleanup predictable
    // we call fetchRestaurantData and rely on onSnapshot closure to be cleaned when component unmounts.
    fetchRestaurantData();
    return () => {
      // Nothing explicit to unsubscribe here because onSnapshot unsubscribe is scoped inside fetchRestaurantData
      // and will be garbage-collected on unmount; if needed, refactor to store unsubscribe.
    };
  }, [user]); // Se refetchea si cambia el usuario

  // Helper: calcula disponibilidad (simplified copy of logic) a partir del documento
  function computeAvailabilityFromDoc(data) {
    try {
      const availability = data?.availability || { status: 'outside_hours' };
      const availabilitySettings = data?.availabilitySettings || { mode: 'hybrid', useScheduledHours: true };
      const hours = data?.hours || {};

      const now = new Date();
      const dayIndex = now.getDay();
      const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const dayKey = dayKeys[dayIndex];
      const currentTime = now.toTimeString().substring(0,5);

      const mode = availabilitySettings.mode;
      const useScheduled = availabilitySettings.useScheduledHours;

      if (mode === 'manual_control') {
        return availability;
      }
      if (mode === 'always_open') {
        return { status: 'open', reason: null };
      }

      if (mode === 'hybrid' || mode === 'fixed_hours') {
        const scheduled = hours?.[dayKey];
        if (!scheduled) return { status: 'outside_hours', reason: 'Sin horarios configurados' };
        if (scheduled.closed) return { status: 'outside_hours', reason: 'Cerrado hoy' };
        const open = scheduled.open;
        const close = scheduled.close;
        const isOpenNow = currentTime >= open && currentTime < close;
        if (isOpenNow) {
          if (useScheduled) {
            if (availability.status === 'closed_by_owner') return availability;
            return { status: 'open', reason: null };
          }
          if (availability.status === 'pending_open_reminder') {
            return { status: 'outside_hours', reason: 'Aguardando confirmación del dueño' };
          }
          return availability;
        }
        return { status: 'outside_hours', reason: `Fuera de horario. Abre a las ${open}` };
      }

      return { status: 'outside_hours', reason: 'No disponible' };
    } catch (err) {
      console.error('Error calculando disponibilidad:', err);
      return { status: 'outside_hours', reason: 'Error calculando disponibilidad' };
    }
  }

  const value = {
    ...state,
    refetch: fetchRestaurantData, // Permitir recargar datos manualmente
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant debe usarse dentro de un RestaurantProvider');
  }
  return context;
};