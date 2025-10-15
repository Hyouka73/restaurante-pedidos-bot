// Servicio base para llamadas a la API del backend
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const api = {
  get: (endpoint) => fetch(`${API_BASE}${endpoint}`).then(res => res.json()),
  post: (endpoint, data) => fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  put: (endpoint, data) => fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  delete: (endpoint) => fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE'
  }).then(res => res.json())
};
