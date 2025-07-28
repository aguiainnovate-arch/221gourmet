import { useParams } from 'react-router-dom';
import { useOrders } from '../contexts/OrderContext';
import { useEffect, useState } from 'react';
import { getTables } from '../services/tableService';
import type { Table } from '../services/tableService';
import type { Product } from '../types/product';

// Mock de produtos para demonstração
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Hambúrguer Clássico',
    description: 'Pão, carne, alface, tomate, queijo',
    price: 25.90,
    category: 'Lanches',
    available: true,
    preparationTime: 15
  },
  {
    id: '2',
    name: 'Pizza Margherita',
    description: 'Molho de tomate, mussarela, manjericão',
    price: 35.00,
    category: 'Pizzas',
    available: true,
    preparationTime: 20
  },
  {
    id: '3',
    name: 'Batata Frita',
    description: 'Porção de batatas fritas crocantes',
    price: 12.50,
    category: 'Acompanhamentos',
    available: true,
    preparationTime: 8
  }
];

export default function Menu() {
  const { mesaId } = useParams<{ mesaId: string }>();
  const { addOrder } = useOrders();
  const [mesaInfo, setMesaInfo] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);

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

    carregarMesaInfo();
  }, [mesaId]);

  const handleEnviarPedido = async () => {
    if (!mesaInfo) {
      alert('Informações da mesa não encontradas!');
      return;
    }

    const itensSelecionados = mockProducts.map(p => p.name);
    
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

        <div className="grid gap-6 mb-8">
          {mockProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                  <p className="text-gray-600 mb-2">{product.description}</p>
                  <p className="text-sm text-gray-500">
                    ⏱️ {product.preparationTime} min
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