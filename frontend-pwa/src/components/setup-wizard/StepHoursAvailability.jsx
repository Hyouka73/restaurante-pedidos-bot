import { motion } from 'framer-motion';
import { Clock, Info, Sparkles, Calendar } from 'lucide-react';
import * as WizardComponents from '../ui/WizardComponents';

export default function StepHoursAvailability({ formData, setFormData, handleChange, handleHourChange }) {
  const dayNames = {
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mié',
    thursday: 'Jue',
    friday: 'Vie',
    saturday: 'Sáb',
    sunday: 'Dom'
  };

  const dayNamesFull = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  const dayEmojis = {
    monday: '📅',
    tuesday: '📅',
    wednesday: '📅',
    thursday: '📅',
    friday: '🎉',
    saturday: '🎉',
    sunday: '😴'
  };

  const tooltips = {
    hybrid: "Combina horarios fijos con control manual. Ideal para negocios con horarios regulares pero flexibles.",
    fixed_hours: "El sistema abre y cierra automáticamente según los horarios establecidos.",
    always_open: "Tu negocio acepta pedidos 24/7 sin restricciones.",
    manual_control: "Tú decides manualmente cuándo abrir y cerrar cada día."
  };

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 sm:space-y-6"
    >
      <WizardComponents.WizardSectionHeader 
        icon={Clock} 
        title="Horarios"
        subtitle="Define cuándo atenderás pedidos"
      />

      {/* Card de Modo de Disponibilidad */}
      <WizardComponents.WizardCard>
        <WizardComponents.WizardSelectField
          label="Modo de Disponibilidad"
          value={formData.availabilitySettings.mode}
          onChange={(e) => handleChange('availabilitySettings', 'mode', e.target.value)}
          icon={Clock}
          tooltipText={tooltips[formData.availabilitySettings.mode]}
          tooltipId="availability-mode"
          helperText="Elige cómo gestionarás tu disponibilidad"
        >
          <option value="fixed_hours">⏰ Horarios Fijos</option>
          <option value="always_open">🌟 Siempre Abierto</option>
          <option value="manual_control">🎮 Control Manual</option>
          <option value="hybrid">🔄 Híbrido (Recomendado)</option>
        </WizardComponents.WizardSelectField>

        {formData.availabilitySettings.mode === 'hybrid' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2 sm:space-y-3 mt-3 sm:mt-4"
          >
            <WizardComponents.WizardCheckboxField
              label="📋 Usar horarios para recordatorios"
              checked={formData.availabilitySettings.useScheduledHours}
              onChange={(e) => handleChange('availabilitySettings', 'useScheduledHours', e.target.checked)}
            />
            <WizardComponents.WizardCheckboxField
              label="🔔 Recordarme si olvido abrir"
              checked={formData.availabilitySettings.remindersEnabled}
              onChange={(e) => handleChange('availabilitySettings', 'remindersEnabled', e.target.checked)}
            />
          </motion.div>
        )}
      </WizardComponents.WizardCard>

      {/* Info Box sobre el modo seleccionado */}
      <WizardComponents.WizardInfoBox icon={Info} variant="info">
        <p className="font-semibold mb-1">
          {formData.availabilitySettings.mode === 'hybrid' && '🔄 Modo Híbrido'}
          {formData.availabilitySettings.mode === 'fixed_hours' && '⏰ Horarios Fijos'}
          {formData.availabilitySettings.mode === 'always_open' && '🌟 Siempre Abierto'}
          {formData.availabilitySettings.mode === 'manual_control' && '🎮 Control Manual'}
        </p>
        <p className="text-xs mt-1">
          {tooltips[formData.availabilitySettings.mode]}
        </p>
      </WizardComponents.WizardInfoBox>

      {/* Card de Horarios por Día */}
      <WizardComponents.WizardCard>
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff7f50]" />
          <h4 className="font-bold text-sm sm:text-lg text-gray-800">Horarios por Día</h4>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {Object.entries(formData.hours).map(([day, schedule], index) => (
            <motion.div
              key={day}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              <div className={`
                flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border-2 
                transition-all duration-300
                ${schedule.closed 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-gradient-to-r from-[#ffe4c4]/30 to-[#ffd3c3]/30 border-[#ffb9a0]/50'
                }
              `}>
                {/* Fila superior: Día y checkbox */}
                <div className="flex items-center justify-between sm:justify-start sm:flex-1 gap-2">
                  {/* Emoji y Nombre del Día */}
                  <div className="flex items-center gap-2 min-w-[80px] sm:min-w-[100px]">
                    <span className="text-xl sm:text-2xl">{dayEmojis[day]}</span>
                    <span className={`font-bold text-xs sm:text-sm ${schedule.closed ? 'text-gray-400' : 'text-[#ff7f50]'}`}>
                      <span className="sm:hidden">{dayNames[day]}</span>
                      <span className="hidden sm:inline">{dayNamesFull[day]}</span>
                    </span>
                  </div>

                  {/* Checkbox Cerrado */}
                  <motion.label
                    whileTap={{ scale: 0.95 }}
                    className={`
                      flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg cursor-pointer transition-all
                      ${schedule.closed 
                        ? 'bg-red-100 border-2 border-red-300' 
                        : 'bg-white/70 border-2 border-gray-200'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={schedule.closed}
                      onChange={(e) => handleHourChange(day, 'closed', e.target.checked)}
                      className="checkbox checkbox-xs sm:checkbox-sm"
                      style={{ accentColor: schedule.closed ? '#dc2626' : '#ff7f50' }}
                    />
                    <span className={`text-xs font-bold ${schedule.closed ? 'text-red-700' : 'text-gray-600'}`}>
                      {schedule.closed ? 'Cerrado' : 'Abierto'}
                    </span>
                  </motion.label>
                </div>

                {/* Fila inferior: Inputs de Hora (solo si está abierto) */}
                {!schedule.closed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 justify-end sm:justify-start"
                  >
                    <div className="relative">
                      <input
                        type="time"
                        value={schedule.open}
                        onChange={(e) => handleHourChange(day, 'open', e.target.value)}
                        className="
                          h-9 w-24 sm:h-10 sm:w-28 px-2 sm:px-3 text-xs sm:text-sm font-semibold
                          bg-white border-2 border-[#ffe4c4] rounded-lg
                          outline-none focus:border-[#ff7f50] focus:ring-4 focus:ring-[#ffe4c4]/50
                          transition-all duration-300 shadow-sm
                        "
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#ff7f50]">—</span>
                    <div className="relative">
                      <input
                        type="time"
                        value={schedule.close}
                        onChange={(e) => handleHourChange(day, 'close', e.target.value)}
                        className="
                          h-9 w-24 sm:h-10 sm:w-28 px-2 sm:px-3 text-xs sm:text-sm font-semibold
                          bg-white border-2 border-[#ffe4c4] rounded-lg
                          outline-none focus:border-[#ff7f50] focus:ring-4 focus:ring-[#ffe4c4]/50
                          transition-all duration-300 shadow-sm
                        "
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </WizardComponents.WizardCard>

      {/* Info Box Final */}
      <WizardComponents.WizardInfoBox icon={Sparkles} variant="success">
        <p className="font-semibold mb-1">💡 Tip Profesional</p>
        <p className="text-xs">
          Define horarios realistas que puedas cumplir. Puedes ajustarlos después desde la configuración.
        </p>
      </WizardComponents.WizardInfoBox>
    </motion.div>
  );
}