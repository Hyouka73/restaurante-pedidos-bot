// frontend-pwa/src/pages/Menu.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase';
import { useRestaurant } from '../context/RestaurantContext';
import { useAlert, AlertContainer } from '../components/ui/CustomAlert';
import { ButtonLoader } from '../components/ui/Loader';
import { WizardCard, WizardSectionHeader, WizardErrorBox } from '../components/ui/WizardComponents.jsx';
import { Plus, Settings } from 'lucide-react';
import MenuItemForm from '../components/menu/MenuItemForm';
import MenuComboForm from '../components/menu/MenuComboForm';
import MenuItemCard from '../components/menu/MenuItemCard';
import MenuComboCard from '../components/menu/MenuComboCard';
import { api, configureAlerts } from '../services/api';

// Define initial states outside the component
const initialNewItemState = { 
  name: '', 
  description: '', 
  price: '', 
  imageUrl: '', 
  available: true, 
  category: 'Platos Fuertes', 
  prepTime: 5, 
  complexity: 1, 
  order: 1,
  tags: {
    categoria_general: '',
    tipo_plato: '',
    proteina: '',
    perfil_sabor: ''
  },
  sugerir_items: []
};

const initialNewComboState = {
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  available: true,
  order: 1,
  componentes: [] // New structure
};

