// frontend-pwa/src/services/api.js
import { getAuth, getIdToken } from 'firebase/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Variable para almacenar la función showAlert
let alertFunction = null;

// Función para configurar el sistema de alertas desde el componente
export const configureAlerts = (showAlertFn) => {
  alertFunction = showAlertFn;
};

// Función para incluir el token de autenticación de Firebase
const getAuthHeaders = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    console.warn("No hay usuario autenticado para obtener token.");
    return {
      'Content-Type': 'application/json',
    };
  }

  try {
    const token = await getIdToken(user);
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  } catch (error) {
    console.error("Error obteniendo token de autenticación:", error);
    return {
      'Content-Type': 'application/json',
    };
  }
};

// Función helper para manejar la respuesta y mostrar alertas
const handleResponse = async (res, method) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
    const errorMessage = errorData.error || errorData.message || res.statusText;
    
    // Mostrar alerta de error
    if (alertFunction) {
      alertFunction(errorMessage, 'error', 4000);
    }
    
    throw new Error(errorMessage);
  }

  // Operación exitosa
  const data = await res.json();
  
  // Mostrar alerta de éxito según el método HTTP
  if (alertFunction) {
    let message = '';
    if (method === 'POST') {
      message = 'Creado exitosamente';
    } else if (method === 'PUT') {
      message = 'Actualizado exitosamente';
    } else if (method === 'DELETE') {
      message = 'Eliminado exitosamente';
    }
    
    if (message) {
      alertFunction(message, 'success', 2000);
    }
  }
  
  return data;
};

export const api = {
  get: async (endpoint) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, { headers });
    return handleResponse(res, 'GET');
  },
  
  post: async (endpoint, data) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return handleResponse(res, 'POST');
  },
  
  put: async (endpoint, data) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    return handleResponse(res, 'PUT');
  },
  
  delete: async (endpoint) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers
    });
    return handleResponse(res, 'DELETE');
  },

  // Método especial para subir archivos
  upload: async (endpoint, file) => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    const token = await getIdToken(user);
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // NO incluir Content-Type para que el navegador lo establezca con el boundary
      },
      body: formData
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
      const errorMessage = errorData.error || errorData.message || 'Error al subir imagen';
      
      if (alertFunction) {
        alertFunction(errorMessage, 'error', 4000);
      }
      
      throw new Error(errorMessage);
    }

    const data = await res.json();
    
    if (alertFunction) {
      alertFunction('Imagen subida exitosamente', 'success', 2000);
    }
    
    return data;
  }
};