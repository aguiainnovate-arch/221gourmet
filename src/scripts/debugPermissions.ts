import { debugPermissions, forceApplyPlanPermissions } from '../utils/debugPermissions';

// Função para executar debug via console
const runDebug = async () => {
  // Substitua pelos IDs reais do seu restaurante e plano
  const restaurantId = 'SEU_RESTAURANTE_ID_AQUI';
  const planId = 'SEU_PLANO_ID_AQUI';
  
  console.log('Executando debug de permissões...');
  await debugPermissions(restaurantId, planId);
  
  // Descomente a linha abaixo para forçar a aplicação de permissões
  // await forceApplyPlanPermissions(restaurantId, planId);
};

// Executar debug quando o script for chamado diretamente
if (require.main === module) {
  runDebug()
    .then(() => {
      console.log('Debug executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro ao executar debug:', error);
      process.exit(1);
    });
}

export { debugPermissions, forceApplyPlanPermissions };
