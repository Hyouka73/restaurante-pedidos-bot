import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase';

export default function MenuManager() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate(); // Para redirigir si no está autenticado
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    available: true,
    category: '',
    prepTime: 5,
    complexity: 1,
    order: 1
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchMenu = async () => {
      try {
        setLoading(true);
        // Suponiendo que los items del menú están en una subcolección
        // Necesitamos el restaurantId del usuario
        const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          const restaurantId = userData.restaurantId;

          const q = query(collection(db, 'restaurants', restaurantId, 'menu'));
          const querySnapshot = await getDocs(q);
          const itemsList = [];
          querySnapshot.forEach((doc) => {
            itemsList.push({ id: doc.id, ...doc.data() });
          });
          setItems(itemsList);
        } else {
          setError('Usuario no encontrado en la base de datos.');
        }
      } catch (err) {
        setError('Error al cargar el menú: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingItem(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      // Obtener restaurantId del usuario
      const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
      if (userDoc.empty) {
        setError('Usuario no encontrado.');
        return;
      }
      const userData = userDoc.docs[0].data();
      const restaurantId = userData.restaurantId;

      const itemToSave = {
        ...newItem,
        price: parseFloat(newItem.price),
        prepTime: parseInt(newItem.prepTime),
        complexity: parseInt(newItem.complexity),
        order: parseInt(newItem.order)
      };

      if (editingItem) {
        // Actualizar item existente
        await updateDoc(doc(db, 'restaurants', restaurantId, 'menu', editingItem.id), itemToSave);
        setItems(prev => prev.map(item => item.id === editingItem.id ? { ...itemToSave, id: editingItem.id } : item));
        setEditingItem(null);
      } else {
        // Crear nuevo item
        const docRef = await addDoc(collection(db, 'restaurants', restaurantId, 'menu'), itemToSave);
        setItems(prev => [...prev, { id: docRef.id, ...itemToSave }]);
      }
      setNewItem({
        name: '',
        description: '',
        price: '',
        imageUrl: '',
        available: true,
        category: '',
        prepTime: 5,
        complexity: 1,
        order: 1
      });
      alert(editingItem ? '✅ Item actualizado' : '✅ Item agregado');
    } catch (err) {
      setError('Error al guardar el item: ' + err.message);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('¿Estás seguro de eliminar este item?')) return;
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      // Obtener restaurantId del usuario
      const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
      if (userDoc.empty) {
        setError('Usuario no encontrado.');
        return;
      }
      const userData = userDoc.docs[0].data();
      const restaurantId = userData.restaurantId;

      await deleteDoc(doc(db, 'restaurants', restaurantId, 'menu', itemId));
      setItems(prev => prev.filter(item => item.id !== itemId));
      alert('❌ Item eliminado');
    } catch (err) {
      setError('Error al eliminar el item: ' + err.message);
    }
  };

  const startEditing = (item) => {
    setEditingItem({ ...item });
    setNewItem({
      name: item.name,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      available: item.available,
      category: item.category,
      prepTime: item.prepTime,
      complexity: item.complexity,
      order: item.order
    });
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setNewItem({
      name: '',
      description: '',
      price: '',
      imageUrl: '',
      available: true,
      category: '',
      prepTime: 5,
      complexity: 1,
      order: 1
    });
  };

  if (loading) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><span className="loading loading-spinner loading-lg"></span></div></div>;
  if (error) return <div className="hero min-h-screen bg-base-200"><div className="hero-content text-center"><div className="max-w-md"><h1 className="text-2xl font-bold">Error</h1><p>{error}</p></div></div></div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Gestión del Menú</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulario */}
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-4">{editingItem ? 'Editar Item' : 'Agregar Nuevo Item'}</h2>
          {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}
          <form onSubmit={handleSubmit}>
            <div className="form-control">
              <label className="label">Nombre</label>
              <input
                type="text"
                name="name"
                value={newItem.name}
                onChange={handleChange}
                className="input input-bordered"
                required
              />
            </div>
            <div className="form-control">
              <label className="label">Descripción</label>
              <textarea
                name="description"
                value={newItem.description}
                onChange={handleChange}
                className="textarea textarea-bordered"
              ></textarea>
            </div>
            <div className="form-control">
              <label className="label">Precio ($)</label>
              <input
                type="number"
                name="price"
                value={newItem.price}
                onChange={handleChange}
                className="input input-bordered"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="form-control">
              <label className="label">Imagen URL</label>
              <input
                type="text"
                name="imageUrl"
                value={newItem.imageUrl}
                onChange={handleChange}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">Categoría</label>
              <input
                type="text"
                name="category"
                value={newItem.category}
                onChange={handleChange}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">Tiempo de Preparación (min)</label>
              <input
                type="number"
                name="prepTime"
                value={newItem.prepTime}
                onChange={handleChange}
                className="input input-bordered"
                min="1"
              />
            </div>
            <div className="form-control">
              <label className="label">Complejidad (1-5)</label>
              <input
                type="number"
                name="complexity"
                value={newItem.complexity}
                onChange={handleChange}
                className="input input-bordered"
                min="1"
                max="5"
              />
            </div>
            <div className="form-control">
              <label className="label">Orden</label>
              <input
                type="number"
                name="order"
                value={newItem.order}
                onChange={handleChange}
                className="input input-bordered"
                min="1"
              />
            </div>
            <label className="label cursor-pointer justify-start mt-2">
              <input
                type="checkbox"
                name="available"
                checked={newItem.available}
                onChange={handleChange}
                className="checkbox checkbox-primary"
              />
              <span className="label-text ml-2">Disponible</span>
            </label>

            <div className="form-control mt-6">
              <button type="submit" className="btn btn-primary">
                {editingItem ? 'Actualizar' : 'Agregar'}
              </button>
              {editingItem && (
                <button type="button" onClick={cancelEditing} className="btn btn-ghost mt-2">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de Items */}
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="text-xl font-semibold mb-4">Items del Menú</h2>
          <div className="space-y-4">
            {items.length === 0 ? (
              <p className="text-center">No hay items en el menú.</p>
            ) : (
              items.map(item => (
                <div key={item.id} className="card bg-base-200 shadow">
                  <div className="card-body">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        <p className="text-gray-500">${item.price}</p>
                        <p className="text-sm">{item.description}</p>
                        <div className="badge badge-neutral mt-1">{item.category || 'Sin categoría'}</div>
                        <div className="badge badge-secondary mt-1 ml-1">Ord. {item.order}</div>
                      </div>
                      <div className="flex flex-col">
                        <button onClick={() => startEditing(item)} className="btn btn-xs btn-outline">Editar</button>
                        <button onClick={() => handleDelete(item.id)} className="btn btn-xs btn-outline btn-error mt-1">Eliminar</button>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      Prep: {item.prepTime}min | Comp: {item.complexity}/5 | {item.available ? '✅ Disponible' : '❌ No disponible'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}