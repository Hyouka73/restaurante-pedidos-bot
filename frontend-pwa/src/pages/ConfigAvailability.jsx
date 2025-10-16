// frontend-pwa/src/pages/ConfigAvailability.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { api } from '../services/api';

export default function ConfigAvailability() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState({
    availabilitySettings: {
      mode: 'hybrid',
      useScheduledHours: true,
      remindersEnabled: true,
    },
    availability: {
      status: 'open', // 'open', 'closed_by_owner', 'outside_hours', 'pending_open_reminder'
      reason: '',
      lastUpdated: null,
      lastOpenReminderSent: null
    },
    closeReasons: [
      "Cocina llena",
      "Sin personal",
      "Falta de ingredientes",
      "Problemas técnicos",
      "Otro"
    ]
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

        const data = await api.get(`/config/${restaurantId}/general`);
        setConfig(prev => ({
          ...prev,
          availabilitySettings: data.availabilitySettings,
          availability: data.availability // Asumiendo que la API también devuelve este objeto
        }));
      } catch (err) {
        setError('Error al cargar la configuración: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [user, navigate]);

  const handleChange = (section, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Función para actualizar manualmente el estado de disponibilidad
  const updateAvailabilityStatus = async (newStatus, reason = '') => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const restaurantId = userDoc.data().restaurantId;

      // Enviar solo la actualización de 'availability'
      await api.put(`/config/${restaurantId}/general`, {
        availability: {
          ...config.availability,
          status: newStatus,
          reason: newStatus === 'closed_by_owner' ? reason : null,
          lastUpdated: new Date().toISOString() // O manejar la fecha en el backend
        }
      });
      // Actualizar estado local
      setConfig(prev => ({
        ...prev,
        availability: {
          ...prev.availability,
          status: newStatus,
          reason: newStatus === 'closed_by_owner' ? reason : null,
          lastUpdated: new Date().toISOString()
        }
      }));
      alert(`✅ Estado actualizado a: ${newStatus}`);
    } catch (err) {
      setError('Error al actualizar el estado: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetOpen = () => updateAvailabilityStatus('open');
  const handleSetClosed = () => {
    const reason = prompt('¿Por qué estás cerrando el restaurante?', config.closeReasons[0]);
    if (reason !== null) { // prompt returns null if cancelled
      updateAvailabilityStatus('closed_by_owner', reason);
    }
  };

  if (loading) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><span className="loading loading-spinner loading-lg"></span></div></div>;
  if (error) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><div className="max-w-md"><h1 className="text-2xl font-bold">Error</h1><p>{error}</p></div></div></div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Configuración de Disponibilidad</h1>
      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuración General */}
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-4">Configuración General</h2>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label">Modo de Disponibilidad</label>
              <select
                className="select select-bordered"
                value={config.availabilitySettings.mode}
                onChange={(e) => handleChange('availabilitySettings', 'mode', e.target.value)}
              >
                <option value="fixed_hours">Horarios Fijos</option>
                <option value="always_open">Siempre Abierto</option>
                <option value="manual_control">Control Manual</option>
                <option value="hybrid">Híbrido (Recomendado)</option>
              </select>
            </div>
            {config.availabilitySettings.mode === 'hybrid' && (
              <div className="space-y-2">
                <label className="label cursor-pointer justify-start">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary mr-2"
                    checked={config.availabilitySettings.useScheduledHours}
                    onChange={(e) => handleChange('availabilitySettings', 'useScheduledHours', e.target.checked)}
                  />
                  <span className="label-text">Usar horarios fijos como base para recordatorios</span>
                </label>
                <label className="label cursor-pointer justify-start">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary mr-2"
                    checked={config.availabilitySettings.remindersEnabled}
                    onChange={(e) => handleChange('availabilitySettings', 'remindersEnabled', e.target.checked)}
                  />
                  <span className="label-text">Recibir recordatorios si olvido abrir</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Control Manual de Estado */}
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-4">Control Manual de Estado</h2>
          <div className="space-y-4">
            <div className="stat bg-base-200">
              <div className="stat-title">Estado Actual</div>
              <div className="stat-value text-center">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                  config.availability.status === 'open' ? 'bg-success' :
                  config.availability.status === 'closed_by_owner' ? 'bg-error' :
                  'bg-warning'
                }`}></span>
                {config.availability.status}
              </div>
              {config.availability.reason && (
                <div className="stat-desc">Razón: {config.availability.reason}</div>
              )}
              {config.availability.lastUpdated && (
                <div className="stat-desc">Última actualización: {new Date(config.availability.lastUpdated).toLocaleString()}</div>
              )}
            </div>
            <div className="flex flex-col space-y-2">
              <button
                className={`btn ${config.availability.status === 'open' ? 'btn-disabled' : 'btn-success'}`}
                onClick={handleSetOpen}
                disabled={config.availability.status === 'open' || saving}
              >
                Abrir Restaurante
              </button>
              <button
                className={`btn ${config.availability.status === 'closed_by_owner' ? 'btn-disabled' : 'btn-error'}`}
                onClick={handleSetClosed}
                disabled={config.availability.status === 'closed_by_owner' || saving}
              >
                Cerrar Restaurante
              </button>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              <p>Este control sobreescribe las reglas de horario fijo o híbrido.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Razones de Cierre */}
      <div className="card bg-base-100 shadow-xl p-4 mt-6">
        <h2 className="text-xl font-semibold mb-4">Razones Comunes de Cierre</h2>
        <div className="flex flex-wrap gap-2">
          {config.closeReasons.map((reason, index) => (
            <div key={index} className="badge badge-outline">{reason}</div>
          ))}
        </div>
        {/* Opcional: Formulario para añadir nuevas razones */}
      </div>
    </div>
  );
}