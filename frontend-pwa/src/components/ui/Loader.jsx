// frontend-pwa/src/components/ui/Loader.jsx
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * Componente de carga reutilizable con diferentes variantes
 * @param {string} variant - Tipo de loader: 'spinner', 'dots', 'pulse', 'full' (default: 'spinner')
 * @param {string} size - Tamaño: 'sm', 'md', 'lg', 'xl' (default: 'md')
 * @param {string} message - Mensaje opcional a mostrar
 * @param {boolean} fullScreen - Si true, ocupa toda la pantalla
 */
export default function Loader({ 
  variant = 'spinner', 
  size = 'md', 
  message = '', 
  fullScreen = false 
}) {
  const sizes = {
    sm: { width: 'w-8 h-8', text: 'text-sm' },
    md: { width: 'w-12 h-12', text: 'text-base' },
    lg: { width: 'w-16 h-16', text: 'text-lg' },
    xl: { width: 'w-24 h-24', text: 'text-xl' }
  };

  const currentSize = sizes[size] || sizes.md;

  const containerClass = fullScreen
    ? 'fixed inset-0 bg-gradient-to-br from-[#ffe4c4] via-[#ffd3c3] to-[#ffb8a1] flex items-center justify-center z-50'
    : 'flex items-center justify-center p-4';

  // Variante: Spinner con icono
  if (variant === 'spinner') {
    return (
      <div className={containerClass}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mx-auto mb-4"
          >
            <Loader2 className={`${currentSize.width} text-[#ff7f50]`} />
          </motion.div>
          {message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`${currentSize.text} text-gray-700 font-medium`}
            >
              {message}
            </motion.p>
          )}
        </div>
      </div>
    );
  }

  // Variante: Puntos animados
  if (variant === 'dots') {
    return (
      <div className={containerClass}>
        <div className="text-center">
          <div className="flex items-center gap-2 mb-4">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-4 h-4 bg-[#ff7f50] rounded-full"
                animate={{
                  y: [0, -20, 0],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: index * 0.15
                }}
              />
            ))}
          </div>
          {message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`${currentSize.text} text-gray-700 font-medium`}
            >
              {message}
            </motion.p>
          )}
        </div>
      </div>
    );
  }

  // Variante: Pulso circular
  if (variant === 'pulse') {
    return (
      <div className={containerClass}>
        <div className="text-center">
          <div className="relative mx-auto mb-4" style={{ width: currentSize.width.split(' ')[0].replace('w-', '') * 4, height: currentSize.width.split(' ')[1].replace('h-', '') * 4 }}>
            <motion.div
              className={`absolute inset-0 bg-[#ff7f50] rounded-full opacity-75`}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.75, 0, 0.75]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
            <motion.div
              className={`absolute inset-0 bg-[#ff7f50] rounded-full opacity-75`}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.75, 0, 0.75]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.75
              }}
            />
          </div>
          {message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`${currentSize.text} text-gray-700 font-medium`}
            >
              {message}
            </motion.p>
          )}
        </div>
      </div>
    );
  }

  // Variante: Loader completo con branding (para pantalla completa)
  if (variant === 'full') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#ffe4c4] via-[#ffd3c3] to-[#ffb8a1] flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          {/* Logo animado */}
          <motion.div
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
              scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' }
            }}
            className="w-20 h-20 bg-gradient-to-br from-[#ff7f50] to-[#ff6347] rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-6"
          >
            <span className="text-4xl">🍽️</span>
          </motion.div>

          {/* Texto del nombre */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-gray-800 mb-2"
          >
            RestBot Admin
          </motion.h2>

          {/* Barra de progreso animada */}
          <div className="w-64 h-2 bg-white/50 rounded-full overflow-hidden mx-auto mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-[#ff7f50] to-[#ff6347]"
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              style={{ width: '50%' }}
            />
          </div>

          {/* Mensaje */}
          {message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-700 font-medium"
            >
              {message}
            </motion.p>
          )}

          {/* Puntos animados */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-2 h-2 bg-[#ff7f50] rounded-full"
                animate={{
                  y: [0, -10, 0],
                  opacity: [1, 0.5, 1]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: index * 0.2
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className={containerClass}>
      <div className="text-center">
        <div className={`${currentSize.width} border-4 border-[#ffe4c4] border-t-[#ff7f50] rounded-full animate-spin mx-auto mb-4`} />
        {message && (
          <p className={`${currentSize.text} text-gray-700 font-medium`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Loader específico para botones
 */
export function ButtonLoader({ size = 'sm' }) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`${sizeMap[size]} border-2 border-white border-t-transparent rounded-full`}
    />
  );
}

/**
 * Loader inline para textos
 */
export function InlineLoader({ message = 'Cargando' }) {
  return (
    <div className="inline-flex items-center gap-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-1.5 h-1.5 bg-[#ff7f50] rounded-full"
            animate={{
              y: [0, -8, 0],
              opacity: [1, 0.5, 1]
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: index * 0.15
            }}
          />
        ))}
      </div>
      <span className="text-sm text-gray-700 font-medium">{message}</span>
    </div>
  );
}