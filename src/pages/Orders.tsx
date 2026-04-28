import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft,
    MapPin,
    Phone,
    RefreshCw,
    Receipt,
    Search,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    Filter,
    ShoppingBag,
    Copy,
    Check,
    QrCode
} from 'lucide-react';
import { getDeliveryOrdersByPhone, subscribeDeliveryOrdersByPhone } from '../services/deliveryService';
import type { DeliveryOrder, DeliveryOrderItem } from '../types/delivery';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';

const formatDate = (d: Date) =>
    new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d instanceof Date ? d : new Date(d));

const formatDateShort = (d: Date) =>
    new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d instanceof Date ? d : new Date(d));

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const normalizePixQrImage = (value?: string): string | null => {
    if (!value?.trim()) return null;
    const raw = value.trim();
    if (raw.startsWith('data:image')) return raw;
    return `data:image/png;base64,${raw}`;
};

const paymentLabel: Record<string, string> = {
    money: 'Dinheiro',
    credit: 'Cartão de crédito',
    debit: 'Cartão de débito',
    pix: 'PIX',
    stripe: 'Cartão online (Stripe)',
};

// Status: badge + progresso compacto (Etapa X/5)
const STATUS_CONFIG: Record<
    DeliveryOrder['status'],
    { label: string; step: number; stepLabel: string; badgeClass: string; progressClass: string }
> = {
    pending: {
        label: 'Aguardando confirmação',
        step: 1,
        stepLabel: 'Etapa 1/5: Aguardando confirmação',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        progressClass: 'bg-amber-500',
    },
    confirmed: {
        label: 'Confirmado',
        step: 2,
        stepLabel: 'Etapa 2/5: Confirmado',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        progressClass: 'bg-blue-500',
    },
    preparing: {
        label: 'Em preparo',
        step: 3,
        stepLabel: 'Etapa 3/5: Em preparo',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
        progressClass: 'bg-orange-500',
    },
    delivering: {
        label: 'Saiu para entrega',
        step: 4,
        stepLabel: 'Etapa 4/5: Saiu para entrega',
        badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
        progressClass: 'bg-violet-500',
    },
    delivered: {
        label: 'Entregue',
        step: 5,
        stepLabel: 'Entregue',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        progressClass: 'bg-emerald-500',
    },
    cancelled: {
        label: 'Cancelado',
        step: 0,
        stepLabel: 'Cancelado',
        badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
        progressClass: 'bg-gray-300',
    },
};

// Resumo: 2–3 itens + "+N itens"
function getOrderSummary(order: DeliveryOrder, maxItems = 3): string {
    const items = order.items || [];
    if (items.length === 0) return 'Pedido sem itens';
    const parts = items.slice(0, maxItems).map((i) => `${i.quantity}x ${i.productName}`);
    const rest = items.length - maxItems;
    if (rest > 0) return `${parts.join(', ')} +${rest} ${rest === 1 ? 'item' : 'itens'}`;
    return parts.join(', ');
}

// Referência amigável (sem ID interno)
function getOrderReference(order: DeliveryOrder): string {
    const d = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
    return `Pedido de ${formatDateShort(d)}`;
}

function truncate(str: string, max: number): string {
    if (!str?.trim()) return '';
    const s = str.trim();
    return s.length <= max ? s : s.slice(0, max) + '…';
}

