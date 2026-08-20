import { useEffect, useState } from 'react';
import { Clock, Plus, Trash2, X } from 'lucide-react';
import type { MenuShift, MenuShiftChannel } from '../types/menuShift';
import {
  MAX_MENU_SHIFTS,
  createEmptyMenuShift,
  createTypicalMenuShifts,
  menuShiftChannelLabel,
} from '../types/menuShift';

interface Props {
  open: boolean;
  shifts: MenuShift[];
  saving?: boolean;
  onClose: () => void;
  onSave: (shifts: MenuShift[]) => Promise<void> | void;
}

const CHANNEL_OPTIONS: MenuShiftChannel[] = ['both', 'dine_in', 'delivery'];

export default function MenuShiftsModal({ open, shifts, saving = false, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<MenuShift[]>(shifts);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(shifts);
    setError(null);
  }, [open, shifts]);

  if (!open) return null;

  const updateShift = (id: string, patch: Partial<MenuShift>) => {
    setDraft((current) => current.map((shift) => (shift.id === id ? { ...shift, ...patch } : shift)));
  };

  const handleSave = async () => {
    const named = draft.filter((shift) => shift.name.trim());
    if (named.length !== draft.length) {
      setError('Dê um nome para cada turno (ex.: Café da manhã, Almoço, Jantar).');
      return;
    }
    setError(null);
    await onSave(named);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">Turnos do cardápio</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Alguns restaurantes vendem um cardápio de manhã e outro à noite. Crie turnos com
                horário e escolha onde eles valem: só no delivery, só nas mesas (QR Code) ou nos dois.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Produto <strong>sem turno</strong> aparece o dia inteiro. Produto <strong>com turno</strong> só
            entra no horário e no canal que você marcar. Quem gerencia isso é o restaurante — o cliente
            só vê o que estiver valendo agora.
          </p>

          {draft.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center">
              <p className="text-sm text-gray-600 mb-3">
                Nenhum turno ainda. Você pode começar do zero ou usar os horários mais comuns.
              </p>
              <button
                type="button"
                onClick={() => setDraft(createTypicalMenuShifts())}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700"
              >
                Usar turnos típicos (manhã, almoço e jantar)
              </button>
            </div>
          )}

          {draft.map((shift, index) => (
            <div key={shift.id} className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Turno {index + 1}
                </p>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={shift.enabled}
                      onChange={(e) => updateShift(shift.id, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    Ativo
                  </label>
                  <button
                    type="button"
                    onClick={() => setDraft((current) => current.filter((item) => item.id !== shift.id))}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                    aria-label={`Remover ${shift.name || 'turno'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-800 mb-1">Nome</label>
                  <input
                    type="text"
                    value={shift.name}
                    onChange={(e) => updateShift(shift.id, { name: e.target.value })}
                    placeholder="Ex: Café da manhã"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Início</label>
                  <input
                    type="time"
                    value={shift.start}
                    onChange={(e) => updateShift(shift.id, { start: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Fim</label>
                  <input
                    type="time"
                    value={shift.end}
                    onChange={(e) => updateShift(shift.id, { end: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    Onde este turno aparece
                  </label>
                  <select
                    value={shift.channels}
                    onChange={(e) =>
                      updateShift(shift.id, { channels: e.target.value as MenuShiftChannel })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {CHANNEL_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {menuShiftChannelLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          {draft.length < MAX_MENU_SHIFTS && draft.length > 0 && (
            <button
              type="button"
              onClick={() => setDraft((current) => [...current, createEmptyMenuShift()])}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              Adicionar turno
            </button>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar turnos'}
          </button>
        </div>
      </div>
    </div>
  );
}
