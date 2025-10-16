// frontend-pwa/src/pages/ConfigDelivery.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { api } from '../services/api';

export default function ConfigDelivery() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState({
    delivery: {
      enabled: true,
      type: "distance_based",
      baseCost: 30,
      costPerKm: 5,
      maxDistance: 10,
      freeDeliveryMinAmount: 150
    },
    zones: [] // Ejemplo para tipo 'zone_based', no implementado aquí pero estructurado
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchConfig = async () => {
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists) {
          setError('Usuario no encontrado.');
          return;
        }
        const restaurantId = userDoc.data().restaurantId;

        // Obtener la configuración general, que incluye 'delivery'
        const data = await api.get(`/config/${restaurantId}/general`);
        setConfig({ delivery: data.delivery, zones: data.zones || [] });
      } catch (err) {
        setError('Error al cargar la configuración: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [user, navigate]);

  const handleChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const restaurantId = userDoc.data().restaurantId;

      // Enviar solo la sección 'delivery' actualizada
      await api.put(`/config/${restaurantId}/general`, { delivery: config.delivery });
      alert('✅ Configuración de delivery guardada exitosamente.');
    } catch (err) {
      setError('Error al guardar la configuración: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><span className="loading loading-spinner loading-lg"></span></div></div>;
  if (error) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><div className="max-w-md"><h1 className="text-2xl font-bold">Error</h1><p>{error}</p></div></div></div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Configuración de Delivery</h1>
      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-4">Opciones Generales</h2>
          <div className="form-control">
            <label className="label cursor-pointer justify-start">
              <input
                type="checkbox"
                className="checkbox checkbox-primary mr-2"
                checked={config.delivery.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
              />
              <span className="label-text">Habilitar Delivery</span>
            </label>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-4">Cálculo de Costo</h2>
          <div className="form-control">
            <label className="label">Tipo de Cálculo</label>
            <select
              className="select select-bordered"
              value={config.delivery.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              <option value="distance_based">Por Distancia (Km)</option>
              <option value="zone_based">Por Zonas (No implementado en este UI)</option>
              <option value="fixed">Costo Fijo</option>
            </select>
          </div>

          {config.delivery.type === 'distance_based' && (
            <>
              <div className="form-control">
                <label className="label">Costo por Km ($)</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={config.delivery.costPerKm}
                  onChange={(e) => handleChange('costPerKm', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-control">
                <label className="label">Distancia Máxima (Km)</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={config.delivery.maxDistance}
                  onChange={(e) => handleChange('maxDistance', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.1"
                />
              </div>
            </>
          )}

          {config.delivery.type === 'fixed' && (
            <div className="form-control">
              <label className="label">Costo de Envío Fijo ($)</label>
              <input
                type="number"
                className="input input-bordered"
                value={config.delivery.baseCost}
                onChange={(e) => handleChange('baseCost', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>
          )}

          <div className="form-control">
            <label className="label">Pedido Mínimo para Envío Gratis ($)</label>
            <input
              type="number"
              className="input input-bordered"
              value={config.delivery.freeDeliveryMinAmount}
              onChange={(e) => handleChange('freeDeliveryMinAmount', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="form-control mt-6">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}