// frontend-pwa/src/components/menu/MenuComboCard.jsx
import React, { useState } from 'react';
import { Edit, Trash2, Clock, Zap, ListOrdered, Package, Heart } from 'lucide-react';

// MenuComboCard mejorado
const MenuComboCard = ({ combo, items, onEdit, onDelete }) => {
  const [isFavorite, setIsFavorite] = useState(false);
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
    <div className="relative w-full max-w-[280px] mx-auto bg-white rounded-2xl p-2 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.03]">
      {/* Imagen con precio */}
      <div className="relative w-full h-40 rounded-xl rounded-tr-[4rem] mb-4 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={40} className="text-blue-400" />
          </div>
        )}
        
        {/* Precio flotante */}
        <div className="absolute right-3 -bottom-4 bg-white text-blue-600 font-black text-lg px-4 py-2 rounded-2xl rounded-br-3xl shadow-md">
          ${parseFloat(price).toFixed(2)}
        </div>
      </div>

      {/* Badge de COMBO */}
      <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full z-10">
        COMBO
      </div>

      {/* Botón favorito */}
      <label className="absolute top-2 right-2 w-6 h-6 cursor-pointer z-10">
        <input 
          type="checkbox"
          checked={isFavorite}
          onChange={() => setIsFavorite(!isFavorite)}
          className="hidden"
        />
        <Heart 
          size={24} 
          className={`transition-all duration-300 ${
            isFavorite 
              ? 'fill-red-500 text-red-500 animate-bounce' 
              : 'fill-gray-300 text-gray-300'
          }`}
        />
      </label>

      {/* Contenido */}
      <div className="px-3 mb-4">
        {/* Marca/Categoría */}
        <div className="text-xs font-black text-gray-400 tracking-wider mb-1">
          PAQUETE ESPECIAL
        </div>
        
        {/* Nombre del producto */}
        <h4 className="font-bold text-base text-gray-700 mb-3 line-clamp-2 min-h-[2.5rem]">
          {name}
        </h4>

        {/* Información en dos columnas */}
        <div className="flex justify-between gap-4 text-xs font-bold text-gray-400 uppercase mb-4">
          {/* Componentes */}
          <div className="flex-1">
            <div className="mb-1">Incluye</div>
            <div className="flex flex-col gap-1 mt-1 text-[10px] text-gray-600 normal-case font-normal">
              {(componentes || []).slice(0, 2).map((comp, index) => (
                <div key={index} className="flex items-start gap-1">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span className="line-clamp-1">{comp.title || 'Item'}</span>
                </div>
              ))}
              {(componentes || []).length > 2 && (
                <span className="text-blue-600 text-[9px] font-medium">
                  +{componentes.length - 2} más
                </span>
              )}
            </div>
          </div>

          {/* Info adicional */}
          <div className="flex-1">
            <div className="mb-1">Orden</div>
            <div className="flex items-center gap-1 mt-1">
              <ListOrdered size={12} className="text-blue-600" />
              <span className="text-gray-700 text-[10px]">{order || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Estado de disponibilidad */}
        <div className="flex items-center gap-2 text-xs font-bold mb-3">
          <div className="flex items-center gap-1 text-gray-600">
            <span className="text-[10px]">★★★★★</span>
            <span className="text-gray-400">(189)</span>
          </div>
          <span 
            className={`ml-auto px-2 py-1 rounded-full text-[10px] ${
              available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {available ? '✓' : '✗'}
          </span>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-1.5">
        <button
          onClick={() => onEdit(combo)}
          className="flex-1 bg-blue-600 hover:bg-indigo-600 text-white font-black py-2.5 rounded-[1.4rem] rounded-b-xl transition-colors duration-300"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(combo.id)}
          className="w-14 bg-blue-600 hover:bg-red-600 text-white font-black py-2.5 rounded-[1.4rem] rounded-b-xl transition-colors duration-300 flex items-center justify-center"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default MenuComboCard;

/* Este componente de demostración es útil para probar los diseños 
  aisladamente, pero no es necesario para la app principal. 
  Lo dejaremos comentado por si lo necesitas.
*/
// // Demo Component
// export default function MenuCardsDemo() {
//   // ... (estado de demo y JSX)
// }