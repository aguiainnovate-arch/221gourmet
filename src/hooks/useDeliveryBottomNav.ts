import { useNavigate } from 'react-router-dom';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';
import type { DeliveryNavTab } from '../components/delivery/DeliveryBottomNav';

/** Navegação compartilhada da bottom bar do delivery. */
export function useDeliveryBottomNav(current: DeliveryNavTab) {
  const navigate = useNavigate();
  const { user } = useDeliveryAuth();

  return (tab: DeliveryNavTab) => {
    if (tab === current) return;

    if (tab === 'orders') {
      navigate(user ? '/delivery/orders' : '/delivery/auth?redirect=/delivery/orders');
      return;
    }

    if (tab === 'discover') {
      navigate('/delivery');
      return;
    }

    if (tab === 'favorites') {
      navigate('/delivery', { state: { navTab: 'favorites' as const } });
    }
  };
}
