// frontend-pwa/src/components/menu/MenuComboCard.jsx
import { Edit, Trash2, Image as ImageIcon, ListOrdered, Package } from 'lucide-react';

const MenuComboCard = ({ combo, items, onEdit, onDelete }) => {
  const {
    name,
    description,
    price,
    imageUrl,
    available,
    order,
    componentes
  } = combo;

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border-2 border-blue-200/50">
      <div className="flex flex-col md:flex-row">
        
        {/* --- Sección de Imagen --- */}
        <div className="md:w-1/3 flex-shrink-0">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={name}
              className="w-full h-48 md:h-full object-cover"
              onError={(e) => { e.target.src = ''; /* Opcional: poner un placeholder */ }}
            />
          ) : (
            <div className="w-full h-48 md:h-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
              <ImageIcon size={40} className="text-blue-400" />
            </div>
          )}
        </div>

        {/* --- Sección de Contenido --- */}
        <div className="p-5 flex flex-col justify-between flex-1">
          
          <div>
            {/* Encabezado: Nombre y Precio */}
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-xl text-gray-800 flex-1 pr-2">{name}</h4>
              <p className="font-extrabold text-2xl text-blue-600">${parseFloat(price).toFixed(2)}</p>
            </div>
            
            {/* Descripción */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{description || 'Sin descripción'}</p>

            {/* Componentes del Combo */}
            <div className="mb-4">
              <h5 className="text-xs font-semibold text-gray-400 uppercase mb-2">Componentes</h5>
              <div className="space-y-2">
                {(componentes || []).map((comp, index) => (
                  <div key={index} className="text-sm">
                    <strong className="text-gray-700">{comp.title || 'Componente'}</strong>:
                    <span className="text-gray-600 ml-1">
                      {comp.items_opciones.map(opt => opt.name).join(', ') || 'Sin opciones'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Detalles (Orden) */}
            <div className="flex gap-2 text-sm text-gray-700 mb-4">
              <div className="flex items-center gap-1.5" title="Orden Visual">
                <ListOrdered size={14} className="text-blue-600" />
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
                onClick={() => onDelete(combo.id)}
                className="btn btn-ghost btn-sm text-red-600 hover:bg-red-100 w-1/2 sm:w-auto"
                title="Eliminar Combo"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => onEdit(combo)}
                className="btn btn-primary btn-sm bg-gradient-to-r from-blue-500 to-indigo-600 border-none text-white w-1/2 sm:w-auto"
                title="Editar Combo"
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

export default MenuComboCard;