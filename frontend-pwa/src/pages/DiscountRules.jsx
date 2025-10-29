import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import DiscountRuleForm from '../components/config/DiscountRuleForm';
import { useRestaurant } from '../context/RestaurantContext';
import Loader from '../components/ui/Loader';
import { Plus, Edit, Trash2 } from 'lucide-react';

const DiscountRules = () => {
  const [rules, setRules] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // ✅ CORRECCIÓN: Usar el hook correctamente
  const { data: restaurantData, loading: loadingRestaurant } = useRestaurant();
  const restaurantId = restaurantData?.id;

  useEffect(() => {
    if (!restaurantId) {
      setLoading(loadingRestaurant);
      return;
    }
    fetchData(restaurantId);
  }, [restaurantId, loadingRestaurant]);

  const fetchData = async (currentRestaurantId) => {
    if (!currentRestaurantId) return;

    try {
      setLoading(true);
      
      // ✅ CORRECCIÓN: Incluir restaurantId en las rutas
      const [rulesRes, itemsRes] = await Promise.all([
        api.get(`/discount-rules/${currentRestaurantId}`),
        api.get(`/menu/${currentRestaurantId}/items`)
      ]);
      
      setRules(Array.isArray(rulesRes) ? rulesRes : []);
      setMenuItems(Array.isArray(itemsRes) ? itemsRes : []);
      setError(null);
    } catch (err) {
      setError('Error al cargar los datos. Por favor, intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (ruleData) => {
    try {
      if (!restaurantId) {
        setError('No se pudo guardar la regla: ID de restaurante no disponible.');
        return;
      }
      
      setSaving(true);
      
      // ✅ CORRECCIÓN: Incluir restaurantId en las rutas
      if (ruleData.id) {
        await api.put(`/discount-rules/${restaurantId}/${ruleData.id}`, ruleData);
      } else {
        await api.post(`/discount-rules/${restaurantId}`, ruleData);
      }
      
      await fetchData(restaurantId);
      setIsFormVisible(false);
      setSelectedRule(null);
    } catch (err) {
      setError('Error al guardar la regla.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta regla?')) {
      if (!restaurantId) {
        setError('No se pudo eliminar la regla: ID de restaurante no disponible.');
        return;
      }
      
      try {
        // ✅ CORRECCIÓN: Incluir restaurantId en la ruta
        await api.delete(`/discount-rules/${restaurantId}/${ruleId}`);
        await fetchData(restaurantId);
      } catch (err) {
        setError('Error al eliminar la regla.');
      }
    }
  };

  const handleAddNew = () => {
    setSelectedRule({});
    setIsFormVisible(true);
  };

  const handleEdit = (rule) => {
    setSelectedRule(rule);
    setIsFormVisible(true);
  };

  const handleCancel = () => {
    setIsFormVisible(false);
    setSelectedRule(null);
  };

  if (loading || loadingRestaurant) return <Loader />;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Reglas de Descuento (Combos Dinámicos)</h1>
        {!isFormVisible && (
          <button 
            onClick={handleAddNew} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus size={18} /> Crear Regla
          </button>
        )}
      </div>

      {isFormVisible ? (
        <DiscountRuleForm
          rule={selectedRule}
          menuItems={menuItems}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map(rule => (
            <div key={rule.id} className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="font-bold text-lg">{rule.nombre_regla}</h3>
              <div className="mt-4 flex gap-2">
                <button 
                  onClick={() => handleEdit(rule)} 
                  className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
                >
                  <Edit size={14} /> Editar
                </button>
                <button 
                  onClick={() => handleDelete(rule.id)} 
                  className="flex items-center gap-1 text-sm text-red-500 hover:underline"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscountRules;
