// frontend-pwa/src/components/menu/MenuComboCard.jsx
import { Edit, Trash2, Image as ImageIcon } from 'lucide-react';

const MenuComboCard = ({ combo, items, onEdit, onDelete }) => {
  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Imagen del combo */}
      {combo.imageUrl ? (
        <div className="w-full h-40 bg-gray-100">
          <img 
            src={combo.imageUrl} 
            alt={combo.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `
                <div class="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
              `;
            }}
          />
        </div>
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
          <ImageIcon size={40} className="text-blue-400" />
        </div>
      )}
      
      {/* Contenido */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h4 className="font-bold text-lg">{combo.name}</h4>
            <p className="text-sm text-gray-600 line-clamp-2">{combo.description}</p>
          </div>
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => onEdit(combo)}
              className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
              title="Editar combo"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => onDelete(combo.id)}
              className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
              title="Eliminar combo"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <p className="font-semibold text-xl text-blue-600 mb-2">
          ${typeof combo.price === 'number' ? combo.price.toFixed(2) : combo.price}
          <span className="text-xs text-gray-500 ml-1">
            {combo.useItemPrices ? "(Calculado)" : "(Fijo)"}
          </span>
        </p>
        
        <div className="mt-2 mb-3">
          <h5 className="text-xs font-medium text-gray-700 mb-1">Items incluidos:</h5>
          <div className="flex flex-wrap gap-1">
            {combo.items && combo.items.length > 0 ? (
              combo.items.map(itemId => {
                const item = items.find(i => i.id === itemId);
                return item ? (
                  <span key={itemId} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                    {item.name}
                  </span>
                ) : (
                  <span key={itemId} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">
                    Item no encontrado
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-gray-400 italic">Sin items asignados</span>
            )}
          </div>
        </div>
        
        <div className="text-xs text-gray-500 flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          <span className="bg-gray-100 px-2 py-1 rounded">📋 Orden: {combo.order}</span>
          <span className={`px-2 py-1 rounded ${combo.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {combo.available ? '✓ Disponible' : '✗ No disponible'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MenuComboCard;