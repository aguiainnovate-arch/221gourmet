import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    MapPin,
    RefreshCw,
    ClipboardList,
    ChevronUp,
    ChevronRight,
    ShoppingBag,
    Copy,
    Check,
    QrCode,
    UtensilsCrossed,
    XCircle,
} from 'lucide-react';
import {
    cancelDeliveryOrderByCustomer,
    getDeliveryOrdersByPhone,
    subscribeDeliveryOrdersByPhone,
} from '../services/deliveryService';
import type { DeliveryOrder, DeliveryOrderItem } from '../types/delivery';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';
import DeliveryBottomNav from '../components/delivery/DeliveryBottomNav';
import { useDeliveryBottomNav } from '../hooks/useDeliveryBottomNav';

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
    onToggleExpansion,
    onCancelOrder,
    cancelling,
}: {
    order: DeliveryOrder;
    isExpanded: boolean;
    onToggleExpansion: (orderId: string) => void;
    onCancelOrder: (orderId: string) => Promise<void>;
    cancelling: boolean;
}) => {
    const config = STATUS_CONFIG[order.status];
    const summary = getOrderSummary(order);
    const reference = getOrderReference(order);
    const progressPct = config.step > 0 ? (config.step / 5) * 100 : 0;
    const [copiedPix, setCopiedPix] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const pixQrImage = normalizePixQrImage(order.pixQrCodeImage);
    const canCancel = order.status === 'pending';

    const handleCopyPix = async () => {
        if (!order.pixCopyPaste?.trim()) return;
        try {
            const { copyToClipboard } = await import('../utils/copyToClipboard');
            const ok = await copyToClipboard(order.pixCopyPaste);
            if (ok) {
                setCopiedPix(true);
                window.setTimeout(() => setCopiedPix(false), 1800);
            }
        } catch (err) {
            console.error('Erro ao copiar PIX:', err);
        }
    };

    return (
        <div
            className="rounded-2xl shadow-sm overflow-hidden border"
            style={{ backgroundColor: '#FAF0DB', borderColor: '#E9D7C4' }}
        >
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold truncate" style={{ color: '#2A1E1A' }}>
                            {order.restaurantName}
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: '#6B5A54' }}>{reference}</p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 text-[11px] font-bold border rounded-full ${config.badgeClass}`}>
                        {config.label}
                    </span>
                </div>

                {config.step > 0 && config.step < 5 && (
                    <div className="mt-3">
                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: '#E9D7C4' }}>
                            <div
                                className={`h-full ${config.progressClass} rounded-full transition-all duration-500`}
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        <p className="text-[11px] mt-1.5 font-medium" style={{ color: '#6B5A54' }}>
                            {config.stepLabel}
                        </p>
                    </div>
                )}
                {canCancel && !confirmCancel && (
                    <p className="text-[11px] mt-2 leading-snug" style={{ color: '#6B5A54' }}>
                        O restaurante ainda não confirmou. Você pode cancelar se mudar de ideia.
                    </p>
                )}
            </div>

            <div className="px-4 pb-3">
                <p className="text-sm leading-snug" style={{ color: '#2A1E1A' }}>
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

            <div
                className="border-t px-4 py-3 flex flex-col gap-2"
                style={{ borderColor: '#E9D7C4', backgroundColor: 'rgba(255,255,255,0.45)' }}
            >
                {canCancel && confirmCancel && (
                    <div
                        className="rounded-xl border p-3"
                        style={{ borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
                    >
                        <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>
                            Cancelar este pedido?
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
                            O restaurante ainda não confirmou. O cancelamento é imediato.
                        </p>
                        <div className="flex gap-2 mt-3">
                            <button
                                type="button"
                                disabled={cancelling}
                                onClick={() => void onCancelOrder(order.id)}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-60 active:scale-[0.98]"
                                style={{ backgroundColor: '#DC2626' }}
                            >
                                <XCircle className="w-4 h-4" />
                                {cancelling ? 'Cancelando…' : 'Sim, cancelar'}
                            </button>
                            <button
                                type="button"
                                disabled={cancelling}
                                onClick={() => setConfirmCancel(false)}
                                className="flex-1 px-3 py-2 rounded-xl border text-sm font-bold disabled:opacity-60"
                                style={{ borderColor: '#E9D7C4', color: '#2A1E1A', backgroundColor: '#FFFFFF' }}
                            >
                                Voltar
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-lg font-bold tabular-nums" style={{ color: '#E91120' }}>
                        {formatCurrency(order.total)}
                    </span>
                    <div className="flex items-center gap-2">
                        {canCancel && !confirmCancel && (
                            <button
                                type="button"
                                onClick={() => setConfirmCancel(true)}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border text-sm font-bold active:scale-[0.98]"
                                style={{ borderColor: '#DC2626', color: '#DC2626', backgroundColor: '#FFFFFF' }}
                            >
                                <XCircle className="w-4 h-4" />
                                Cancelar
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => onToggleExpansion(order.id)}
                            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-white text-sm font-bold active:scale-[0.98] transition-transform"
                            style={{ backgroundColor: '#E91120' }}
                        >
                            {isExpanded ? 'Fechar' : 'Detalhes'}
                            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="border-t p-4" style={{ borderColor: '#E9D7C4', backgroundColor: '#FFF8F2' }}>
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
                            <div className="flex justify-between font-bold text-gray-900">
                                <span>Total</span>
                                <span>{formatCurrency(order.total)}</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            Pagamento: {paymentLabel[order.paymentMethod] || order.paymentMethod}
                        </p>
                        {order.status === 'cancelled' && order.cancellationReason?.trim() && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
                                Motivo: {order.cancellationReason}
                            </p>
                        )}
                        {(order.paymentMethod === 'pix' ||
                          (order.paymentMethod === 'stripe' && order.pixCopyPaste?.trim())) && (
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
    const { user, isLoading: authLoading } = useDeliveryAuth();
    const handleBottomNav = useDeliveryBottomNav('orders');
    const [orders, setOrders] = useState<DeliveryOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
    const [refreshing, setRefreshing] = useState(false);
    const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
    const [cancelError, setCancelError] = useState<string | null>(null);

    const customerPhone = user?.phone?.trim() ?? '';

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            navigate('/delivery/auth?redirect=/delivery/orders', { replace: true });
        }
    }, [authLoading, user, navigate]);

    useEffect(() => {
        if (!customerPhone) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = subscribeDeliveryOrdersByPhone(customerPhone, (ordersData) => {
            setOrders(ordersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [customerPhone]);

    const loadOrders = async () => {
        if (!customerPhone) return;
        try {
            setRefreshing(true);
            const ordersData = await getDeliveryOrdersByPhone(customerPhone);
            setOrders(ordersData);
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };


    const toggleOrderExpansion = useCallback((orderId: string) => {
        setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
    }, []);

    const handleCancelOrder = useCallback(async (orderId: string) => {
        if (!customerPhone) return;
        setCancelError(null);
        setCancellingOrderId(orderId);
        try {
            await cancelDeliveryOrderByCustomer(orderId, customerPhone);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Não foi possível cancelar o pedido.';
            setCancelError(message);
            console.error('Erro ao cancelar pedido:', error);
        } finally {
            setCancellingOrderId(null);
        }
    }, [customerPhone]);

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

    if (authLoading || !user) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: '#FFF8F2' }}
            >
                <div
                    className="w-10 h-10 rounded-2xl border-2 animate-spin"
                    style={{ borderColor: '#E9D7C4', borderTopColor: '#E91120' }}
                />
            </div>
        );
    }

    const ordersHeader = (
        <header
            className="shrink-0 border-b shadow-sm"
            style={{
                backgroundColor: '#FFF8F2',
                borderColor: '#E9D7C4',
                paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
            }}
        >
            <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/delivery')}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border active:scale-95 transition-transform"
                        style={{ backgroundColor: '#FAF0DB', borderColor: '#E9D7C4', color: '#2A1E1A' }}
                        aria-label="Voltar"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 shrink-0" style={{ color: '#E91120' }} />
                            <h1 className="text-lg font-bold truncate" style={{ color: '#2A1E1A' }}>
                                Meus Pedidos
                            </h1>
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#6B5A54' }}>
                            Acompanhe status em tempo real
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void loadOrders()}
                        disabled={refreshing || !customerPhone}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border active:scale-95 transition-transform disabled:opacity-60"
                        style={{ backgroundColor: '#FFFFFF', borderColor: '#E9D7C4', color: '#E91120' }}
                        aria-label="Atualizar pedidos"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
        </header>
    );

    return (
        <div
            className="font-sans flex flex-col"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: '#FFF8F2',
                overflow: 'hidden',
            }}
        >
            {ordersHeader}

            {/* Filtros horizontais — sempre visíveis */}
            <div
                className="shrink-0 border-b px-4 py-3 overflow-x-auto scrollbar-hide"
                style={{ borderColor: '#E9D7C4', backgroundColor: '#FFF8F2' }}
            >
                <div className="flex gap-2 min-w-max">
                    {statusOptions.map((option) => {
                        const selected = selectedStatus === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setSelectedStatus(option.value)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap border-2 transition-all active:scale-[0.98]"
                                style={
                                    selected
                                        ? { backgroundColor: '#E91120', borderColor: '#E91120', color: '#FFFFFF' }
                                        : { backgroundColor: '#FAF0DB', borderColor: '#E9D7C4', color: '#2A1E1A' }
                                }
                            >
                                <span>{option.label}</span>
                                <span
                                    className="min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] flex items-center justify-center font-bold"
                                    style={{
                                        backgroundColor: selected ? 'rgba(255,255,255,0.25)' : 'rgba(233,17,32,0.12)',
                                        color: selected ? '#FFFFFF' : '#E91120',
                                    }}
                                >
                                    {option.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 scrollbar-hide">
                {cancelError && (
                    <div
                        className="mb-3 max-w-lg mx-auto rounded-xl border px-4 py-3 text-sm"
                        style={{ borderColor: '#FECACA', backgroundColor: '#FEF2F2', color: '#991B1B' }}
                    >
                        {cancelError}
                    </div>
                )}
                {loading ? (
                    <div className="text-center py-16">
                        <div
                            className="w-12 h-12 rounded-2xl border-2 animate-spin mx-auto mb-4"
                            style={{ borderColor: '#E9D7C4', borderTopColor: '#E91120' }}
                        />
                        <p className="text-sm font-medium" style={{ color: '#6B5A54' }}>
                            Carregando pedidos…
                        </p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div
                        className="rounded-2xl border p-10 text-center"
                        style={{ backgroundColor: '#FAF0DB', borderColor: '#E9D7C4' }}
                    >
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                            style={{ backgroundColor: '#E9D7C4' }}
                        >
                            <UtensilsCrossed className="w-8 h-8" style={{ color: '#6B5A54' }} />
                        </div>
                        <h3 className="text-lg font-bold mb-2" style={{ color: '#2A1E1A' }}>
                            {selectedStatus === 'all' ? 'Nenhum pedido ainda' : 'Nada neste filtro'}
                        </h3>
                        <p className="text-sm mb-6" style={{ color: '#6B5A54' }}>
                            {selectedStatus === 'all'
                                ? 'Faça um pedido e ele aparecerá aqui automaticamente.'
                                : 'Tente outro status ou volte para «Todos os pedidos».'}
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate('/delivery')}
                            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold active:scale-[0.99]"
                            style={{ backgroundColor: '#E91120' }}
                        >
                            Ver restaurantes
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3 max-w-lg mx-auto">
                        {filteredOrders.map((order) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                isExpanded={expandedOrders[order.id] || false}
                                onToggleExpansion={toggleOrderExpansion}
                                onCancelOrder={handleCancelOrder}
                                cancelling={cancellingOrderId === order.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            <DeliveryBottomNav active="orders" onChange={handleBottomNav} />
        </div>
    );
}