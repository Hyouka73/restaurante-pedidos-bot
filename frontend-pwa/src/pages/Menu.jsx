// frontend-pwa/src/pages/Menu.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAlert, AlertContainer } from '../components/ui/CustomAlert';
import { ButtonLoader } from '../components/ui/Loader';
import { WizardCard, WizardSectionHeader, WizardErrorBox } from '../components/ui/WizardComponents.jsx';
import { Plus, Settings } from 'lucide-react';
import MenuItemForm from '../components/menu/MenuItemForm';
import MenuComboForm from '../components/menu/MenuComboForm';
import MenuItemCard from '../components/menu/MenuItemCard';
import MenuComboCard from '../components/menu/MenuComboCard';
import { api, configureAlerts } from '../services/api';

const Menu = () => {
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
  const [restaurantId, setRestaurantId] = useState(null);

  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    available: true,
    category: 'Platos Fuertes',
    prepTime: 5,
    complexity: 1,
    order: 1
  });

  const [newCombo, setNewCombo] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    available: true,
    order: 1,
    items: [],
    useItemPrices: false
  });

  const navigate = useNavigate();
  const { showAlert, alerts, hideAlert } = useAlert();
  const auth = getAuth();
  
  // Ref para el formulario
  const formRef = useRef(null);

  // Configurar las alertas cuando el componente se monte
  useEffect(() => {
    configureAlerts(showAlert);
  }, [showAlert]);

  // Efecto para hacer scroll cuando se abre un formulario
  useEffect(() => {
    if ((showItemForm || editingItem || showComboForm || editingCombo) && formRef.current) {
      // Pequeño delay para asegurar que el DOM se haya actualizado
      setTimeout(() => {
        formRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }, 100);
    }
  }, [showItemForm, editingItem, showComboForm, editingCombo]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError('');

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists) {
          setError('Usuario no encontrado.');
          return;
        }
        const userRestaurantId = userDoc.data().restaurantId;
        setRestaurantId(userRestaurantId);

        let itemsData = [];
        try {
          const itemsResponse = await api.get(`/menu/${userRestaurantId}/items`);
          itemsData = Array.isArray(itemsResponse) ? itemsResponse : [];
        } catch (itemsErr) {
          console.error("Error al cargar items:", itemsErr);
          itemsData = [];
        }
        setItems(itemsData);

        let combosData = [];
        try {
          const combosResponse = await api.get(`/menu/${userRestaurantId}/combos`);
          combosData = Array.isArray(combosResponse) ? combosResponse : [];
        } catch (combosErr) {
          console.error("Error al cargar combos:", combosErr);
          combosData = [];
        }
        setCombos(combosData);

      } catch (err) {
        console.error("Error general al cargar el menú:", err);
        setError('Error general al cargar el menú: ' + err.message);
        setItems([]);
        setCombos([]);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  const handleAddItem = async () => {
    if (!restaurantId) return;

    if (!newItem.name.trim() || !newItem.price) {
      showAlert('Nombre y precio son obligatorios.', 'warning', 3000);
      return;
    }

    setSaving(true);
    try {
      const itemData = {
        ...newItem,
        price: parseFloat(newItem.price),
        prepTime: parseInt(newItem.prepTime) || 5,
        complexity: parseInt(newItem.complexity) || 1,
        order: parseInt(newItem.order) || 1,
      };

      await api.post(`/menu/${restaurantId}/items`, itemData);
      
      const itemsResponse = await api.get(`/menu/${restaurantId}/items`);
      setItems(Array.isArray(itemsResponse) ? itemsResponse : []);
      
      setNewItem({
        name: '',
        description: '',
        price: '',
        imageUrl: '',
        available: true,
        category: 'Platos Fuertes',
        prepTime: 5,
        complexity: 1,
        order: 1
      });
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
      const itemData = {
        ...editingItem,
        price: parseFloat(editingItem.price),
        prepTime: parseInt(editingItem.prepTime) || 5,
        complexity: parseInt(editingItem.complexity) || 1,
        order: parseInt(editingItem.order) || 1,
      };

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

  const handleAddCombo = async () => {
    if (!restaurantId) return;

    if (!newCombo.name.trim() || newCombo.items.length === 0) {
      showAlert('Nombre y al menos un item son obligatorios para el combo.', 'warning', 3000);
      return;
    }

    setSaving(true);
    try {
      let finalPrice = newCombo.price;
      if (newCombo.useItemPrices) {
        const itemPrices = items.filter(item => newCombo.items.includes(item.id)).map(item => item.price);
        finalPrice = itemPrices.reduce((sum, price) => sum + price, 0).toFixed(2);
      } else {
        finalPrice = parseFloat(newCombo.price);
      }

      const comboData = {
        ...newCombo,
        price: parseFloat(finalPrice),
        items: newCombo.items,
        order: parseInt(newCombo.order) || 1,
      };

      await api.post(`/menu/${restaurantId}/combos`, comboData);
      
      const combosResponse = await api.get(`/menu/${restaurantId}/combos`);
      setCombos(Array.isArray(combosResponse) ? combosResponse : []);
      
      setNewCombo({
        name: '',
        description: '',
        price: '',
        imageUrl: '',
        available: true,
        order: 1,
        items: [],
        useItemPrices: false
      });
      setShowComboForm(false);
    } catch (err) {
      console.error("Error al agregar combo:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCombo = async () => {
    if (!restaurantId || !editingCombo) return;

    if (!editingCombo.name.trim() || editingCombo.items.length === 0) {
      showAlert('Nombre y al menos un item son obligatorios para el combo.', 'warning', 3000);
      return;
    }

    setSaving(true);
    try {
      let finalPrice = editingCombo.price;
      if (editingCombo.useItemPrices) {
        const itemPrices = items.filter(item => editingCombo.items.includes(item.id)).map(item => item.price);
        finalPrice = itemPrices.reduce((sum, price) => sum + price, 0).toFixed(2);
      } else {
        finalPrice = parseFloat(editingCombo.price);
      }

      const comboData = {
        ...editingCombo,
        price: parseFloat(finalPrice),
        items: editingCombo.items,
        order: parseInt(editingCombo.order) || 1,
      };

      await api.put(`/menu/${restaurantId}/combos/${editingCombo.id}`, comboData);
      setCombos(prev => prev.map(combo => combo.id === editingCombo.id ? { ...comboData, id: editingCombo.id } : combo));
      setEditingCombo(null);
    } catch (err) {
      console.error("Error al actualizar combo:", err);
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

  const handleAddItemToCombo = (itemId, isEditing) => {
    const state = isEditing ? editingCombo : newCombo;
    if (state.items.includes(itemId)) return;
    if (isEditing) {
      setEditingCombo(prev => ({ ...prev, items: [...prev.items, itemId] }));
    } else {
      setNewCombo(prev => ({ ...prev, items: [...prev.items, itemId] }));
    }
  };

  const handleRemoveItemFromCombo = (itemId, isEditing) => {
    if (isEditing) {
      setEditingCombo(prev => ({ ...prev, items: prev.items.filter(id => id !== itemId) }));
    } else {
      setNewCombo(prev => ({ ...prev, items: prev.items.filter(id => id !== itemId) }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ButtonLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <AlertContainer alerts={alerts} onClose={hideAlert} />
      
      <WizardCard>
        <WizardSectionHeader icon={Settings} title="Menú del Restaurante" subtitle="Gestiona tus items y combos" />
        {error && <WizardErrorBox error={error} onDismiss={() => setError('')} />}

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { 
              setShowItemForm(true); 
              setEditingItem(null);
              // Cerrar formularios de combo
              setShowComboForm(false);
              setEditingCombo(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ff7f50] to-[#ff6347] text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus size={18} /> Agregar Item
          </button>
          <button
            onClick={() => { 
              setShowComboForm(true); 
              setEditingCombo(null);
              // Cerrar formularios de item
              setShowItemForm(false);
              setEditingItem(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus size={18} /> Agregar Combo
          </button>
        </div>

        {/* Formulario de Item - Con ref para scroll */}
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

        {/* Formulario de Combo - Con ref para scroll */}
        {(showComboForm || editingCombo) && (
          <div ref={formRef} className="mb-6 scroll-mt-20">
            <MenuComboForm
              combo={editingCombo || newCombo}
              availableItems={items.filter(item => item.available)}
              onSave={editingCombo ? handleUpdateCombo : handleAddCombo}
              onCancel={() => { setShowComboForm(false); setEditingCombo(null); }}
              onChange={(field, value) => editingCombo ? setEditingCombo({...editingCombo, [field]: value}) : setNewCombo({...newCombo, [field]: value})}
              onAddItem={(itemId) => handleAddItemToCombo(itemId, !!editingCombo)}
              onRemoveItem={(itemId) => handleRemoveItemFromCombo(itemId, !!editingCombo)}
              saving={saving}
            />
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Items del Menú</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(items) && items.map(item => (
              <MenuItemCard
                key={item.id}
                item={item}
                onEdit={(itemData) => { 
                  setEditingItem(itemData); 
                  setShowItemForm(false);
                  // Cerrar formularios de combo
                  setShowComboForm(false);
                  setEditingCombo(null);
                }}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Combos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(combos) && combos.map(combo => (
              <MenuComboCard
                key={combo.id}
                combo={combo}
                items={items}
                onEdit={(comboData) => { 
                  setEditingCombo(comboData); 
                  setShowComboForm(false);
                  // Cerrar formularios de item
                  setShowItemForm(false);
                  setEditingItem(null);
                }}
                onDelete={handleDeleteCombo}
              />
            ))}
          </div>
        </div>
      </WizardCard>
    </div>
  );
};

export default Menu;