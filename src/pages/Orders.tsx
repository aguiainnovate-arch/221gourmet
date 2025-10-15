import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Clock,
    CheckCircle,
    Truck,
    MapPin,
    Phone,
    CreditCard,
    Package,
    RefreshCw,
    Star,
    Calendar,
    Receipt,
    Search,
    Filter,
    X,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Timer,
    User,
    ShoppingBag
} from 'lucide-react';
import { getDeliveryOrdersByPhone } from '../services/deliveryService';
import type { DeliveryOrder } from '../types/delivery';

// Funções auxiliares
const getStatusInfo = (status: DeliveryOrder['status']) => {
    switch (status) {
        case 'pending':
            return {
                label: 'Aguardando confirmação',
                color: 'text-yellow-600',
                bgColor: 'bg-yellow-100',
                borderColor: 'border-yellow-200',
                icon: Clock,
                progress: 1,
                description: 'Seu pedido foi recebido e está aguardando confirmação do restaurante'
            };
        case 'confirmed':
            return {
                label: 'Confirmado',
                color: 'text-blue-600',
                bgColor: 'bg-blue-100',
                borderColor: 'border-blue-200',
                icon: CheckCircle,
                progress: 2,
                description: 'Restaurante confirmou seu pedido e começará o preparo'
            };
        case 'preparing':
            return {
                label: 'Preparando',
                color: 'text-orange-600',
                bgColor: 'bg-orange-100',
                borderColor: 'border-orange-200',
                icon: Package,
                progress: 3,
                description: 'Seu pedido está sendo preparado pela cozinha'
            };
        case 'delivering':
            return {
                label: 'Saindo para entrega',
                color: 'text-purple-600',
                bgColor: 'bg-purple-100',
                borderColor: 'border-purple-200',
                icon: Truck,
                progress: 4,
                description: 'Seu pedido saiu para entrega e está a caminho'
            };
        case 'delivered':
            return {
                label: 'Entregue',
                color: 'text-green-600',
                bgColor: 'bg-green-100',
                borderColor: 'border-green-200',
                icon: CheckCircle,
                progress: 5,
                description: 'Pedido entregue com sucesso! Aproveite sua refeição'
            };
        case 'cancelled':
            return {
                label: 'Cancelado',
                color: 'text-red-600',
                bgColor: 'bg-red-100',
                borderColor: 'border-red-200',
                icon: X,
                progress: 0,
                description: 'Este pedido foi cancelado'
            };
        default:
            return {
                label: 'Desconhecido',
                color: 'text-gray-600',
                bgColor: 'bg-gray-100',
                borderColor: 'border-gray-200',
                icon: AlertCircle,
                progress: 0,
                description: 'Status desconhecido'
            };
    }
};

