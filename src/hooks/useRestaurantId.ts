import { useParams } from 'react-router-dom';
import { useTestMode } from '../contexts/TestModeContext';

export const useRestaurantId = () => {
  const { restaurantId: urlRestaurantId } = useParams<{ restaurantId: string }>();
  const { isTestMode, testRestaurant } = useTestMode();

  // Prioridade: ID da URL (ex.: /:restaurantId/settings) > modo teste > padrão
  if (urlRestaurantId) {
    return urlRestaurantId;
  }
  if (isTestMode && testRestaurant) {
    return testRestaurant.id;
  }
  return 'YcL3Q98o8zkWRT1ak4BD';
};
