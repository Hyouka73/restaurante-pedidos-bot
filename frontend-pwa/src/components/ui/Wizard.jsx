import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import * as WizardComponents from './WizardComponents';
import MiniDots from './MiniDots';

export default function Wizard({
  steps,
  currentStep,
  onNext,
  onBack,
  onSubmit,
  isSubmitting,
  submitLabel = "Finalizar",
  children,
  className = "",
  error = null,
  onDismissError = null
}) {
  const totalSteps = steps.length;

  return (
    <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-[#ffe4c4] overflow-hidden ${className}`}>
      <div className="card-body p-4 sm:p-6 md:p-10">
        {/* Mostrar error si existe */}
        {error && onDismissError && (
          <div className="mb-4 sm:mb-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative p-3 sm:p-4 pr-10 sm:pr-12 rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-red-100 text-red-700 shadow-lg"
            >
              <p className="text-xs sm:text-sm font-medium">{error}</p>
              <motion.button
                onClick={onDismissError}
                className="absolute right-2 top-2 sm:right-3 sm:top-3 p-1 sm:p-1.5 rounded-lg bg-red-200 hover:bg-red-300 transition-colors"
                whileTap={{ scale: 0.9 }}
              >
                <Check size={14} className="sm:w-4 sm:h-4" />
              </motion.button>
            </motion.div>
          </div>
        )}

        {/* Cabecera del Paso - Mobile Optimized */}
        <div className="bg-gradient-to-r from-[#ffe4c4] via-[#ffd3c3] to-[#ffb9a0] rounded-xl sm:rounded-2xl px-4 py-4 sm:px-6 sm:py-5 mb-4 sm:mb-6 shadow-md border border-[#ffb9a0]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-xl sm:text-2xl font-bold text-[#ff7f50]">{currentStep}</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-[#ff7f50] truncate">
                  Paso {currentStep} de {totalSteps}
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  {Math.round((currentStep / totalSteps) * 100)}% completado
                </p>
              </div>
            </div>
            
            {/* Indicadores de paso (solo en desktop) */}
            <div className="hidden lg:flex items-center gap-2">
              {steps.slice(0, Math.min(4, totalSteps)).map((_, index) => {
                const stepNum = index + 1;
                return (
                  <div
                    key={stepNum}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                      stepNum === currentStep
                        ? 'bg-white text-[#ff7f50] shadow-lg scale-110'
                        : stepNum < currentStep
                        ? 'bg-[#ff7f50] text-white'
                        : 'bg-white/50 text-gray-400'
                    }`}
                  >
                    {stepNum < currentStep ? <Check size={16} /> : stepNum}
                  </div>
                );
              })}
              {totalSteps > 4 && (
                <>
                  <span className="text-[#ff7f50] font-bold">...</span>
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                      totalSteps === currentStep
                        ? 'bg-white text-[#ff7f50] shadow-lg scale-110'
                        : 'bg-white/50 text-gray-400'
                    }`}
                  >
                    {totalSteps < currentStep ? <Check size={16} /> : totalSteps}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Progreso */}
        <WizardComponents.WizardProgressBar current={currentStep} total={totalSteps} />

        {/* Contenido del Paso */}
        <div className="min-h-[350px] sm:min-h-[450px] bg-gradient-to-br from-[#fffaf5] to-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-[#ffe4c4]/30">
          <AnimatePresence mode="wait">
            {children}
          </AnimatePresence>
        </div>

        {/* Botones de Navegación - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t-2 border-[#ffe4c4]">
          <motion.button
            onClick={onBack}
            disabled={currentStep === 1}
            className={`
              order-2 sm:order-1
              px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl font-bold transition-all duration-300 
              flex items-center justify-center gap-2 text-sm sm:text-base
              ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                  : 'bg-white border-2 border-[#ff7f50] text-[#ff7f50] hover:bg-[#ff7f50] hover:text-white shadow-md hover:shadow-lg active:scale-95'
              }
            `}
            whileTap={currentStep !== 1 ? { scale: 0.95 } : {}}
          >
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" /> 
            <span>Anterior</span>
          </motion.button>

          {/* Mini Dots - Hidden on mobile */}
          <div className="hidden sm:flex flex-1 justify-center order-2">
            <MiniDots steps={steps} currentStep={currentStep} />
          </div>

          {currentStep < totalSteps ? (
            <motion.button
              onClick={onNext}
              className="
                order-1 sm:order-3
                px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl font-bold text-white shadow-lg hover:shadow-xl 
                transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base
                bg-gradient-to-r from-[#ff7f50] via-[#ff6347] to-[#ff7f50]
                active:scale-95
              "
              style={{
                backgroundSize: '200% 100%'
              }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Siguiente</span>
              <ChevronRight size={18} className="sm:w-5 sm:h-5" />
            </motion.button>
          ) : (
            <motion.button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="
                order-1 sm:order-3
                px-8 py-3 sm:px-10 sm:py-3.5 rounded-xl font-bold text-white shadow-xl hover:shadow-2xl 
                transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base
                disabled:opacity-50 disabled:cursor-not-allowed
                bg-gradient-to-r from-[#ff7f50] via-[#ff6347] to-[#ff7f50]
                active:scale-95
              "
              style={{
                backgroundSize: '200% 100%'
              }}
              whileTap={!isSubmitting ? { scale: 0.95 } : {}}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Guardando...</span>
                  <span className="sm:hidden">Guardando...</span>
                </>
              ) : (
                <>
                  <Check size={18} className="sm:w-5 sm:h-5" /> 
                  <span>{submitLabel}</span>
                </>
              )}
            </motion.button>
          )}
        </div>

        {/* Progress Dots for Mobile */}
        <div className="flex sm:hidden justify-center mt-4">
          <div className="flex items-center gap-1.5">
            {steps.map((_, index) => {
              const stepNumber = index + 1;
              return (
                <div
                  key={stepNumber}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    stepNumber === currentStep
                      ? 'w-8 bg-gradient-to-r from-[#ffae91] to-[#ff7f50]'
                      : stepNumber < currentStep
                      ? 'w-2 bg-[#ff7f50]/70'
                      : 'w-2 bg-[#ffe4c4]'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}