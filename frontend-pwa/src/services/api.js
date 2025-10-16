// frontend-pwa/src/services/api.js
// Servicio base para llamadas a la API del backend
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Función para incluir el token de autenticación
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken'); // O donde lo guardes
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const api = {
  get: (endpoint) => fetch(`${API_BASE}${endpoint}`, { headers: getAuthHeaders() }).then(res => res.json()),
  post: (endpoint, data) => fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(res => res.json()),
  put: (endpoint, data) => fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(res => res.json()),
  delete: (endpoint) => fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }).then(res => res.json())
};