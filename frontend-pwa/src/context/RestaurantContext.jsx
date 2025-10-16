// frontend-pwa/src/context/RestaurantContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
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

      // Obtener la configuración general del restaurante
      const data = await api.get(`/config/${restaurantId}/general`);
      dispatch({ type: 'FETCH_SUCCESS', payload: { id: restaurantId, ...data } });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: error.message });
    }
  };

  useEffect(() => {
    fetchRestaurantData();
  }, [user]); // Se refetchea si cambia el usuario

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