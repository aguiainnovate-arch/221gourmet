import { updateExistingRestaurantsWithPassword } from './updateRestaurantsPassword';

/**
 * Script de inicialização para ser executado via console do navegador
 * 
 * Para executar:
 * 1. Abra o console do navegador (F12)
 * 2. Copie e cole esta função:
 *    window.updateRestaurantsPassword = () => { 
 *      import('./scripts/initializeRestaurantsPassword').then(m => m.runUpdate()); 
 *    }
 * 3. Execute: window.updateRestaurantsPassword()
 */
export const runUpdate = async () => {
  console.log('🚀 Iniciando atualização de senhas dos restaurantes...\n');
  
  const confirmed = confirm(
    '⚠️ ATENÇÃO!\n\n' +
    'Este script irá atualizar TODOS os restaurantes que não possuem senha com a senha padrão "123456".\n\n' +
    'Deseja continuar?'
  );
  
  if (!confirmed) {
    console.log('❌ Operação cancelada pelo usuário.');
    return;
  }
  
  try {
    const result = await updateExistingRestaurantsWithPassword();
    
    if (result.success) {
      alert(
        `✅ Atualização concluída!\n\n` +
        `${result.updatedCount} restaurantes atualizados\n` +
        `${result.skippedCount} restaurantes pulados (já tinham senha)\n\n` +
        `Senha padrão: "123456"`
      );
    }
  } catch (error) {
    console.error('❌ Erro durante a atualização:', error);
    alert('❌ Erro ao atualizar senhas. Verifique o console para mais detalhes.');
  }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
  (window as any).updateRestaurantsPassword = runUpdate;
  console.log('✅ Script carregado! Execute window.updateRestaurantsPassword() para atualizar as senhas.');
}

