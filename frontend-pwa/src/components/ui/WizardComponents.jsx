//src/components/ui/WizardComponents.jsx
import { motion } from 'framer-motion';
import { Info, Check, X, AlertTriangle } from 'lucide-react';
import { useState } from 'react';


// --- Componente ProgressBar ---
export const WizardProgressBar = ({ current, total }) => (
  <div className="w-full h-3 bg-white/80 rounded-full overflow-hidden mb-6 shadow-inner border border-[#ffe4c4]">
    <motion.div
      className="h-full bg-gradient-to-r from-[#ffae91] via-[#ff7f50] to-[#ff6347] shadow-lg"
      initial={{ width: "0%" }}
      animate={{ width: `${(current / total) * 100}%` }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    />
  </div>
);

// --- Componente SectionHeader ---
export const WizardSectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="mb-6">
    <div className="flex items-center gap-3 pb-4">
      <div className="w-12 h-12 bg-gradient-to-br from-[#ff7f50] to-[#ff6347] rounded-xl flex items-center justify-center text-white shadow-lg">
        <Icon size={24} />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-[#ff7f50]">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
    </div>
    <div className="h-1 w-full bg-gradient-to-r from-[#ff7f50] via-[#ffb9a0] to-transparent rounded-full" />
  </div>
);

// --- Componente InputField ---
export const WizardInputField = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = "text", 
  required = false, 
  className = "", 
  icon: Icon,
  helperText,
  error,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputValue = value ?? '';

  return (
    <div className="form-control w-full mb-4">
      {label && (
        <label className="label pb-2">
          <span className="label-text text-sm font-semibold text-gray-700 flex items-center gap-1">
            {label} 
            {required && <span className="text-[#ff7f50] text-lg">*</span>}
          </span>
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <motion.div
            animate={{ scale: isFocused ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
            className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none transition-colors ${
              isFocused ? 'text-[#ff7f50]' : 'text-gray-400'
            }`}
          >
            <Icon size={20} />
          </motion.div>
        )}
        <input
          type={type}
          value={inputValue}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 ${Icon ? 'pl-12' : ''} 
            bg-white border-2 rounded-xl
            font-medium text-gray-800 placeholder-gray-400
            transition-all duration-300 outline-none
            shadow-sm hover:shadow-md
            ${error 
              ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
              : isFocused 
                ? 'border-[#ff7f50] ring-4 ring-[#ffe4c4]/50' 
                : 'border-[#ffe4c4] hover:border-[#ffb9a0]'
            }
            ${className}
          `}
          {...props}
        />
        {isFocused && !error && (
          <motion.div
            layoutId="input-focus-indicator"
            className="absolute inset-0 rounded-xl border-2 border-[#ff7f50] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}
      </div>
      {helperText && !error && (
        <p className="text-xs text-gray-500 mt-1.5 ml-1">{helperText}</p>
      )}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-600 mt-1.5 ml-1 font-medium flex items-center gap-1"
        >
          <AlertTriangle size={12} />
          {error}
        </motion.p>
      )}
    </div>
  );
};

// --- Componente TextAreaField ---
export const WizardTextAreaField = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  rows = 3, 
  className = "",
  helperText,
  error,
  maxLength,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const currentLength = value?.length || 0;

  return (
    <div className="form-control w-full mb-4">
      {label && (
        <label className="label pb-2 flex justify-between items-center">
          <span className="label-text text-sm font-semibold text-gray-700">
            {label}
          </span>
          {maxLength && (
            <span className={`text-xs font-medium ${
              currentLength > maxLength ? 'text-red-500' : 'text-gray-400'
            }`}>
              {currentLength}/{maxLength}
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <textarea
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className={`
            w-full px-4 py-3 
            bg-white border-2 rounded-xl
            font-medium text-gray-800 placeholder-gray-400
            transition-all duration-300 outline-none resize-none
            shadow-sm hover:shadow-md
            ${error 
              ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
              : isFocused 
                ? 'border-[#ff7f50] ring-4 ring-[#ffe4c4]/50' 
                : 'border-[#ffe4c4] hover:border-[#ffb9a0]'
            }
            ${className}
          `}
          {...props}
        />
      </div>
      {helperText && !error && (
        <p className="text-xs text-gray-500 mt-1.5 ml-1">{helperText}</p>
      )}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-600 mt-1.5 ml-1 font-medium flex items-center gap-1"
        >
          <AlertTriangle size={12} />
          {error}
        </motion.p>
      )}
    </div>
  );
};

// --- Componente SelectField ---
export const WizardSelectField = ({ 
  label, 
  value, 
  onChange, 
  children, 
  className = "", 
  tooltipText, 
  tooltipId, 
  icon: Icon,
  error,
  helperText,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="form-control w-full mb-4">
      {label && (
        <label className="label pb-2 flex justify-between items-center">
          <span className="label-text text-sm font-semibold text-gray-700">
            {label}
          </span>
          {tooltipText && (
            <WizardTooltip text={tooltipText} id={tooltipId}>
              <button type="button" className="btn btn-xs btn-circle btn-ghost text-gray-500 hover:text-[#ff7f50] hover:bg-[#ffe4c4]/50">
                <Info size={16} />
              </button>
            </WizardTooltip>
          )}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <motion.div
            animate={{ scale: isFocused ? 1.1 : 1 }}
            className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none transition-colors ${
              isFocused ? 'text-[#ff7f50]' : 'text-gray-400'
            }`}
          >
            <Icon size={20} />
          </motion.div>
        )}
        <select
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full px-4 py-3 ${Icon ? 'pl-12' : ''} 
            bg-white border-2 rounded-xl
            font-medium text-gray-800
            transition-all duration-300 outline-none
            shadow-sm hover:shadow-md cursor-pointer
            ${error 
              ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
              : isFocused 
                ? 'border-[#ff7f50] ring-4 ring-[#ffe4c4]/50' 
                : 'border-[#ffe4c4] hover:border-[#ffb9a0]'
            }
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
      </div>
      {helperText && !error && (
        <p className="text-xs text-gray-500 mt-1.5 ml-1">{helperText}</p>
      )}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-600 mt-1.5 ml-1 font-medium flex items-center gap-1"
        >
          <AlertTriangle size={12} />
          {error}
        </motion.p>
      )}
    </div>
  );
};

// --- Componente CheckboxField ---
export const WizardCheckboxField = ({ label, checked, onChange, className = "", disabled = false, ...props }) => (
  <motion.label
    whileHover={!disabled ? { scale: 1.01 } : {}}
    whileTap={!disabled ? { scale: 0.99 } : {}}
    className={`
      flex items-center gap-3 p-4 rounded-xl cursor-pointer
      bg-white border-2 transition-all duration-300
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
      ${checked 
        ? 'border-[#ff7f50] bg-gradient-to-r from-[#ffe4c4]/30 to-[#ffd3c3]/30' 
        : 'border-[#ffe4c4] hover:border-[#ffb9a0]'
      }
      ${className}
    `}
  >
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
        {...props}
      />
      <div className={`
        w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300
        ${checked 
          ? 'bg-gradient-to-br from-[#ff7f50] to-[#ff6347] border-[#ff7f50] shadow-md' 
          : 'bg-white border-gray-300'
        }
      `}>
        {checked && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Check size={16} className="text-white font-bold" />
          </motion.div>
        )}
      </div>
    </div>
    <span className="text-sm font-medium text-gray-700 flex-1">
      {label}
    </span>
  </motion.label>
);

// --- Componente ErrorBox ---
export const WizardErrorBox = ({ error, onDismiss }) => (
  error && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative mb-6 p-4 pr-12 rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-red-100 text-red-700 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-200 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium flex-1">{error}</p>
      </div>
      <motion.button
        onClick={onDismiss}
        className="absolute right-3 top-3 p-1.5 rounded-lg bg-red-200 hover:bg-red-300 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <X className="w-4 h-4" />
      </motion.button>
    </motion.div>
  )
);

// --- Componente Card Container ---
export const WizardCard = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-xl border-2 border-[#ffe4c4] p-6 ${className}`}>
    {children}
  </div>
);

// --- Componente Info Box ---
export const WizardInfoBox = ({ children, icon: Icon, variant = "info" }) => {
  const variants = {
    info: {
      bg: "from-blue-50 to-indigo-50",
      border: "border-blue-200",
      icon: "text-blue-600",
      iconBg: "bg-blue-100"
    },
    success: {
      bg: "from-green-50 to-emerald-50",
      border: "border-green-200",
      icon: "text-green-600",
      iconBg: "bg-green-100"
    },
    warning: {
      bg: "from-amber-50 to-orange-50",
      border: "border-[#ffb9a0]",
      icon: "text-[#ff7f50]",
      iconBg: "bg-[#ffe4c4]"
    }
  };

  const config = variants[variant];

  return (
    <div className={`bg-gradient-to-br ${config.bg} border-2 ${config.border} rounded-xl p-5 shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${config.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className={config.icon} />
        </div>
        <div className="flex-1 text-sm text-gray-700">
          {children}
        </div>
      </div>
    </div>
  );
};