import { useState, useEffect } from 'react';
import { WizardInputField, WizardTextAreaField, WizardSaveButton, WizardLocationButton } from '../ui/WizardComponents';
import MapSelectorModal from '../ui/MapSelectorModal';
import { useAlert } from '../ui/CustomAlert';
import { api } from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';
import { MapPin, Store, Phone, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const BasicInfoForm = ({ initialData }) => {
  const [info, setInfo] = useState(initialData.info);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: restaurant } = useRestaurant();
  const { showAlert } = useAlert();

  useEffect(() => {
    setInfo(initialData.info);
  }, [initialData]);

  const handleChange = (field, value) => {
    setInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectLocation = (location) => {
    setInfo(prev => ({
      ...prev,
      location: {
        ...(prev.location || {}),
        lat: location.lat,
        lng: location.lng,
        formatted_address: location.formatted_address,
      },
    }));
    setIsMapModalOpen(false);
    showAlert('Ubicación seleccionada. No olvides guardar los cambios.', 'info', 3000);
  };

  const handleSave = async () => {
    if (!restaurant?.id) {
      showAlert('Error: No se pudo encontrar el ID del restaurante.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/config/${restaurant.id}/general`, { info });
      showAlert('Información básica guardada correctamente.', 'success');
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
          <div className="w-12 h-12 bg-gradient-to-br from-[#ff7f50] to-[#ff6347] rounded-xl flex items-center justify-center text-white shadow-lg">
            <Store size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#ff7f50]">Información Básica</h2>
            <p className="text-sm text-gray-600">Datos principales de tu restaurante</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nombre del Restaurante */}
        <div className="md:col-span-2">
          <WizardInputField
            label="Nombre del Restaurante"
            value={info.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            placeholder="Ej: Restaurante El Sabor"
            icon={Store}
          />
        </div>

        {/* Teléfono */}
        <div className="md:col-span-2">
          <WizardInputField
            label="Teléfono"
            value={info.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+52 961 123 4567"
            icon={Phone}
          />
        </div>

        {/* Botón de ubicación */}
        <div className="md:col-span-2">
          <label className="label pb-2">
            <span className="label-text text-sm font-semibold text-gray-700">
              Ubicación del Restaurante
            </span>
          </label>
          <WizardLocationButton
            location={info.location}
            onClick={() => setIsMapModalOpen(true)}
            loading={false}
          />
        </div>
        {/* Descripción */}
        <div className="md:col-span-2">
          <WizardTextAreaField
            label="Descripción"
            value={info.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe tu restaurante..."
            rows={4}
            maxLength={200}
            helperText="Breve descripción que verán tus clientes (máx. 200 caracteres)"
          />
        </div>
      </div>

      {/* Botón de guardar mejorado */}
      <div className="mt-8 pt-6 border-t-2 border-[#ffe4c4] flex justify-end">
        <WizardSaveButton 
          onClick={handleSave}
          loading={saving}
          className="w-full sm:w-auto min-w-[200px]"
        >
          Guardar Información
        </WizardSaveButton>
      </div>

      {/* Modal del mapa */}
      <MapSelectorModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSelectLocation={handleSelectLocation}
        initialLocation={info.location}
      />
    </div>
  );
};

export default BasicInfoForm;