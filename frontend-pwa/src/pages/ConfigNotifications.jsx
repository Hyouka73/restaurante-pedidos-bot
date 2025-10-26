// frontend-pwa/src/pages/ConfigNotifications.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase';
import { api } from '../services/api'; // <-- 1. Importar api

export default function ConfigNotifications() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notificationPrefs, setNotificationPrefs] = useState({
    browserNotifications: false,
    pushEnabled: false,
    fcmToken: null,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchNotificationPrefs = async () => {
      try {
        setLoading(true);
        // 2. Usar el endpoint del backend
        const prefs = await api.get('/user/notification-prefs');
        
        setNotificationPrefs(prev => ({
          ...prev,
          pushEnabled: prefs.notificationsEnabled || false,
          fcmToken: prefs.fcmToken || null
        }));

        if ("Notification" in window) {
          setNotificationPrefs(prev => ({
            ...prev,
            browserNotifications: Notification.permission === 'granted'
          }));
        }
      } catch (err) {
        setError('Error al cargar la configuración: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotificationPrefs();
  }, [user, navigate]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Este navegador no soporta notificaciones push.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Permiso para notificaciones concedido.");
      setNotificationPrefs(prev => ({ ...prev, browserNotifications: true }));
    } else {
      console.log("Permiso para notificaciones denegado.");
      setNotificationPrefs(prev => ({ ...prev, browserNotifications: false }));
    }
  };

  const togglePushNotifications = async (enabled) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // 3. Usar el endpoint del backend para actualizar
      await api.put('/user/notification-prefs', {
        notificationsEnabled: enabled
      });
      
      setNotificationPrefs(prev => ({ ...prev, pushEnabled: enabled }));
      alert(`✅ Notificaciones ${enabled ? 'habilitadas' : 'deshabilitadas'}.`);
    } catch (err) {
      setError('Error al actualizar la configuración: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><span className="loading loading-spinner loading-lg"></span></div></div>;
  if (error) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><div className="max-w-md"><h1 className="text-2xl font-bold">Error</h1><p>{error}</p></div></div></div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Configuración de Notificaciones</h1>
      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

      <div className="grid grid-cols-1 gap-6">
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-2">Notificaciones del Navegador</h2>
          <p className="text-gray-500 mb-4">Controla si el navegador puede mostrarte notificaciones.</p>
          <div className="flex items-center space-x-4">
            <span className={`badge ${notificationPrefs.browserNotifications ? 'badge-success' : 'badge-error'}`}>
              {notificationPrefs.browserNotifications ? 'Concedido' : 'Denegado'}
            </span>
            {!notificationPrefs.browserNotifications && (
              <button
                className="btn btn-sm btn-primary"
                onClick={requestNotificationPermission}
              >
                Solicitar Permiso
              </button>
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-2">Notificaciones Push</h2>
          <p className="text-gray-500 mb-4">Recibe alertas importantes en tu dispositivo (por ejemplo, recordatorios de apertura).</p>
          <div className="flex items-center space-x-4">
            <label className="cursor-pointer label justify-start">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={notificationPrefs.pushEnabled}
                onChange={(e) => togglePushNotifications(e.target.checked)}
                disabled={saving || !notificationPrefs.browserNotifications}
              />
              <span className="label-text ml-2">Habilitar Notificaciones Push</span>
            </label>
            {!notificationPrefs.browserNotifications && (
              <span className="text-sm text-gray-500">(Permiso del navegador denegado)</span>
            )}
          </div>
          {notificationPrefs.fcmToken && (
            <div className="mt-4 text-sm text-gray-500">
              <p>Token FCM registrado: {notificationPrefs.fcmToken.substring(0, 20)}...</p>
            </div>
          )}
        </div>

        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-2">Recordatorios de Apertura</h2>
          <p className="text-gray-500 mb-4">Esto se configura en la sección de "Disponibilidad".</p>
          <button
            className="btn btn-outline"
            onClick={() => navigate('/config/availability')}
          >
            Ir a Configuración de Disponibilidad
          </button>
        </div>
      </div>
    </div>
  );
}
