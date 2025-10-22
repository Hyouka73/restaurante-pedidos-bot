// frontend-pwa/src/components/menu/MenuComboCard.jsx
import { Edit, Trash2 } from 'lucide-react';

const MenuComboCard = ({ combo, items, onEdit, onDelete }) => {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold">{combo.name}</h4>
          <p className="text-sm text-gray-600">{combo.description}</p>
          <p className="font-semibold mt-1">${combo.price} {(combo.useItemPrices ? "(Calculado)" : "(Fijo)")}</p>
          <div className="mt-2">
            <h5 className="text-xs font-medium">Items:</h5>
            <ul className="text-xs list-disc list-inside">
              {combo.items.map(itemId => {
                const item = items.find(i => i.id === itemId);
                return item ? <li key={itemId}>{item.name}</li> : <li key={itemId}>Item no encontrado</li>;
              })}
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onEdit(combo)}
            className="text-blue-600 hover:text-blue-800 p-1"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => onDelete(combo.id)}
            className="text-red-600 hover:text-red-800 p-1"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Ord: {combo.order} | Disp: {combo.available ? 'Sí' : 'No'}
      </div>
    </div>
  );
};

export default MenuComboCard;