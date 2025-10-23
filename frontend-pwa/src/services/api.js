// frontend-pwa/src/services/api.js
import { getAuth, getIdToken } from 'firebase/auth'; // Importar getIdToken

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Función para incluir el token de autenticación de Firebase
const getAuthHeaders = async () => {
  const auth = getAuth(); // Obtener instancia de auth
  const user = auth.currentUser; // Obtener el usuario actual

  if (!user) {
    console.warn("No hay usuario autenticado para obtener token.");
    // Si no hay usuario, devolver headers sin token
    return {
      'Content-Type': 'application/json',
    };
  }

  try {
    // getIdToken() refresca el token si es necesario
    const token = await getIdToken(user);
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Asegúrate que el backend espere 'Bearer'
    };
  } catch (error) {
    console.error("Error obteniendo token de autenticación:", error);
    // Devolver headers sin token si falla
    return {
      'Content-Type': 'application/json',
    };
  }
};

export const api = {
  get: async (endpoint) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, { headers });

    if (!res.ok) {
        // Lanzar error para que el catch lo maneje
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.error || res.statusText);
    }
    return res.json();
  },
  post: async (endpoint, data) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.error || res.statusText);
    }
    return res.json();
  },
  put: async (endpoint, data) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.error || res.statusText);
    }
    return res.json();
  },
  delete: async (endpoint) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.error || res.statusText);
    }
    return res.json();
  }
};