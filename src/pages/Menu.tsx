import { useParams } from 'react-router-dom';
import { useOrders } from '../contexts/OrderContext';
import { useEffect, useState } from 'react';
import { getTables } from '../services/tableService';
import { getProducts } from '../services/productService';
import type { Table } from '../services/tableService';
import type { Product } from '../types/product';

export default function Menu() {
  const { mesaId } = useParams<{ mesaId: string }>();
  const { addOrder } = useOrders();
  const [mesaInfo, setMesaInfo] = useState<Table | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const carregarMesaInfo = async () => {
      if (!mesaId) return;
      
      try {
        setLoading(true);
        const tables = await getTables();
        const mesa = tables.find(table => table.numero === mesaId);
        setMesaInfo(mesa || null);
      } catch (error) {
        // Erro silencioso
      } finally {
        setLoading(false);
      }
    };

    const carregarProdutos = async () => {
      try {
        setLoadingProducts(true);
        const productsData = await getProducts();
        setProducts(productsData.filter(p => p.available));
      } catch (error) {
        // Erro silencioso
      } finally {
        setLoadingProducts(false);
      }
    };

    carregarMesaInfo();
    carregarProdutos();
  }, [mesaId]);

  const handleEnviarPedido = async () => {
    if (!mesaInfo) {
      alert('Informações da mesa não encontradas!');
      return;
    }

    const itensSelecionados = products.map(p => p.name);
    
    await addOrder({
      mesaId: mesaInfo.id, // ID da mesa no Firestore
      mesaNumero: mesaInfo.numero,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'novo',
      itens: itensSelecionados,
      tempoEspera: '15 min'
    });

    alert(`Pedido enviado da Mesa ${mesaInfo.numero}! Verifique na página da cozinha.`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  if (!mesaInfo) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Mesa não encontrada!</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">🍽️ Cardápio</h1>
          <p className="text-gray-600 mb-4">Mesa {mesaInfo.numero}</p>
        </div>

        {loadingProducts ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Carregando cardápio...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Nenhum produto disponível no momento</div>
          </div>
        ) : (
          <div className="grid gap-6 mb-8">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                    <p className="text-gray-600 mb-2">{product.description}</p>
                    <p className="text-sm text-gray-500">
                      ⏱️ {product.preparationTime || 0} min
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      R$ {product.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={handleEnviarPedido}
            className="w-full bg-green-500 text-white py-4 px-6 rounded-lg text-xl font-semibold hover:bg-green-600 transition-colors"
          >
            📤 Enviar Pedido
          </button>
        </div>
      </div>
    </div>
  );
} 