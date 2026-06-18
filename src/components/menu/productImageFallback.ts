const FALLBACK_BY_KEYWORD: Array<{ keywords: string[]; url: string }> = [
  {
    keywords: ['cafe', 'café', 'coffee', 'espresso', 'cappuccino', 'latte'],
    url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop&q=80',
  },
  {
    keywords: ['suco', 'juice', 'laranja', 'orange', 'maracuja', 'abacaxi'],
    url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=400&fit=crop&q=80',
  },
  {
    keywords: ['coca', 'refrigerante', 'cola', 'soda', 'pepsi', 'guarana'],
    url: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop&q=80',
  },
  {
    keywords: ['cerveja', 'beer', 'chopp'],
    url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop&q=80',
  },
  {
    keywords: ['agua', 'água', 'water'],
    url: 'https://images.unsplash.com/photo-1548839140-5a941f221e8a?w=400&h=400&fit=crop&q=80',
  },
  {
    keywords: ['entrada', 'salada', 'salad', 'bruschetta', 'petisco'],
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop&q=80',
  },
  {
    keywords: ['sobremesa', 'doce', 'bolo', 'cake', 'pudim', 'sorvete', 'dessert'],
    url: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=400&fit=crop&q=80',
  },
  {
    keywords: ['prato', 'carne', 'frango', 'peixe', 'massa', 'pizza', 'burger'],
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop&q=80',
  },
];

const CATEGORY_FALLBACK: Record<string, string> = {
  bebidas: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop&q=80',
  entradas: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop&q=80',
  sobremesas: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=400&fit=crop&q=80',
};

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getProductImageSrc(
  image: string | undefined | null,
  productName: string,
  category?: string
): string {
  if (image?.trim()) return image;

  const normalizedName = normalize(productName);
  for (const entry of FALLBACK_BY_KEYWORD) {
    if (entry.keywords.some((kw) => normalizedName.includes(normalize(kw)))) {
      return entry.url;
    }
  }

  if (category) {
    const categoryKey = normalize(category);
    for (const [key, url] of Object.entries(CATEGORY_FALLBACK)) {
      if (categoryKey.includes(key)) return url;
    }
  }

  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop&q=80';
}
