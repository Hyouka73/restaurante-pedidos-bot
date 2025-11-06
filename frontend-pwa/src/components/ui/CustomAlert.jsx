import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// --- Alerta Global ---
// Esto permite que módulos no-React (como interceptores de API) muestren alertas.
let alertEmitter = null;

/**
 * Configura el emisor de alertas. Llámalo en tu componente raíz (App.jsx).
 * @param {function} emitter - La función `showAlert` del hook `useAlert`.
 */
export const configureAlerts = (emitter) => {
  alertEmitter = emitter;
};

/**
 * Muestra una alerta desde cualquier lugar de la aplicación.
 * @param {string} message - El mensaje a mostrar.
 * @param {'success'|'error'|'warning'|'info'|'notification'} [type='info'] - El tipo de alerta.
 * @param {number} [duration=3000] - Duración en ms (0 para persistente).
 */
export const triggerAlert = (message, type = 'info', duration = 3000) => {
  if (alertEmitter) {
    alertEmitter(message, type, duration);
  } else {
    // Fallback si el sistema de alertas aún no está listo
    console.warn('Alert system not configured yet. Alert triggered via console:', { message, type });
    // Opcional: podrías usar un alert nativo como fallback
    // window.alert(`${type.toUpperCase()}: ${message}`);
  }
};


// Hook personalizado para manejar alertas
export const useAlert = () => {
  const [alerts, setAlerts] = useState([]);

  const showAlert = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const newAlert = { id, message, type, duration };
    setAlerts(prev => [...prev, newAlert]);
    return id;
  }, []);

  const hideAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  return { alerts, showAlert, hideAlert };
};

// Componente de alerta individual (Mobile-Optimized & Fixed)
const Alert = ({ alert, onClose }) => {
  const { id, message, type, duration } = alert;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const configs = {
    success: {
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-green-600',
      shadow: 'shadow-emerald-500/30',
      bgIcon: 'bg-emerald-600',
      textColor: 'text-white'
    },
    error: {
      icon: AlertCircle,
      gradient: 'from-red-500 to-rose-600',
      shadow: 'shadow-red-500/30',
      bgIcon: 'bg-red-600',
      textColor: 'text-white'
    },
    warning: {
      icon: AlertTriangle,
      gradient: 'from-amber-400 to-yellow-500',
      shadow: 'shadow-amber-400/30',
      bgIcon: 'bg-amber-500',
      textColor: 'text-gray-900'
    },
    notification: {
      icon: Info,
      gradient: 'from-orange-500 to-orange-600',
      shadow: 'shadow-orange-500/30',
      bgIcon: 'bg-orange-600',
      textColor: 'text-white'
    },
    info: {
      icon: Info,
      gradient: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/30',
      bgIcon: 'bg-blue-600',
      textColor: 'text-white'
    }
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;
  const isLightText = config.textColor === 'text-white';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 25 
      }}
      className={`
        relative flex items-center gap-3 px-4 py-3 rounded-xl
        bg-gradient-to-r ${config.gradient} ${config.textColor}
        shadow-xl ${config.shadow}
        border border-white/20 backdrop-blur-sm
        w-full max-w-sm
      `}
    >
      {/* Icono */}
      <div className={`
        flex-shrink-0 w-9 h-9 rounded-lg ${config.bgIcon} 
        flex items-center justify-center shadow-lg
      `}>
        <Icon size={18} className="text-white" />
      </div>

      {/* Mensaje */}
      <div className="flex-1 pr-8 min-w-0">
        <p className="text-sm font-semibold leading-snug break-words">
          {message}
        </p>
      </div>

      {/* Botón cerrar */}
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose(id);
        }}
        className={`
          absolute top-2 right-2 p-1 rounded-lg
          ${isLightText ? 'bg-white/20 hover:bg-white/30' : 'bg-black/10 hover:bg-black/20'}
          transition-colors duration-200
        `}
        whileTap={{ scale: 0.9 }}
      >
        <X size={16} className={isLightText ? 'text-white' : 'text-gray-900'} />
      </motion.button>

      {/* Barra de progreso (solo si hay duración) */}
      {duration > 0 && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-b-xl"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ 
            duration: duration / 1000, 
            ease: 'linear' 
          }}
        />
      )}
    </motion.div>
  );
};

