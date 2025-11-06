import { useState, useEffect } from 'react';
import { WizardSaveButton, WizardSwitch } from '../ui/WizardComponents';
import { CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { useAlert } from '../ui/CustomAlert';
import  api  from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';
import { motion } from 'framer-motion';

const PaymentMethodsForm = ({ initialData }) => {
  const [paymentMethods, setPaymentMethods] = useState(initialData.paymentMethods);
  const [saving, setSaving] = useState(false);
  const { data: restaurant } = useRestaurant();
  const { showAlert } = useAlert();

  useEffect(() => {
    setPaymentMethods(initialData.paymentMethods);
  }, [initialData]);

  const handlePaymentMethodChange = (id, field, value) => {
    const updatedMethods = paymentMethods.map(method =>
      method.id === id ? { ...method, [field]: value } : method
    );
    setPaymentMethods(updatedMethods);
  };

  const handleSave = async () => {
    if (!restaurant?.id) {
      showAlert('Error: No se pudo encontrar el ID del restaurante.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/config/${restaurant.id}/general`, { paymentMethods });
      showAlert('Métodos de pago guardados correctamente.', 'success');
    } catch (error) {
      showAlert(`Error al guardar: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-[#ffe4c4] p-3 sm:p-6 hover:shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="mb-6 pb-4 border-b-2 border-[#ffe4c4]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg">
            <CreditCard size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-amber-600">Métodos de Pago</h3>
            <p className="text-sm text-gray-600 mt-1">Selecciona los métodos que aceptas</p>
          </div>
        </div>
      </div>

      {/* Lista de métodos de pago */}
      <div className="space-y-3">
        {paymentMethods.map((method, index) => (
          <motion.div
            key={method.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              relative overflow-hidden
              bg-gradient-to-r rounded-xl p-4 border-2 transition-all duration-300
              ${method.enabled 
                ? 'from-green-50 to-emerald-50 border-green-300 hover:border-green-400' 
                : 'from-gray-50 to-gray-100 border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <label className="flex items-center justify-between cursor-pointer">
              {/* Nombre del método */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                  ${method.enabled 
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-md' 
                    : 'bg-gray-300'
                  }
                `}>
                  {method.enabled ? (
                    <CheckCircle size={20} className="text-white" />
                  ) : (
                    <XCircle size={20} className="text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-gray-700 block truncate">
                    {method.name}
                  </span>
                  <span className={`text-xs font-medium ${method.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {method.enabled ? 'Habilitado' : 'Deshabilitado'}
                  </span>
                </div>
              </div>

              {/* Toggle Switch */}
              <WizardSwitch
                checked={method.enabled}
                onChange={(e) => handlePaymentMethodChange(method.id, 'enabled', e.target.checked)}
                activeClass="bg-gradient-to-r from-green-400 to-emerald-500"
              />
            </label>
          </motion.div>
        ))}
      </div>

      {/* Resumen */}
      <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            Métodos habilitados:
          </span>
          <span className="text-2xl font-bold text-amber-600">
            {paymentMethods.filter(m => m.enabled).length} / {paymentMethods.length}
          </span>
        </div>
      </div>

      {/* Botón de guardar */}
      <div className="mt-8 pt-6 border-t-2 border-[#ffe4c4] flex justify-end">
        <WizardSaveButton 
          onClick={handleSave}
          loading={saving}
          className="w-full sm:w-auto min-w-[220px]"
        >
          Guardar Métodos de Pago
        </WizardSaveButton>
      </div>
    </div>
  );
};

export default PaymentMethodsForm;