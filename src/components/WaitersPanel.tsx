import { useEffect, useState } from 'react';
import {
  createWaiter,
  deleteWaiter,
  getWaitersByRestaurant,
  updateWaiterPassword
} from '../services/waiterService';
import type { Waiter } from '../types/waiter';
import { formatCpf, isValidCpf } from '../utils/cpf';
import PasswordInput from './PasswordInput';
import ModalOverlay from './ModalOverlay';
import {
  PanelPage,
  PanelPageHeader,
  PanelCard,
  PanelButton,
  PanelEmptyState,
  panelInputClass,
  panelLabelClass
} from './panel';
import { Plus, Trash2, KeyRound, Users } from 'lucide-react';

interface WaitersPanelProps {
  restaurantId: string;
}

export default function WaitersPanel({ restaurantId }: WaitersPanelProps) {
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [passwordWaiter, setPasswordWaiter] = useState<Waiter | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setWaiters(await getWaitersByRestaurant(restaurantId));
    } catch {
      setError('Não foi possível carregar os garçons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [restaurantId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !cpf.trim() || !password.trim()) {
      setError('Preencha nome, CPF e senha.');
      return;
    }
    if (!isValidCpf(cpf)) {
      setError('CPF inválido.');
      return;
    }

    setSaving(true);
    try {
      await createWaiter({
        restaurantId,
        name,
        cpf,
        password
      });
      setName('');
      setCpf('');
      setPassword('');
      setSuccess('Garçom cadastrado. Ele já pode entrar com CPF e senha.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar garçom.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (waiter: Waiter) => {
    if (!window.confirm(`Remover o garçom ${waiter.name}?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await deleteWaiter(waiter.id);
      setWaiters((prev) => prev.filter((w) => w.id !== waiter.id));
      setSuccess('Garçom removido.');
    } catch {
      setError('Erro ao remover garçom.');
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordWaiter) return;
    setError(null);
    setSuccess(null);
    setSavingPassword(true);
    try {
      await updateWaiterPassword(passwordWaiter.id, newPassword);
      setPasswordWaiter(null);
      setNewPassword('');
      setSuccess(`Senha de ${passwordWaiter.name} atualizada.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <PanelPage>
      <PanelPageHeader
        title="Garçons"
        description="Cadastre a equipe. O garçom entra com CPF e senha; você pode trocar a senha a qualquer momento."
        icon={<Users className="w-5 h-5" />}
      />

      <PanelCard>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Cadastrar garçom</h3>
        <form onSubmit={(e) => void handleCreate(e)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={panelLabelClass}>Nome *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={panelInputClass}
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label className={panelLabelClass}>CPF *</label>
            <input
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              className={panelInputClass}
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="off"
            />
          </div>
          <div>
            <label className={panelLabelClass}>Senha *</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={panelInputClass}
              placeholder="Senha de acesso"
              autoComplete="new-password"
            />
          </div>
          <div className="flex items-end">
            <PanelButton type="submit" disabled={saving} icon={<Plus className="w-4 h-4" />} className="w-full">
              {saving ? 'Salvando...' : 'Cadastrar'}
            </PanelButton>
          </div>
        </form>
      </PanelCard>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{success}</div>
      )}

      {loading ? (
        <PanelCard>
          <p className="text-sm text-gray-500">Carregando garçons...</p>
        </PanelCard>
      ) : waiters.length === 0 ? (
        <PanelEmptyState
          icon={<Users className="w-8 h-8" />}
          title="Nenhum garçom cadastrado"
          description="Use o formulário acima para registrar o primeiro garçom."
        />
      ) : (
        <PanelCard className="overflow-hidden" padding="none">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">CPF</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {waiters.map((waiter) => (
                <tr key={waiter.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{waiter.name}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCpf(waiter.cpf)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordWaiter(waiter);
                          setNewPassword('');
                          setError(null);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
                      >
                        <KeyRound className="w-4 h-4" />
                        Alterar senha
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(waiter)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PanelCard>
      )}

      {passwordWaiter && (
        <ModalOverlay
          onBackdropClick={() => {
            if (!savingPassword) {
              setPasswordWaiter(null);
              setNewPassword('');
            }
          }}
        >
          <form
            onSubmit={(e) => void handleSavePassword(e)}
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Alterar senha</h3>
            <p className="text-sm text-gray-500 mb-4">
              Nova senha para {passwordWaiter.name} ({formatCpf(passwordWaiter.cpf)}).
            </p>
            <label className={panelLabelClass}>Nova senha *</label>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={panelInputClass}
              placeholder="Digite a nova senha"
              autoFocus
              autoComplete="new-password"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={savingPassword}
                onClick={() => {
                  setPasswordWaiter(null);
                  setNewPassword('');
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <PanelButton type="submit" disabled={savingPassword || newPassword.trim().length < 4}>
                {savingPassword ? 'Salvando...' : 'Salvar senha'}
              </PanelButton>
            </div>
          </form>
        </ModalOverlay>
      )}
    </PanelPage>
  );
}
