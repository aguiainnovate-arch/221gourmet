import { addCategory } from '../services/categoryService';

// Categorias populares para restaurantes com traduções
const categories = [
    {
        name: 'Refeições',
        translations: {
            name: {
                'en-US': 'Meals',
                'es-ES': 'Comidas',
                'fr-FR': 'Repas'
            }
        }
    },
    {
        name: 'Pratos Principais',
        translations: {
            name: {
                'en-US': 'Main Dishes',
                'es-ES': 'Platos Principales',
                'fr-FR': 'Plats Principaux'
            }
        }
    },
    {
        name: 'Carnes',
        translations: {
            name: {
                'en-US': 'Meat',
                'es-ES': 'Carnes',
                'fr-FR': 'Viandes'
            }
        }
    },
    {
        name: 'Frutos do Mar',
        translations: {
            name: {
                'en-US': 'Seafood',
                'es-ES': 'Mariscos',
                'fr-FR': 'Fruits de Mer'
            }
        }
    },
    {
        name: 'Massas',
        translations: {
            name: {
                'en-US': 'Pasta',
                'es-ES': 'Pastas',
                'fr-FR': 'Pâtes'
            }
        }
    },
    {
        name: 'Saladas',
        translations: {
            name: {
                'en-US': 'Salads',
                'es-ES': 'Ensaladas',
                'fr-FR': 'Salades'
            }
        }
    },
    {
        name: 'Sobremesas',
        translations: {
            name: {
                'en-US': 'Desserts',
                'es-ES': 'Postres',
                'fr-FR': 'Desserts'
            }
        }
    },
    {
        name: 'Bebidas',
        translations: {
            name: {
                'en-US': 'Beverages',
                'es-ES': 'Bebidas',
                'fr-FR': 'Boissons'
            }
        }
    },
    {
        name: 'Aperitivos',
        translations: {
            name: {
                'en-US': 'Appetizers',
                'es-ES': 'Aperitivos',
                'fr-FR': 'Apéritifs'
            }
        }
    },
    {
        name: 'Vegetariano',
        translations: {
            name: {
                'en-US': 'Vegetarian',
                'es-ES': 'Vegetariano',
                'fr-FR': 'Végétarien'
            }
        }
    },
    {
        name: 'Vegano',
        translations: {
            name: {
                'en-US': 'Vegan',
                'es-ES': 'Vegano',
                'fr-FR': 'Végan'
            }
        }
    },
    {
        name: 'Especiais',
        translations: {
            name: {
                'en-US': 'Specials',
                'es-ES': 'Especiales',
                'fr-FR': 'Spéciaux'
            }
        }
    },
    {
        name: 'Lanches',
        translations: {
            name: {
                'en-US': 'Snacks',
                'es-ES': 'Snacks',
                'fr-FR': 'Collations'
            }
        }
    },
    {
        name: 'Sopas',
        translations: {
            name: {
                'en-US': 'Soups',
                'es-ES': 'Sopas',
                'fr-FR': 'Soupes'
            }
        }
    },
    {
        name: 'Pizzas',
        translations: {
            name: {
                'en-US': 'Pizzas',
                'es-ES': 'Pizzas',
                'fr-FR': 'Pizzas'
            }
        }
    },
    {
        name: 'Hambúrgueres',
        translations: {
            name: {
                'en-US': 'Burgers',
                'es-ES': 'Hamburguesas',
                'fr-FR': 'Burgers'
            }
        }
    },
    {
        name: 'Sanduíches',
        translations: {
            name: {
                'en-US': 'Sandwiches',
                'es-ES': 'Sándwiches',
                'fr-FR': 'Sandwichs'
            }
        }
    },
    {
        name: 'Açaí',
        translations: {
            name: {
                'en-US': 'Açaí',
                'es-ES': 'Açaí',
                'fr-FR': 'Açaí'
            }
        }
    },
    {
        name: 'Café da Manhã',
        translations: {
            name: {
                'en-US': 'Breakfast',
                'es-ES': 'Desayuno',
                'fr-FR': 'Petit Déjeuner'
            }
        }
    },
    {
        name: 'Almoço',
        translations: {
            name: {
                'en-US': 'Lunch',
                'es-ES': 'Almuerzo',
                'fr-FR': 'Déjeuner'
            }
        }
    }
];

// Função para adicionar todas as categorias
export const addAllCategories = async (restaurantId?: string) => {
    console.log('🚀 Iniciando adição de categorias...');

    try {
        const results = [];

        for (const category of categories) {
            try {
                const newCategory = await addCategory(
                    category.name,
                    restaurantId,
                    category.translations
                );
                results.push(newCategory);
                console.log(`✅ Categoria "${category.name}" adicionada com sucesso!`);
            } catch (error) {
                console.error(`❌ Erro ao adicionar categoria "${category.name}":`, error);
            }
        }

        console.log(`🎉 Processo concluído! ${results.length} categorias adicionadas.`);
        return results;
    } catch (error) {
        console.error('❌ Erro geral ao adicionar categorias:', error);
        throw error;
    }
};

// Função para executar no console do navegador
export const runAddCategories = () => {
    console.log('📋 Categorias disponíveis:');
    categories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name}`);
    });

    console.log('\n🔧 Para adicionar todas as categorias, execute:');
    console.log('addAllCategories()');

    console.log('\n🔧 Para adicionar categorias para um restaurante específico:');
    console.log('addAllCategories("ID_DO_RESTAURANTE")');
};

// Executar automaticamente se chamado diretamente
if (typeof window !== 'undefined') {
    (window as any).addAllCategories = addAllCategories;
    (window as any).runAddCategories = runAddCategories;

    console.log('🎯 Script de categorias carregado!');
    console.log('Digite "runAddCategories()" para ver as opções disponíveis.');
}
