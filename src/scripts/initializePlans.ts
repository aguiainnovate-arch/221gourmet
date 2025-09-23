// Script para inicializar planos básicos no Firestore
// Execute este script apenas uma vez para criar os planos iniciais

import { addPlan } from '../services/planService';

const initialPlans = [
  {
    name: 'Básico',
    description: 'Plano ideal para restaurantes pequenos',
    price: 49.90,
    period: 'monthly' as const,
    features: [
      'Até 10 mesas',
      'Cardápio digital',
      'Suporte básico',
      'Analytics básico',
      '1 idioma'
    ],
    maxTables: 10,
    maxProducts: 50,
    supportLevel: 'basic' as const,
    active: true
  },
  {
    name: 'Premium',
    description: 'Plano para restaurantes em crescimento',
    price: 99.90,
    period: 'monthly' as const,
    features: [
      'Até 25 mesas',
      'Cardápio digital',
      'Suporte prioritário',
      'Analytics avançado',
      'Múltiplos idiomas',
      'Integração delivery',
      'Temas personalizados'
    ],
    maxTables: 25,
    maxProducts: 200,
    supportLevel: 'priority' as const,
    active: true
  },
  {
    name: 'Enterprise',
    description: 'Solução completa para grandes redes',
    price: 199.90,
    period: 'monthly' as const,
    features: [
      'Mesas ilimitadas',
      'Cardápio digital',
      'Suporte premium 24/7',
      'Analytics completo',
      'White label',
      'API personalizada',
      'Domínio próprio',
      'Treinamento dedicado'
    ],
    maxTables: 999,
    maxProducts: 9999,
    supportLevel: 'premium' as const,
    active: true
  }
];

export async function initializePlans() {
  console.log('Iniciando criação dos planos...');
  
  for (const planData of initialPlans) {
    try {
      const plan = await addPlan(planData);
      console.log(`Plano "${plan.name}" criado com sucesso! ID: ${plan.id}`);
    } catch (error) {
      console.error(`Erro ao criar plano "${planData.name}":`, error);
    }
  }
  
  console.log('Criação de planos concluída!');
}

// Para executar este script diretamente (descomente as linhas abaixo):
// initializePlans().catch(console.error);