// Componente contenedor de alertas (Mobile-Optimized & Fixed)
export const AlertContainer = ({ alerts, onClose }) => {
  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-[9999] pointer-events-none">
      <div className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {alerts.map(alert => (
            <div key={alert.id} className="pointer-events-auto">
              <Alert alert={alert} onClose={onClose} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Demo Component - Para probar el sistema
export default function AlertDemo() {
  const { alerts, showAlert, hideAlert } = useAlert();

  const testAlerts = [
    { label: '✅ Success', type: 'success', msg: '¡Operación completada exitosamente!' },
    { label: '❌ Error', type: 'error', msg: 'Ha ocurrido un error inesperado' },
    { label: '⚠️ Warning', type: 'warning', msg: 'Por favor, verifica tu información' },
    { label: '🔔 Notif', type: 'notification', msg: 'Tienes una nueva notificación' },
    { label: 'ℹ️ Info', type: 'info', msg: 'Esta es información importante' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffe4c4] via-[#ffe7de] to-[#ffd3c3] p-4 sm:p-8">
      <AlertContainer alerts={alerts} onClose={hideAlert} />
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#ff7f50] mb-2">
            Sistema de Alertas
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Prueba los diferentes tipos de alertas haciendo clic en los botones
          </p>
          
          {/* Botones de prueba */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {testAlerts.map((test, index) => (
              <button
                key={index}
                onClick={() => showAlert(test.msg, test.type, 3000)}
                className={`
                  px-4 py-3 rounded-xl font-semibold text-sm
                  shadow-lg hover:shadow-xl active:scale-95
                  transition-all duration-200
                  ${test.type === 'success' && 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'}
                  ${test.type === 'error' && 'bg-gradient-to-r from-red-500 to-rose-500 text-white'}
                  ${test.type === 'warning' && 'bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900'}
                  ${test.type === 'notification' && 'bg-gradient-to-r from-orange-400 to-orange-500 text-white'}
                  ${test.type === 'info' && 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'}
                `}
              >
                {test.label}
              </button>
            ))}
          </div>

          {/* Botón persistente */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => showAlert('Alerta persistente - Haz clic en X para cerrar', 'info', 0)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 text-sm"
            >
              🔄 Alerta Persistente
            </button>
          </div>

          {/* Botón múltiples alertas */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => {
                showAlert('Primera alerta', 'success', 5000);
                setTimeout(() => showAlert('Segunda alerta', 'warning', 5000), 300);
                setTimeout(() => showAlert('Tercera alerta', 'info', 5000), 600);
              }}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 text-sm"
            >
              🎉 Mostrar Múltiples
            </button>
          </div>
        </div>

        {/* Documentación */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-[#ff7f50] mb-4">
            📖 Cómo usar
          </h2>
          
          <div className="space-y-4">
            {/* Paso 1 */}
            <div className="bg-gradient-to-r from-[#ffe4c4]/30 to-[#ffd3c3]/30 p-4 rounded-xl border-l-4 border-[#ff7f50]">
              <h3 className="font-bold text-sm sm:text-base mb-2 text-gray-800">
                1️⃣ Importa el hook y el contenedor
              </h3>
              <pre className="bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto text-xs sm:text-sm">
                <code>{`import { useAlert, AlertContainer } from './components/ui/CustomAlert';`}</code>
              </pre>
            </div>

            {/* Paso 2 */}
            <div className="bg-gradient-to-r from-[#ffe4c4]/30 to-[#ffd3c3]/30 p-4 rounded-xl border-l-4 border-[#ff7f50]">
              <h3 className="font-bold text-sm sm:text-base mb-2 text-gray-800">
                2️⃣ Usa el hook en tu componente
              </h3>
              <pre className="bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto text-xs sm:text-sm">
                <code>{`const { alerts, showAlert, hideAlert } = useAlert();`}</code>
              </pre>
            </div>

            {/* Paso 3 */}
            <div className="bg-gradient-to-r from-[#ffe4c4]/30 to-[#ffd3c3]/30 p-4 rounded-xl border-l-4 border-[#ff7f50]">
              <h3 className="font-bold text-sm sm:text-base mb-2 text-gray-800">
                3️⃣ Agrega el contenedor en tu JSX
              </h3>
              <pre className="bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto text-xs sm:text-sm">
                <code>{`<AlertContainer alerts={alerts} onClose={hideAlert} />`}</code>
              </pre>
            </div>

            {/* Paso 4 */}
            <div className="bg-gradient-to-r from-[#ffe4c4]/30 to-[#ffd3c3]/30 p-4 rounded-xl border-l-4 border-[#ff7f50]">
              <h3 className="font-bold text-sm sm:text-base mb-2 text-gray-800">
                4️⃣ Muestra alertas
              </h3>
              <pre className="bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto text-xs sm:text-sm">
                <code>{`showAlert('Tu mensaje aquí', 'success', 3000);`}</code>
              </pre>
              <div className="mt-3 space-y-2">
                <p className="text-xs sm:text-sm text-gray-700">
                  <strong>Tipos disponibles:</strong> <code className="bg-gray-100 px-2 py-0.5 rounded">success</code>, <code className="bg-gray-100 px-2 py-0.5 rounded">error</code>, <code className="bg-gray-100 px-2 py-0.5 rounded">warning</code>, <code className="bg-gray-100 px-2 py-0.5 rounded">notification</code>, <code className="bg-gray-100 px-2 py-0.5 rounded">info</code>
                </p>
                <p className="text-xs sm:text-sm text-gray-700">
                  <strong>Duración:</strong> milisegundos (3000 = 3 segundos). Usa <code className="bg-gray-100 px-2 py-0.5 rounded">0</code> para alertas persistentes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}