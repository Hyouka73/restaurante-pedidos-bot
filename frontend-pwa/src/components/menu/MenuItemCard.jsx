// frontend-pwa/src/components/menu/MenuItemCard.jsx
import { Edit, Trash2, Image as ImageIcon } from 'lucide-react';

const MenuItemCard = ({ item, onEdit, onDelete }) => {
  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Imagen del item */}
      {item.imageUrl ? (
        <div className="w-full h-40 bg-gray-100">
          <img 
            src={item.imageUrl} 
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <ImageIcon size={40} className="text-gray-400" />
        </div>
      )}
      
      {/* Contenido */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h4 className="font-bold text-lg">{item.name}</h4>
            <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
          </div>
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => onEdit(item)}
              className="text-blue-600 hover:text-blue-800 p-1"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="text-red-600 hover:text-red-800 p-1"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <p className="font-semibold text-xl text-[#ff7f50] mb-2">${item.price}</p>
        <p className="text-xs text-gray-500 mb-2">
          <span className="inline-block bg-gray-100 px-2 py-1 rounded">{item.category}</span>
        </p>
        
        <div className="text-xs text-gray-500 flex flex-wrap gap-2">
          <span>⏱️ {item.prepTime}min</span>
          <span>🔥 {item.complexity}/5</span>
          <span>📋 Ord: {item.order}</span>
          <span className={item.available ? 'text-green-600' : 'text-red-600'}>
            {item.available ? '✓ Disponible' : '✗ No disponible'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;