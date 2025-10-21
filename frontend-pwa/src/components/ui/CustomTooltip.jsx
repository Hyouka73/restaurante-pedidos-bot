// frontend-pwa/src/components/ui/CustomTooltip.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Si lo tienes instalado
// Si no tienes framer-motion, puedes usar transiciones simples de Tailwind

const CustomTooltip = ({ text, children, id, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="cursor-pointer"
      >
        {children}
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 text-xs text-white bg-[#105652] rounded-lg shadow-lg"
          >
            {text}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-[#105652]"></div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sin AnimatePresence/Framer: 
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 text-xs text-white bg-[#105652] rounded-lg shadow-lg transition-opacity duration-200 ease-in-out">
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-[#105652]"></div>
        </div>
      )} */}
    </div>
  );
};

export default CustomTooltip;