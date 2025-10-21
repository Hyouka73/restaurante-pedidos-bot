// frontend-pwa/src/components/ui/WizardComponents.jsx
import { motion } from 'framer-motion';
import { Info, Check, X, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

// --- Componente Tooltip ---

export const WizardTooltip = ({ text, children, id, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});

  const showTooltip = (e) => {
    setIsVisible(true);
    // Calcular posición basada en la ventana
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    setTooltipStyle({
      position: 'fixed', // Usar fixed para evitar recortes
      top: `${rect.bottom + scrollTop + 5}px`, // 5px de margen debajo del elemento
      left: `${rect.left + scrollLeft + rect.width / 2}px`, // Centrado horizontalmente
      transform: 'translateX(-50%)', // Centrado
      zIndex: 50, // Asegurar que esté por encima
    });
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onClick={showTooltip}
        className="cursor-pointer"
      >
        {children}
      </div>
      {isVisible && (
        <>
          {/* Overlay para cerrar al hacer clic fuera (opcional, mejora UX táctil) */}
          <div
            className="fixed inset-0 z-40"
            onClick={hideTooltip}
          ></div>
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
            className="absolute p-3 text-xs text-white bg-[#ff7f50] rounded-lg shadow-lg w-64" // w-64 para ancho fijo
            style={tooltipStyle} // Aplicar estilo calculado
          >
            <div className="relative">
              {text}
              {/* Triángulo */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-[#ff7f50]"></div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

// --- Componente ProgressBar ---
export const WizardProgressBar = ({ current, total }) => (
  <div className="w-full h-2 bg-[#ffe4c4]/50 rounded-full overflow-hidden mb-6">
    <motion.div
      className="h-full bg-gradient-to-r from-[#ffae91] to-[#ff7f50]"
      initial={{ width: "0%" }}
      animate={{ width: `${(current / total) * 100}%` }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    />
  </div>
);

// --- Componente StepIndicator ---
export const WizardStepIndicator = ({ steps, currentStep, onStepClick = null }) => (
  <div className="hidden sm:flex justify-center gap-3 mb-6">
    {steps.map((_, index) => {
      const stepNumber = index + 1;
      let classes = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ";
      if (stepNumber === currentStep) {
        classes += "bg-gradient-to-r from-[#ffae91] to-[#ff7f50] text-white scale-110 ring-2 ring-[#ff7f50] ring-offset-2";
      } else if (stepNumber < currentStep) {
        classes += "bg-gradient-to-r from-[#ffae91]/75 to-[#ff7f50]/75 text-white";
      } else {
        classes += "bg-[#ffe4c4] text-[#ff7f50] border border-[#ffb9a0]";
      }
      return (
        <motion.div
          key={stepNumber}
          className={classes}
          whileHover={onStepClick ? { scale: 1.1 } : {}}
          whileTap={onStepClick ? { scale: 0.95 } : {}}
          onClick={onStepClick ? () => onStepClick(stepNumber) : undefined}
        >
          {stepNumber < currentStep ? <Check size={16} /> : stepNumber}
        </motion.div>
      );
    })}
  </div>
);

// --- Componente MiniDots ---
export const WizardMiniDots = ({ steps, currentStep }) => (
  <div className="flex justify-center items-center gap-1 flex-1">
    {steps.map((_, index) => {
      const stepNumber = index + 1;
      let dotClasses = "w-2 h-2 rounded-full transition-all duration-300 ";
      if (stepNumber === currentStep) {
        dotClasses += "w-6 bg-gradient-to-r from-[#ffae91] to-[#ff7f50] rounded";
      } else if (stepNumber < currentStep) {
        dotClasses += "bg-gradient-to-r from-[#ffae91]/75 to-[#ff7f50]/75";
      } else {
        dotClasses += "bg-[#ffe4c4]";
      }
      return <motion.div key={stepNumber} className={dotClasses} layoutId="wizard-step-dot" />;
    })}
  </div>
);

// --- Componente SectionHeader ---
export const WizardSectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-3 pb-3 mb-5 border-b border-[#ffb9a0]">
    <div className="w-10 h-10 bg-gradient-to-br from-[#ffae91]/30 to-[#ff7f50]/30 rounded-lg flex items-center justify-center text-[#ff7f50]">
      <Icon size={20} />
    </div>
    <h3 className="text-xl font-bold text-[#ff7f50]">{title}</h3>
  </div>
);

// --- Componente InputField ---
export const WizardInputField = ({ label, value, onChange, placeholder, type = "text", required = false, className = "", icon: Icon, ...props }) => {
  // --- CORRECCIÓN: Asegurar que `value` siempre sea un string ---
  // Esto evita el error "A component is changing a controlled input to be uncontrolled"
  const inputValue = value ?? ''; // Usa el operador de coalescencia nula
  // ---------------------------------------------------------------

  return (
    <div className="form-control w-full">
      {label && (
        <label className="label pb-1">
          <span className="label-text text-sm font-medium text-gray-700">
            {label} {required && <span className="text-error">*</span>}
          </span>
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        )}
        <input
          type={type}
          // value={value} // <-- Reemplazar esta línea
          value={inputValue} // <-- Con esta
          onChange={onChange}
          placeholder={placeholder}
          className={`input input-bordered w-full ${Icon ? 'pl-12' : ''} ${className}`}
          style={{ backgroundColor: 'rgba(255, 228, 196, 0.3)' }}
          {...props}
        />
      </div>
    </div>
  );
};

// --- Componente TextAreaField ---
export const WizardTextAreaField = ({ label, value, onChange, placeholder, rows = 3, className = "", ...props }) => (
  <div className="form-control w-full">
    {label && (
      <label className="label pb-1">
        <span className="label-text text-sm font-medium text-gray-700">
          {label}
        </span>
      </label>
    )}
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`textarea textarea-bordered w-full ${className}`}
      style={{ backgroundColor: 'rgba(255, 228, 196, 0.3)' }}
      rows={rows}
      {...props}
    />
  </div>
);

// --- Componente SelectField ---
export const WizardSelectField = ({ label, value, onChange, children, className = "", tooltipText, tooltipId, icon: Icon, ...props }) => (
  <div className="form-control w-full">
    {label && (
      <label className="label pb-1 flex justify-between items-center">
        <span className="label-text text-sm font-medium text-gray-700">
          {label}
        </span>
        {tooltipText && (
          <WizardTooltip text={tooltipText} id={tooltipId}>
            <button type="button" className="btn btn-xs btn-circle btn-ghost text-gray-500 hover:text-[#ff7f50]">
              <Info size={16} />
            </button>
          </WizardTooltip>
        )}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      )}
      <select
        value={value}
        onChange={onChange}
        className={`select select-bordered w-full ${Icon ? 'pl-12' : ''} ${className}`}
        style={{ backgroundColor: 'rgba(255, 228, 196, 0.3)' }}
        {...props}
      >
        {children}
      </select>
    </div>
  </div>
);

// --- Componente CheckboxField ---
export const WizardCheckboxField = ({ label, checked, onChange, className = "", ...props }) => (
  <div className={`flex items-center ps-4 border border-gray-200 rounded-lg ${className}`} style={{ backgroundColor: 'rgba(255, 228, 196, 0.2)' }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="checkbox checkbox-primary"
      {...props}
    />
    <label className="w-full py-3 ms-2 text-sm font-medium text-gray-700">
      {label}
    </label>
  </div>
);

// --- Componente ErrorBox ---
export const WizardErrorBox = ({ error, onDismiss }) => (
  error && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative mb-6 p-4 pr-12 rounded-lg border-2 border-red-300 bg-red-50 text-red-700"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
        <p className="text-sm font-medium">{error}</p>
      </div>
      <motion.button
        onClick={onDismiss}
        className="absolute right-3 top-3 p-1 rounded-md border border-red-400 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <X className="w-4 h-4" />
      </motion.button>
    </motion.div>
  )
);