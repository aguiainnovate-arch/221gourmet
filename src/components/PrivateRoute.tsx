import { Navigate, useParams } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { mesaId, restaurantId } = useParams();
  
  // Recupera a mesa original do sessionStorage
  const mesaOriginal = sessionStorage.getItem('mesa_id');
  
  // Se não há mesa definida ainda, define a mesa atual
  if (!mesaOriginal) {
    sessionStorage.setItem('mesa_id', mesaId || '');
    return <>{children}</>;
  }
  
  // Se já há uma mesa definida e é diferente da atual, redireciona (mantendo o restaurante na URL)
  if (mesaOriginal !== mesaId) {
    const to = restaurantId ? `/${restaurantId}/mesa/${mesaOriginal}` : `/mesa/${mesaOriginal}`;
    return <Navigate to={to} replace />;
  }

  return <>{children}</>;
} 