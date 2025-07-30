import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

// Função para testar se conseguimos ler dados
export const testReadAccess = async (collectionName: string) => {
  try {
    console.log(`Testando leitura da coleção: ${collectionName}`);
    const querySnapshot = await getDocs(collection(db, collectionName));
    console.log(`✅ Leitura bem-sucedida. ${querySnapshot.size} documentos encontrados em ${collectionName}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao ler ${collectionName}:`, error);
    return false;
  }
};

// Função para testar se conseguimos escrever dados
export const testWriteAccess = async (collectionName: string) => {
  try {
    console.log(`Testando escrita na coleção: ${collectionName}`);
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: 'Teste de conectividade'
    };
    const docRef = await addDoc(collection(db, collectionName), testDoc);
    console.log(`✅ Escrita bem-sucedida. Documento criado: ${docRef.id}`);
    
    // Limpar o documento de teste
    await deleteDoc(doc(db, collectionName, docRef.id));
    console.log(`✅ Documento de teste removido`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao escrever em ${collectionName}:`, error);
    return false;
  }
};

// Função para testar todas as coleções necessárias
export const testAllCollections = async () => {
  console.log('=== TESTE DE CONECTIVIDADE FIRESTORE ===');
  
  const collections = ['products', 'categories', 'tables'];
  
  for (const collectionName of collections) {
    console.log(`\n--- Testando ${collectionName} ---`);
    const canRead = await testReadAccess(collectionName);
    const canWrite = await testWriteAccess(collectionName);
    
    if (!canRead || !canWrite) {
      console.error(`❌ Problemas detectados com ${collectionName}`);
      return false;
    }
  }
  
  console.log('\n✅ Todos os testes passaram!');
  return true;
}; 