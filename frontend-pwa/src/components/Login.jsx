import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertTriangle, X, Loader2 } from 'lucide-react';

export default function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("[Login] Inicio de sesión para UID:", userCredential.user.uid);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("[Login] Registro exitoso para UID:", userCredential.user.uid);
      }

      try {
        console.log("[Login] Intentando asegurar perfil para UID:", userCredential.user.uid);
        await new Promise(resolve => setTimeout(resolve, 100));

        const currentUser = auth.currentUser;
        if (!currentUser || currentUser.uid !== userCredential.user.uid) {
          throw new Error("[Login] auth.currentUser no coincide después de la operación.");
        }

        const token = await currentUser.getIdToken();
        if (!token) throw new Error("[Login] No se pudo obtener el token.");

        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        if (!apiUrl) throw new Error("[Login] VITE_API_BASE_URL no definida.");

        const ensureProfileUrl = `${apiUrl}/auth/ensure-profile`;
        console.log("[Login] Llamando a ensure-profile:", ensureProfileUrl);

        const response = await fetch(ensureProfileUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Login] Error HTTP en ensure-profile:", response.status, errorText);
        } else {
          const data = await response.json();
          console.log("[Login] Respuesta de ensure-profile:", data);
        }
      } catch (apiError) {
        console.error("[Login] Error al asegurar perfil:", apiError);
      } finally {
        console.log("[Login] Llamada a ensure-profile finalizada. Procediendo a onLogin.");
        onLogin(userCredential.user);
      }

    } catch (err) {
      console.error("[Login] Error de autenticación:", err);
      let errorMessage = 'Ocurrió un error.';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No se encontró una cuenta con ese email.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'La contraseña es incorrecta.';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Ya existe una cuenta con ese email.';
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Credenciales inválidas.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #ffe4c4 0%, #ffe7de 40%, #ffd3c3 70%, rgba(255, 127, 80, 0.4) 100%)'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          <motion.div
            className="p-8 text-center"
            style={{
              background: 'linear-gradient(120deg, #ffae91 30%, #ff7f50 88%, #ffe4c4 40%, #ffb9a0 78%)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl font-bold text-white">
              {isLogin ? 'Bienvenido' : 'Crear Cuenta'}
            </h2>
            <p className="text-white/95 text-sm mt-2">
              {isLogin ? 'Inicia sesión para continuar' : 'Únete a nosotros hoy'}
            </p>
          </motion.div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="relative mb-6 p-4 pr-12 rounded-lg border-2 border-red-300 bg-red-50 text-red-700"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                  <motion.button
                    onClick={() => setError('')}
                    className="absolute right-3 top-3 p-1 rounded-md border border-red-400 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div 
                className="group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label 
                  htmlFor="email" 
                  className="block mb-2 text-sm font-bold text-gray-600 transition-colors duration-300 group-hover:text-gray-800"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none transition-colors duration-300 group-hover:text-orange-400" />
                  <input
                    type="email"
                    id="email"
                    placeholder="nombre@ejemplo.com"
                    className="w-full h-12 rounded-lg px-12 border-2 border-transparent text-base text-gray-800 outline-none transition-all duration-300 focus:bg-white"
                    style={{
                      backgroundColor: 'rgba(255, 228, 196, 0.2)'
                    }}
                    onMouseEnter={(e) => e.target.style.borderColor = '#ffb9a0'}
                    onMouseLeave={(e) => e.target.style.borderColor = 'transparent'}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#ff7f50';
                      e.target.style.backgroundColor = '#ffffff';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'transparent';
                      e.target.style.backgroundColor = 'rgba(255, 228, 196, 0.2)';
                    }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </motion.div>

              <motion.div 
                className="group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label 
                  htmlFor="password" 
                  className="block mb-2 text-sm font-bold text-gray-600 transition-colors duration-300 group-hover:text-gray-800"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none transition-colors duration-300 group-hover:text-orange-400" />
                  <input
                    type="password"
                    id="password"
                    placeholder="••••••••"
                    className="w-full h-12 rounded-lg px-12 border-2 border-transparent text-base text-gray-800 outline-none transition-all duration-300 focus:bg-white"
                    style={{
                      backgroundColor: 'rgba(255, 228, 196, 0.2)'
                    }}
                    onMouseEnter={(e) => e.target.style.borderColor = '#ffb9a0'}
                    onMouseLeave={(e) => e.target.style.borderColor = 'transparent'}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#ff7f50';
                      e.target.style.backgroundColor = '#ffffff';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'transparent';
                      e.target.style.backgroundColor = 'rgba(255, 228, 196, 0.2)';
                    }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                </div>
              </motion.div>

              <motion.button
                type="submit"
                className="w-full text-white font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl cursor-pointer"
                style={{
                  background: 'linear-gradient(120deg, #ffae91 30%, #ff7f50 88%, #ffe4c4 40%, #ffb9a0 78%)'
                }}
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Procesando...</span>
                  </span>
                ) : (
                  <span>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
                )}
              </motion.button>
            </form>

            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-gray-600 text-sm">
                {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                {' '}
                <motion.button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  disabled={loading}
                  className="font-semibold transition-colors cursor-pointer"
                  style={{ color: '#ff7f50' }}
                  whileHover={{ scale: 1.05, y: -2, color: '#ff6347' }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isLogin ? 'Regístrate aquí' : 'Inicia sesión aquí'}
                </motion.button>
              </p>
            </motion.div>
          </div>
        </div>

        <motion.p
          className="text-center text-gray-500 text-xs mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Protegido y seguro con Firebase Auth
        </motion.p>
      </motion.div>
    </div>
  );
}