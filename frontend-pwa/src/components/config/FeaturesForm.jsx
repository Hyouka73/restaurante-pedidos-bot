import { useState, useEffect } from 'react';
import { WizardSaveButton } from '../ui/WizardComponents';
import { ShoppingBag, Truck, Package, MapPin, Image, MessageSquare, User, Phone } from 'lucide-react';
import { useAlert } from '../ui/CustomAlert';
import { api } from '../../services/api';
import { useRestaurant } from '../../context/RestaurantContext';
import { motion } from 'framer-motion';

const FeaturesForm = ({ initialData }) => {
  const [features, setFeatures] = useState(initialData.features);
  const [saving, setSaving] = useState(false);
  const { data: restaurant } = useRestaurant();
  const { showAlert } = useAlert();

  useEffect(() => {
    setFeatures(initialData.features);
  }, [initialData]);

  const handleFeatureChange = (field, value) => {
    setFeatures(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!restaurant?.id) {
      showAlert('Error: No se pudo encontrar el ID del restaurante.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/config/${restaurant.id}/general`, { features });
      showAlert('Características guardadas correctamente.', 'success');
    } catch (error) {
      showAlert(`Error al guardar: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Organizar features por categorías
  const featureCategories = [
    {
      title: 'Métodos de Entrega',
      icon: Truck,
      color: 'from-blue-500 to-indigo-500',
      features: [
        { key: 'deliveryEnabled', label: 'Aceptar Pedidos con Delivery', icon: Truck, description: 'Permite entregas a domicilio' },
        { key: 'pickupEnabled', label: 'Aceptar Pedidos para Recoger', icon: Package, description: 'Clientes recogen en el local' },
        { key: 'requireLocationIfDelivery', label: 'Requerir Ubicación en Delivery', icon: MapPin, description: 'Obligatorio compartir ubicación' },
      ]
    },
    {
      title: 'Presentación del Menú',
      icon: Image,
      color: 'from-purple-500 to-pink-500',
      features: [
        { key: 'showMenuImages', label: 'Mostrar Imágenes en el Menú', icon: Image, description: 'Fotos de los platillos' },
      ]
    },
    {
      title: 'Interacción con Clientes',
      icon: MessageSquare,
      color: 'from-green-500 to-emerald-500',
      features: [
        { key: 'acceptComplaints', label: 'Aceptar Comentarios/Reclamos', icon: MessageSquare, description: 'Canal de retroalimentación' },
        { key: 'askForName', label: 'Solicitar Nombre del Cliente', icon: User, description: 'Pedirá nombre al ordenar' },
        { key: 'askForPhone', label: 'Solicitar Teléfono del Cliente', icon: Phone, description: 'Pedirá teléfono al ordenar' },
      ]
    }
  ];

  const enabledCount = Object.values(features).filter(Boolean).length;
  const totalCount = Object.keys(features).length;

  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-[#ffe4c4] p-3 sm:p-6 hover:shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="mb-6 pb-4 border-b-2 border-[#ffe4c4]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-purple-600">Opciones de Pedido</h3>
            <p className="text-sm text-gray-600 mt-1">Define cómo operarán los pedidos</p>
          </div>
        </div>
      </div>

      {/* Categorías de features */}
      <div className="space-y-6">
        {featureCategories.map((category, catIndex) => (
          <motion.div
            key={category.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: catIndex * 0.1 }}
          >
            {/* Título de categoría */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center shadow-md`}>
                <category.icon size={16} className="text-white" />
              </div>
              <h4 className="font-bold text-gray-700">{category.title}</h4>
            </div>

            {/* Features de la categoría */}
            <div className="space-y-3">
              {category.features.map((feature, index) => (
                <motion.div
                  key={feature.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: catIndex * 0.1 + index * 0.05 }}
                  className={`
                    relative overflow-hidden
                    bg-gradient-to-r rounded-xl p-4 border-2 transition-all duration-300
                    ${features[feature.key]
                      ? 'from-purple-50 to-pink-50 border-purple-300 hover:border-purple-400' 
                      : 'from-gray-50 to-gray-100 border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <label className="flex items-center justify-between cursor-pointer">
                    {/* Información del feature */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
                        ${features[feature.key]
                          ? `bg-gradient-to-br ${category.color} shadow-md` 
                          : 'bg-gray-300'
                        }
                      `}>
                        <feature.icon size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-gray-700 block">
                          {feature.label}
                        </span>
                        <span className="text-xs text-gray-500 block mt-0.5">
                          {feature.description}
                        </span>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className="relative flex-shrink-0 ml-3">
                      <input
                        type="checkbox"
                        checked={features[feature.key]}
                        onChange={(e) => handleFeatureChange(feature.key, e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`
                        w-14 h-7 rounded-full transition-all duration-300 shadow-inner
                        ${features[feature.key] ? `bg-gradient-to-r ${category.color}` : 'bg-gray-300'}
                      `}>
                        <motion.div
                          className="w-5 h-5 bg-white rounded-full shadow-md mt-1"
                          animate={{ x: features[feature.key] ? 32 : 4 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </div>
                    </div>
                  </label>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Resumen */}
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            Características activas:
          </span>
          <span className="text-2xl font-bold text-purple-600">
            {enabledCount} / {totalCount}
          </span>
        </div>
        
        {/* Advertencia si no hay métodos de entrega */}
        {!features.deliveryEnabled && !features.pickupEnabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 p-3 bg-amber-100 border-2 border-amber-300 rounded-lg"
          >
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-2">
              <span>⚠️</span>
              <span>Advertencia: No hay métodos de entrega activos. Activa al menos uno.</span>
            </p>
          </motion.div>
        )}
      </div>

      {/* Botón de guardar */}
      <div className="mt-8 pt-6 border-t-2 border-[#ffe4c4] flex justify-end">
        <WizardSaveButton 
          onClick={handleSave}
          loading={saving}
          className="w-full sm:w-auto min-w-[220px]"
        >
          Guardar Características
        </WizardSaveButton>
      </div>
    </div>
  );
};

export default FeaturesForm;