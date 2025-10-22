// frontend-pwa/src/pages/Menu.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAlert } from '../components/ui/CustomAlert';
import { ButtonLoader } from '../components/ui/Loader';
import { WizardCard, WizardSectionHeader, WizardErrorBox } from './SetupWizard'; // Reutilizamos componentes del wizard
import { Plus } from 'lucide-react';
import MenuItemForm from '../components/menu/MenuItemForm';
import MenuComboForm from '../components/menu/MenuComboForm';
import MenuItemCard from '../components/menu/MenuItemCard';
import MenuComboCard from '../components/menu/MenuComboCard';

const Menu = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [combos, setCombos] = useState([]);
  const [categories] = useState(['Entradas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Adicionales']); // Categorías por defecto
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editingCombo, setEditingCombo] = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showComboForm, setShowComboForm] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    available: true,
    category: 'Platos Fuertes', // Valor por defecto
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
    items: [], // Lista de IDs de items
    useItemPrices: false // Si es true, suma precios de items; si false, usa precio único
  });

  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const auth = getAuth();

  useEffect(() => {
    const fetchMenu = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Obtener restaurantId del usuario
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (!userDoc.exists()) {
          setError('Usuario no encontrado.');
          return;
        }
        const restaurantId = userDoc.data().restaurantId;

        // Obtener items del menú
        const itemsQuery = query(collection(db, 'restaurants', restaurantId, 'menu', 'items'));
        const itemsSnapshot = await getDocs(itemsQuery);
        const itemsList = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(itemsList);

        // Obtener combos del menú
        const combosQuery = query(collection(db, 'restaurants', restaurantId, 'menu', 'combos'));
        const combosSnapshot = await getDocs(combosQuery);
        const combosList = combosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCombos(combosList);

      } catch (err) {
        console.error("Error al cargar el menú:", err);
        setError('Error al cargar el menú: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [auth, navigate]); // Dependencias limpias

  // Funciones para Items
  const handleAddItem = async () => {
    if (!auth.currentUser) return;
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const restaurantId = userDoc.data().restaurantId;

    if (!newItem.name.trim() || !newItem.price) {
      showAlert('Nombre y precio son obligatorios.', 'warning', 3000);
      return;
    }

    setSaving(true);
    try {
      const itemData = {
        ...newItem,
        price: parseFloat(newItem.price), // Asegurar que sea número
        prepTime: parseInt(newItem.prepTime) || 5,
        complexity: parseInt(newItem.complexity) || 1,
        order: parseInt(newItem.order) || 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'restaurants', restaurantId, 'menu', 'items'), itemData);
      showAlert('Item agregado exitosamente.', 'success', 2000);
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
      setError('Error al agregar item: ' + err.message);
      showAlert('Error al agregar item.', 'error', 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!auth.currentUser || !editingItem) return;
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const restaurantId = userDoc.data().restaurantId;

    if (!editingItem.name.trim() || !editingItem.price) {
      showAlert('Nombre y precio son obligatorios.', 'warning', 3000);
      return;
    }

    setSaving(true);
    try {
      const itemRef = doc(db, 'restaurants', restaurantId, 'menu', 'items', editingItem.id);
      const itemData = {
        ...editingItem,
        price: parseFloat(editingItem.price),
        prepTime: parseInt(editingItem.prepTime) || 5,
        complexity: parseInt(editingItem.complexity) || 1,
        order: parseInt(editingItem.order) || 1,
        updatedAt: new Date()
      };

      await updateDoc(itemRef, itemData);
      showAlert('Item actualizado exitosamente.', 'success', 2000);
      setEditingItem(null);
    } catch (err) {
      console.error("Error al actualizar item:", err);
      setError('Error al actualizar item: ' + err.message);
      showAlert('Error al actualizar item.', 'error', 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!auth.currentUser || !window.confirm('¿Estás seguro de eliminar este item?')) return;
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const restaurantId = userDoc.data().restaurantId;

    setSaving(true);
    try {
      await deleteDoc(doc(db, 'restaurants', restaurantId, 'menu', 'items', itemId));
      showAlert('Item eliminado exitosamente.', 'success', 2000);
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error("Error al eliminar item:", err);
      setError('Error al eliminar item: ' + err.message);
      showAlert('Error al eliminar item.', 'error', 4000);
    } finally {
      setSaving(false);
    }
  };

  // Funciones para Combos
  const handleAddCombo = async () => {
    if (!auth.currentUser) return;
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const restaurantId = userDoc.data().restaurantId;

    if (!newCombo.name.trim() || !newCombo.price || newCombo.items.length === 0) {
      showAlert('Nombre, precio y al menos un item son obligatorios para el combo.', 'warning', 3000);
      return;
    }

    setSaving(true);
    try {
      const comboData = {
        ...newCombo,
        price: parseFloat(newCombo.price),
        items: newCombo.items, // Lista de IDs
        order: parseInt(newCombo.order) || 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'restaurants', restaurantId, 'menu', 'combos'), comboData);
      showAlert('Combo agregado exitosamente.', 'success', 2000);
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
      setError('Error al agregar combo: ' + err.message);
      showAlert('Error al agregar combo.', 'error', 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCombo = async () => {
    if (!auth.currentUser || !editingCombo) return;
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const restaurantId = userDoc.data().restaurantId;

    if (!editingCombo.name.trim() || editingCombo.items.length === 0) {
      showAlert('Nombre y al menos un item son obligatorios para el combo.', 'warning', 3000);
      return;
    }

    setSaving(true);
    try {
      const comboRef = doc(db, 'restaurants', restaurantId, 'menu', 'combos', editingCombo.id);
      let finalPrice = editingCombo.price;
      if (editingCombo.useItemPrices) {
          const itemPrices = items.filter(item => editingCombo.items.includes(item.id)).map(item => item.price);
          finalPrice = itemPrices.reduce((sum, price) => sum + price, 0).toFixed(2);
      } else {
          finalPrice = parseFloat(editingCombo.price);
      }

      const comboData = {
        ...editingCombo,
        price: finalPrice,
        items: editingCombo.items,
        order: parseInt(editingCombo.order) || 1,
        updatedAt: new Date()
      };

      await updateDoc(comboRef, comboData);
      showAlert('Combo actualizado exitosamente.', 'success', 2000);
      setEditingCombo(null);
    } catch (err) {
      console.error("Error al actualizar combo:", err);
      setError('Error al actualizar combo: ' + err.message);
      showAlert('Error al actualizar combo.', 'error', 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCombo = async (comboId) => {
    if (!auth.currentUser || !window.confirm('¿Estás seguro de eliminar este combo?')) return;
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const restaurantId = userDoc.data().restaurantId;

    setSaving(true);
    try {
      await deleteDoc(doc(db, 'restaurants', restaurantId, 'menu', 'combos', comboId));
      showAlert('Combo eliminado exitosamente.', 'success', 2000);
      setCombos(prev => prev.filter(combo => combo.id !== comboId));
    } catch (err) {
      console.error("Error al eliminar combo:", err);
      setError('Error al eliminar combo: ' + err.message);
      showAlert('Error al eliminar combo.', 'error', 4000);
    } finally {
      setSaving(false);
    }
  };

  // Funciones para manejo de items en combos
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
      <WizardCard>
        <WizardSectionHeader title="Menú del Restaurante" subtitle="Gestiona tus items y combos" />
        {error && <WizardErrorBox error={error} onDismiss={() => setError('')} />}

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { setShowItemForm(true); setEditingItem(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ff7f50] to-[#ff6347] text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus size={18} /> Agregar Item
          </button>
          <button
            onClick={() => { setShowComboForm(true); setEditingCombo(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus size={18} /> Agregar Combo
          </button>
        </div>

        {/* Formulario de Item */}
        {(showItemForm || editingItem) && (
          <div className="mb-6">
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

        {/* Formulario de Combo */}
        {(showComboForm || editingCombo) && (
          <div className="mb-6">
            <MenuComboForm
              combo={editingCombo || newCombo}
              availableItems={items.filter(item => item.available)} // Solo items disponibles
              onSave={editingCombo ? handleUpdateCombo : handleAddCombo}
              onCancel={() => { setShowComboForm(false); setEditingCombo(null); }}
              onChange={(field, value) => editingCombo ? setEditingCombo({...editingCombo, [field]: value}) : setNewCombo({...newCombo, [field]: value})}
              onAddItem={(itemId) => handleAddItemToCombo(itemId, !!editingCombo)}
              onRemoveItem={(itemId) => handleRemoveItemFromCombo(itemId, !!editingCombo)}
              saving={saving}
            />
          </div>
        )}

        {/* Lista de Items */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Items del Menú</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <MenuItemCard
                key={item.id}
                item={item}
                onEdit={(itemData) => { setEditingItem(itemData); setShowItemForm(false); }}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
        </div>

        {/* Lista de Combos */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Combos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {combos.map(combo => (
              <MenuComboCard
                key={combo.id}
                combo={combo}
                items={items} // Pasamos la lista completa de items para que el card pueda mapearlos
                onEdit={(comboData) => { setEditingCombo(comboData); setShowComboForm(false); }}
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