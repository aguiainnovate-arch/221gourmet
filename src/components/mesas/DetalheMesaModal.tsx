import { useEffect, useState, useCallback } from 'react';
import { X, Clock, RefreshCw, ChefHat, CheckCircle, Undo2 } from 'lucide-react';
import type { Table } from '../../services/tableService';
import { getActiveSessionByTable, closeSession, addSessionAdjustment, type TableSession } from '../../services/tableSessionService';
import { getOrdersByRestaurant, getOrdersByTable, updateOrderStatus } from '../../services/orderService';
import { updateTable } from '../../services/tableService';
import { logTableEvent } from '../../services/tableAuditService';
import type { FirestoreOrder } from '../../services/orderService';

const STATUS_LABEL: Record<FirestoreOrder['status'], string> = {
  novo: 'Na fila',
  preparando: 'Em preparo',
  pronto: 'Pronto'
};

interface DetalheMesaModalProps {
  mesa: Table;
  onClose: () => void;
  restaurantId: string;
  onMesaUpdated: () => void;
}

export default function DetalheMesaModal({ mesa, onClose, restaurantId, onMesaUpdated }: DetalheMesaModalProps) {
  const [session, setSession] = useState<TableSession | null>(null);
  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustmentModal, setAdjustmentModal] = useState(false);
  const [adjustValor, setAdjustValor] = useState('');
  const [adjustMotivo, setAdjustMotivo] = useState('');

  const loadOrdersAndSession = useCallback(async () => {
    if (!restaurantId || !mesa.id) return;
    setLoading(true);
    try {
      const [sess, ordersByTableResult] = await Promise.all([
        getActiveSessionByTable(mesa.id),
        // Tenta por id da mesa; se falhar (ex.: índice), busca por restaurante e filtra por id ou número
        getOrdersByTable(mesa.id).catch(async () => {
          const all = await getOrdersByRestaurant(restaurantId);
          return all.filter(
            (o) =>
              (o.mesaId === mesa.id || String(o.mesaNumero) === String(mesa.numero)) &&
              (o.orderType === 'mesa' || !o.orderType)
          );
        })
      ]);
      setSession(sess ?? null);
      // Garante que só entram pedidos de mesa (não delivery)
      const mesaOrders = (ordersByTableResult || []).filter(
        (o) => o.orderType === 'mesa' || !o.orderType
      );
      setOrders(mesaOrders);
    } catch (e) {
      console.error(e);
      // Fallback: buscar todos do restaurante e filtrar por mesa (id ou número)
      try {
        const all = await getOrdersByRestaurant(restaurantId);
        setOrders(
          all.filter(
            (o) =>
              (o.mesaId === mesa.id || String(o.mesaNumero) === String(mesa.numero)) &&
              (o.orderType === 'mesa' || !o.orderType)
          )
        );
      } catch (e2) {
        console.error(e2);
      }
    } finally {
      setLoading(false);
    }
  }, [restaurantId, mesa.id, mesa.numero]);

  useEffect(() => {
    loadOrdersAndSession();
  }, [loadOrdersAndSession]);

  const handleEmFechamento = async () => {
    try {
      await updateTable(mesa.id, { status: 'em_fechamento' });
      await logTableEvent(restaurantId, mesa.id, 'mesa_em_fechamento', 'gerente', { mesaNumero: mesa.numero });
      onMesaUpdated();
    } catch (e) {
      console.error(e);
      alert('Erro ao alterar status.');
    }
  };

  const handleFecharMesa = async () => {
    try {
      const totalStr = window.prompt('Total da conta (R$):', '0');
      if (totalStr === null) return;
      const total = parseFloat(totalStr.replace(',', '.')) || 0;
      if (session) {
        await closeSession(session.id, total, 'gerente');
        await logTableEvent(restaurantId, mesa.id, 'mesa_fechada', 'gerente', { mesaNumero: mesa.numero, detalhe: `Total R$ ${total}` });
      }
      await updateTable(mesa.id, { status: 'fechada' });
      onMesaUpdated();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erro ao fechar mesa.');
    }
  };

  const handleVoltarLivre = async () => {
    try {
      await updateTable(mesa.id, { status: 'livre', responsavel: null, observacao: null });
      await logTableEvent(restaurantId, mesa.id, 'mesa_livre', 'gerente', { mesaNumero: mesa.numero });
      onMesaUpdated();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erro ao liberar mesa.');
    }
  };

  const handleOrderStatus = async (orderId: string, newStatus: FirestoreOrder['status']) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      onMesaUpdated();
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar status do pedido.');
    }
  };

  const handleAddAjuste = async () => {
    if (!session) return;
    const valor = parseFloat(adjustValor.replace(',', '.'));
    if (isNaN(valor) || !adjustMotivo.trim()) {
      alert('Informe valor e motivo.');
      return;
    }
    try {
      await addSessionAdjustment(session.id, { valor, motivo: adjustMotivo.trim(), userId: 'gerente' });
      await logTableEvent(restaurantId, mesa.id, 'ajuste', 'gerente', { motivo: adjustMotivo.trim(), detalhe: `R$ ${valor}` });
      setAdjustmentModal(false);
      setAdjustValor('');
      setAdjustMotivo('');
      const [sess] = await Promise.all([getActiveSessionByTable(mesa.id)]);
      setSession(sess ?? null);
      onMesaUpdated();
    } catch (e) {
      console.error(e);
      alert('Erro ao registrar ajuste.');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-8">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-xl font-semibold">Mesa {mesa.numero}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => loadOrdersAndSession()}
              className="p-2 rounded-lg hover:bg-gray-100"
              title="Atualizar pedidos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {mesa.responsavel && (
            <p className="text-sm text-gray-600"><strong>Responsável:</strong> {mesa.responsavel}</p>
          )}
          {mesa.observacao && (
            <p className="text-sm text-gray-600"><strong>Observação:</strong> {mesa.observacao}</p>
          )}

          {session && (
            <div className="text-sm text-gray-600">
              <Clock className="w-4 h-4 inline mr-1" />
              Sessão aberta em {new Date(session.abertaEm).toLocaleString('pt-BR')}
            </div>
          )}

          <div>
            <h4 className="font-medium mb-2">Pedidos nesta mesa</h4>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhum pedido ainda. Pedidos feitos pelo QR/cardápio desta mesa aparecem aqui. Use o ícone de atualizar para recarregar.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {orders.map((o) => (
                    <li key={o.id} className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-gray-800">{o.itens?.join(' · ') ?? o.timestamp}</span>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                            o.status === 'novo'
                              ? 'bg-amber-100 text-amber-800'
                              : o.status === 'preparando'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {STATUS_LABEL[o.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 items-center">
                        {o.status === 'novo' && (
                          <button
                            onClick={() => handleOrderStatus(o.id, 'preparando')}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            Colocar em preparo
                          </button>
                        )}
                        {o.status === 'preparando' && (
                          <>
                            <button
                              onClick={() => handleOrderStatus(o.id, 'pronto')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 text-xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Marcar pronto
                            </button>
                            <button
                              onClick={() => handleOrderStatus(o.id, 'novo')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs"
                              title="Voltar para na fila"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              Voltar para na fila
                            </button>
                          </>
                        )}
                        {o.status === 'pronto' && (
                          <>
                            <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Entregar à mesa
                            </span>
                            <button
                              onClick={() => handleOrderStatus(o.id, 'preparando')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs"
                              title="Voltar para em preparo"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              Voltar para em preparo
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                ))}
              </ul>
            )}
          </div>

          {session?.ajustes && session.ajustes.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Ajustes</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                {session.ajustes.map((a, i) => (
                  <li key={i}>R$ {a.valor} – {a.motivo}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4">
            {(mesa.status === 'ocupada' || mesa.status === 'em_fechamento') && (
              <>
                {mesa.status === 'ocupada' && (
                  <button
                    onClick={handleEmFechamento}
                    className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm hover:bg-orange-600"
                  >
                    Em fechamento
                  </button>
                )}
                {session && (
                  <button
                    onClick={() => setAdjustmentModal(true)}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
                  >
                    Adicionar ajuste
                  </button>
                )}
                <button
                  onClick={handleFecharMesa}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-600"
                >
                  Fechar mesa
                </button>
              </>
            )}
            {mesa.status === 'fechada' && (
              <button
                onClick={handleVoltarLivre}
                className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm hover:bg-green-600"
              >
                Voltar para livre
              </button>
            )}
          </div>
        </div>
      </div>

      {adjustmentModal && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h4 className="font-semibold mb-3">Registrar ajuste</h4>
            <input
              type="text"
              placeholder="Valor (ex: -10 ou 5)"
              value={adjustValor}
              onChange={(e) => setAdjustValor(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-2"
            />
            <input
              type="text"
              placeholder="Motivo (obrigatório)"
              value={adjustMotivo}
              onChange={(e) => setAdjustMotivo(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setAdjustmentModal(false)} className="flex-1 py-2 rounded-lg border text-gray-700">Cancelar</button>
              <button onClick={handleAddAjuste} className="flex-1 py-2 rounded-lg bg-amber-500 text-white">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
