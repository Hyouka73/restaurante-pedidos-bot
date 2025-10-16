// frontend-pwa/src/pages/ConfigCommands.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { api } from '../services/api';

export default function ConfigCommands() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [commands, setCommands] = useState({});

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
        // Solo necesitamos la sección de comandos
        setCommands(data.commands);
      } catch (err) {
        setError('Error al cargar la configuración: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [user, navigate]);

  const handleCommandChange = (id, field, value) => {
    setCommands(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
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

      // Enviar solo la sección 'commands' actualizada
      await api.put(`/config/${restaurantId}/general`, { commands });
      alert('✅ Configuración de comandos guardada exitosamente.');
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
      <h1 className="text-3xl font-bold mb-6">Configuración de Comandos del Bot</h1>
      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-4">Activar o Desactivar Comandos</h2>
          <p className="mb-4">Habilita o deshabilita los comandos que el bot responderá en Telegram.</p>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Comando</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(commands).map((cmdId) => (
                  <tr key={cmdId}>
                    <td className="font-mono">/{cmdId}</td>
                    <td>{commands[cmdId].description}</td>
                    <td>
                      <label className="cursor-pointer label justify-start">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={commands[cmdId].enabled}
                          onChange={(e) => handleCommandChange(cmdId, 'enabled', e.target.checked)}
                        />
                        <span className="label-text ml-2">{commands[cmdId].enabled ? 'Activo' : 'Inactivo'}</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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