
import { useState, useEffect } from 'react';
import { WizardCard, WizardCheckboxField } from '../ui/WizardComponents';
import { CreditCard } from 'lucide-react';
import { ButtonLoader } from '../ui/Loader';
import { useAlert } from '../ui/CustomAlert';
import { api } from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';

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
    <WizardCard>
      <div className="flex items-center gap-3 pb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg">
          <CreditCard size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-amber-600">Métodos de Pago</h3>
          <p className="text-sm text-gray-600 mt-1">Selecciona los métodos que aceptas</p>
        </div>
      </div>
      <div className="space-y-2">
        {paymentMethods.map((method) => (
          <div key={method.id} className="flex items-center justify-between p-2 border-b">
            <span className="label-text">{method.name}</span>
            <WizardCheckboxField
              label="Habilitado"
              checked={method.enabled}
              onChange={(e) => handlePaymentMethodChange(method.id, 'enabled', e.target.checked)}
              className="!flex-row-reverse !items-center !justify-start !gap-2"
            />
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <ButtonLoader size="sm"/> : 'Guardar Métodos de Pago'}
        </button>
      </div>
    </WizardCard>
  );
};

export default PaymentMethodsForm;
