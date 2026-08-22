/**
 * Define senha 123456 nos clientes delivery que ainda não têm passwordHash.
 * Execução: npm run seed:delivery-passwords
 */
import 'dotenv/config';
import { setDefaultPasswordForUsersWithoutOne } from '../services/deliveryUserService';

async function main() {
  console.log('Definindo senha 123456 para clientes delivery sem senha...');
  const updated = await setDefaultPasswordForUsersWithoutOne();
  console.log(`Pronto. ${updated} usuário(s) atualizado(s). Senha: 123456`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
