import { useTestMode } from '../contexts/TestModeContext';

export const useRestaurantId = () => {
  const { isTestMode, testRestaurant } = useTestMode();
  
  if (isTestMode && testRestaurant) {
    // Modo teste: retorna o ID do restaurante sendo testado
    return testRestaurant.id;
  } else {
    // Modo normal: retorna o ID do restaurante padrão
    return 'YcL3Q98o8zkWRT1ak4BD';
  }
};
