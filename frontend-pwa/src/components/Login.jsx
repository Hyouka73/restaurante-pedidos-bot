// frontend-pwa/src/components/Login.jsx
import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

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
      // Registro
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("[Login] Registro exitoso para UID:", userCredential.user.uid);
      // No necesitamos hacer nada más aquí, onLogin se encargará de asegurar el perfil
    }

    // --- MOVEMOS LA LÓGICA DE ensure-profile AQUÍ, FUERA DEL IF ---
    // Esta lógica se ejecutará tanto para login como para registro.
    try {
      console.log("[Login] Intentando asegurar perfil para UID:", userCredential.user.uid);
      // Breve espera para sincronización
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
        // Opcional: setError("Hubo un problema al configurar tu cuenta.");
      } else {
        const data = await response.json();
        console.log("[Login] Respuesta de ensure-profile:", data);
      }
    } catch (apiError) {
      console.error("[Login] Error al asegurar perfil:", apiError);
      // Opcional: setError("Error al configurar tu cuenta.");
    } finally {
      console.log("[Login] Llamada a ensure-profile finalizada. Procediendo a onLogin.");
      // Llamar a onLogin DESPUÉS de intentar asegurar el perfil
      onLogin(userCredential.user);
    }
    // ---------------------------------------------------------------

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
    <div className="min-h-screen bg-neutral flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-base-300 rounded-xl p-8 shadow-2xl">
        <h2 className="text-center text-2xl font-bold text-base-content mb-6">
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>

        {error && (
          <div className="mb-6 p-3 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-base-content/60 text-sm mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="nombre@ejemplo.com"
              className="w-full bg-base-300 border border-base-content/20 rounded-md px-4 py-3 text-base-content outline-none focus:border-primary transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-base-content/60 text-sm mb-1">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-base-300 border border-base-content/20 rounded-md px-4 py-3 text-base-content outline-none focus:border-primary transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-content font-semibold py-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-base-content/60 text-sm">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            {' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              disabled={loading}
              className="text-base-content hover:underline font-medium"
            >
              {isLogin ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}