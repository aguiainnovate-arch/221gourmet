import { addCategory } from '../services/categoryService';

// Categorias populares para restaurantes com traduções
const categories = [
    {
        name: 'Refeições',
        translations: {
            name: {
                'en-US': 'Meals',
                'fr-FR': 'Repas'
            }
        }
    },
    {
        name: 'Pratos Principais',
        translations: {
            name: {
                'en-US': 'Main Dishes',
                'fr-FR': 'Plats Principaux'
            }
        }
    },
    {
        name: 'Carnes',
        translations: {
            name: {
                'en-US': 'Meat',
                'fr-FR': 'Viandes'
            }
        }
    },
    {
        name: 'Frutos do Mar',
        translations: {
            name: {
                'en-US': 'Seafood',
                'fr-FR': 'Fruits de Mer'
            }
        }
    },
    {
        name: 'Massas',
        translations: {
            name: {
                'en-US': 'Pasta',
                'fr-FR': 'Pâtes'
            }
        }
    },
    {
        name: 'Saladas',
        translations: {
            name: {
                'en-US': 'Salads',
                'fr-FR': 'Salades'
            }
        }
    },
    {
        name: 'Sobremesas',
        translations: {
            name: {
                'en-US': 'Desserts',
                'fr-FR': 'Desserts'
            }
        }
    },
    {
        name: 'Bebidas',
        translations: {
            name: {
                'en-US': 'Beverages',
                'fr-FR': 'Boissons'
            }
        }
    },
    {
        name: 'Aperitivos',
        translations: {
            name: {
                'en-US': 'Appetizers',
                'fr-FR': 'Apéritifs'
            }
        }
    },
    {
        name: 'Vegetariano',
        translations: {
            name: {
                'en-US': 'Vegetarian',
                'fr-FR': 'Végétarien'
            }
        }
    },
    {
        name: 'Vegano',
        translations: {
            name: {
                'en-US': 'Vegan',
                'fr-FR': 'Végan'
            }
        }
    },
    {
        name: 'Especiais',
        translations: {
            name: {
                'en-US': 'Specials',
                'fr-FR': 'Spéciaux'
            }
        }
    },
    {
        name: 'Lanches',
        translations: {
            name: {
                'en-US': 'Snacks',
                'fr-FR': 'Collations'
            }
        }
    },
    {
        name: 'Sopas',
        translations: {
            name: {
                'en-US': 'Soups',
                'fr-FR': 'Soupes'
            }
        }
    },
    {
        name: 'Pizzas',
        translations: {
            name: {
                'en-US': 'Pizzas',
                'fr-FR': 'Pizzas'
            }
        }
    },
    {
        name: 'Hambúrgueres',
        translations: {
            name: {
                'en-US': 'Burgers',
                'fr-FR': 'Burgers'
            }
        }
    },
    {
        name: 'Sanduíches',
        translations: {
            name: {
                'en-US': 'Sandwiches',
                'fr-FR': 'Sandwichs'
            }
        }
    },
    {
        name: 'Açaí',
        translations: {
            name: {
                'en-US': 'Açaí',
                'fr-FR': 'Açaí'
            }
        }
    },
    {
        name: 'Café da Manhã',
        translations: {
            name: {
                'en-US': 'Breakfast',
                'fr-FR': 'Petit Déjeuner'
            }
        }
    },
    {
        name: 'Almoço',
        translations: {
            name: {
                'en-US': 'Lunch',
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
