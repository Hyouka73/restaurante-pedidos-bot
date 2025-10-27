// backend/src/services/apiClient.js
const axios = require('axios');

// El backend se llama a sí mismo. La URL base apunta a la API local.
const baseURL = `http://localhost:${process.env.PORT || 3000}/api`;

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para loguear errores de forma más clara
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      console.error('API Error Request:', error.request);
    } else {
      console.error('API Error Message:', error.message);
    }
    return Promise.reject(error);
  }
);

module.exports = apiClient;