const Menu = () => {
  const [user] = useAuthState(auth);
  const { data: restaurantData } = useRestaurant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [combos, setCombos] = useState([]);
  const [categories] = useState(['Entradas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Adicionales']);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editingCombo, setEditingCombo] = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showComboForm, setShowComboForm] = useState(false);
  
  const [newItem, setNewItem] = useState(initialNewItemState);
  const [newCombo, setNewCombo] = useState(initialNewComboState);

  const navigate = useNavigate();
  const { showAlert, alerts, hideAlert } = useAlert();
  const formRef = useRef(null);

  useEffect(() => {
    configureAlerts(showAlert);
  }, [showAlert]);

  useEffect(() => {
    if ((showItemForm || editingItem || showComboForm || editingCombo) && formRef.current) {
      setTimeout(() => formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [showItemForm, editingItem, showComboForm, editingCombo]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!restaurantData?.id) {
      setLoading(true);
      return;
    }

    const fetchMenu = async () => {
      try {
        setLoading(true);
        setError('');
        const restaurantId = restaurantData.id;

        const [itemsResponse, combosResponse] = await Promise.all([
          api.get(`/menu/${restaurantId}/items`),
          api.get(`/menu/${restaurantId}/combos`)
        ]);

        setItems(Array.isArray(itemsResponse) ? itemsResponse : []);
        setCombos(Array.isArray(combosResponse) ? combosResponse : []);

      } catch (err) {
        console.error("Error general al cargar el menú:", err);
        setError('Error general al cargar el menú: ' + err.message);
        setItems([]);
        setCombos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [user, restaurantData, navigate]);

  const restaurantId = restaurantData?.id;

  const handleAddItem = async () => {
    if (!restaurantId) return;
    if (!newItem.name.trim() || !newItem.price) {
      showAlert('Nombre y precio son obligatorios.', 'warning', 3000);
      return;
    }
    setSaving(true);
    try {
      const itemData = { ...newItem, price: parseFloat(newItem.price), prepTime: parseInt(newItem.prepTime) || 5, complexity: parseInt(newItem.complexity) || 1, order: parseInt(newItem.order) || 1 };
      await api.post(`/menu/${restaurantId}/items`, itemData);
      const itemsResponse = await api.get(`/menu/${restaurantId}/items`);
      setItems(Array.isArray(itemsResponse) ? itemsResponse : []);
      setNewItem(initialNewItemState);
      setShowItemForm(false);
    } catch (err) {
      console.error("Error al agregar item:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!restaurantId || !editingItem) return;
    if (!editingItem.name.trim() || !editingItem.price) {
      showAlert('Nombre y precio son obligatorios.', 'warning', 3000);
      return;
    }
    setSaving(true);
    try {
      const itemData = { ...editingItem, price: parseFloat(editingItem.price), prepTime: parseInt(editingItem.prepTime) || 5, complexity: parseInt(editingItem.complexity) || 1, order: parseInt(editingItem.order) || 1 };
      await api.put(`/menu/${restaurantId}/items/${editingItem.id}`, itemData);
      setItems(prev => prev.map(item => item.id === editingItem.id ? { ...itemData, id: editingItem.id } : item));
      setEditingItem(null);
    } catch (err) {
      console.error("Error al actualizar item:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!restaurantId || !window.confirm('¿Estás seguro de eliminar este item?')) return;
    setSaving(true);
    try {
      await api.delete(`/menu/${restaurantId}/items/${itemId}`);
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error("Error al eliminar item:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCombo = async () => {
    const comboToSave = editingCombo || newCombo;
    if (!comboToSave.name.trim() || !comboToSave.price) {
      showAlert('Nombre y precio son obligatorios para el combo.', 'warning', 3000);
      return;
    }
    if (!comboToSave.componentes || comboToSave.componentes.length === 0 || comboToSave.componentes.some(c => !c.title || c.items_opciones.length === 0)) {
      showAlert('El combo debe tener al menos un componente, y cada componente debe tener un título y opciones.', 'warning', 3000);
      return;
    }

    setSaving(true);
    try {
      const comboData = { 
        ...comboToSave, 
        price: parseFloat(comboToSave.price),
        order: parseInt(comboToSave.order) || 1 
      };

      if (editingCombo) {
        await api.put(`/menu/${restaurantId}/combos/${comboData.id}`, comboData);
        setCombos(prev => prev.map(combo => combo.id === comboData.id ? comboData : combo));
        setEditingCombo(null);
      } else {
        await api.post(`/menu/${restaurantId}/combos`, comboData);
        const combosResponse = await api.get(`/menu/${restaurantId}/combos`);
        setCombos(Array.isArray(combosResponse) ? combosResponse : []);
        setNewCombo(initialNewComboState);
        setShowComboForm(false);
      }
    } catch (err) {
      console.error("Error al guardar combo:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCombo = async (comboId) => {
    if (!restaurantId || !window.confirm('¿Estás seguro de eliminar este combo?')) return;
    setSaving(true);
    try {
      await api.delete(`/menu/${restaurantId}/combos/${comboId}`);
      setCombos(prev => prev.filter(combo => combo.id !== comboId));
    } catch (err) {
      console.error("Error al eliminar combo:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><ButtonLoader size="lg" /></div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <AlertContainer alerts={alerts} onClose={hideAlert} />
      <WizardCard>
        <WizardSectionHeader icon={Settings} title="Menú del Restaurante" subtitle="Gestiona tus items y combos" />
        {error && <WizardErrorBox error={error} onDismiss={() => setError('')} />}
        <div className="flex gap-4 mb-6">
          <button onClick={() => { setShowItemForm(true); setEditingItem(null); setShowComboForm(false); setEditingCombo(null); setNewItem(initialNewItemState); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ff7f50] to-[#ff6347] text-white rounded-lg hover:shadow-lg transition-all"><Plus size={18} /> Agregar Item</button>
          <button onClick={() => { setShowComboForm(true); setEditingCombo(null); setShowItemForm(false); setEditingItem(null); setNewCombo(initialNewComboState); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"><Plus size={18} /> Agregar Combo</button>
        </div>
        
        {(showItemForm || editingItem) && (
          <div ref={formRef} className="mb-6 scroll-mt-20">
            <MenuItemForm 
              item={editingItem || newItem} 
              categories={categories} 
              onSave={editingItem ? handleUpdateItem : handleAddItem} 
              onCancel={() => { setShowItemForm(false); setEditingItem(null); }} 
              onChange={(field, value) => editingItem ? setEditingItem({...editingItem, [field]: value}) : setNewItem({...newItem, [field]: value})} 
              saving={saving} 
            />
          </div>
        )}

        {(showComboForm || editingCombo) && (
          <div ref={formRef} className="mb-6 scroll-mt-20">
            <MenuComboForm 
              combo={editingCombo || newCombo} 
              menuItems={items}
              onSave={handleSaveCombo} 
              onCancel={() => { setShowComboForm(false); setEditingCombo(null); }} 
              onChange={(field, value) => editingCombo ? setEditingCombo({...editingCombo, [field]: value}) : setNewCombo({...newCombo, [field]: value})} 
              saving={saving} 
            />
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Items del Menú</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(items) && items.map(item => <MenuItemCard key={item.id} item={item} onEdit={(itemData) => { setEditingItem(itemData); setShowItemForm(false); setShowComboForm(false); setEditingCombo(null); }} onDelete={handleDeleteItem} />)}
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-4">Combos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(combos) && combos.map(combo => <MenuComboCard key={combo.id} combo={combo} items={items} onEdit={(comboData) => { setEditingCombo(comboData); setShowComboForm(false); setShowItemForm(false); setEditingItem(null); }} onDelete={handleDeleteCombo} />)}
          </div>
        </div>
      </WizardCard>
    </div>
  );
};

export default Menu;