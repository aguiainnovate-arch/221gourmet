import { useEffect, useState } from 'react';
import {
  getAllDeliveryUsers,
  saveDeliveryUser
} from '../../services/deliveryUserService';
import type { DeliveryUser } from '../../types/deliveryUser';

interface MotoboyForm {
  name: string;
  email: string;
  phone: string;
  vehicleInfo: string;
}

const EMPTY_FORM: MotoboyForm = { name: '', email: '', phone: '', vehicleInfo: '' };

function MotoboyRow({ user }: { user: DeliveryUser & { vehicleInfo?: string } }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-green-700 font-bold text-sm">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <span className="font-medium text-gray-900">{user.name}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-gray-600 text-sm">{user.email}</td>
      <td className="py-3 px-4 text-gray-600 text-sm">{user.phone}</td>
      <td className="py-3 px-4 text-gray-500 text-sm">{user.vehicleInfo || '—'}</td>
      <td className="py-3 px-4 text-gray-400 text-xs">
        {user.createdAt.toLocaleDateString('pt-BR')}
      </td>
    </tr>
  );
}

export default function Motoboys() {
  const [users, setUsers] = useState<DeliveryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MotoboyForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      setUsers(await getAllDeliveryUsers());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Nome, e-mail e telefone são obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      await saveDeliveryUser({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: '',
        defaultPaymentMethod: 'money'
      });
      setSuccess(`Motoboy ${form.name} cadastrado com sucesso.`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      void load();
    } catch {
      setError('Erro ao cadastrar motoboy. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search)
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Motoboys</h2>
          <p className="text-sm text-gray-500 mt-1">Cadastro e listagem de entregadores da plataforma.</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(null); setSuccess(null); }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Motoboy
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6"
        >
          <h3 className="font-semibold text-gray-800 mb-4">Cadastrar novo motoboy</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="João da Silva"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="joao@email.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone <span className="text-red-500">*</span>
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="(11) 99999-9999"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Veículo (opcional)</label>
              <input
                name="vehicleInfo"
                value={form.vehicleInfo}
                onChange={handleChange}
                placeholder="Moto Honda CG, placa ABC-1234"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
            >
              {saving ? 'Salvando…' : 'Cadastrar'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null); }}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Feedback de sucesso */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          {success}
        </div>
      )}

      {/* Busca */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="font-medium">
              {search ? 'Nenhum resultado encontrado' : 'Nenhum motoboy cadastrado ainda'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">E-mail</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefone</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Veículo</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <MotoboyRow key={u.id} user={u} />
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 px-4 py-3">
              {filtered.length} motoboy{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
