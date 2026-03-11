import { useState } from 'react';
import { Plus, Trash2, Eye, Download, QrCode } from 'lucide-react';
import type { Table } from '../../services/tableService';
import type { Area } from '../../services/areaService';

interface EditorSalaoProps {
  restaurantId: string;
  mesas: Table[];
  areas: Area[];
  maxTables: number;
  loading: boolean;
  loadTables: () => void;
  loadAreas: () => void;
  onAddTable: () => void;
  onRemoveTable: (id: string) => void;
  onAddArea: (nome: string) => void;
  onRemoveArea: (id: string) => void;
  onVerDetalhe?: (mesa: Table) => void;
  visualizarQRCode: (numero: string) => void;
  baixarQRCode: (numero: string) => void;
  generateTableUrl?: (numero: string) => string;
  setShowAddModal: (v: boolean) => void;
  novaMesa?: string;
  setNovaMesa?: (v: string) => void;
}

export default function EditorSalao({
  mesas,
  areas,
  maxTables,
  loading,
  onRemoveTable,
  onAddArea,
  onRemoveArea,
  onVerDetalhe,
  visualizarQRCode,
  baixarQRCode,
  setShowAddModal
}: EditorSalaoProps) {
  const [newAreaName, setNewAreaName] = useState('');
  const atLimit = mesas.length >= maxTables;

  const mesasByArea = (areaId: string | null) =>
    mesas.filter((m) => (m.areaId ?? null) === areaId);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-black">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
        Limite do plano: {maxTables} mesas. Atual: {mesas.length}.
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            placeholder="Nome da área (ex: Salão, Varanda)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 text-black"
          />
          <button
            onClick={() => {
              if (newAreaName.trim()) {
                onAddArea(newAreaName.trim());
                setNewAreaName('');
              }
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
          >
            <Plus className="w-4 h-4" />
            Adicionar área
          </button>
        </div>
        <div className="p-4 space-y-6">
          {areas.map((area) => (
            <div key={area.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-black">{area.nome}</h4>
                <button
                  onClick={() => onRemoveArea(area.id)}
                  className="p-1.5 rounded text-red-600 hover:bg-red-50"
                  title="Remover área"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <ul className="space-y-2">
                {mesasByArea(area.id).map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="font-medium text-black">Mesa {m.numero}</span>
                    <span className="text-xs text-black">Cap. {m.capacidade} · Ordem {m.ordem}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onVerDetalhe?.(m)}
                        className="p-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                        title="Ver detalhes da mesa (pedidos, sessão)"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => visualizarQRCode(m.numero)}
                        className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                        title="Ver QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => baixarQRCode(m.numero)}
                        className="p-1.5 rounded bg-green-50 text-green-600 hover:bg-green-100"
                        title="Baixar QR Code"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemoveTable(m.id)}
                        className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {mesasByArea(area.id).length === 0 && (
                <p className="text-sm text-black py-2">Nenhuma mesa nesta área.</p>
              )}
            </div>
          ))}

          <div className="border border-dashed border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-black mb-2">Sem área</h4>
            <ul className="space-y-2">
              {mesasByArea(null).map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="font-medium text-black">Mesa {m.numero}</span>
                  <span className="text-xs text-black">Cap. {m.capacidade} · Ordem {m.ordem}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onVerDetalhe?.(m)}
                      className="p-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                      title="Ver detalhes da mesa (pedidos, sessão)"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => visualizarQRCode(m.numero)}
                      className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                      title="Ver QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button onClick={() => baixarQRCode(m.numero)} className="p-1.5 rounded bg-green-50 text-green-600 hover:bg-green-100" title="Baixar QR Code">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => onRemoveTable(m.id)} className="p-1.5 rounded bg-red-50 text-red-600" title="Remover">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {mesasByArea(null).length === 0 && areas.length === 0 && (
              <p className="text-sm text-black py-2">Crie uma área ou adicione mesas sem área abaixo.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAddModal(true)}
          disabled={atLimit}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Adicionar mesa
        </button>
        {atLimit && (
          <span className="text-sm text-amber-700">Limite do plano atingido ({maxTables} mesas).</span>
        )}
      </div>
    </div>
  );
}