const OrderCard = memo(({
    order,
    isExpanded,
    onToggleExpansion
}: {
    order: DeliveryOrder;
    isExpanded: boolean;
    onToggleExpansion: (orderId: string) => void;
}) => {
    const config = STATUS_CONFIG[order.status];
    const summary = getOrderSummary(order);
    const reference = getOrderReference(order);
    const progressPct = config.step > 0 ? (config.step / 5) * 100 : 0;
    const [copiedPix, setCopiedPix] = useState(false);
    const pixQrImage = normalizePixQrImage(order.pixQrCodeImage);

    const handleCopyPix = async () => {
        if (!order.pixCopyPaste?.trim()) return;
        try {
            await navigator.clipboard.writeText(order.pixCopyPaste);
            setCopiedPix(true);
            window.setTimeout(() => setCopiedPix(false), 1800);
        } catch (err) {
            console.error('Erro ao copiar PIX:', err);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-gray-900 truncate">{order.restaurantName}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{reference}</p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 text-xs font-semibold border rounded-lg ${config.badgeClass}`}>
                        {config.label}
                    </span>
                </div>

                <p className="text-xs text-gray-500 mt-1">Entrega · {formatDate(order.createdAt)}</p>

                {config.step > 0 && config.step < 5 && (
                    <div className="mt-2">
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${config.progressClass} rounded-full transition-colors`}
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{config.stepLabel}</p>
                    </div>
                )}
            </div>

            <div className="px-4 pb-3">
                <p className="text-sm text-gray-700 leading-snug">
                    {order.items?.length ? (
                        <>
                            {summary}
                            {order.observations?.trim() && (
                                <span className="block mt-1 text-gray-500 text-xs">
                                    Obs.: {truncate(order.observations, 60)}
                                </span>
                            )}
                        </>
                    ) : (
                        `Pedido com ${order.items?.length || 0} itens`
                    )}
                </p>
                {order.customerAddress?.trim() && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">{truncate(order.customerAddress, 50)}</span>
                    </div>
                )}
            </div>

            <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/60 flex flex-wrap items-center justify-between gap-2">
                <span className="text-base font-bold text-gray-900">
                    {formatCurrency(order.total + order.deliveryFee)}
                </span>
                <button
                    onClick={() => onToggleExpansion(order.id)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold"
                >
                    Ver detalhes
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">Detalhes do pedido</h4>
                        <button
                            onClick={() => onToggleExpansion(order.id)}
                            className="p-1 rounded-lg hover:bg-gray-200 text-gray-600"
                            aria-label="Fechar"
                        >
                            <ChevronUp className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                <ShoppingBag className="w-3.5 h-3.5" />
                                Itens
                            </h5>
                            <ul className="space-y-1.5">
                                {(order.items || []).map((item: DeliveryOrderItem, idx: number) => (
                                    <li key={idx} className="flex justify-between text-sm">
                                        <span className="text-gray-800">
                                            {item.quantity}x {item.productName}
                                            {item.observations && (
                                                <span className="text-gray-500 text-xs block">Obs.: {item.observations}</span>
                                            )}
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            {formatCurrency(item.price * item.quantity)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {order.customerAddress?.trim() && (
                            <div>
                                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    Endereço de entrega
                                </h5>
                                <p className="text-sm text-gray-700">{order.customerAddress}</p>
                            </div>
                        )}
                        <div className="pt-2 border-t border-gray-200 space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium">{formatCurrency(order.total)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Taxa de entrega</span>
                                <span className="font-medium">{formatCurrency(order.deliveryFee)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-gray-900 pt-1">
                                <span>Total</span>
                                <span>{formatCurrency(order.total + order.deliveryFee)}</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            Pagamento: {paymentLabel[order.paymentMethod] || order.paymentMethod}
                        </p>
                        {order.paymentMethod === 'pix' && (
                            <div className="mt-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50/60">
                                <div className="flex items-center gap-1.5 mb-2 text-emerald-900">
                                    <QrCode className="w-4 h-4" />
                                    <span className="text-sm font-semibold">Pagamento PIX</span>
                                </div>
                                {pixQrImage ? (
                                    <img
                                        src={pixQrImage}
                                        alt="QR Code PIX"
                                        className="w-36 h-36 rounded-md bg-white border border-emerald-100 object-contain"
                                    />
                                ) : (
                                    <p className="text-xs text-emerald-800 mb-2">
                                        QR Code indisponível no momento.
                                    </p>
                                )}
                                {order.pixCopyPaste?.trim() && (
                                    <>
                                        <p className="text-xs text-emerald-900 mt-2 mb-1 font-medium">
                                            Código copia e cola
                                        </p>
                                        <p className="text-xs text-gray-700 bg-white border border-emerald-100 rounded-md p-2 break-all">
                                            {order.pixCopyPaste}
                                        </p>
                                        <button
                                            onClick={handleCopyPix}
                                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                                        >
                                            {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copiedPix ? 'Copiado' : 'Copiar código PIX'}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

export default function Orders() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useDeliveryAuth();
    const [orders, setOrders] = useState<DeliveryOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [customerPhone, setCustomerPhone] = useState('');
    const [searchPhone, setSearchPhone] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Telefone: state (após pedido) > usuário logado > localStorage
    useEffect(() => {
        const phoneFromState = (location.state as { phone?: string } | null)?.phone?.trim();
        const savedPhone = localStorage.getItem('customerPhone');
        const userPhone = user?.phone?.trim();
        const phoneToUse = phoneFromState || userPhone || savedPhone;
        if (phoneToUse) {
            setCustomerPhone(phoneToUse);
            setSearchPhone(phoneToUse);
            if (phoneFromState) localStorage.setItem('customerPhone', phoneFromState);
        } else if (user === null) {
            setLoading(false);
        }
    }, [location.state, user]);

    // Encerrar loading quando não há telefone para buscar (não logado ou perfil sem telefone)
    useEffect(() => {
        if (user === null && !customerPhone) setLoading(false);
        if (user && !user.phone?.trim() && !customerPhone) setLoading(false);
    }, [user, customerPhone]);

    // Atualização em tempo real: escuta mudanças no Firestore (status, etc.)
    useEffect(() => {
        if (!customerPhone) return;

        setLoading(true);
        const unsubscribe = subscribeDeliveryOrdersByPhone(customerPhone, (ordersData) => {
            setOrders(ordersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [customerPhone]);

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
        setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
    }, []);

    const filteredOrders = orders.filter(order => {
        if (selectedStatus === 'all') return true;
        return order.status === selectedStatus;
    });

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
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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