import { DIGITAL_MENU_OFFER } from '../../types/digitalMenuOffer';

export const CARDAPIO_DIGITAL_PATH = '/delivery/cardapio-digital';

export const offer = {
  priceLabel: DIGITAL_MENU_OFFER.priceLabel,
  payment: 'Pagamento único, via Stripe',
  included: [...DIGITAL_MENU_OFFER.bullets],
  guarantee: '[Garantia a definir]',
} as const;

export type MenuScene = 'home' | 'categories' | 'product' | 'brand' | 'flow';

export const storySteps: { scene: MenuScene; index: string; title: string; text: string }[] = [
  {
    scene: 'home',
    index: '01',
    title: 'A casa abre na primeira tela',
    text: 'Banner, categorias e pratos aparecem juntos. O cliente entende o cardápio antes de rolar.',
  },
  {
    scene: 'categories',
    index: '02',
    title: 'Tudo no lugar certo',
    text: 'Entradas, pratos, bebidas e sobremesas separados. Menos busca, mais pedido.',
  },
  {
    scene: 'product',
    index: '03',
    title: 'O prato vende sozinho',
    text: 'Foto grande, descrição curta e preço claro. O desejo acontece na tela.',
  },
  {
    scene: 'brand',
    index: '04',
    title: 'A marca entra no cardápio',
    text: 'Cor, nome e tom do estabelecimento. A interface deixa de ser genérica.',
  },
  {
    scene: 'flow',
    index: '05',
    title: 'Leve no celular',
    text: 'Navegação direta no navegador. Sem baixar aplicativo, sem espera.',
  },
];

export const venues = [
  {
    id: 'burger',
    name: 'Hamburgueria',
    dish: 'Smash duplo',
    price: 'R$ 42',
    image: '/cardapio-digital/burger.jpg',
    accent: '#E07A3D',
  },
  {
    id: 'pizza',
    name: 'Pizzaria',
    dish: 'Margherita',
    price: 'R$ 68',
    image: '/cardapio-digital/pizza.jpg',
    accent: '#C4483A',
  },
  {
    id: 'coffee',
    name: 'Cafeteria',
    dish: 'Latte da casa',
    price: 'R$ 16',
    image: '/cardapio-digital/coffee.jpg',
    accent: '#C4A574',
  },
  {
    id: 'restaurant',
    name: 'Restaurante',
    dish: 'Peixe do dia',
    price: 'R$ 89',
    image: '/cardapio-digital/plate.jpg',
    accent: '#D7C4A3',
  },
  {
    id: 'sushi',
    name: 'Sushi',
    dish: 'Combinado',
    price: 'R$ 96',
    image: '/cardapio-digital/sushi.jpg',
    accent: '#E8E4DC',
  },
  {
    id: 'acai',
    name: 'Açaí',
    dish: 'Tigela 500 ml',
    price: 'R$ 28',
    image: '/cardapio-digital/acai.jpg',
    accent: '#7B4B8A',
  },
  {
    id: 'bar',
    name: 'Bar',
    dish: 'Drink da casa',
    price: 'R$ 32',
    image: '/cardapio-digital/bar.jpg',
    accent: '#E0A15A',
  },
] as const;

export const benefits = [
  { index: '01', title: 'Experiência profissional', text: 'Produtos numa interface moderna e agradável.' },
  { index: '02', title: 'Acesso instantâneo', text: 'O cliente entra por um QR Code.' },
  { index: '03', title: '100% responsivo', text: 'Celular, tablet e computador.' },
  { index: '04', title: 'Visual personalizado', text: 'Alinhado à identidade da sua marca.' },
  { index: '05', title: 'Atualização simples', text: 'Preços e produtos sempre em dia.' },
  { index: '06', title: 'Sem aplicativo', text: 'Abre direto no navegador.' },
] as const;

export const journey = [
  { index: '01', title: 'Escaneia', text: 'A câmera lê o QR da mesa.' },
  { index: '02', title: 'Navega', text: 'Categorias e fotos abrem na hora.' },
  { index: '03', title: 'Escolhe', text: 'O prato aparece grande, com preço.' },
  { index: '04', title: 'Compra', text: 'O pedido segue sem cardápio de papel.' },
] as const;

export const testimonials = [
  {
    id: 't1',
    place: 'Marina Alves · Casa Lume',
    quote: 'O cliente para de pedir o cardápio de papel. A foto já faz o pedido.',
  },
  {
    id: 't2',
    place: 'Rafael Moura · Forno Alto',
    quote: 'Mudo o preço no almoço e a mesa já vê. Sem reimprimir nada.',
  },
  {
    id: 't3',
    place: 'Lívia Costa · Bar do Largo',
    quote: 'O QR na mesa virou o nosso garçom silencioso.',
  },
] as const;

export const resultsNote = 'Depoimentos ilustrativos de hamburgueria, pizzaria e bar.';
