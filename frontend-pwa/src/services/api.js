// frontend-pwa/src/services/api.js
import { getAuth, getIdToken } from 'firebase/auth';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Variable para almacenar la función showAlert
let alertFunction = null;

// Función para configurar el sistema de alertas desde el componente
export const configureAlerts = (showAlertFn) => {
  console.log('⚙️ configureAlerts llamado con:', typeof showAlertFn);
  alertFunction = showAlertFn;
  console.log('⚙️ alertFunction configurada:', !!alertFunction);
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
  console.log('📡 handleResponse - method:', method, 'status:', res.status, 'alertFunction:', !!alertFunction);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
    const errorMessage = errorData.error || errorData.message || res.statusText;
    
    console.log('❌ Error detectado:', errorMessage);
    
    // Mostrar alerta de error
    if (alertFunction) {
      console.log('🔴 Intentando mostrar alerta de error...');
      alertFunction(errorMessage, 'error', 4000);
    } else {
      console.warn('⚠️ alertFunction no está definida!');
    }
    
    throw new Error(errorMessage);
  }

  // Operación exitosa
  const data = await res.json();
  
  // Mostrar alerta de éxito según el método HTTP
  let message = '';
  if (method === 'POST') {
    message = 'Creado exitosamente';
  } else if (method === 'PUT') {
    message = 'Actualizado exitosamente';
  } else if (method === 'DELETE') {
    message = 'Eliminado exitosamente';
  }
  
  console.log('✅ Operación exitosa, mensaje:', message, 'alertFunction:', !!alertFunction);
  
  if (message && alertFunction) {
    console.log('🟢 Intentando mostrar alerta de éxito...');
    alertFunction(message, 'success', 2000);
  } else if (message && !alertFunction) {
    console.warn('⚠️ alertFunction no está definida para mostrar éxito!');
  }
  
  return data;
};

export const api = {
  get: async (endpoint) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}${endpoint}`, { headers });
      return handleResponse(res, 'GET');
    } catch (err) {
      console.error('[api.get] Network or unexpected error:', err);
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
      console.error('[api.post] Network or unexpected error:', err);
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
      console.error('[api.put] Network or unexpected error:', err);
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
      console.error('[api.delete] Network or unexpected error:', err);
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