import { useState, useEffect } from 'react';
import { getActivePlans } from '../services/planService';
import { createRegistrationToken, generateRegistrationUrl } from '../services/registrationTokenService';
import type { Plan } from '../types/plan';

interface GenerateRegistrationLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function GenerateRegistrationLinkModal({
  isOpen,
  onClose,
  onSuccess
}: GenerateRegistrationLinkModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<number>(7);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
      // Reset state
      setSelectedPlanId('');
      setExpiresIn(7);
      setNotes('');
      setGeneratedLink('');
      setError('');
      setCopied(false);
    }
  }, [isOpen]);

  const loadPlans = async () => {
    try {
      const fetchedPlans = await getActivePlans();
      setPlans(fetchedPlans);
      if (fetchedPlans.length > 0) {
        setSelectedPlanId(fetchedPlans[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
      setError('Erro ao carregar planos disponíveis');
    }
  };

  const handleGenerate = async () => {
    if (!selectedPlanId) {
      setError('Selecione um plano');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedLink(''); // Limpar link anterior se houver

    try {
      const trimmedNotes = notes.trim();
      const token = await createRegistrationToken(
        {
          planId: selectedPlanId,
          expiresIn,
          ...(trimmedNotes
            ? {
                metadata: {
                  notes: trimmedNotes
                }
              }
            : {})
        },
        localStorage.getItem('admin_auth_token') || 'admin'
      );

      const url = generateRegistrationUrl(token.token);
      
      // Atualizar estados de uma vez para evitar flicker
      // Primeiro limpar erro, depois setar o link
      setError('');
      setGeneratedLink(url);
      setLoading(false);
      
      // Chamar onSuccess após um pequeno delay para garantir que o estado foi atualizado
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 100);
    } catch (err: any) {
      console.error('Erro ao gerar link:', err);
      const errorMessage = err?.message || 'Erro desconhecido ao gerar link de registro';
      setError(errorMessage);
      setGeneratedLink(''); // Limpar link em caso de erro
      
      // Se for erro de permissão, adicionar dica
      if (err?.message?.includes('permission') || err?.message?.includes('Missing or insufficient permissions')) {
        setError('Erro de permissões do Firestore. Verifique as regras do Firestore no console Firebase.');
      }
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
      setError('Erro ao copiar link');
    }
  };

  const handleClose = () => {
    setGeneratedLink('');
    setError('');
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-black">
            Gerar Link de Cadastro
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Informação */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Como funciona:</p>
                <p>Gere um link único que pode ser enviado para o dono do restaurante. Ao acessar o link, ele poderá fazer o cadastro inicial do restaurante com o plano e permissões que você definir.</p>
              </div>
            </div>
          </div>

          {/* Success/Error Message */}
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          ) : generatedLink ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 mb-1">Link criado com sucesso!</p>
                  <p className="text-xs text-green-700">
                    O link é válido por {expiresIn} {expiresIn === 1 ? 'dia' : 'dias'} e pode ser usado apenas uma vez.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {!generatedLink ? (
            <>
              {/* Seleção de Plano */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Plano do Restaurante *
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  disabled={loading}
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - R$ {plan.price.toFixed(2)}/{plan.period === 'monthly' ? 'mês' : 'ano'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Detalhes do Plano Selecionado */}
              {selectedPlan && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-black mb-2">Detalhes do Plano</h3>
                  <div className="text-sm text-black space-y-1">
                    <p><strong>Descrição:</strong> {selectedPlan.description}</p>
                    <p><strong>Máximo de Mesas:</strong> {selectedPlan.maxTables}</p>
                    <p><strong>Máximo de Produtos:</strong> {selectedPlan.maxProducts}</p>
                    <p><strong>Suporte:</strong> {selectedPlan.supportLevel}</p>
                    {selectedPlan.features && selectedPlan.features.length > 0 && (
                      <div>
                        <strong>Recursos:</strong>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          {selectedPlan.features.map((feature, idx) => (
                            <li key={idx}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Validade do Link */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Validade do Link (dias)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  O link expirará em {expiresIn} {expiresIn === 1 ? 'dia' : 'dias'}
                </p>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Link para o Restaurante XYZ - contato João"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  disabled={loading}
                />
                <p className="text-xs text-black mt-1">
                  Essas notas são apenas para seu controle interno
                </p>
              </div>
            </>
          ) : (
            /* Card com Link Gerado */
            <div className="space-y-4">
              {/* Card do Link */}
              <div className="bg-white border-2 border-blue-200 rounded-lg p-5 shadow-sm">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-black mb-2">
                    Link de Cadastro
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedLink}
                      readOnly
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono text-black"
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`px-6 py-3 rounded-lg font-medium transition flex items-center ${
                        copied
                          ? 'bg-green-600 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {copied ? (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copiado!
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copiar Link
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {selectedPlan && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Plano associado:</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedPlan.name} - R$ {selectedPlan.price.toFixed(2)}/{selectedPlan.period === 'monthly' ? 'mês' : 'ano'}
                    </p>
                  </div>
                )}
              </div>

              {notes && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2 text-sm">Notas</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3 sticky bottom-0 bg-white">
          {!generatedLink ? (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !selectedPlanId}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Gerando...
                  </>
                ) : (
                  'Gerar Link'
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

