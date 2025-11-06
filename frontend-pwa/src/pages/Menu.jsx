import { useState, useEffect } from 'react'; // Eliminamos useRef
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRestaurant } from '../context/RestaurantContext';
import { useAlert, AlertContainer } from '../components/ui/CustomAlert';
import { ButtonLoader } from '../components/ui/Loader';
// Eliminamos WizardCard y WizardSectionHeader, ya no los usaremos en esta página
import { WizardErrorBox } from '../components/ui/WizardComponents.jsx';
import { Plus, Utensils, Package } from 'lucide-react'; // <-- Cambiamos el icono
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
  const { user, loading: loadingAuth } = useAuth();
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

  const handleSaveItem = async (itemDataFromForm) => {
    const isEditing = !!itemDataFromForm.id;
    if (!itemDataFromForm.name.trim() || !itemDataFromForm.price) {
      showAlert('Nombre y precio son obligatorios.', 'warning', 3000);
      return;
    }
    if (!itemDataFromForm.tags?.categoria_general) {
      showAlert('La "Categoría General" es obligatoria.', 'warning', 3000);
      return;
    }
    console.log(isEditing ? '[Menu] ✏️ Actualizando item:' : '[Menu] ➕ Agregando nuevo item:', itemDataFromForm.id || '(nuevo)');
    setSaving(true);
    
    try {
      // Usamos 'dataToSave' para no mutar el estado accidentalmente
      const dataToSave = { 
        ...itemDataFromForm, 
        price: parseFloat(itemDataFromForm.price), 
        prepTime: parseInt(itemDataFromForm.prepTime) || 5, 
        complexity: parseInt(itemDataFromForm.complexity) || 1, 
        order: parseInt(itemDataFromForm.order) || 1 
      };

      if (isEditing) {
        await api.put(`/menu/${restaurantId}/items/${dataToSave.id}`, dataToSave);
        setItems(prev => prev.map(item => (item.id === dataToSave.id ? dataToSave : item)));
      } else {
        await api.post(`/menu/${restaurantId}/items`, dataToSave);
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

  const handleSaveCombo = async (comboDataFromForm) => {
    const isEditing = !!comboDataFromForm.id;
    if (!comboDataFromForm.name.trim() || !comboDataFromForm.price) {
      showAlert('Nombre y precio son obligatorios para el combo.', 'warning', 3000);
      return;
    }
    if (!comboDataFromForm.componentes || comboDataFromForm.componentes.length === 0 || 
        comboDataFromForm.componentes.some(c => !c.title || c.items_opciones.length === 0)) {
      showAlert('El combo debe tener al menos un componente con título y opciones.', 'warning', 3000);
      return;
    }

    console.log(isEditing ? '[Menu] ✏️ Actualizando combo:' : '[Menu] 💾 Guardando combo:', comboDataFromForm.id || '(nuevo)');
    setSaving(true);
    
    try {
      // Usamos 'dataToSave'
      const dataToSave = { 
        ...comboDataFromForm, 
        price: parseFloat(comboDataFromForm.price),
        order: parseInt(comboDataFromForm.order) || 1 
      };

      if (isEditing) {
        await api.put(`/menu/${restaurantId}/combos/${dataToSave.id}`, dataToSave);
        setCombos(prev => prev.map(combo => 
          combo.id === dataToSave.id ? dataToSave : combo
        ));
      } else {
        await api.post(`/menu/${restaurantId}/combos`, dataToSave);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <ButtonLoader size="lg" message="Cargando menú..." />
      </div>
    );
  }

  // --- 🔥 5. RENDERIZADO SIMPLIFICADO ---
  // --- 🔥 RENDERIZADO REDISEÑADO ---
  return (
    // Fondo degradado para que las tarjetas blancas resalten
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 p-4 md:p-8">
      <AlertContainer alerts={alerts} onClose={hideAlert} />
      
      {/* Contenedor principal */}
      <div className="max-w-7xl mx-auto">
        
        {/* Encabezado de la Página */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gray-800 mb-2">
            Gestión del Menú
          </h1>
          <p className="text-lg text-gray-600">
            Añade, edita y organiza tus productos y combos.
          </p>
        </div>
        
        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10"> 
          <button 
            onClick={handleAddNewItem}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ff7f50] to-[#ff6347] text-white rounded-full hover:shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            <Plus size={18} />
            <span className="font-bold">Agregar Item</span>
          </button>
          
          <button 
            onClick={handleAddNewCombo}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full hover:shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            <Plus size={18} />
            <span className="font-bold">Agregar Combo</span>
          </button>
        </div>
        
        {error && <WizardErrorBox error={error} onDismiss={() => setError('')} />}

        {/* --- LISTA DE ITEMS --- */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-700 mb-6 flex items-center gap-3">
            <span className="w-2 h-10 bg-[#ff7f50] rounded-full"></span>
            Items del Menú ({items.length})
          </h2>
          
          {items.length === 0 ? ( 
            <div className="text-center py-16 text-gray-500 bg-white rounded-2xl shadow-inner border border-gray-100">
              <Utensils size={40} className="mx-auto mb-4 text-gray-400" />
              No hay items en el menú. ¡Crea el primero!
            </div>
          ) : (
            // Grid responsivo que centra las tarjetas
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
              {items.map(item => ( 
                <MenuItemCard 
                  key={item.id} 
                  item={item} 
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem} 
                />
              ))}
            </div>
          )}
        </section>
        
        {/* --- LISTA DE COMBOS --- */}
        <section>
          <h2 className="text-3xl font-bold text-gray-700 mb-6 flex items-center gap-3">
            <span className="w-2 h-10 bg-blue-600 rounded-full"></span>
            Combos ({combos.length})
          </h2>
          
          {combos.length === 0 ? ( 
            <div className="text-center py-16 text-gray-500 bg-white rounded-2xl shadow-inner border border-gray-100">
              <Package size={40} className="mx-auto mb-4 text-gray-400" />
              No hay combos configurados. ¡Crea el primero!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
              {combos.map(combo => ( 
                <MenuComboCard 
                  key={combo.id} 
                  combo={combo} 
                  items={items} 
                  onEdit={handleEditCombo}
                  onDelete={handleDeleteCombo} 
                />
              ))}
            </div>
          )}
        </section>
      </div>
      
      {/* --- MODALES (Se renderizan aquí, fuera del flujo principal) --- */}
      <Modal 
        isOpen={modalState.isOpen && modalState.type === 'ITEM'}
        onClose={handleCloseModal}
        title={modalState.data?.id ? 'Editar Item' : 'Agregar Nuevo Item'} 
        size="md" // 'md' es un buen tamaño para el item form
      >
        <MenuItemForm 
          item={modalState.data} 
          allItems={items} 
          onSave={handleSaveItem} 
          onCancel={handleCloseModal}
          saving={saving}
        />
      </Modal>

      <Modal 
        isOpen={modalState.isOpen && modalState.type === 'COMBO'}
        onClose={handleCloseModal}
        title={modalState.data?.id ? 'Editar Combo' : 'Agregar Nuevo Combo'}
        size="lg" // 'lg' es mejor para los componentes del combo
      >
        <MenuComboForm 
          combo={modalState.data} 
          menuItems={items}
          onSave={handleSaveCombo} 
          onCancel={handleCloseModal} 
          saving={saving} 
        />
      </Modal>

    </div>
  );
};

export default Menu;