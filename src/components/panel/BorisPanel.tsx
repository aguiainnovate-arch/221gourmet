import { useState } from 'react';
import { ChevronRight, Lightbulb, X } from 'lucide-react';
import type { PanelChecklistStep } from './panelChecklist';

const TIPS: Record<string, { highlight: string; lead: string; body: string; hint: string }> = {
  visao: {
    lead: 'Você está na',
    highlight: 'Visão geral',
    body: 'Daqui você vê o que falta para a loja receber pedidos. Comece pelo passo em aberto.',
    hint: 'Uma loja com logo, cardápio e horário aparece com mais clareza para quem pede.',
  },
  cozinha: {
    lead: 'Você está em',
    highlight: 'Pedidos',
    body: 'Os pedidos do salão e do delivery caem aqui. O número vermelho no menu é o que ainda pede ação.',
    hint: 'Confirme o pedido assim que ele chegar para o cliente não ficar esperando.',
  },
  cardapio: {
    lead: 'Você está no',
    highlight: 'Cardápio',
    body: 'Cadastre o primeiro produto com foto, preço e categoria. É o que o cliente vê na loja.',
    hint: 'Foto nítida e nome claro aumentam a chance do pedido.',
  },
  personalizacao: {
    lead: 'Você está em',
    highlight: 'Personalização',
    body: 'Aqui você define a identidade do seu restaurante. Você pode adicionar logo, ajustar as informações e construir uma presença de marca forte para seus clientes.',
    hint: 'Uma boa descrição para o seu restaurante ajuda os clientes a conhecerem melhor seus diferenciais e aumenta suas chances de receber mais pedidos.',
  },
  delivery: {
    lead: 'Você está em',
    highlight: 'Delivery',
    body: 'Escolha se a entrega é da casa e até onde ela vai. Sem isso o pedido não sai do app.',
    hint: 'Revise a taxa antes de publicar. O cliente vê esse valor no checkout.',
  },
  cashback: {
    lead: 'Você está em',
    highlight: 'Cashback',
    body: 'Aqui você define se a loja dá cashback, o %, dias especiais, produtos e combos. Pode deixar desligado.',
    hint: 'O saldo do cliente só vale nesta loja. Ele não usa em outro restaurante.',
  },
  horarios: {
    lead: 'Você está em',
    highlight: 'Horários',
    body: 'Marque os dias e os turnos em que a loja atende. Fora disso o cardápio mostra fechado.',
    hint: 'Dois períodos no mesmo dia cabem aqui, como almoço e jantar.',
  },
  whatsapp: {
    lead: 'Você está em',
    highlight: 'WhatsApp',
    body: 'Este é o número que entrou no cadastro. Ele fica na loja para o cliente falar com você.',
    hint: 'Use o WhatsApp com DDD, o mesmo que você atende no dia a dia.',
  },
  mesas: {
    lead: 'Você está em',
    highlight: 'Mesas',
    body: 'Acompanhe o salão, abra mesa e veja quem chamou o garçom.',
    hint: 'O sino do topo avisa quando uma mesa chama.',
  },
  relatorios: {
    lead: 'Você está em',
    highlight: 'Relatórios',
    body: 'Pedidos, receita e os produtos que mais saem ficam neste painel.',
    hint: 'O período da semana já mostra se a casa está girando.',
  },
  garcons: {
    lead: 'Você está em',
    highlight: 'Garçons',
    body: 'Cadastre quem atende o salão. Cada um entra com o próprio acesso.',
    hint: 'O garçom vê mesas e cozinha, sem mexer no cadastro da loja.',
  },
};

interface BorisPanelProps {
  tab: string;
  steps: PanelChecklistStep[];
  onOpenStep: (tab: string) => void;
  onClose?: () => void;
}

