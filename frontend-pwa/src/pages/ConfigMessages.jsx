import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function ConfigMessages() {
  const [messages, setMessages] = useState({
    welcome: '',
    menu_intro: '',
    ask_delivery: '',
    order_confirmed: '',
  });
  const [loading, setLoading] = useState(false);

  const restaurantId = 'demo-restaurant'; // Hardcoded por ahora

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await api.get(`/config/${restaurantId}/messages`);
        setMessages(data);
      } catch (error) {
        console.error('Error al cargar mensajes:', error);
      }
    };
    fetchMessages();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put(`/config/${restaurantId}/messages`, messages);
      alert('✅ Mensajes actualizados');
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configurar Mensajes del Bot</h1>

      <div className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Mensaje de Bienvenida</span>
          </label>
          <textarea 
            className="textarea textarea-bordered h-24"
            value={messages.welcome}
            onChange={(e) => setMessages({...messages, welcome: e.target.value})}
            placeholder="¡Hola! Bienvenido a {restaurante}"
          />
          <label className="label">
            <span className="label-text-alt">Variables: {'{nombre}'}, {'{restaurante}'}</span>
          </label>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Introducción al Menú</span>
          </label>
          <textarea 
            className="textarea textarea-bordered"
            value={messages.menu_intro}
            onChange={(e) => setMessages({...messages, menu_intro: e.target.value})}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Preguntar por Delivery</span>
          </label>
          <textarea 
            className="textarea textarea-bordered"
            value={messages.ask_delivery}
            onChange={(e) => setMessages({...messages, ask_delivery: e.target.value})}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Confirmación de Pedido</span>
          </label>
          <textarea 
            className="textarea textarea-bordered"
            value={messages.order_confirmed}
            onChange={(e) => setMessages({...messages, order_confirmed: e.target.value})}
          />
        </div>

        <button 
          className="btn btn-primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="alert alert-info">
        <span>💡 Los cambios se reflejarán inmediatamente en el bot</span>
      </div>
    </div>
  );
}
