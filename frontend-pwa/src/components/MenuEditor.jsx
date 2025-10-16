// frontend-pwa/src/components/MenuEditor.jsx
// Este componente reutiliza la lógica de src/pages/MenuManager.jsx pero la divide.
// Es un componente enfocado solo en la parte de edición/creación de un ítem.
// Es útil si se quiere incrustar la edición en una modal o vista más grande.

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore';

export default function MenuEditor({ itemId = null, restaurantId, onSave, onCancel }) {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itemData, setItemData] = useState({
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
    if (itemId && restaurantId) {
      const fetchItem = async () => {
        try {
          setLoading(true);
          const itemDoc = await getDoc(doc(db, 'restaurants', restaurantId, 'menu', itemId));
          if (itemDoc.exists()) {
            setItemData({ id: itemDoc.id, ...itemDoc.data() });
          } else {
            setError('Item no encontrado.');
          }
        } catch (err) {
          setError('Error al cargar el item: ' + err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchItem();
    } else if (!itemId) {
      // Limpiar formulario para nuevo ítem
      setItemData({
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
    }
  }, [itemId, restaurantId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setItemData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !restaurantId) {
      setError('Usuario o restaurante no válido.');
      return;
    }

    try {
      setLoading(true);
      const itemToSave = {
        ...itemData,
        price: parseFloat(itemData.price),
        prepTime: parseInt(itemData.prepTime),
        complexity: parseInt(itemData.complexity),
        order: parseInt(itemData.order)
      };

      let result;
      if (itemId) {
        // Actualizar item existente
        await updateDoc(doc(db, 'restaurants', restaurantId, 'menu', itemId), itemToSave);
        result = { id: itemId, ...itemToSave };
      } else {
        // Crear nuevo item
        const docRef = await addDoc(collection(db, 'restaurants', restaurantId, 'menu'), itemToSave);
        result = { id: docRef.id, ...itemToSave };
      }
      onSave(result); // Notificar al componente padre
    } catch (err) {
      setError('Error al guardar el item: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center"><span className="loading loading-spinner loading-md"></span></div>;
  if (error) return <div className="alert alert-error m-2"><span>{error}</span></div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-2">
      <h3 className="text-lg font-semibold">{itemId ? 'Editar Item' : 'Agregar Nuevo Item'}</h3>
      {error && <div className="alert alert-error"><span>{error}</span></div>}
      <div className="form-control">
        <label className="label">Nombre</label>
        <input
          type="text"
          name="name"
          value={itemData.name}
          onChange={handleChange}
          className="input input-bordered"
          required
        />
      </div>
      <div className="form-control">
        <label className="label">Descripción</label>
        <textarea
          name="description"
          value={itemData.description}
          onChange={handleChange}
          className="textarea textarea-bordered"
        ></textarea>
      </div>
      <div className="form-control">
        <label className="label">Precio ($)</label>
        <input
          type="number"
          name="price"
          value={itemData.price}
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
          value={itemData.imageUrl}
          onChange={handleChange}
          className="input input-bordered"
        />
      </div>
      <div className="form-control">
        <label className="label">Categoría</label>
        <input
          type="text"
          name="category"
          value={itemData.category}
          onChange={handleChange}
          className="input input-bordered"
        />
      </div>
      <div className="form-control">
        <label className="label">Tiempo de Preparación (min)</label>
        <input
          type="number"
          name="prepTime"
          value={itemData.prepTime}
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
          value={itemData.complexity}
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
          value={itemData.order}
          onChange={handleChange}
          className="input input-bordered"
          min="1"
        />
      </div>
      <label className="label cursor-pointer justify-start mt-2">
        <input
          type="checkbox"
          name="available"
          checked={itemData.available}
          onChange={handleChange}
          className="checkbox checkbox-primary"
        />
        <span className="label-text ml-2">Disponible</span>
      </label>

      <div className="form-control mt-4 flex-row justify-end space-x-2">
        <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel} disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-sm btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : (itemId ? 'Actualizar' : 'Agregar')}
        </button>
      </div>
    </form>
  );
}