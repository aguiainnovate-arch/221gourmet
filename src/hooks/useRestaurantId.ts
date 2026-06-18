import { useParams, useLocation, matchPath } from 'react-router-dom';
import { useTestMode } from '../contexts/TestModeContext';

/** Segmentos de URL que não são ID de restaurante. */
const NON_RESTAURANT_ROOTS = new Set([
  'delivery',
  'owner',
  'register',
  'testing',
  'restaurant',
  'parceiros',
  'privacy-policy',
  'test',
  'mesa',
]);

function restaurantIdFromPath(pathname: string): string | undefined {
  const patterns = ['/:restaurantId/mesa/:mesaId', '/:restaurantId/settings'] as const;

  for (const pattern of patterns) {
    const match = matchPath(pattern, pathname);
    const id = match?.params?.restaurantId;
    if (id && !NON_RESTAURANT_ROOTS.has(id)) {
      return id;
    }
  }

  return undefined;
}

export const useRestaurantId = () => {
  const { restaurantId: paramId } = useParams<{ restaurantId: string }>();
  const location = useLocation();
  const { isTestMode, testRestaurant } = useTestMode();

  // useParams na rota filha (Menu, Settings)
  if (paramId) {
    return paramId;
  }

  // SettingsProvider fica acima de <Routes> — lê o ID pela URL atual
  const fromPath = restaurantIdFromPath(location.pathname);
  if (fromPath) {
    return fromPath;
  }

  if (isTestMode && testRestaurant) {
    return testRestaurant.id;
  }

  return 'YcL3Q98o8zkWRT1ak4BD';
};
