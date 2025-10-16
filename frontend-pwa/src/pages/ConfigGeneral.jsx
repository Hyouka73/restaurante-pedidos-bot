// frontend-pwa/src/pages/ConfigGeneral.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { api } from '../services/api';

export default function ConfigGeneral() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState({
    info: {
      name: '',
      description: '',
      phone: '',
      address: '',
    },
    hours: {
      monday: { open: "10:00", close: "22:00", closed: false },
      tuesday: { open: "10:00", close: "22:00", closed: false },
      wednesday: { open: "10:00", close: "22:00", closed: false },
      thursday: { open: "10:00", close: "22:00", closed: false },
      friday: { open: "10:00", close: "23:00", closed: false },
      saturday: { open: "10:00", close: "23:00", closed: false },
      sunday: { open: "10:00", close: "21:00", closed: false }
    },
    availabilitySettings: {
      mode: 'hybrid',
      useScheduledHours: true,
      remindersEnabled: true,
    },
    delivery: {
      enabled: true,
      type: "distance_based",
      baseCost: 30,
      costPerKm: 5,
      maxDistance: 10,
      freeDeliveryMinAmount: 150
    },
    paymentMethods: [
      { id: "cash", name: "Efectivo", enabled: true },
      { id: "card", name: "Tarjeta", enabled: true },
      { id: "transfer", name: "Transferencia", enabled: false }
    ],
    features: {
      deliveryEnabled: true,
      pickupEnabled: true,
      askForName: true,
      askForPhone: true,
      requireLocationIfDelivery: true,
      showMenuImages: true,
      acceptComplaints: true
    },
    commands: {
      start: { enabled: true, description: "Iniciar conversación" },
      menu: { enabled: true, description: "Ver menú completo" },
      pedido: { enabled: true, description: "Hacer un pedido" },
      estado: { enabled: true, description: "Ver estado de mi pedido" },
      ayuda: { enabled: true, description: "Obtener ayuda" },
      reclamar: { enabled: true, description: "Enviar un comentario o reclamo" }
    }
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchConfig = async () => {
      try {
        setLoading(true);
        // Usar la API para obtener la configuración general
        // Este endpoint debe verificar ownership internamente
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists) {
          setError('Usuario no encontrado.');
          return;
        }
        const restaurantId = userDoc.data().restaurantId;

        const data = await api.get(`/config/${restaurantId}/general`);
        setConfig(data);
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

  const handleHourChange = (day, field, value) => {
    setConfig(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          ...prev.hours[day],
          [field]: value
        }
      }
    }));
  };

  const handlePaymentMethodChange = (id, field, value) => {
    setConfig(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map(pm =>
        pm.id === id ? { ...pm, [field]: value } : pm
      )
    }));
  };

  const handleFeatureChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [field]: value
      }
    }));
  };

  const handleCommandChange = (id, field, value) => {
    setConfig(prev => ({
      ...prev,
      commands: {
        ...prev.commands,
        [id]: {
          ...prev.commands[id],
          [field]: value
        }
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
      // Obtener restaurantId
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const restaurantId = userDoc.data().restaurantId;

      // Enviar la configuración actualizada al backend
      await api.put(`/config/${restaurantId}/general`, config);
      alert('✅ Configuración guardada exitosamente.');
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
      <h1 className="text-3xl font-bold mb-6">Configuración General del Restaurante</h1>
      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Información Básica */}
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-4">Información Básica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">Nombre del Restaurante</label>
              <input
                type="text"
                className="input input-bordered"
                value={config.info.name}
                onChange={(e) => handleChange('info', 'name', e.target.value)}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">Teléfono</label>
              <input
                type="text"
                className="input input-bordered"
                value={config.info.phone}
                onChange={(e) => handleChange('info', 'phone', e.target.value)}
              />
            </div>
            <div className="form-control md:col-span-2">
              <label className="label">Dirección</label>
              <input
                type="text"
                className="input input-bordered"
                value={config.info.address}
                onChange={(e) => handleChange('info', 'address', e.target.value)}
              />
            </div>
            <div className="form-control md:col-span-2">
              <label className="label">Descripción</label>
              <textarea
                className="textarea textarea-bordered"
                value={config.info.description}
                onChange={(e) => handleChange('info', 'description', e.target.value)}
              ></textarea>
            </div>
          </div>
        </div>

        {/* Horarios */}
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-4">Horarios de Operación</h2>
          <div className="space-y-2">
            {Object.keys(config.hours).map(day => (
              <div key={day} className="flex items-center justify-between p-2 border-b">
                <span className="capitalize w-24">{day}</span>
                <label className="cursor-pointer label">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={config.hours[day].closed}
                    onChange={(e) => handleHourChange(day, 'closed', e.target.checked)}
                  />
                  <span className="label-text ml-2">Cerrado</span>
                </label>
                {!config.hours[day].closed && (
                  <>
                    <input
                      type="time"
                      className="input input-sm input-bordered w-24"
                      value={config.hours[day].open}
                      onChange={(e) => handleHourChange(day, 'open', e.target.value)}
                    />
                    <span className="mx-2">a</span>
                    <input
                      type="time"
                      className="input input-sm input-bordered w-24"
                      value={config.hours[day].close}
                      onChange={(e) => handleHourChange(day, 'close', e.target.value)}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Opciones de Pedido */}
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-4">Opciones de Pedido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="label cursor-pointer justify-start">
              <input
                type="checkbox"
                className="checkbox checkbox-primary mr-2"
                checked={config.features.deliveryEnabled}
                onChange={(e) => handleFeatureChange('deliveryEnabled', e.target.checked)}
              />
              <span className="label-text">Aceptar Pedidos con Delivery</span>
            </label>
            <label className="label cursor-pointer justify-start">
              <input
                type="checkbox"
                className="checkbox checkbox-primary mr-2"
                checked={config.features.pickupEnabled}
                onChange={(e) => handleFeatureChange('pickupEnabled', e.target.checked)}
              />
              <span className="label-text">Aceptar Pedidos para Recoger</span>
            </label>
            <label className="label cursor-pointer justify-start">
              <input
                type="checkbox"
                className="checkbox checkbox-primary mr-2"
                checked={config.features.requireLocationIfDelivery}
                onChange={(e) => handleFeatureChange('requireLocationIfDelivery', e.target.checked)}
              />
              <span className="label-text">Requerir ubicación si es delivery</span>
            </label>
            <label className="label cursor-pointer justify-start">
              <input
                type="checkbox"
                className="checkbox checkbox-primary mr-2"
                checked={config.features.showMenuImages}
                onChange={(e) => handleFeatureChange('showMenuImages', e.target.checked)}
              />
              <span className="label-text">Mostrar imágenes en el menú</span>
            </label>
          </div>
        </div>

        {/* Métodos de Pago */}
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-4">Métodos de Pago</h2>
          <div className="space-y-2">
            {config.paymentMethods.map((method) => (
              <label key={method.id} className="label cursor-pointer justify-between p-2 border-b">
                <span className="label-text">{method.name}</span>
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={method.enabled}
                  onChange={(e) => handlePaymentMethodChange(method.id, 'enabled', e.target.checked)}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Comandos del Bot */}
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-4">Comandos del Bot</h2>
          <div className="space-y-2">
            {Object.keys(config.commands).map((cmdId) => (
              <label key={cmdId} className="label cursor-pointer justify-between p-2 border-b">
                <div>
                  <span className="label-text font-mono">/{cmdId}</span>
                  <span className="text-sm text-gray-500 ml-2">{config.commands[cmdId].description}</span>
                </div>
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={config.commands[cmdId].enabled}
                  onChange={(e) => handleCommandChange(cmdId, 'enabled', e.target.checked)}
                />
              </label>
            ))}
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