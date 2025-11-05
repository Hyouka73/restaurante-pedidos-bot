import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRestaurant } from '../context/RestaurantContext'; // Importar el contexto

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { loading: loadingContext, error: contextError } = useRestaurant(); // Usar el contexto
  const location = useLocation();

  // Si está cargando autenticación o el contexto, mostrar un spinner
  if (loading || loadingContext) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Si hay un error en el contexto (por ejemplo, usuario no encontrado en DB)
  if (contextError) {
    console.error("Error en ProtectedRoute:", contextError);
    // Opcional: Puedes redirigir a una página de error específica
    // return <Navigate to="/error" state={{ error: contextError }} replace />;
    // Por ahora, redirigimos al login como si no estuviera autenticado
    return <Navigate to="/login" replace />;
  }

  // Si no hay usuario, redirigir al login y guardar la ruta original
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si hay usuario y el contexto está listo (sin error), renderizar los hijos
  return children;
}