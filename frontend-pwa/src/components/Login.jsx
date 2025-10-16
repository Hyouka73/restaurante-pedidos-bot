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
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }
      onLogin(userCredential.user);
    } catch (err) {
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