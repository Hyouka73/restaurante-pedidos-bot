
import { useState, useEffect } from 'react';
import { WizardInputField, WizardTextAreaField } from '../ui/WizardComponents';
import MapSelectorModal from '../ui/MapSelectorModal';
import { ButtonLoader } from '../ui/Loader';
import { useAlert } from '../ui/CustomAlert';
import { api } from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';
import { MapPin } from 'lucide-react';

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
      location: { lat: location.lat, lng: location.lng },
      address: location.formatted_address || prev.address,
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
    <div className="card bg-base-100 shadow-xl p-4">
      <h2 className="text-xl font-semibold mb-4">Información Básica</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardInputField
          label="Nombre del Restaurante"
          value={info.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
          placeholder="Ej: Restaurante El Sabor"
        />
        <WizardInputField
          label="Teléfono"
          value={info.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="+52 961 123 4567"
        />
        
        <div className="form-control md:col-span-2">
          <label className="label-text text-sm font-semibold text-gray-700 mb-2">Dirección</label>
          <input
            type="text"
            readOnly
            value={info.address || 'No se ha seleccionado una ubicación'}
            className="input input-bordered w-full bg-gray-100 cursor-not-allowed"
            placeholder="Selecciona una ubicación en el mapa"
          />
        </div>

        <div className="form-control md:col-span-2">
            <button
              type="button"
              onClick={() => setIsMapModalOpen(true)}
              className="btn btn-outline btn-primary w-full md:w-auto md:justify-self-start"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {info.location?.lat ? 'Cambiar Ubicación en Mapa' : 'Seleccionar Ubicación en Mapa'}
            </button>
        </div>

        <div className="form-control md:col-span-2">
          <WizardTextAreaField
            label="Descripción"
            value={info.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe tu restaurante..."
            rows={3}
            maxLength={200}
            helperText="Breve descripción (máx. 200 caracteres)"
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <ButtonLoader size="sm"/> : 'Guardar Información Básica'}
        </button>
      </div>

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
