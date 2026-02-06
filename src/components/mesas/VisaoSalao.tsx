import { useState } from 'react';
import { Eye, User, DoorOpen } from 'lucide-react';
import type { Table } from '../../services/tableService';
import type { Area } from '../../services/areaService';

const STATUS_LABEL: Record<string, string> = {
  livre: 'Livre',
  ocupada: 'Ocupada',
  em_fechamento: 'Em fechamento',
  fechada: 'Fechada',
  bloqueada: 'Bloqueada'
};

const STATUS_COLOR: Record<string, string> = {
  livre: 'bg-green-100 text-green-800',
  ocupada: 'bg-amber-100 text-amber-800',
  em_fechamento: 'bg-orange-100 text-orange-800',
  fechada: 'bg-gray-100 text-gray-800',
  bloqueada: 'bg-red-100 text-red-800'
};

interface VisaoSalaoProps {
  mesas: Table[];
  areas: Area[];
  loading: boolean;
  onOpenMesa: (mesa: Table, responsavel?: string, observacao?: string) => void;
  onVerDetalhe: (mesa: Table) => void;
  onAtribuirResponsavel: (mesa: Table, responsavel: string) => void;
  generateTableUrl?: (numero: string) => string;
}

export default function VisaoSalao({
  mesas,
  areas,
  loading,
  onOpenMesa,
  onVerDetalhe,
  onAtribuirResponsavel
}: VisaoSalaoProps) {
  const [filterArea, setFilterArea] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [openModalMesa, setOpenModalMesa] = useState<Table | null>(null);
  const [responsavelInput, setResponsavelInput] = useState('');
  const [observacaoInput, setObservacaoInput] = useState('');

  const filtered = mesas.filter((m) => {
    if (filterArea !== 'todos' && (m.areaId ?? '') !== filterArea) return false;
    if (filterStatus !== 'todos' && m.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        Carregando mesas...
      </div>
    );
  }

  if (mesas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        Nenhuma mesa configurada. Configure no Editor de Salão.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-gray-600">Área:</span>
        <select
          value={filterArea}
          onChange={(e) => setFilterArea(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="todos">Todas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
          <option value="">Sem área</option>
        </select>
        <span className="text-sm font-medium text-gray-600 ml-2">Status:</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="todos">Todos</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((mesa) => (
          <div
            key={mesa.id}
            className="bg-white rounded-lg shadow border border-gray-100 p-4 flex flex-col"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-gray-900">Mesa {mesa.numero}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[mesa.status] ?? 'bg-gray-100'}`}>
                {STATUS_LABEL[mesa.status] ?? mesa.status}
              </span>
            </div>
            {mesa.areaName && (
              <p className="text-xs text-gray-500 mb-1">{mesa.areaName}</p>
            )}
            {mesa.responsavel && (
              <p className="text-xs text-gray-600 flex items-center gap-1 mb-2">
                <User className="w-3 h-3" />
                {mesa.responsavel}
              </p>
            )}
            <div className="mt-auto flex flex-wrap gap-2">
              {mesa.status === 'livre' && (
                <button
                  onClick={() => setOpenModalMesa(mesa)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded bg-amber-500 text-white text-sm hover:bg-amber-600"
                >
                  <DoorOpen className="w-3.5 h-3.5" />
                  Abrir mesa
                </button>
              )}
              {(mesa.status === 'ocupada' || mesa.status === 'em_fechamento') && (
                <>
                  <button
                    onClick={() => onVerDetalhe(mesa)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded bg-blue-500 text-white text-sm hover:bg-blue-600"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver detalhe
                  </button>
                  <button
                    onClick={() => {
                      const r = window.prompt('Nome do responsável:', mesa.responsavel ?? '');
                      if (r !== null && r.trim()) onAtribuirResponsavel(mesa, r.trim());
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
                  >
                    <User className="w-3.5 h-3.5" />
                    Responsável
                  </button>
                </>
              )}
              {mesa.status === 'fechada' && (
                <button
                  onClick={() => onVerDetalhe(mesa)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver detalhe
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {openModalMesa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Abrir mesa {openModalMesa.numero}</h3>
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700">Responsável (opcional)</label>
              <input
                type="text"
                value={responsavelInput}
                onChange={(e) => setResponsavelInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Nome do garçom/caixa"
              />
              <label className="block text-sm font-medium text-gray-700">Observação (opcional)</label>
              <input
                type="text"
                value={observacaoInput}
                onChange={(e) => setObservacaoInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Ex: aniversário"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setOpenModalMesa(null);
                  setResponsavelInput('');
                  setObservacaoInput('');
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onOpenMesa(openModalMesa, responsavelInput.trim() || undefined, observacaoInput.trim() || undefined);
                  setOpenModalMesa(null);
                  setResponsavelInput('');
                  setObservacaoInput('');
                }}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
              >
                Abrir mesa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
