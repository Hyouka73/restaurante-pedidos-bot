import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Componente Tooltip Mejorado ---
export const CustomTooltip = ({ 
  text, 
  children, 
  className = "", 
  position = "top",
  disabled = false 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Detectar si el tooltip se sale de la pantalla y ajustar
  useEffect(() => {
    if (isVisible && tooltipRef.current && containerRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newPosition = position;

      // Verificar si se sale horizontalmente
      if (position === 'top' || position === 'bottom') {
        const tooltipLeft = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2;
        if (tooltipLeft < 8) {
          newPosition = 'right';
        } else if (tooltipLeft + tooltipRect.width > viewportWidth - 8) {
          newPosition = 'left';
        }
      }

      // Verificar si se sale verticalmente
      if (position === 'top' && containerRect.top - tooltipRect.height - 12 < 8) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && containerRect.bottom + tooltipRect.height + 12 > viewportHeight - 8) {
        newPosition = 'top';
      }

      setAdjustedPosition(newPosition);
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    if (disabled) return;
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150);
  };

  const handleClick = (e) => {
    if (disabled) return;
    e.stopPropagation();
    clearTimeout(hoverTimeoutRef.current);
    setIsVisible(!isVisible);
  };

  useEffect(() => {
    return () => clearTimeout(hoverTimeoutRef.current);
  }, []);

  // Clases de posicionamiento según la posición ajustada
  const getPositionClasses = () => {
    switch (adjustedPosition) {
      case 'bottom':
        return 'top-full mt-2 left-1/2 -translate-x-1/2';
      case 'left':
        return 'right-full mr-2 top-1/2 -translate-y-1/2';
      case 'right':
        return 'left-full ml-2 top-1/2 -translate-y-1/2';
      case 'top':
      default:
        return 'bottom-full mb-2 left-1/2 -translate-x-1/2';
    }
  };

  // Flecha según posición
  const getArrowClasses = () => {
    switch (adjustedPosition) {
      case 'bottom':
        return 'absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-[#ff7f50]';
      case 'left':
        return 'absolute left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-[#ff7f50]';
      case 'right':
        return 'absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-[#ff7f50]';
      case 'top':
      default:
        return 'absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#ff7f50]';
    }
  };

  if (disabled || !text) {
    return <>{children}</>;
  }

  return (
    <div 
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        onClick={handleClick}
        className="cursor-pointer"
      >
        {children}
      </div>
      
      <AnimatePresence>
        {isVisible && (
          <>
            {/* Backdrop para cerrar al hacer click fuera */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsVisible(false)}
            />
            
            {/* Tooltip */}
            <motion.div
              ref={tooltipRef}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`
                absolute ${getPositionClasses()} 
                p-3 text-xs leading-relaxed text-white bg-[#ff7f50] rounded-lg shadow-2xl 
                w-64 max-w-[calc(100vw-2rem)] z-50 pointer-events-auto
              `}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {text}
              <div className={getArrowClasses()} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomTooltip;