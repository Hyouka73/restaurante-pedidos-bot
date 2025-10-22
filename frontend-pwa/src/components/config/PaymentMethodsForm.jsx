// frontend-pwa/src/components/config/PaymentMethodsForm.jsx
import { WizardCard, WizardCheckboxField } from '../ui/WizardComponents'; // Ajusta la ruta
import { CreditCard, DollarSign } from 'lucide-react';

const PaymentMethodsForm = ({ config, onChange }) => {
  const handlePaymentMethodChange = (id, field, value) => {
    const updatedMethods = config.paymentMethods.map(method =>
      method.id === id ? { ...method, [field]: value } : method
    );
    onChange('paymentMethods', updatedMethods);
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
        {config.paymentMethods.map((method) => (
          <div key={method.id} className="flex items-center justify-between p-2 border-b">
            <span className="label-text">{method.name}</span>
            <WizardCheckboxField
              label=""
              checked={method.enabled}
              onChange={(e) => handlePaymentMethodChange(method.id, 'enabled', e.target.checked)}
              className="!flex-row !items-center !justify-start !gap-2"
            />
          </div>
        ))}
      </div>
    </WizardCard>
  );
};

export default PaymentMethodsForm;