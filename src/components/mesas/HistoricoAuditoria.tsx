import { RefreshCw } from 'lucide-react';
import type { TableAuditEvent } from '../../services/tableAuditService';
import type { Table } from '../../services/tableService';

const EVENT_LABEL: Record<string, string> = {
  mesa_aberta: 'Mesa aberta',
  mesa_fechada: 'Mesa fechada',
  mesa_em_fechamento: 'Em fechamento',
  mesa_livre: 'Mesa livre',
  ajuste: 'Ajuste',
  responsavel_alterado: 'Responsável alterado',
  forcar_fechamento: 'Fechamento forçado'
};

interface HistoricoAuditoriaProps {
  events: TableAuditEvent[];
  mesas: Table[];
  filters: { mesaId?: string; since?: string };
  onFilterChange: (f: { mesaId?: string; since?: string }) => void;
  onRefresh: () => void;
}

export default function HistoricoAuditoria({
  events,
  mesas,
  filters,
  onFilterChange,
  onRefresh
}: HistoricoAuditoriaProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex flex-wrap gap-2 items-center">
        <select
          value={filters.mesaId ?? ''}
          onChange={(e) => onFilterChange({ ...filters, mesaId: e.target.value || undefined })}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Todas as mesas</option>
          {mesas.map((m) => (
            <option key={m.id} value={m.id}>
              Mesa {m.numero}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.since ?? ''}
          onChange={(e) => onFilterChange({ ...filters, since: e.target.value || undefined })}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        />
        <button
          onClick={onRefresh}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>
      <div className="overflow-x-auto">
        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum evento no período.
          </div>
        ) : (
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium text-sm">Data/Hora</th>
                <th className="text-left p-3 font-medium text-sm">Mesa</th>
                <th className="text-left p-3 font-medium text-sm">Evento</th>
                <th className="text-left p-3 font-medium text-sm">Detalhe / Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50">
                  <td className="p-3 text-sm text-gray-600">
                    {new Date(ev.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 font-medium text-sm">{ev.mesaNumero ?? ev.mesaId}</td>
                  <td className="p-3 text-sm">{EVENT_LABEL[ev.evento] ?? ev.evento}</td>
                  <td className="p-3 text-sm text-gray-600">{ev.detalhe ?? ev.motivo ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
