import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../config/firebase';
import { useRestaurant } from '../../context/RestaurantContext';
import { api } from '../../services/api';
import { Download, ExternalLink, RefreshCw, AlertCircle, Copy, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ButtonLoader } from './Loader';

const QrDisplay = () => {
  const [user] = useAuthState(auth);
  const { data: restaurant } = useRestaurant();
  const restaurantId = restaurant?.id;
  
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchQrCode = async () => {
    if (!user || !restaurantId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/qr/${restaurantId}`);
      
      if (!response?.qrDataUrl) {
        throw new Error('Respuesta inválida del servidor');
      }

      setQrData(response);
    } catch (err) {
      // api.js ya muestra la alerta, solo guardamos el error local
      setError(err.message || 'Error al cargar el QR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQrCode();
  }, [user, restaurantId]);

  const handleDownload = async () => {
    if (!qrData?.qrDataUrl) return;
    
    setDownloading(true);
    
    try {
      // Crear nombre del archivo limpio
      const restaurantName = restaurant?.info?.name?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'restaurante';
      const fileName = `qr-${restaurantName}-${restaurantId.substring(0, 8)}.png`;
      
      // Método 1: Intentar descarga directa desde data URL
      const link = document.createElement('a');
      link.href = qrData.qrDataUrl;
      link.download = fileName;
      
      // Agregar al DOM temporalmente
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      console.log('✅ QR descargado:', fileName);
      
    } catch (err) {
      console.error('❌ Error descargando QR:', err);
      
      // Método alternativo: Abrir en nueva pestaña para descarga manual
      try {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Código QR - ${restaurant?.info?.name || 'Restaurante'}</title>
                <style>
                  body {
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    font-family: system-ui, -apple-system, sans-serif;
                  }
                  .container {
                    background: white;
                    padding: 2rem;
                    border-radius: 1rem;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                  }
                  img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.5rem;
                  }
                  h2 {
                    color: #333;
                    margin-bottom: 1rem;
                  }
                  p {
                    color: #666;
                    font-size: 0.9rem;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h2>${restaurant?.info?.name || 'Código QR'}</h2>
                  <img src="${qrData.qrDataUrl}" alt="Código QR" />
                  <p>Click derecho sobre la imagen → Guardar imagen como...</p>
                </div>
              </body>
            </html>
          `);
        }
      } catch (fallbackErr) {
        console.error('❌ Error en método alternativo:', fallbackErr);
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!qrData?.deepLinkUrl) return;

    try {
      await navigator.clipboard.writeText(qrData.deepLinkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copiando:', err);
    }
  };

  // Estado: Cargando
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-64 h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl animate-pulse flex items-center justify-center">
          <ButtonLoader size="lg" />
        </div>
        <p className="text-gray-600 font-medium">Generando código QR...</p>
      </div>
    );
  }

  // Estado: Error
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6"
      >
        <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-red-800 mb-2">
              No se pudo generar el QR
            </h3>
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>

          <button
            onClick={fetchQrCode}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors mx-auto"
          >
            <RefreshCw size={18} />
            Reintentar
          </button>
        </div>
      </motion.div>
    );
  }

  // Estado: Sin datos
  if (!qrData) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600">No hay datos disponibles</p>
        <button
          onClick={fetchQrCode}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  // Estado: Éxito
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">
          📱 Tu Código QR
        </h2>
        <p className="text-sm text-gray-600">
          Escanea para acceder al menú de{' '}
          <span className="font-semibold text-orange-600">
            {restaurant?.info?.name || 'tu restaurante'}
          </span>
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="relative group cursor-pointer"
          onClick={handleDownload}
          title="Click para descargar"
        >
          {/* Efecto glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-red-400 to-pink-400 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
          
          {/* QR Container */}
          <div className="relative bg-white p-8 rounded-3xl shadow-2xl border-4 border-white">
            <img 
              src={qrData.qrDataUrl} 
              alt="Código QR del restaurante" 
              className="w-72 h-72 rounded-2xl"
            />
            
            {/* Overlay de descarga al hover */}
            <div className="absolute inset-0 bg-black/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="bg-white/90 px-6 py-3 rounded-xl flex items-center gap-2 font-semibold text-gray-800">
                <Download size={20} />
                <span>Click para descargar</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Deep Link Card */}
      <div className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 border-2 border-orange-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <ExternalLink size={16} className="text-orange-600" />
          Enlace directo
        </div>
        
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-white px-4 py-3 rounded-xl border border-orange-200 text-orange-700 break-all font-mono">
            {qrData.deepLinkUrl}
          </code>
          
          <button
            onClick={handleCopyLink}
            className="px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all flex items-center gap-2 font-medium text-sm whitespace-nowrap shadow-lg hover:shadow-xl"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  <span>¡Copiado!</span>
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2"
                >
                  <Copy size={16} />
                  <span>Copiar</span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Bot Info */}
      {qrData.botUsername && (
        <div className="text-center py-3 px-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Bot de Telegram</p>
          <p className="text-sm font-semibold text-gray-800">
            @{qrData.botUsername}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-2xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <>
              <ButtonLoader size="sm" />
              <span>Descargando...</span>
            </>
          ) : (
            <>
              <Download size={22} />
              <span>Descargar QR</span>
            </>
          )}
        </button>
        
        <button
          onClick={fetchQrCode}
          className="px-5 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all border-2 border-gray-200 hover:border-gray-300"
          title="Regenerar código"
        >
          <RefreshCw size={22} />
        </button>
      </div>

      {/* Help Info */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle size={20} className="text-blue-600" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="font-semibold text-blue-900 text-sm">
              💡 ¿Cómo usar el código QR?
            </p>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Click en el QR o en "Descargar QR" para guardarlo</li>
              <li>Imprímelo y colócalo en tus mesas</li>
              <li>Los clientes lo escanean con su cámara</li>
              <li>Se abrirá automáticamente tu bot de Telegram</li>
              <li>Podrán ver tu menú y hacer pedidos al instante</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default QrDisplay;