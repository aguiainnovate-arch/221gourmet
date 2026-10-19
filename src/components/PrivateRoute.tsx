import { useParams } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
}

/**
 * Mantém a mesa do QR no sessionStorage.
 * Se o cliente escanear outro QR (outra mesa), atualiza a mesa atual
 * em vez de redirecionar de volta para a mesa antiga.
 */
export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { mesaId } = useParams();
  const nextMesa = mesaId || '';

  if (typeof window !== 'undefined' && nextMesa) {
    const current = sessionStorage.getItem('mesa_id');
    if (current !== nextMesa) {
      sessionStorage.setItem('mesa_id', nextMesa);
    }
  }

  return <>{children}</>;
}
