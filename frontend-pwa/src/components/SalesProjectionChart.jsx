// frontend-pwa/src/components/SalesProjectionChart.jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import { useRestaurant } from '../context/RestaurantContext';
import Loader from './ui/Loader'; // Assuming this is the correct path

function SalesProjectionChart() {
  const [loadingMessage, setLoadingMessage] = useState('Cargando...');
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState(null);
  const { data: restaurant } = useRestaurant();

  useEffect(() => {
    if (!restaurant?.id) return;

    const fetchProjection = async () => {
      try {
        setLoadingMessage('Verificando datos...');
        setError(null);
        setChartData(null);

        // 1. PRIMERA LLAMADA: Verificar el estado del caché
        const statusResponse = await api.get(`/api/dashboard/projection-status/${restaurant.id}`);
        const status = statusResponse.status; // "fresh" o "stale"

        // 2. REQUISITO DE UX: Poner el mensaje de espera específico
        if (status === 'stale') {
          setLoadingMessage('Espera un momento, estamos calculando la nueva proyección...');
        } else {
          setLoadingMessage('Cargando proyección...');
        }

        // 3. SEGUNDA LLAMADA: Obtener los datos (la API recalculará si es 'stale')
        const dataResponse = await api.get(`/api/dashboard/projection-data/${restaurant.id}`);

        // 4. Manejar la respuesta
        if (dataResponse.message) {
          // Caso de "datos insuficientes" (ej. < 14 días)
          setError(dataResponse.message);
          setChartData(null);
        } else {
          // Éxito: tenemos datos para la gráfica
          const { historical, projected } = dataResponse;
          const combinedData = [
            ...historical.map((value, index) => ({ name: `Day ${index + 1}`, historical: value, projected: null })),
            ...projected.map((value, index) => ({ name: `Day ${historical.length + index + 1}`, historical: null, projected: value }))
          ];
          setChartData(combinedData);
        }

      } catch (err) {
        console.error("Error cargando proyección:", err);
        setError('No se pudo cargar la proyección.');
      } finally {
        // Ponemos el mensaje a null para que el loader desaparezca
        setLoadingMessage(null); 
      }
    };

    fetchProjection();
  }, [restaurant]);

  // --- Lógica de Renderizado ---

  if (loadingMessage) {
    // REQUISITO DE UX: Usar el componente Loader existente
    return (
      <div className="h-80 flex items-center justify-center">
        <Loader message={loadingMessage} /> 
      </div>
    );
  }

  if (error) {
    // Mostrar el mensaje de "datos insuficientes"
    return (
      <div className="h-80 flex items-center justify-center bg-yellow-50 text-yellow-700 rounded-lg p-4">
        <p>{error}</p>
      </div>
    );
  }

  if (chartData) {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="historical" stroke="#8884d8" name="Ventas Históricas" />
          <Line type="monotone" dataKey="projected" stroke="#82ca9d" name="Ventas Proyectadas" />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return null; // Estado por defecto
}

export default SalesProjectionChart;
