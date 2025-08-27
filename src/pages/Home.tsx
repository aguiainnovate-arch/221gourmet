import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getTables } from '../services/tableService';
import { useSettings } from '../contexts/SettingsContext';
import type { Table } from '../services/tableService';

export default function Home() {
  const { settings } = useSettings();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTables = async () => {
      try {
        setLoading(true);
        const tablesData = await getTables();
        setTables(tablesData);
      } catch (error) {
        console.error('Erro ao carregar mesas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTables();
  }, []);

  // Atualizar título da aba do navegador
  useEffect(() => {
    if (settings?.restaurantName) {
      document.title = settings.restaurantName;
    } else {
      document.title = '221 Gourmet';
    }
  }, [settings?.restaurantName]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Banner do Restaurante */}
        {settings?.bannerUrl && (
          <div className="mb-8">
            <div className="w-full h-48 rounded-lg overflow-hidden shadow-lg">
              <img 
                src={settings.bannerUrl} 
                alt="Banner do restaurante" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
        
        <h1 className="text-4xl font-bold text-center mb-8">{settings?.restaurantName || '221 Gourmet'}</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-2xl font-bold mb-4">Teste de Mesas</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Carregando mesas...</div>
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">Nenhuma mesa cadastrada no sistema</div>
              <Link 
                to="/settings" 
                className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Cadastrar Mesas
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {tables.map((table) => (
                <Link 
                  key={table.id}
                  to={`/mesa/${table.numero}`} 
                  className="bg-blue-500 text-white p-4 rounded text-center hover:bg-blue-600 transition-colors"
                >
                  Mesa {table.numero}
                </Link>
              ))}
            </div>
          )}
          
          <button 
            onClick={() => sessionStorage.removeItem('mesa_id')}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Limpar Sessão
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <Link 
            to="/staff" 
            className="inline-flex items-center space-x-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600"
          >
            <span className="text-2xl"></span>
            <span className="font-semibold">Visão da Cozinha</span>
          </Link>
        </div>
      </div>
    </div>
  );
} 