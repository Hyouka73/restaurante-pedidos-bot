// frontend-pwa/src/components/ui/MapSelectorModal.jsx
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, X, Check, Loader2, Search } from 'lucide-react';

// Solucionar problema de iconos por defecto en Leaflet
delete L.Icon.Default.prototype._getIconUrl;

// Crear un icono personalizado más bonito
const customIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      position: relative;
      width: 32px;
      height: 40px;
      filter: drop-shadow(0 4px 8px rgba(255, 127, 80, 0.4));
    ">
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 40 16 40C16 40 32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="url(#gradient)"/>
        <circle cx="16" cy="15" r="6" fill="white"/>
        <defs>
          <linearGradient id="gradient" x1="16" y1="0" x2="16" y2="40" gradientUnits="userSpaceOnUse">
            <stop stop-color="#ff7f50"/>
            <stop offset="1" stop-color="#ff6347"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  `,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40]
});

// Coordenadas por defecto (Tuxtla Gtz, Chiapas)
const DEFAULT_CENTER = [16.7595, -93.1171];
const DEFAULT_ZOOM = 13;

// Componente para manejar clics en el mapa
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: onMapClick,
  });
  return null;
}

export default function MapSelectorModal({ isOpen, onClose, onSelectLocation, initialLocation = null }) {
  const [map, setMap] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    if (isOpen && map) {
      console.log("[MapModal] Modal abierto y mapa cargado. initialLocation:", initialLocation);

      if (initialLocation && initialLocation.lat != null && initialLocation.lng != null) {
        console.log("[MapModal] Ubicación inicial válida. Centrando mapa y marcador.");
        const newPos = [initialLocation.lat, initialLocation.lng];
        map.setView(newPos, DEFAULT_ZOOM);
        setMarkerPosition(newPos);
        setAddress(initialLocation.formatted_address || `Coordenadas: ${newPos[0].toFixed(6)}, ${newPos[1].toFixed(6)}`);
      } else {
        console.log("[MapModal] No hay ubicación inicial válida. Centrando en posición por defecto.");
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        setMarkerPosition(null);
        setAddress('');
      }
    }
  }, [isOpen, map, initialLocation]);

  // Función para obtener dirección desde coordenadas (Geocodificación inversa)
  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      setAddress('🔍 Buscando dirección...');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'es'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener dirección');
      }
      
      const data = await response.json();
      console.log('[MapModal] Datos de geocodificación:', data);
      
      // Construir dirección formateada
      const address = data.address;
      let formattedAddress = '';
      
      if (address.road || address.street) {
        formattedAddress += (address.road || address.street);
        if (address.house_number) {
          formattedAddress += ` ${address.house_number}`;
        }
      }
      
      if (address.suburb || address.neighbourhood) {
        formattedAddress += formattedAddress ? ', ' : '';
        formattedAddress += (address.suburb || address.neighbourhood);
      }
      
      if (address.city || address.town || address.village) {
        formattedAddress += formattedAddress ? ', ' : '';
        formattedAddress += (address.city || address.town || address.village);
      }
      
      if (address.state) {
        formattedAddress += formattedAddress ? ', ' : '';
        formattedAddress += address.state;
      }
      
      // Si no se pudo construir dirección, usar display_name
      const finalAddress = formattedAddress || data.display_name || `📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      
      setAddress(finalAddress);
      return finalAddress;
    } catch (error) {
      console.error('[MapModal] Error en geocodificación:', error);
      const fallbackAddress = `📍 Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
      setAddress(fallbackAddress);
      return fallbackAddress;
    }
  };

  const handleMapClick = async (e) => {
    if (isDragging) {
      console.log("[MapModal] Ignorando clic porque se está arrastrando el marcador.");
      return;
    }
    const { lat, lng } = e.latlng;
    console.log(`[MapModal] Mapa clickeado en [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
    setMarkerPosition([lat, lng]);
    await getAddressFromCoordinates(lat, lng);
  };

  const handleMarkerDragStart = () => {
    console.log("[MapModal] Arrastre de marcador iniciado.");
    setIsDragging(true);
  };

  const handleMarkerDragEnd = async (e) => {
    setIsDragging(false);
    const marker = e.target;
    const position = marker.getLatLng();
    console.log(`[MapModal] Marcador movido a [${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}]`);
    setMarkerPosition([position.lat, position.lng]);
    await getAddressFromCoordinates(position.lat, position.lng);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`[MapModal] Ubicación actual obtenida: [${latitude}, ${longitude}]`);
        const newPos = [latitude, longitude];
        
        // Verificar que el mapa existe y tiene el método flyTo
        console.log('[MapModal] Objeto map:', map);
        if (map && typeof map.flyTo === 'function') {
          console.log('[MapModal] Volando hacia ubicación:', newPos);
          map.flyTo(newPos, 17, {
            duration: 1.5,
            easeLinearity: 0.25
          });
        } else {
          console.error('[MapModal] El mapa no está disponible o no tiene flyTo');
        }
        
        // Luego actualizar el marcador y dirección
        setMarkerPosition(newPos);
        setIsGettingLocation(false);
        await getAddressFromCoordinates(latitude, longitude);
      },
      (error) => {
        console.error('[MapModal] Error al obtener ubicación:', error);
        let errorMessage = 'No se pudo obtener tu ubicación.';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso denegado. Por favor, permite el acceso a tu ubicación en la configuración del navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible.';
            break;
          case error.TIMEOUT:
            errorMessage = 'La solicitud de ubicación ha expirado. Intenta de nuevo.';
            break;
          default:
            errorMessage = 'Error desconocido al obtener la ubicación.';
        }
        
        alert(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleConfirm = () => {
    if (markerPosition) {
      console.log(`[MapModal] Confirmar selección en [${markerPosition[0].toFixed(6)}, ${markerPosition[1].toFixed(6)}]`);
      const selectedLocation = {
        lat: markerPosition[0],
        lng: markerPosition[1],
        formatted_address: address || `Lat: ${markerPosition[0].toFixed(6)}, Lng: ${markerPosition[1].toFixed(6)}`
      };
      onSelectLocation(selectedLocation);
      onClose();
    } else {
      console.warn("[MapModal] No hay marcador para confirmar.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header del Modal */}
            <div 
              className="p-6 flex justify-between items-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(120deg, #ffae91 30%, #ff7f50 88%, #ffe4c4 40%, #ffb9a0 78%)'
              }}
            >
              <div className="relative z-10 flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <MapPin className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-white">Seleccionar Ubicación</h3>
                  <p className="text-white/90 text-sm">Marca la ubicación de tu restaurante</p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="relative z-10 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} />
              </motion.button>

              {/* Decoración de fondo */}
              <motion.div
                className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"
                animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                transition={{ duration: 8, repeat: Infinity }}
              />
            </div>

            {/* Contenido del Modal (Mapa) */}
            <div className="flex-1 relative">
              {isOpen && (
                <>
                  <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={DEFAULT_ZOOM}
                    style={{ height: '100%', width: '100%' }}
                    ref={setMap}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onMapClick={handleMapClick} />
                    {markerPosition && (
                      <Marker
                        position={markerPosition}
                        draggable={true}
                        icon={customIcon}
                        eventHandlers={{
                          dragstart: handleMarkerDragStart,
                          dragend: handleMarkerDragEnd,
                        }}
                      >
                        <Popup className="custom-popup">
                          <div className="text-center p-2">
                            <p className="font-bold text-[#ff7f50] mb-1">📍 Tu Restaurante</p>
                            <p className="text-xs text-gray-600">Arrastra para ajustar</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>

                  {/* Botón flotante para obtener ubicación actual */}
                  <motion.button
                    onClick={handleGetCurrentLocation}
                    disabled={isGettingLocation}
                    className="absolute bottom-6 right-6 z-[1000] w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, #ff7f50 0%, #ff6347 100%)'
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Usar mi ubicación actual"
                  >
                    {isGettingLocation ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Navigation className="w-6 h-6" />
                    )}
                  </motion.button>

                  {/* Instrucciones flotantes */}
                  {!markerPosition && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border-2 border-[#ff7f50]/30"
                    >
                      <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <MapPin size={18} className="text-[#ff7f50]" />
                        Haz clic en el mapa para marcar la ubicación
                      </p>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* Footer del Modal */}
            <div 
              className="p-6 flex flex-col gap-4"
              style={{
                background: 'linear-gradient(to top, rgba(255, 228, 196, 0.3), rgba(255, 255, 255, 0.95))'
              }}
            >
              {/* Información de dirección */}
              <div className="flex items-start gap-3 p-4 bg-white border-2 border-[#ffe4c4] rounded-xl">
                <MapPin className="w-5 h-5 text-[#ff7f50] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {address ? (
                    <>
                      <p className="text-xs font-semibold text-[#ff7f50] uppercase mb-1">Dirección seleccionada</p>
                      <p className="text-sm text-gray-700 font-medium leading-relaxed">
                        {address.includes('Buscando') ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#ff7f50]" />
                            {address}
                          </span>
                        ) : (
                          address
                        )}
                      </p>
                      {markerPosition && (
                        <p className="text-xs text-gray-500 mt-2">
                          Coordenadas: {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Haz clic en el mapa, arrastra el marcador o usa tu ubicación actual
                    </p>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <motion.button
                  className="flex-1 px-6 py-3 rounded-xl font-semibold border-2 border-[#ff7f50] text-[#ff7f50] bg-white hover:bg-[#ffe4c4]/30 transition-colors cursor-pointer"
                  onClick={onClose}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  style={{
                    background: markerPosition 
                      ? 'linear-gradient(120deg, #ffae91 30%, #ff7f50 88%, #ffe4c4 40%, #ffb9a0 78%)'
                      : '#d1d5db'
                  }}
                  onClick={handleConfirm}
                  disabled={!markerPosition}
                  whileHover={markerPosition ? { scale: 1.02 } : {}}
                  whileTap={markerPosition ? { scale: 0.98 } : {}}
                >
                  <Check size={20} />
                  Confirmar Ubicación
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}