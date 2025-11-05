// frontend-pwa/src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Sparkles } from 'lucide-react';
import { useAlert, AlertContainer } from '../components/ui/CustomAlert';
import { ButtonLoader } from '../components/ui/Loader';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [confirmPassword, setConfirmPassword] = useState('');
  // const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { alerts, showAlert, hideAlert } = useAlert();
  const { setUser } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      showAlert('Por favor completa todos los campos', 'warning', 3000);
      return;
    }

    setLoading(true);
    try {
      const data = await login(email, password);
      setUser(data.user);
      showAlert('¡Inicio de sesión exitoso!', 'success', 2000);
      navigate('/');
    } catch (error) {
      console.error('Error en login:', error);
      const errorMessage = error.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales';
      showAlert(errorMessage, 'error', 4000);
    } finally {
      setLoading(false);
    }
  };

  // const handleRegister = async (e) => {
  //   e.preventDefault();
    
  //   if (!email || !password || !confirmPassword || !displayName) {
  //     showAlert('Por favor completa todos los campos', 'warning', 3000);
  //     return;
  //   }

  //   if (password !== confirmPassword) {
  //     showAlert('Las contraseñas no coinciden', 'error', 3000);
  //     return;
  //   }

  //   if (password.length < 6) {
  //     showAlert('La contraseña debe tener al menos 6 caracteres', 'warning', 3000);
  //     return;
  //   }

  //   setLoading(true);
  //   // Registration logic using backend will be implemented here
  //   setLoading(false);
  // };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setEmail('');
    setPassword('');
    // setConfirmPassword('');
    // setDisplayName('');
    setShowPassword(false);
    // setShowConfirmPassword(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffe4c4] via-[#ffd3c3] to-[#ffb8a1] flex items-center justify-center p-4">
      <AlertContainer alerts={alerts} onClose={hideAlert} />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo y Header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#ff7f50] to-[#ff6347] rounded-3xl shadow-2xl mb-4">
            <span className="text-4xl">🍽️</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            RestBot Admin
          </h1>
          <p className="text-gray-600 flex items-center justify-center gap-2">
            <Sparkles size={16} className="text-[#ff7f50]" />
            Gestiona tu restaurante con facilidad
          </p>
        </motion.div>

        {/* Card de Login/Register */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isRegister ? 'register' : 'login'}
            initial={{ opacity: 0, x: isRegister ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRegister ? -20 : 20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-2xl p-8"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </h2>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Registration fields commented out */}
              {/* {isRegister && ( ... )} */}

              {/* Campo de Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo Electrónico
                  <span className="text-[#ff7f50] ml-1">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    disabled={loading}
                    className="
                      w-full pl-12 pr-4 py-3.5 rounded-xl
                      border-2 border-[#ffe4c4] 
                      focus:border-[#ff7f50] focus:ring-2 focus:ring-[#ff7f50]/20
                      transition-all duration-300
                      bg-white text-gray-800 placeholder-gray-400
                      disabled:bg-gray-100 disabled:cursor-not-allowed
                    "
                  />
                </div>
              </div>

              {/* Campo de Contraseña */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña
                  <span className="text-[#ff7f50] ml-1">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="
                      w-full pl-12 pr-12 py-3.5 rounded-xl
                      border-2 border-[#ffe4c4] 
                      focus:border-[#ff7f50] focus:ring-2 focus:ring-[#ff7f50]/20
                      transition-all duration-300
                      bg-white text-gray-800 placeholder-gray-400
                      disabled:bg-gray-100 disabled:cursor-not-allowed
                    "
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#ff7f50] transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm password field commented out */}
              {/* {isRegister && ( ... )} */}

              {/* Botón de Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="
                  w-full py-4 rounded-xl font-bold text-white
                  bg-gradient-to-r from-[#ff7f50] to-[#ff6347]
                  hover:shadow-xl hover:scale-[1.02]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  transition-all duration-300
                  flex items-center justify-center gap-2
                "
              >
                {loading ? (
                  <>
                    <ButtonLoader size="md" />
                    <span>{'Iniciando sesión...'}</span>
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    <span>{'Iniciar Sesión'}</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Toggle entre Login y Register */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {'¿No tienes cuenta?'}
                <button
                  onClick={toggleMode}
                  disabled={true} // Disabled for now
                  className="ml-2 text-[#ff7f50] hover:text-[#ff6347] font-semibold transition-colors disabled:opacity-50"
                >
                  {'Regístrate'}
                </button>
              </p>
            </div>

            {/* Link de recuperación (solo en login) */}
            {!isRegister && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => showAlert('Contacta al administrador para recuperar tu contraseña', 'info', 4000)}
                  className="text-sm text-gray-500 hover:text-[#ff7f50] transition-colors"
                  disabled={loading}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mt-6 text-sm text-gray-600"
        >
          © 2024 RestBot. Todos los derechos reservados.
        </motion.p>
      </motion.div>
    </div>
  );
}