const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
        return 'Há poucos minutos';
    } else if (diffInHours < 24) {
        return `Há ${diffInHours}h`;
    } else {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// Componente separado para cada pedido para evitar conflitos de renderização
const OrderCard = memo(({
    order,
    isExpanded,
    onToggleExpansion
}: {
    order: DeliveryOrder;
    isExpanded: boolean;
    onToggleExpansion: (orderId: string) => void;
}) => {
    const statusInfo = getStatusInfo(order.status);
    const StatusIcon = statusInfo.icon;

    console.log(`Renderizando pedido ${order.id.substring(0, 8)}, expandido: ${isExpanded}`);

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header do Pedido */}
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusInfo.bgColor}`}>
                            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                Pedido #{order.id.substring(0, 8)}
                            </h3>
                            <p className="text-sm text-gray-600">{order.restaurantName}</p>
                            <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${statusInfo.bgColor} ${statusInfo.color}`}>
                            {statusInfo.label}
                        </div>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                            {formatCurrency(order.total + order.deliveryFee)}
                        </p>
                    </div>
                </div>

                {/* Timeline de Progresso */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-900">Status</h4>
                        <div className="flex items-center space-x-1">
                            <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                            <span className={`text-xs font-medium ${statusInfo.color}`}>
                                {statusInfo.label}
                            </span>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="flex items-center justify-between">
                            {[
                                { step: 1, label: 'Pedido', icon: Clock },
                                { step: 2, label: 'Confirmado', icon: CheckCircle },
                                { step: 3, label: 'Preparando', icon: Package },
                                { step: 4, label: 'Saindo', icon: Truck },
                                { step: 5, label: 'Entregue', icon: CheckCircle }
                            ].map((step, index) => {
                                const StepIcon = step.icon;
                                const isCompleted = statusInfo.progress >= step.step;
                                const isCurrent = statusInfo.progress === step.step;

                                return (
                                    <div key={step.step} className="flex flex-col items-center">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${isCompleted
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : isCurrent
                                                ? 'bg-red-500 border-red-500 text-white'
                                                : 'bg-gray-100 border-gray-300 text-gray-400'
                                            }`}>
                                            <StepIcon className="w-3 h-3" />
                                        </div>
                                        <span className={`text-xs font-medium mt-1 text-center ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                                            }`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Linha de progresso */}
                        <div className="absolute top-3 left-3 right-3 h-0.5 bg-gray-200 -z-10">
                            <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${(statusInfo.progress / 5) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Informações Resumidas */}
                <div className="space-y-2 mb-3">
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <User className="w-3 h-3" />
                        <span className="truncate">{order.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{order.customerAddress}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <CreditCard className="w-3 h-3" />
                        <span>{order.paymentMethod === 'money' ? 'Dinheiro' :
                            order.paymentMethod === 'credit' ? 'Cartão de Crédito' :
                                order.paymentMethod === 'debit' ? 'Cartão de Débito' : 'PIX'}</span>
                    </div>
                </div>

                {/* Botão para expandir/recolher */}
                <button
                    onClick={() => onToggleExpansion(order.id)}
                    className="w-full flex items-center justify-center space-x-1 py-2 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <span className="font-medium">
                        {isExpanded ? 'Ver menos' : 'Ver mais'}
                    </span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
            </div>

            {/* Detalhes Expandidos */}
            {isExpanded && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <div className="text-xs text-gray-500 mb-2">
                        DEBUG: Pedido {order.id.substring(0, 8)} está expandido
                    </div>
                    <div className="space-y-4">
                        {/* Itens do Pedido */}
                        <div>
                            <h5 className="font-semibold text-gray-900 mb-2 flex items-center text-sm">
                                <ShoppingBag className="w-4 h-4 mr-2 text-gray-500" />
                                Itens do Pedido
                            </h5>
                            <div className="space-y-2">
                                {order.items.map((item, index) => (
                                    <div key={index} className="flex justify-between items-start bg-white p-2 rounded text-xs">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">
                                                {item.quantity}x {item.productName}
                                            </p>
                                            {item.observations && (
                                                <p className="text-gray-500 italic">
                                                    Obs: {item.observations}
                                                </p>
                                            )}
                                        </div>
                                        <span className="font-semibold text-gray-900 ml-2">
                                            {formatCurrency(item.price * item.quantity)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Resumo Financeiro */}
                        <div className="bg-white rounded p-3">
                            <h5 className="font-semibold text-gray-900 mb-2 text-sm">Resumo</h5>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="font-semibold">{formatCurrency(order.total)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Taxa de entrega:</span>
                                    <span className="font-semibold">{formatCurrency(order.deliveryFee)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                                    <span>Total:</span>
                                    <span>{formatCurrency(order.total + order.deliveryFee)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default function Orders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<DeliveryOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [customerPhone, setCustomerPhone] = useState('');
    const [searchPhone, setSearchPhone] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        // Tentar buscar pedidos se já tiver um telefone salvo
        const savedPhone = localStorage.getItem('customerPhone');
        if (savedPhone) {
            setCustomerPhone(savedPhone);
            setSearchPhone(savedPhone);
            loadOrders(savedPhone);
        } else {
            setLoading(false);
        }
    }, []);

    // Auto-refresh a cada 30 segundos
    useEffect(() => {
        if (!autoRefresh || !customerPhone) return;

        const interval = setInterval(() => {
            loadOrders(customerPhone);
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefresh, customerPhone]);

    const loadOrders = async (phone: string) => {
        try {
            setLoading(true);
            const ordersData = await getDeliveryOrdersByPhone(phone);
            setOrders(ordersData);
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        if (searchPhone.trim()) {
            setCustomerPhone(searchPhone.trim());
            localStorage.setItem('customerPhone', searchPhone.trim());
            loadOrders(searchPhone.trim());
        }
    };


    const toggleOrderExpansion = useCallback((orderId: string) => {
        console.log('Toggle para pedido:', orderId);
        setExpandedOrders(prev => {
            const newState = { ...prev };
            newState[orderId] = !prev[orderId];
            console.log('Novo estado de expansão:', newState);
            return newState;
        });
    }, []);

    const filteredOrders = orders.filter(order => {
        if (selectedStatus === 'all') return true;
        return order.status === selectedStatus;
    });

    // Debug: verificar se há IDs duplicados
    console.log('Pedidos filtrados:', filteredOrders.map(o => o.id.substring(0, 8)));

    const statusOptions = [
        { value: 'all', label: 'Todos os pedidos', count: orders.length },
        { value: 'pending', label: 'Aguardando', count: orders.filter(o => o.status === 'pending').length },
        { value: 'confirmed', label: 'Confirmados', count: orders.filter(o => o.status === 'confirmed').length },
        { value: 'preparing', label: 'Preparando', count: orders.filter(o => o.status === 'preparing').length },
        { value: 'delivering', label: 'Saindo', count: orders.filter(o => o.status === 'delivering').length },
        { value: 'delivered', label: 'Entregues', count: orders.filter(o => o.status === 'delivered').length },
        { value: 'cancelled', label: 'Cancelados', count: orders.filter(o => o.status === 'cancelled').length }
    ];

    if (!customerPhone) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white py-12">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center space-x-4 mb-6">
                            <button
                                onClick={() => navigate('/delivery')}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold">Meus Pedidos</h1>
                                <p className="text-red-100">Acompanhe seus pedidos de delivery</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Buscar por telefone */}
                <div className="container mx-auto px-4 py-12">
                    <div className="max-w-md mx-auto">
                        <div className="bg-white rounded-2xl shadow-xl p-8">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Receipt className="w-10 h-10 text-red-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Buscar Pedidos</h2>
                                <p className="text-gray-600">Digite seu telefone para ver seus pedidos</p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Número do telefone
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="tel"
                                            placeholder="(11) 99999-9999"
                                            value={searchPhone}
                                            onChange={(e) => setSearchPhone(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleSearch}
                                    disabled={!searchPhone.trim()}
                                    className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
                                >
                                    <Search className="w-5 h-5" />
                                    <span>Buscar Pedidos</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white py-8">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/delivery')}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold">Meus Pedidos</h1>
                                <p className="text-red-100">Acompanhe seus pedidos de delivery</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${autoRefresh ? 'bg-white/20' : 'bg-white/10'
                                    }`}
                            >
                                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                                <span className="text-sm font-medium">Auto</span>
                            </button>
                            <button
                                onClick={() => loadOrders(customerPhone)}
                                className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 hover:bg-white/30 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span className="text-sm font-medium">Atualizar</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Phone className="w-5 h-5" />
                                <span className="font-medium">{customerPhone}</span>
                            </div>
                            <button
                                onClick={() => {
                                    setCustomerPhone('');
                                    setSearchPhone('');
                                    localStorage.removeItem('customerPhone');
                                }}
                                className="text-red-200 hover:text-white text-sm underline"
                            >
                                Trocar telefone
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                        >
                            <Filter className="w-4 h-4" />
                            <span className="text-sm font-medium">Filtros</span>
                            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                            {statusOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setSelectedStatus(option.value)}
                                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${selectedStatus === option.value
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    <div className="text-center">
                                        <div className="font-semibold">{option.count}</div>
                                        <div className="text-xs">{option.label}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Lista de Pedidos */}
            <div className="container mx-auto px-4 pb-8">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Carregando pedidos...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Receipt className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                            {selectedStatus === 'all' ? 'Nenhum pedido encontrado' : 'Nenhum pedido neste status'}
                        </h3>
                        <p className="text-gray-500 text-lg mb-6">
                            {selectedStatus === 'all'
                                ? 'Não encontramos pedidos para este telefone'
                                : 'Não há pedidos com este status no momento'
                            }
                        </p>
                        <button
                            onClick={() => navigate('/delivery')}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                        >
                            Fazer novo pedido
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {filteredOrders.map((order) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                isExpanded={expandedOrders[order.id] || false}
                                onToggleExpansion={toggleOrderExpansion}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}