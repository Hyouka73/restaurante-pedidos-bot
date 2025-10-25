import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../config/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore'; // Importar getDoc
import { api } from '../services/api';

const RestaurantContext = createContext();

const initialState = {
  data: null,
  loading: true,
  error: null,
};

function restaurantReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload, error: null };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

export function RestaurantProvider({ children }) {
  const [state, dispatch] = useReducer(restaurantReducer, initialState);
  const [user] = useAuthState(auth);

  const fetchRestaurantData = useCallback(async (userId) => {
    dispatch({ type: 'FETCH_START' });
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef); // Usar getDoc de firebase

      if (!userDoc.exists()) {
        throw new Error('Usuario no encontrado en la base de datos.');
      }
      const restaurantId = userDoc.data().restaurantId;
      if (!restaurantId) {
        throw new Error('ID de restaurante no encontrado para este usuario.');
      }

      const restaurantRef = doc(db, 'restaurants', restaurantId);
      const unsubscribe = onSnapshot(restaurantRef, (snapshot) => {
        const data = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      }, (err) => {
        console.error('Error escuchando cambios del restaurante:', err);
        dispatch({ type: 'FETCH_ERROR', payload: err.message });
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error en fetchRestaurantData:", error);
      dispatch({ type: 'FETCH_ERROR', payload: error.message });
    }
  }, []);

  useEffect(() => {
    let unsubscribePromise;
    if (user?.uid) {
      unsubscribePromise = fetchRestaurantData(user.uid);
    }
    return () => {
      if (unsubscribePromise) {
        unsubscribePromise.then(unsub => unsub && unsub());
      }
    };
  }, [user, fetchRestaurantData]);

  const updateAvailability = async (status, reason = null) => {
    if (!state.data?.id) throw new Error("ID de restaurante no disponible.");
    try {
      await api.put(`/config/${state.data.id}/availability`, { status, reason });
      // onSnapshot se encargará de actualizar el estado automáticamente
      return { success: true };
    } catch (err) {
      console.error("Error al actualizar la disponibilidad:", err);
      return { success: false, error: err.message };
    }
  };

  const value = {
    ...state,
    updateAvailability,
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