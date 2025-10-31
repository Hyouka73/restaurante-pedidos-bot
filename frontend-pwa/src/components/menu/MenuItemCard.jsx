// frontend-pwa/src/components/menu/MenuItemCard.jsx
import { Edit, Trash2, Image as ImageIcon, Clock, Zap, ListOrdered } from 'lucide-react';

const MenuItemCard = ({ item, onEdit, onDelete }) => {
  const { 
    name, 
    description, 
    price, 
    imageUrl, 
    available, 
    prepTime, 
    complexity, 
    order,
    tags 
  } = item;

  // Formatear los tags para mostrarlos
  const tagList = [
    tags?.categoria_general,
    tags?.tipo_plato,
    tags?.proteina,
    tags?.perfil_sabor,
  ].filter(Boolean); // Filtra los tags vacíos

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border-2 border-[#ffe4c4]/50">
      <div className="flex flex-col md:flex-row">
        
        {/* --- Sección de Imagen --- */}
        <div className="md:w-1/3 flex-shrink-0">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={name}
              className="w-full h-48 md:h-full object-cover"
            />
          ) : (
            <div className="w-full h-48 md:h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <ImageIcon size={40} className="text-gray-400" />
            </div>
          )}
        </div>

        {/* --- Sección de Contenido --- */}
        <div className="p-5 flex flex-col justify-between flex-1">
          
          <div>
            {/* Encabezado: Nombre y Precio */}
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-xl text-gray-800 flex-1 pr-2">{name}</h4>
              <p className="font-extrabold text-2xl text-[#ff7f50]">${parseFloat(price).toFixed(2)}</p>
            </div>
            
            {/* Descripción */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{description || 'Sin descripción'}</p>

            {/* Tags del Asistente */}
            {tagList.length > 0 && (
              <div className="mb-4">
                <h5 className="text-xs font-semibold text-gray-400 uppercase mb-2">Tags</h5>
                <div className="flex flex-wrap gap-2">
                  {tagList.map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Detalles (Tiempo, Orden, etc.) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-700 mb-4">
              <div className="flex items-center gap-1.5" title="Tiempo de Preparación">
                <Clock size={14} className="text-[#ff7f50]" />
                <span>{prepTime || 'N/A'} min</span>
              </div>
              <div className="flex items-center gap-1.5" title="Complejidad">
                <Zap size={14} className="text-[#ff7f50]" />
                <span>{complexity || 'N/A'}/5</span>
              </div>
              <div className="flex items-center gap-1.5" title="Orden Visual">
                <ListOrdered size={14} className="text-[#ff7f50]" />
                <span>{order || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* --- Footer: Acciones y Disponibilidad --- */}
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between pt-4 border-t border-gray-100">
            <span 
              className={`text-sm font-bold px-3 py-1 rounded-full ${
                available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {available ? '✓ Disponible' : '✗ No disponible'}
            </span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => onDelete(item.id)}
                className="btn btn-ghost btn-sm text-red-600 hover:bg-red-100 w-1/2 sm:w-auto"
                title="Eliminar Item"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => onEdit(item)}
                className="btn btn-primary btn-sm bg-gradient-to-r from-[#ff7f50] to-[#ff6347] border-none text-white w-1/2 sm:w-auto"
                title="Editar Item"
              >
                <Edit size={16} />
                <span className="ml-1 hidden sm:inline">Editar</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;