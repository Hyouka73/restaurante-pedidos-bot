// frontend-pwa/src/components/ui/MapSelectorModal.jsx
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';

// Solucionar problema de iconos por defecto en Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Coordenadas por defecto (por ejemplo, Tuxtla Gtz, Chiapas)
const DEFAULT_CENTER = [16.7595, -93.1171];
const DEFAULT_ZOOM = 13;

export default function MapSelectorModal({ isOpen, onClose, onSelectLocation, initialLocation = null }) {
  const [map, setMap] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(null); // Inicializar como null
  const [address, setAddress] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // --- useEffect para manejar cambios en initialLocation o apertura del modal ---
  useEffect(() => {
    if (isOpen && map) {
      console.log("[MapModal] Modal abierto y mapa cargado. initialLocation:", initialLocation);

      // Verificar si initialLocation es válido
      if (initialLocation && initialLocation.lat != null && initialLocation.lng != null) {
        console.log("[MapModal] Ubicación inicial válida. Centrando mapa y marcador.");
        const newPos = [initialLocation.lat, initialLocation.lng];
        map.setView(newPos, DEFAULT_ZOOM);
        setMarkerPosition(newPos);
        // Mostrar la dirección formateada o las coordenadas
        setAddress(initialLocation.formatted_address || `Coordenadas: ${newPos[0].toFixed(6)}, ${newPos[1].toFixed(6)}`);
      } else {
        console.log("[MapModal] No hay ubicación inicial válida. Centrando en posición por defecto y limpiando marcador.");
        // Si no hay ubicación inicial, centrar en la posición por defecto y limpiar el marcador
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        setMarkerPosition(null); // Limpiar marcador
        setAddress(''); // Limpiar dirección
      }
    }
  }, [isOpen, map, initialLocation]); // Dependencias: se ejecuta cuando cambian estas

  // --- Manejadores de eventos del mapa y marcador ---
  const handleMapClick = (e) => {
    if (isDragging) {
      console.log("[MapModal] Ignorando clic en mapa porque se está arrastrando el marcador.");
      return; // Evitar selección si se está arrastrando el marcador
    }
    const { lat, lng } = e.latlng;
    console.log(`[MapModal] Mapa clickeado en [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
    setMarkerPosition([lat, lng]);
    // Aquí podrías llamar a un servicio de geocodificación inversa para obtener la dirección
    // Por ahora, solo mostramos las coordenadas
    setAddress(`Coordenadas seleccionadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  const handleMarkerDragStart = () => {
    console.log("[MapModal] Arrastre de marcador iniciado.");
    setIsDragging(true);
  };

  const handleMarkerDragEnd = (e) => {
    setIsDragging(false);
    const marker = e.target;
    const position = marker.getLatLng();
    console.log(`[MapModal] Arrastre de marcador finalizado en [${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}]`);
    setMarkerPosition([position.lat, position.lng]);
    // Aquí también podrías geocodificar
    setAddress(`Coordenadas seleccionadas: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`);
  };

  // --- Confirmar selección ---
  const handleConfirm = () => {
    if (markerPosition) {
      console.log(`[MapModal] Confirmar selección en [${markerPosition[0].toFixed(6)}, ${markerPosition[1].toFixed(6)}]`);
      // En un futuro, puedes usar una API de geocodificación para obtener `formatted_address`
      // Por ahora, usamos las coordenadas como dirección o una cadena descriptiva
      const selectedLocation = {
        lat: markerPosition[0],
        lng: markerPosition[1],
        formatted_address: address || `Lat: ${markerPosition[0].toFixed(6)}, Lng: ${markerPosition[1].toFixed(6)}`
      };
      onSelectLocation(selectedLocation);
      onClose(); // Cerrar el modal después de confirmar
    } else {
      console.warn("[MapModal] No hay marcador para confirmar.");
      // Opcional: Mostrar un mensaje de error si no hay marcador
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          {/* Contenedor principal del modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header del Modal */}
            <div className="bg-primary text-primary-content p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Seleccionar Ubicación del Restaurante</h3>
              <button
                onClick={onClose}
                className="btn btn-circle btn-ghost btn-sm text-primary-content hover:bg-primary-focus"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Contenido del Modal (Mapa) */}
            <div className="flex-1 relative">
              {isOpen && (
                <MapContainer
                  center={DEFAULT_CENTER}
                  zoom={DEFAULT_ZOOM}
                  style={{ height: '100%', width: '100%' }}
                  whenCreated={setMap}
                  eventHandlers={{
                    click: handleMapClick,
                  }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {/* Renderizar el marcador solo si markerPosition no es null */}
                  {markerPosition && (
                    <Marker
                      position={markerPosition}
                      draggable={true}
                      eventHandlers={{
                        dragstart: handleMarkerDragStart,
                        dragend: handleMarkerDragEnd,
                      }}
                    >
                      <Popup minWidth={90}>
                        <span className="font-medium">Arrástrame para ajustar</span>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="bg-base-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600 flex-1 w-full sm:w-auto">
                {address ? (
                  <p className="truncate ...">{address}</p>
                ) : (
                  <p>Haz clic en el mapa o arrastra el marcador para seleccionar la ubicación.</p>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  className="btn btn-ghost flex-1"
                  onClick={onClose}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={handleConfirm}
                  disabled={!markerPosition} // Deshabilitar si no hay marcador
                >
                  Seleccionar Ubicación
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}