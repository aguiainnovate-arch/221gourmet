import { Navigate, useLocation } from 'react-router-dom';
import { useRestaurantAuth } from '../contexts/RestaurantAuthContext';

interface MotoboyRouteProps {
  children: React.ReactNode;
}

/**
 * Guarda de rota: só permite acesso para usuários autenticados com role MOTOBOY.
 * Caso contrário redireciona para a página de login com returnUrl.
 */
export default function MotoboyRoute({ children }: MotoboyRouteProps) {
  const { isAuthenticated, authType, isLoading } = useRestaurantAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!isAuthenticated || authType !== 'motoboy') {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/delivery/auth?returnUrl=${returnUrl}`} replace />;
  }

  return <>{children}</>;
}
