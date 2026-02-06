import { useEffect, useState } from 'react';
import { X, Clock } from 'lucide-react';
import type { Table } from '../../services/tableService';
import { getActiveSessionByTable, closeSession, addSessionAdjustment, type TableSession } from '../../services/tableSessionService';
import { getOrdersByRestaurant } from '../../services/orderService';
import { updateTable } from '../../services/tableService';
import { logTableEvent } from '../../services/tableAuditService';
import type { FirestoreOrder } from '../../services/orderService';

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

  useEffect(() => {
    const load = async () => {
      if (!restaurantId || !mesa.id) return;
      setLoading(true);
      try {
        const [sess, allOrders] = await Promise.all([
          getActiveSessionByTable(mesa.id),
          getOrdersByRestaurant(restaurantId)
        ]);
        setSession(sess ?? null);
        setOrders(allOrders.filter((o) => o.mesaId === mesa.id));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [restaurantId, mesa.id]);

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
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
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
            <h4 className="font-medium mb-2">Pedidos nesta sessão</h4>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum pedido nesta sessão.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {orders.map((o) => (
                  <li key={o.id} className="flex justify-between">
                    <span>{o.itens?.join(', ') ?? o.timestamp}</span>
                    <span>{o.status}</span>
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
