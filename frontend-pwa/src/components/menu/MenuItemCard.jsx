// frontend-pwa/src/components/menu/MenuItemCard.jsx
import React, { useState } from 'react';
import { Edit, Trash2, Clock, Zap, ListOrdered, Package, Heart } from 'lucide-react';

// MenuItemCard mejorado
const MenuItemCard = ({ item, onEdit, onDelete }) => {
  const [isFavorite, setIsFavorite] = useState(false);
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

  const tagList = [
    tags?.categoria_general,
    tags?.tipo_plato,
    tags?.proteina,
    tags?.perfil_sabor,
  ].filter(Boolean);

  return (
    <div className="relative w-full max-w-[280px] mx-auto bg-white rounded-2xl p-2 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.03]">
      {/* Imagen con precio */}
      <div className="relative w-full h-40 rounded-xl rounded-tr-[4rem] mb-4 overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Precio flotante */}
        <div className="absolute right-3 -bottom-4 bg-white text-[#ff7f50] font-black text-lg px-4 py-2 rounded-2xl rounded-br-3xl shadow-md">
          ${parseFloat(price).toFixed(2)}
        </div>
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
          {tags?.categoria_general || 'PLATO'}
        </div>
        
        {/* Nombre del producto */}
        <h4 className="font-bold text-base text-gray-700 mb-3 line-clamp-2 min-h-[2.5rem]">
          {name}
        </h4>

        {/* Información en dos columnas */}
        <div className="flex justify-between gap-4 text-xs font-bold text-gray-400 uppercase mb-4">
          {/* Detalles */}
          <div className="flex-1">
            <div className="mb-1">Tiempo</div>
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center gap-1">
                <Clock size={12} className="text-[#ff7f50]" />
                <span className="text-gray-700 text-[10px]">{prepTime || 'N/A'} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap size={12} className="text-[#ff7f50]" />
                <span className="text-gray-700 text-[10px]">{complexity || 'N/A'}/5</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex-1">
            <div className="mb-1">Tags</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {tagList.slice(0, 2).map(tag => (
                <span key={tag} className="text-[9px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                  {tag.substring(0, 8)}
                </span>
              ))}
              {tagList.length > 2 && (
                <span className="text-[9px] text-gray-500">+{tagList.length - 2}</span>
              )}
            </div>
          </div>
        </div>

        {/* Estado de disponibilidad */}
        <div className="flex items-center gap-2 text-xs font-bold mb-3">
          <div className="flex items-center gap-1 text-gray-600">
            <span className="text-[10px]">★★★★</span>
            <span className="text-gray-400">(250)</span>
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
          onClick={() => onEdit(item)}
          className="flex-1 bg-[#ff7f50] hover:bg-[#ff6347] text-white font-black py-2.5 rounded-[1.4rem] rounded-b-xl transition-colors duration-300"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="w-14 bg-[#ff7f50] hover:bg-red-600 text-white font-black py-2.5 rounded-[1.4rem] rounded-b-xl transition-colors duration-300 flex items-center justify-center"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default MenuItemCard;