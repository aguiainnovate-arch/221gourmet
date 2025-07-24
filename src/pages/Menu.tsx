import { useParams, Link } from 'react-router-dom';
import type { Product } from '../types/product';

export default function Menu() {
  const { mesaId } = useParams();

  // Exemplos de produtos usando a interface Product
  const products: Product[] = [
    {
      id: '1',
      name: 'Hambúrguer Clássico',
      description: 'Pão, carne, queijo, alface e tomate',
      price: 25.00,
      category: 'Lanches',
      available: true,
      preparationTime: 15,
      tags: ['popular', 'lanche']
    },
    {
      id: '2',
      name: 'Pizza Margherita',
      description: 'Molho de tomate, muçarela e manjericão',
      price: 45.00,
      category: 'Pizzas',
      available: true,
      preparationTime: 25,
      allergens: ['gluten', 'lactose'],
      tags: ['pizza', 'vegetariano']
    }
  ];

  const handleEnviarPedido = () => {
    const pedido = {
      mesa: mesaId,
      timestamp: new Date().toISOString(),
      status: 'enviado'
    };
    
    console.log('Pedido enviado:', pedido);
    console.log(`Mesa ${mesaId} fez um pedido!`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="bg-white p-6 rounded">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Mesa {mesaId}</h1>
          <Link to="/" className="text-blue-500">
            Voltar
          </Link>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-2">
            Mesa {mesaId} ativa
          </p>
          <p className="text-sm text-gray-500">
            URL: /mesa/{mesaId}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {products.map((product) => (
            <div key={product.id} className="p-4 border rounded">
              <h2 className="text-lg font-semibold mb-2">{product.name}</h2>
              <p className="text-gray-600 mb-2">{product.description}</p>
              <p className="font-bold text-blue-500">R$ {product.price.toFixed(2)}</p>
              <div className="text-sm text-gray-500 mt-2">
                <span>Categoria: {product.category}</span>
                {product.preparationTime && (
                  <span className="ml-4">Tempo: {product.preparationTime}min</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleEnviarPedido}
          className="w-full bg-blue-500 text-white font-semibold py-3 px-6 rounded"
        >
          Enviar Pedido da Mesa {mesaId}
        </button>
      </div>
    </div>
  );
} 