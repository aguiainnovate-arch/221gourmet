import { runAllPermissionMigrations } from '../utils/migratePermissions';

// Executar migrações quando o script for chamado diretamente
if (require.main === module) {
  runAllPermissionMigrations()
    .then(() => {
      console.log('Migrações executadas com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro ao executar migrações:', error);
      process.exit(1);
    });
}

export { runAllPermissionMigrations };
