import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { addCategory } from '../services/categoryService';

interface AddCategoriesButtonProps {
    restaurantId: string;
    onCategoriesAdded?: () => void;
}

// Categorias pré-definidas mais populares
const popularCategories = [
    'Refeições',
    'Carnes',
    'Frutos do Mar',
    'Massas',
    'Saladas',
    'Sobremesas',
    'Bebidas',
    'Aperitivos',
    'Vegetariano',
    'Especiais'
];

export default function AddCategoriesButton({ restaurantId, onCategoriesAdded }: AddCategoriesButtonProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [addedCount, setAddedCount] = useState(0);

    const addPopularCategories = async () => {
        setIsAdding(true);
        setAddedCount(0);

        try {
            for (const categoryName of popularCategories) {
                try {
                    await addCategory(categoryName, restaurantId);
                    setAddedCount(prev => prev + 1);
                } catch (error) {
                    console.warn(`Categoria "${categoryName}" já existe ou erro ao adicionar:`, error);
                }
            }

            console.log(`✅ ${addedCount} categorias adicionadas com sucesso!`);

            if (onCategoriesAdded) {
                onCategoriesAdded();
            }
        } catch (error) {
            console.error('Erro ao adicionar categorias:', error);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <button
            onClick={addPopularCategories}
            disabled={isAdding}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isAdding
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md'
                }`}
        >
            {isAdding ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adicionando... ({addedCount}/{popularCategories.length})</span>
                </>
            ) : (
                <>
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Categorias Populares</span>
                </>
            )}
        </button>
    );
}