// frontend-pwa/src/services/api.js
import { getAuth } from 'firebase/auth';

export const API_BASE = import.meta.env.VITE_API_BASE;
console.log("🚀 API_BASE está usando:", API_BASE);

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
    return {
      'Content-Type': 'application/json',
    };
  }

  try {
    const token = await user.getIdToken();
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

// Función helper para manejar la respuesta
const handleResponse = async (res, method) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
    const errorMessage = errorData.error || errorData.message || res.statusText;
    
    if (alertFunction) {
      alertFunction(errorMessage, 'error', 4000);
    }
    
    throw new Error(errorMessage);
  }

  const data = await res.json();
  
  // Solo mostrar alertas de éxito para POST, PUT, DELETE
  let message = '';
  if (method === 'POST') {
    message = 'Creado exitosamente';
  } else if (method === 'PUT') {
    message = 'Actualizado exitosamente';
  } else if (method === 'DELETE') {
    message = 'Eliminado exitosamente';
  }
  
  if (message && alertFunction) {
    alertFunction(message, 'success', 2000);
  }
  
  return data;
};

export const api = {
  get: async (endpoint) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}${endpoint}`, { 
        method: 'GET',
        headers 
      });
      return handleResponse(res, 'GET');
    } catch (err) {
      console.error('[API] GET Error:', err);
      if (alertFunction) alertFunction(err.message || 'Error de red', 'error', 4000);
      throw err;
    }
  },
  
  post: async (endpoint, data) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      return handleResponse(res, 'POST');
    } catch (err) {
      console.error('[API] POST Error:', err);
      if (alertFunction) alertFunction(err.message || 'Error de red', 'error', 4000);
      throw err;
    }
  },
  
  put: async (endpoint, data) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      });
      return handleResponse(res, 'PUT');
    } catch (err) {
      console.error('[API] PUT Error:', err);
      if (alertFunction) alertFunction(err.message || 'Error de red', 'error', 4000);
      throw err;
    }
  },
  
  delete: async (endpoint) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers
      });
      return handleResponse(res, 'DELETE');
    } catch (err) {
      console.error('[API] DELETE Error:', err);
      if (alertFunction) alertFunction(err.message || 'Error de red', 'error', 4000);
      throw err;
    }
  },

  // Método especial para subir archivos
  upload: async (endpoint, file) => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    try {
      const token = await user.getIdToken();
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
    } catch (err) {
      console.error('[API] UPLOAD Error:', err);
      throw err;
    }
  }
};