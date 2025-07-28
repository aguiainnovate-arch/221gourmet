import { useOrders } from '../contexts/OrderContext';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Settings, 
  RefreshCw, 
  ChefHat,
  Users,
  Package,
  Timer
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Staff() {
  const { orders, updateOrderStatus, deleteOrder, refreshOrders } = useOrders();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'novo':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'preparando':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'pronto':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo':
        return 'bg-red-50 border-red-200 shadow-sm';
      case 'preparando':
        return 'bg-yellow-50 border-yellow-200 shadow-sm';
      case 'pronto':
        return 'bg-green-50 border-green-200 shadow-sm';
      default:
        return 'bg-gray-50 border-gray-200 shadow-sm';
    }
  };

  const handleStatusChange = async (orderId: string, currentStatus: string) => {
    let newStatus: 'novo' | 'preparando' | 'pronto';
    
    switch (currentStatus) {
      case 'novo':
        newStatus = 'preparando';
        break;
      case 'preparando':
        newStatus = 'pronto';
        break;
      default:
        return;
    }

    await updateOrderStatus(orderId, newStatus);
  };

  const handleFinalizeOrder = async (orderId: string) => {
    if (window.confirm('Tem certeza que deseja finalizar este pedido? Esta ação não pode ser desfeita.')) {
      await deleteOrder(orderId);
    }
  };

  const getStatusButtonText = (status: string) => {
    switch (status) {
      case 'novo':
        return 'Iniciar Preparo';
      case 'preparando':
        return 'Marcar como Pronto';
      default:
        return '';
    }
  };

  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.status]) {
      acc[order.status] = [];
    }
    acc[order.status].push(order);
    return acc;
  }, {} as Record<string, typeof orders>);

  const statusOrder = ['novo', 'preparando', 'pronto'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <ChefHat className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cozinha</h1>
                <p className="text-sm text-gray-500">Gerenciamento de Pedidos</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={refreshOrders}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </button>
              <Link
                to="/settings"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido no momento</h3>
            <p className="text-gray-500">Os pedidos aparecerão aqui quando forem enviados pelos clientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {statusOrder.map((status) => (
              <div key={status} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status)}
                    <h2 className="text-lg font-semibold text-gray-900 capitalize">
                      {status === 'novo' && 'Novos Pedidos'}
                      {status === 'preparando' && 'Em Preparo'}
                      {status === 'pronto' && 'Prontos'}
                    </h2>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {groupedOrders[status]?.length || 0}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {groupedOrders[status]?.map((order) => (
                    <div
                      key={order.id}
                      className={`p-6 rounded-lg border ${getStatusColor(status)}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-white p-2 rounded-lg shadow-sm">
                            <Users className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Mesa {order.mesaNumero}</h3>
                            <p className="text-sm text-gray-500">{order.timestamp}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Timer className="w-4 h-4" />
                          <span>{order.tempoEspera}</span>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          <Package className="w-4 h-4 mr-2 text-gray-500" />
                          Itens do Pedido
                        </h4>
                        <ul className="space-y-2">
                          {order.itens.map((item, index) => (
                            <li key={index} className="text-sm text-gray-700 bg-white px-3 py-2 rounded border border-gray-100">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="space-y-2">
                        {status !== 'pronto' && (
                          <button
                            onClick={() => handleStatusChange(order.id, status)}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                          >
                            {getStatusButtonText(status)}
                          </button>
                        )}
                        
                        {status === 'pronto' && (
                          <button
                            onClick={() => handleFinalizeOrder(order.id)}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Finalizar Pedido
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 