
import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Assuming api service is set up
import MenuComboForm from '../components/menu/MenuComboForm';
import { ButtonLoader, Loader } from '../components/ui/Loader';
import { Plus, Edit, Trash2 } from 'lucide-react';

const Combos = () => {
  const [combos, setCombos] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [combosRes, itemsRes] = await Promise.all([
        api.get('/menu/combos'), // Endpoint from backend
        api.get('/menu/items')   // To pass to the form for selection
      ]);
      setCombos(combosRes.data);
      setMenuItems(itemsRes.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los datos. Por favor, intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (comboData) => {
    try {
      setSaving(true);
      if (comboData.id) {
        // Update
        await api.put(`/menu/combos/${comboData.id}`, comboData);
      } else {
        // Create
        await api.post('/menu/combos', comboData);
      }
      await fetchData();
      setIsFormVisible(false);
      setSelectedCombo(null);
    } catch (err) {
      setError('Error al guardar el combo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (comboId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este combo?')) {
      try {
        await api.delete(`/menu/combos/${comboId}`);
        await fetchData();
      } catch (err) {
        setError('Error al eliminar el combo.');
      }
    }
  };

  const handleAddNew = () => {
    setSelectedCombo({}); // New empty combo
    setIsFormVisible(true);
  };

  const handleEdit = (combo) => {
    setSelectedCombo(combo);
    setIsFormVisible(true);
  };

  const handleCancel = () => {
    setIsFormVisible(false);
    setSelectedCombo(null);
  };

  if (loading) return <Loader />;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestión de Combos Manuales</h1>
        {!isFormVisible && (
          <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            <Plus size={18} /> Crear Combo
          </button>
        )}
      </div>

      {isFormVisible ? (
        <MenuComboForm 
          combo={selectedCombo}
          menuItems={menuItems}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {combos.map(combo => (
            <div key={combo.id} className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="font-bold text-lg">{combo.nombre_combo}</h3>
              <p className="text-gray-600 text-sm">{combo.descripcion}</p>
              <p className="font-semibold text-lg mt-2">${combo.precio_fijo}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => handleEdit(combo)} className="flex items-center gap-1 text-sm text-blue-500 hover:underline">
                  <Edit size={14} /> Editar
                </button>
                <button onClick={() => handleDelete(combo.id)} className="flex items-center gap-1 text-sm text-red-500 hover:underline">
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

export default Combos;
