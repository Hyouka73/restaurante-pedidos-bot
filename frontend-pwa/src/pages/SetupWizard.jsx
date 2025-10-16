import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase'; // Asegúrate de tener acceso al user UID

export default function SetupWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupCompleted, setSetupCompleted] = useState(false);

  // Datos del formulario
  const [formData, setFormData] = useState({
    info: {
      name: '',
      description: '',
      phone: '',
      address: ''
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
      mode: 'hybrid', // Opciones: 'fixed_hours', 'always_open', 'manual_control', 'hybrid'
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
    messages: {
      welcome: '¡Hola {nombre}! Bienvenido a {restaurante}',
      menu_intro: 'Este es nuestro menú:',
      ask_delivery_or_pickup: '¿Cómo deseas tu pedido?',
      ask_location: 'Por favor, comparte tu ubicación para calcular el envío.',
      order_confirmed: '✅ Pedido #{numero} confirmado. Total: ${total}.',
      order_preparing: '👨‍🍳 Tu pedido está en preparación.',
      order_ready: '✅ ¡Tu pedido está listo!',
      order_delivered: '🎉 ¡Gracias por tu compra!',
      closed_message: 'Lo sentimos, estamos cerrados. Horario: {horario}',
      outside_hours_message: 'Lo sentimos, estamos fuera de horario. Horario: {horario}',
      complaint_message: 'Gracias por tu comentario. Lo revisaremos pronto.'
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

  const navigate = useNavigate();

  useEffect(() => {
    const checkSetupStatus = async () => {
      if (!auth.currentUser) return;

      try {
        // Obtener restaurantId del usuario
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (!userDoc.exists()) {
          setError('Usuario no encontrado.');
          return;
        }
        const restaurantId = userDoc.data().restaurantId;

        // Obtener datos del restaurante
        const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
        if (!restaurantDoc.exists()) {
          setError('Restaurante no encontrado.');
          return;
        }
        const restaurantData = restaurantDoc.data();

        setSetupCompleted(restaurantData.setupCompleted || false);

        // Si ya está completado, redirigir
        if (restaurantData.setupCompleted) {
          navigate('/');
          return;
        }

        // Si no, cargar datos existentes (por si se recarga la página en medio del wizard)
        if (restaurantData.info) {
          setFormData(prev => ({ ...prev, info: restaurantData.info }));
        }
        // Puedes cargar otros campos aquí si es necesario

      } catch (err) {
        setError('Error al verificar el estado de configuración: ' + err.message);
      }
    };

    checkSetupStatus();
  }, [navigate]);

  const handleChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleHourChange = (day, field, value) => {
    setFormData(prev => ({
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

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    setError('');
    try {
      // Obtener restaurantId del usuario
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const restaurantId = userDoc.data().restaurantId;

      // Actualizar el documento del restaurante
      const restaurantRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(restaurantRef, {
        ...formData,
        setupCompleted: true
      });

      alert('✅ Configuración inicial completada exitosamente.');
      navigate('/'); // Redirigir al dashboard

    } catch (err) {
      setError('Error al guardar la configuración: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (setupCompleted) {
    return <div>Redirigiendo...</div>; // O un mensaje temporal antes de redirigir
  }

  if (error) {
    return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><div className="max-w-md"><h1 className="text-2xl font-bold">Error</h1><p>{error}</p></div></div></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="card bg-base-100 shadow-xl max-w-4xl mx-auto">
        <div className="card-body">
          <h2 className="text-2xl font-bold">Configuración Inicial del Restaurante</h2>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">
              Paso {step} de 4
            </h3>
            <div className="flex space-x-2">
              {step > 1 && (
                <button className="btn btn-sm" onClick={handleBack}>Anterior</button>
              )}
              {step < 4 && (
                <button className="btn btn-primary btn-sm" onClick={handleNext}>Siguiente</button>
              )}
              {step === 4 && (
                <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Guardando...' : 'Finalizar Configuración'}
                </button>
              )}
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-base-300 rounded-full h-2.5 mb-6">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            ></div>
          </div>

          {/* Contenido del paso */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Información Básica</h3>
              <div className="form-control">
                <label className="label">Nombre del Restaurante</label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.info.name}
                  onChange={(e) => handleChange('info', 'name', e.target.value)}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label">Descripción</label>
                <textarea
                  className="textarea textarea-bordered"
                  value={formData.info.description}
                  onChange={(e) => handleChange('info', 'description', e.target.value)}
                ></textarea>
              </div>
              <div className="form-control">
                <label className="label">Teléfono</label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.info.phone}
                  onChange={(e) => handleChange('info', 'phone', e.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="label">Dirección</label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.info.address}
                  onChange={(e) => handleChange('info', 'address', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Horarios y Disponibilidad</h3>
              <div className="form-control">
                <label className="label">Modo de Disponibilidad</label>
                <select
                  className="select select-bordered"
                  value={formData.availabilitySettings.mode}
                  onChange={(e) => handleChange('availabilitySettings', 'mode', e.target.value)}
                >
                  <option value="fixed_hours">Horarios Fijos</option>
                  <option value="always_open">Siempre Abierto</option>
                  <option value="manual_control">Control Manual</option>
                  <option value="hybrid">Híbrido (Recomendado)</option>
                </select>
              </div>
              {formData.availabilitySettings.mode === 'hybrid' && (
                <div className="space-y-2">
                  <label className="label cursor-pointer justify-start">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary mr-2"
                      checked={formData.availabilitySettings.useScheduledHours}
                      onChange={(e) => handleChange('availabilitySettings', 'useScheduledHours', e.target.checked)}
                    />
                    <span className="label-text">Usar horarios fijos como base para recordatorios</span>
                  </label>
                  <label className="label cursor-pointer justify-start">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary mr-2"
                      checked={formData.availabilitySettings.remindersEnabled}
                      onChange={(e) => handleChange('availabilitySettings', 'remindersEnabled', e.target.checked)}
                    />
                    <span className="label-text">Recibir recordatorios si olvido abrir</span>
                  </label>
                </div>
              )}
              <div className="divider">Horarios por Día</div>
              {Object.keys(formData.hours).map(day => (
                <div key={day} className="flex items-center space-x-2">
                  <span className="w-24 capitalize">{day}</span>
                  <label className="cursor-pointer label">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={formData.hours[day].closed}
                      onChange={(e) => handleHourChange(day, 'closed', e.target.checked)}
                    />
                    <span className="label-text ml-2">Cerrado</span>
                  </label>
                  {!formData.hours[day].closed && (
                    <>
                      <input
                        type="time"
                        className="input input-sm input-bordered w-24"
                        value={formData.hours[day].open}
                        onChange={(e) => handleHourChange(day, 'open', e.target.value)}
                      />
                      <span>a</span>
                      <input
                        type="time"
                        className="input input-sm input-bordered w-24"
                        value={formData.hours[day].close}
                        onChange={(e) => handleHourChange(day, 'close', e.target.value)}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Opciones de Pedido</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label cursor-pointer justify-start">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary mr-2"
                      checked={formData.features.deliveryEnabled}
                      onChange={(e) => handleChange('features', 'deliveryEnabled', e.target.checked)}
                    />
                    <span className="label-text">Aceptar Pedidos con Delivery</span>
                  </label>
                </div>
                <div className="form-control">
                  <label className="label cursor-pointer justify-start">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary mr-2"
                      checked={formData.features.pickupEnabled}
                      onChange={(e) => handleChange('features', 'pickupEnabled', e.target.checked)}
                    />
                    <span className="label-text">Aceptar Pedidos para Recoger</span>
                  </label>
                </div>
              </div>

              <div className="divider">Costos de Delivery</div>
              <div className="form-control">
                <label className="label">Tipo de Cálculo</label>
                <select
                  className="select select-bordered"
                  value={formData.delivery.type}
                  onChange={(e) => handleChange('delivery', 'type', e.target.value)}
                >
                  <option value="distance_based">Por Distancia (Km)</option>
                  <option value="zone_based">Por Zonas</option>
                  <option value="fixed">Costo Fijo</option>
                </select>
              </div>
              {formData.delivery.type === 'distance_based' && (
                <>
                  <div className="form-control">
                    <label className="label">Costo por Km ($)</label>
                    <input
                      type="number"
                      className="input input-bordered"
                      value={formData.delivery.costPerKm}
                      onChange={(e) => handleChange('delivery', 'costPerKm', parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">Distancia Máxima (Km)</label>
                    <input
                      type="number"
                      className="input input-bordered"
                      value={formData.delivery.maxDistance}
                      onChange={(e) => handleChange('delivery', 'maxDistance', parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                </>
              )}
              {formData.delivery.type === 'fixed' && (
                <div className="form-control">
                  <label className="label">Costo de Envío Fijo ($)</label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={formData.delivery.baseCost}
                    onChange={(e) => handleChange('delivery', 'baseCost', parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              )}
              <div className="form-control">
                <label className="label">Pedido Mínimo para Envío Gratis ($)</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={formData.delivery.freeDeliveryMinAmount}
                  onChange={(e) => handleChange('delivery', 'freeDeliveryMinAmount', parseFloat(e.target.value) || 0)}
                  min="0"
                />
              </div>

              <div className="divider">Métodos de Pago</div>
              {formData.paymentMethods.map((method, index) => (
                <div key={method.id} className="form-control">
                  <label className="label cursor-pointer justify-between">
                    <span className="label-text">{method.name}</span>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={method.enabled}
                      onChange={(e) => {
                        const updatedMethods = [...formData.paymentMethods];
                        updatedMethods[index].enabled = e.target.checked;
                        setFormData(prev => ({ ...prev, paymentMethods: updatedMethods }));
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Mensajes y Comandos</h3>
              <div className="form-control">
                <label className="label">Mensaje de Bienvenida</label>
                <textarea
                  className="textarea textarea-bordered h-24"
                  value={formData.messages.welcome}
                  onChange={(e) => handleChange('messages', 'welcome', e.target.value)}
                  placeholder="¡Hola {nombre}! Bienvenido a {restaurante}"
                />
                <label className="label">
                  <span className="label-text-alt">Variables: {'{nombre}'}, {'{restaurante}'}</span>
                </label>
              </div>
              <div className="form-control">
                <label className="label">Introducción al Menú</label>
                <textarea
                  className="textarea textarea-bordered"
                  value={formData.messages.menu_intro}
                  onChange={(e) => handleChange('messages', 'menu_intro', e.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="label">Preguntar Delivery o Recoger</label>
                <textarea
                  className="textarea textarea-bordered"
                  value={formData.messages.ask_delivery_or_pickup}
                  onChange={(e) => handleChange('messages', 'ask_delivery_or_pickup', e.target.value)}
                />
              </div>
              {/* Puedes añadir más campos de mensajes aquí si lo deseas */}
            </div>
          )}

          {error && <div className="alert alert-error mt-4"><span>{error}</span></div>}
        </div>
      </div>
    </div>
  );
}