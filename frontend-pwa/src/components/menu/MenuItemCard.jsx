// frontend-pwa/src/components/menu/MenuItemCard.jsx
import { Edit, Trash2 } from 'lucide-react';

const MenuItemCard = ({ item, onEdit, onDelete }) => {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold">{item.name}</h4>
          <p className="text-sm text-gray-600">{item.description}</p>
          <p className="font-semibold mt-1">${item.price}</p>
          <p className="text-xs text-gray-500">Categoría: {item.category}</p>
        </div>
        <div className="flex flex-col gap-1">
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
      <div className="mt-2 text-xs text-gray-500">
        Prep: {item.prepTime}min | Comp: {item.complexity}/5 | Ord: {item.order} | Disp: {item.available ? 'Sí' : 'No'}
      </div>
    </div>
  );
};

export default MenuItemCard;