import { Link } from 'react-router-dom';
import { Clock, CheckCircle, Users, ChefHat, AlertCircle, ArrowLeft } from 'lucide-react';
import { useOrders } from '../contexts/OrderContext';

export default function Staff() {
  const { orders, updateOrderStatus } = useOrders();

  // Filtrar pedidos por status para estatísticas
  const pedidosNovos = orders.filter(order => order.status === 'novo');
  const pedidosPreparando = orders.filter(order => order.status === 'preparando');
  const pedidosProntos = orders.filter(order => order.status === 'pronto');

  // Filtrar apenas pedidos que não foram entregues
  const pedidosAtivos = orders.filter(order => order.status !== 'entregue');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'bg-yellow-100 text-yellow-800';
      case 'preparando': return 'bg-blue-100 text-blue-800';
      case 'pronto': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'novo': return <AlertCircle className="w-4 h-4" />;
      case 'preparando': return <Clock className="w-4 h-4" />;
      case 'pronto': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleStatusChange = (orderId: string, newStatus: 'preparando' | 'pronto' | 'entregue') => {
    updateOrderStatus(orderId, newStatus);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-3">
          <ChefHat className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl font-bold">Cozinha - 221Gourmet</h1>
        </div>
        <Link 
          to="/" 
          className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded shadow">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{pedidosNovos.length}</p>
              <p className="text-gray-600">Pedidos Novos</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{pedidosPreparando.length}</p>
              <p className="text-gray-600">Em Preparo</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{pedidosProntos.length}</p>
              <p className="text-gray-600">Prontos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white rounded shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Pedidos em Andamento</h2>
        </div>
        {pedidosAtivos.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nenhum pedido em andamento
          </div>
        ) : (
          <div className="divide-y">
            {pedidosAtivos.map((pedido) => (
              <div key={pedido.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-gray-500" />
                    <span className="font-semibold text-lg">Mesa {pedido.mesa}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(pedido.status)}`}>
                      {getStatusIcon(pedido.status)}
                      <span className="capitalize">{pedido.status}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Pedido #{pedido.id}</p>
                    <p className="text-sm text-gray-500">{pedido.timestamp}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Itens:</h4>
                  <ul className="list-disc list-inside text-gray-700">
                    {pedido.itens.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Tempo estimado: {pedido.tempoEspera}</span>
                  </span>
                  <div className="space-x-2">
                    {pedido.status === 'novo' && (
                      <button 
                        onClick={() => handleStatusChange(pedido.id, 'preparando')}
                        className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
                      >
                        Iniciar Preparo
                      </button>
                    )}
                    {pedido.status === 'preparando' && (
                      <button 
                        onClick={() => handleStatusChange(pedido.id, 'pronto')}
                        className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
                      >
                        Marcar como Pronto
                      </button>
                    )}
                    {pedido.status === 'pronto' && (
                      <button 
                        onClick={() => handleStatusChange(pedido.id, 'entregue')}
                        className="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600"
                      >
                        Entregue
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 