export default function BorisPanel({ tab, steps, onOpenStep, onClose }: BorisPanelProps) {
  const [tipOpen, setTipOpen] = useState(true);
  const [hintOpen, setHintOpen] = useState(true);
  const [help, setHelp] = useState(false);
  const tip = TIPS[tab] ?? TIPS.visao;
  const done = steps.filter((step) => step.done).length;

  return (
    <aside className="w-[320px] shrink-0 overflow-y-auto px-3 py-3 space-y-3 bg-[#f7f3ee]">
      <div className="rounded-[22px] bg-white border border-[#efe6dc] shadow-[0_8px_24px_rgba(80,30,20,0.06)] p-4">
        <div className="flex items-start gap-3">
          <img
            src="/boris-painel.png"
            alt="Boris"
            className="w-[72px] h-[72px] rounded-2xl object-cover bg-[#fff8f3] shrink-0"
          />
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-black text-gray-900 leading-none">Boris</p>
              {onClose && (
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Fechar Boris">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
              Seu assistente
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            </p>
          </div>
        </div>

        {tipOpen && (
          <div className="mt-4 rounded-2xl bg-[#fff1f2] border border-[#ffd6d8] p-3.5">
            <p className="text-sm font-bold text-gray-900 flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-[#ffe08a] grid place-items-center shrink-0">
                <Lightbulb className="w-3.5 h-3.5 text-amber-700" />
              </span>
              <span>
                {tip.lead} <span className="text-[#e10600]">{tip.highlight}</span>!
              </span>
            </p>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{tip.body}</p>
            {help && (
              <p className="text-sm text-gray-700 mt-2">
                Siga o checklist. O próximo passo em aberto abre a tela certa.
              </p>
            )}
            <button
              type="button"
              onClick={() => setTipOpen(false)}
              className="mt-3 w-full rounded-xl bg-[#e10600] text-white font-semibold py-2.5 text-sm hover:bg-[#c70500]"
            >
              Entendi, vou ajustar
            </button>
            <button
              type="button"
              onClick={() => setHelp(true)}
              className="mt-2 w-full rounded-xl bg-[#f6efea] text-gray-800 font-semibold py-2.5 text-sm hover:bg-[#efe6dc]"
            >
              Preciso de ajuda
            </button>
          </div>
        )}
      </div>

      <div className="rounded-[22px] bg-white border border-[#efe6dc] shadow-[0_8px_24px_rgba(80,30,20,0.06)] p-4">
        <p className="text-sm font-bold text-gray-900">Sua configuração no Bora Comer GO</p>
        <p className="text-xs text-gray-500 mt-1">
          {done} de {steps.length} concluídos
        </p>
        <div className="mt-2 h-2 rounded-full bg-[#f3e7e4] overflow-hidden">
          <div
            className="h-full bg-[#22a35a]"
            style={{ width: `${steps.length ? (done / steps.length) * 100 : 0}%` }}
          />
        </div>
        <ul className="mt-3 space-y-1">
          {steps.map((step) => {
            const current = step.tab === tab;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => onOpenStep(step.tab)}
                  className={`w-full flex items-center gap-2 rounded-xl px-2 py-2 text-left text-sm ${
                    current ? 'bg-[#fff1f2] text-[#e10600] font-semibold' : 'text-gray-700 hover:bg-[#faf7f4]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] shrink-0 ${
                      step.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
                    }`}
                    aria-hidden
                  >
                    {step.done ? '✓' : ''}
                  </span>
                  <span className="flex-1">{step.label}</span>
                  {current && <ChevronRight className="w-4 h-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {hintOpen && (
        <div className="rounded-[22px] bg-white border border-[#efe6dc] shadow-[0_8px_24px_rgba(80,30,20,0.06)] p-4 relative">
          <button
            type="button"
            onClick={() => setHintOpen(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
            aria-label="Fechar dica"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-sm font-bold text-gray-900 flex items-center gap-2 pr-6">
            <span className="w-7 h-7 rounded-full bg-[#ffe08a] grid place-items-center">
              <Lightbulb className="w-3.5 h-3.5 text-amber-700" />
            </span>
            Dica do Boris
          </p>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{tip.hint}</p>
        </div>
      )}
    </aside>
  );
}
