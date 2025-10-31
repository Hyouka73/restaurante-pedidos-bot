import { useState, useEffect } from 'react'; // Eliminamos useRef
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
import Modal from '../components/ui/Modal'; // <-- 🔥 1. IMPORTAMOS TU MODAL

const initialNewItemState = { 
  name: '', 
  description: '', 
  price: '', 
  imageUrl: '', 
  available: true, 
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
  componentes: []
};

const Menu = () => { 
  const [user, loadingAuth] = useAuthState(auth);
  const navigate = useNavigate();
  const { data: restaurantData, loading: loadingRestaurant } = useRestaurant();
  const restaurantId = restaurantData?.id;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [combos, setCombos] = useState([]);
  const [error, setError] = useState(''); 
  
  // --- 🔥 2. ESTADO DE FORMULARIOS REFACTORIZADO ---
  // Un solo estado para manejar qué modal está abierto
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null, // 'ITEM' o 'COMBO'
    data: null   // Los datos para el formulario (nuevo o en edición)
  });

  const { showAlert, alerts, hideAlert } = useAlert();

  useEffect(() => {
    configureAlerts(showAlert);
  }, [showAlert]);

  // Se elimina el useEffect para 'formRef.current.scrollIntoView'
  

  // ✅ Validar autenticación
  useEffect(() => {
    console.log('[Menu] 🔍 Estado de autenticación:', { 
      loadingAuth, 
      hasUser: !!user,
      userId: user?.uid 
    });
    
    if (!loadingAuth && !user) {
      console.log('[Menu] ⚠️ No hay usuario, redirigiendo a /login');
      navigate('/login');
    }
  }, [user, loadingAuth, navigate]);

  // ✅ Cargar menú cuando tengamos restaurantId
  useEffect(() => {
    if (loadingAuth || !user) {
      console.log('[Menu] ⏳ Esperando autenticación...');
      return;
    }

    if (!restaurantId) {
      console.log('[Menu] ⏳ Esperando restaurantId...', { 
        loadingRestaurant, 
        hasRestaurantData: !!restaurantData,
        restaurantData 
      });
      setLoading(loadingRestaurant);
      return;
    }

    console.log('[Menu] 🔵 Iniciando carga de menú para:', restaurantId);
    fetchMenu();
  }, [user, loadingAuth, restaurantId, loadingRestaurant]);

  const fetchMenu = async () => { 
    if (!restaurantId) {
      console.log('[Menu] ❌ fetchMenu llamado sin restaurantId');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('[Menu] 📡 Llamando a APIs del menú...');
      console.log('  - GET /menu/' + restaurantId + '/items');
      console.log('  - GET /menu/' + restaurantId + '/combos');

      const [itemsResponse, combosResponse] = await Promise.all([
        api.get(`/menu/${restaurantId}/items`),
        api.get(`/menu/${restaurantId}/combos`)
      ]);

      console.log('[Menu] ✅ Respuestas recibidas:', {
        items: itemsResponse,
        combos: combosResponse,
        itemsIsArray: Array.isArray(itemsResponse),
        combosIsArray: Array.isArray(combosResponse),
        itemsCount: Array.isArray(itemsResponse) ? itemsResponse.length : 'N/A',
        combosCount: Array.isArray(combosResponse) ? combosResponse.length : 'N/A'
      });

      setItems(Array.isArray(itemsResponse) ? itemsResponse : []);
      setCombos(Array.isArray(combosResponse) ? combosResponse : []);

    } catch (err) {
      console.error('[Menu] ❌ Error general al cargar el menú:', err);
      console.error('[Menu] Error stack:', err.stack);
      setError('Error al cargar el menú: ' + err.message);
      setItems([]);
      setCombos([]);
    } finally {
      setLoading(false);
    }
  };

  // --- 🔥 3. LÓGICA DE MODAL ---

  // Funciones para ABRIR el modal
  const handleAddNewItem = () => {
    setModalState({ isOpen: true, type: 'ITEM', data: initialNewItemState });
  };
  
  const handleEditItem = (item) => {
    setModalState({ isOpen: true, type: 'ITEM', data: item });
  };

  const handleAddNewCombo = () => {
    setModalState({ isOpen: true, type: 'COMBO', data: initialNewComboState });
  };

  const handleEditCombo = (combo) => {
    setModalState({ isOpen: true, type: 'COMBO', data: combo });
  };
  
  // Función para CERRAR el modal
  const handleCloseModal = () => {
    setModalState({ isOpen: false, type: null, data: null });
  };

  // --- 🔥 4. LÓGICA DE GUARDADO (Ahora es genérica) ---

  const handleSaveItem = async (itemData) => {
    const isEditing = !!itemData.id;
    if (!itemData.name.trim() || !itemData.price) {
      showAlert('Nombre y precio son obligatorios.', 'warning', 3000);
      return;
    }
    // Validación de categoría general
    if (!itemData.tags?.categoria_general) {
      showAlert('La "Categoría General" es obligatoria.', 'warning', 3000);
      return;
    }
    
    console.log(isEditing ? '[Menu] ✏️ Actualizando item:' : '[Menu] ➕ Agregando nuevo item:', itemData.id || '(nuevo)');
    setSaving(true);
    
    try {
      const itemData = { 
        ...itemData, 
        price: parseFloat(itemData.price), 
        prepTime: parseInt(itemData.prepTime) || 5, 
        complexity: parseInt(itemData.complexity) || 1, 
        order: parseInt(itemData.order) || 1 
      };

      if (isEditing) {
        await api.put(`/menu/${restaurantId}/items/${data.id}`, data);
        setItems(prev => prev.map(item => (item.id === data.id ? data : item)));
      } else {
        await api.post(`/menu/${restaurantId}/items`, data);
        await fetchMenu(); // Recargar todo para obtener el nuevo ID
      }
      
      handleCloseModal(); // Cierra el modal al guardar
      showAlert(isEditing ? 'Item actualizado' : 'Item agregado', 'success');
      
    } catch (err) {
      console.error('[Menu] ❌ Error al guardar item:', err);
      showAlert(`Error al guardar: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteItem = async (itemId) => {
    if (!restaurantId || !window.confirm('¿Estás seguro de eliminar este item?')) {
      return;
    }
    
    console.log('[Menu] 🗑️ Eliminando item:', itemId);
    
    try {
      console.log('[Menu] 📡 DELETE /menu/' + restaurantId + '/items/' + itemId);
      await api.delete(`/menu/${restaurantId}/items/${itemId}`);
      
      setItems(prev => prev.filter(item => item.id !== itemId));
      showAlert('Item eliminado', 'success');
      console.log('[Menu] ✅ Item eliminado');
    } catch (err) {
      console.error('[Menu] ❌ Error al eliminar item:', err);
      showAlert(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  const handleSaveCombo = async (comboData) => {
    const isEditing = !!comboData.id;
    if (!comboData.name.trim() || !comboData.price) {
      showAlert('Nombre y precio son obligatorios para el combo.', 'warning', 3000);
      return;
    }
    if (!comboData.componentes || comboData.componentes.length === 0 || 
        comboData.componentes.some(c => !c.title || c.items_opciones.length === 0)) {
      showAlert('El combo debe tener al menos un componente con título y opciones.', 'warning', 3000);
      return;
    }

    console.log(isEditing ? '[Menu] ✏️ Actualizando combo:' : '[Menu] 💾 Guardando combo:', comboData.id || '(nuevo)');
    setSaving(true);
    
    try {
      const comboData = { 
        ...comboData, 
        price: parseFloat(comboToSave.price),
        order: parseInt(comboToSave.order) || 1 
      };

      if (isEditing) {
        console.log('[Menu] 📡 PUT /menu/' + restaurantId + '/combos/' + comboData.id);
        await api.put(`/menu/${restaurantId}/combos/${comboData.id}`, comboData);
        setCombos(prev => prev.map(combo => 
          combo.id === comboData.id ? comboData : combo
        ));
      } else {
        console.log('[Menu] 📡 POST /menu/' + restaurantId + '/combos');
        await api.post(`/menu/${restaurantId}/combos`, comboData);
        await fetchMenu();
      }
      
      handleCloseModal(); // Cierra el modal
      showAlert(isEditing ? 'Combo actualizado' : 'Combo agregado', 'success');

    } catch (err) {
      console.error('[Menu] ❌ Error al guardar combo:', err);
      showAlert(`Error al guardar combo: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCombo = async (comboId) => { 
    if (!restaurantId || !window.confirm('¿Estás seguro de eliminar este combo?')) {
      return;
    }
    
    console.log('[Menu] 🗑️ Eliminando combo:', comboId);
    
    try {
      console.log('[Menu] 📡 DELETE /menu/' + restaurantId + '/combos/' + comboId);
      await api.delete(`/menu/${restaurantId}/combos/${comboId}`);
      
      setCombos(prev => prev.filter(combo => combo.id !== comboId));
      showAlert('Combo eliminado', 'success');
      console.log('[Menu] ✅ Combo eliminado');
    } catch (err) {
      console.error('[Menu] ❌ Error al eliminar combo:', err);
      showAlert(`Error al eliminar combo: ${err.message}`, 'error');
    }
  };

  if (loading) { 
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ButtonLoader size="lg" message="Cargando menú..." />
      </div>
    );
  }

  // --- 🔥 5. RENDERIZADO SIMPLIFICADO ---
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <AlertContainer alerts={alerts} onClose={hideAlert} />
      <WizardCard>
        <WizardSectionHeader 
          icon={Settings} 
          title="Menú del Restaurante" 
          subtitle="Gestiona tus items y combos" 
        />
        
        {error && <WizardErrorBox error={error} onDismiss={() => setError('')} />}
        
        <div className="flex gap-4 mb-6"> 
          <button 
            onClick={handleAddNewItem} // <-- Llama a la nueva función
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ff7f50] to-[#ff6347] text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus size={18} /> Agregar Item
          </button>
          
          <button 
            onClick={handleAddNewCombo} // <-- Llama a la nueva función
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus size={18} /> Agregar Combo
          </button>
        </div>
        
        {/* --- LOS FORMULARIOS YA NO SE RENDERIZAN AQUÍ --- */}

        {/* --- LISTA DE ITEMS --- */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">
            Items del Menú ({items.length})
          </h3>
          
          {items.length === 0 ? ( 
            <div className="text-center py-12 text-gray-500">
              No hay items en el menú. ¡Crea el primero!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => ( 
                <MenuItemCard 
                  key={item.id} 
                  item={item} 
                  onEdit={handleEditItem} // <-- Llama a la nueva función
                  onDelete={handleDeleteItem} 
                />
              ))}
            </div>
          )}
        </div>
        
        {/* --- LISTA DE COMBOS --- */}
        <div>
          <h3 className="text-xl font-semibold mb-4">
            Combos ({combos.length})
          </h3>
          
          {combos.length === 0 ? ( 
            <div className="text-center py-12 text-gray-500">
              No hay combos configurados. ¡Crea el primero!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {combos.map(combo => ( 
                <MenuComboCard 
                  key={combo.id} 
                  combo={combo} 
                  items={items} 
                  onEdit={handleEditCombo} // <-- Llama a la nueva función
                  onDelete={handleDeleteCombo} 
                />
              ))}
            </div>
          )}
        </div>
      </WizardCard>
      
      {/* --- 🔥 6. MODALES (RENDERIZADO FUERA DEL CARD) --- */}
      <Modal 
        isOpen={modalState.isOpen && modalState.type === 'ITEM'}
        onClose={handleCloseModal}
        title={modalState.data?.id ? 'Editar Item' : 'Agregar Nuevo Item'}
        size="md" // Usamos el tamaño 'md' de tu modal
      >
        <MenuItemForm 
          // Pasamos el item/combo como prop
          item={modalState.data} 
          allItems={items} 
          onSave={handleSaveItem} 
          onCancel={handleCloseModal}
          saving={saving}
          // El 'onChange' ahora es manejado internamente por el formulario
        />
      </Modal>

      <Modal 
        isOpen={modalState.isOpen && modalState.type === 'COMBO'}
        onClose={handleCloseModal}
        title={modalState.data?.id ? 'Editar Combo' : 'Agregar Nuevo Combo'}
        size="lg" // Los combos necesitan más espacio
      >
        <MenuComboForm 
          combo={modalState.data} 
          menuItems={items}
          onSave={handleSaveCombo} 
          onCancel={handleCloseModal} 
          saving={saving} 
          // El 'onChange' ahora es manejado internamente
        />
      </Modal>

    </div>
  );
};

export default Menu;