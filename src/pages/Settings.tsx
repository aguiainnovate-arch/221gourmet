import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon, Table as TableIcon, ArrowLeft, Plus, Trash2, Download, Eye, X } from 'lucide-react';
import { addTable, getTables, deleteTable, generateTableUrl } from '../services/tableService';
import qrcode from 'qrcode';
import type { Table } from '../services/tableService';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('mesas');
  const [mesas, setMesas] = useState<Table[]>([]);
  const [novaMesa, setNovaMesa] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrCodeModal, setQrCodeModal] = useState<{ show: boolean; url: string; numero: string }>({
    show: false,
    url: '',
    numero: ''
  });

  // Carregar mesas do Firestore
  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const tables = await getTables();
      setMesas(tables);
    } catch (error) {
      alert('Erro ao carregar mesas do banco de dados');
    } finally {
      setLoading(false);
    }
  };

  const adicionarMesa = async () => {
    if (!novaMesa.trim()) {
      alert('Por favor, digite um número de mesa');
      return;
    }
    
    if (mesas.find(m => m.numero === novaMesa)) {
      alert('Mesa já existe!');
      return;
    }
    
    try {
      const novaMesaObj = await addTable(novaMesa);
      setMesas(prev => [...prev, novaMesaObj]);
      setNovaMesa('');
      setShowAddModal(false);
      alert(`Mesa ${novaMesa} adicionada com sucesso!`);
    } catch (error) {
      alert('Erro ao adicionar mesa. Tente novamente.');
    }
  };

  const removerMesa = async (id: string) => {
    try {
      await deleteTable(id);
      setMesas(prev => prev.filter(m => m.id !== id));
      alert('Mesa removida com sucesso!');
    } catch (error) {
      alert('Erro ao remover mesa. Tente novamente.');
    }
  };

  const visualizarQRCode = async (numeroMesa: string) => {
    try {
      const url = generateTableUrl(numeroMesa);
      const qrDataUrl = await qrcode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeModal({
        show: true,
        url: qrDataUrl,
        numero: numeroMesa
      });
    } catch (error) {
      alert('Erro ao gerar QR Code. Verifique se a biblioteca qrcode está instalada.');
    }
  };

  const baixarQRCode = async (numeroMesa: string) => {
    try {
      const url = generateTableUrl(numeroMesa);
      const qrDataUrl = await qrcode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `mesa-${numeroMesa}-qrcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      alert('Erro ao baixar QR Code. Verifique se a biblioteca qrcode está instalada.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="w-8 h-8 text-gray-600" />
            <h1 className="text-3xl font-bold">Configurações</h1>
          </div>
          <Link 
            to="/staff" 
            className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Cozinha</span>
          </Link>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r min-h-screen">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Configurações</h2>
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('mesas')}
                className={`w-full text-left p-3 rounded flex items-center space-x-3 ${
                  activeTab === 'mesas' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <TableIcon className="w-5 h-5" />
                <span>Gerenciar Mesas</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 p-8">
          {activeTab === 'mesas' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Gerenciar Mesas</h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Mesa</span>
                </button>
              </div>

              <div className="bg-white rounded shadow">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold">Mesas Configuradas</h3>
                </div>
                {loading ? (
                  <div className="p-6 text-center text-gray-500">
                    Carregando mesas...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-4 font-medium">Mesa</th>
                          <th className="text-left p-4 font-medium">URL</th>
                          <th className="text-left p-4 font-medium">QR Code</th>
                          <th className="text-left p-4 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {mesas.map((mesa) => (
                          <tr key={mesa.id} className="hover:bg-gray-50">
                            <td className="p-4 font-medium">Mesa {mesa.numero}</td>
                            <td className="p-4 text-sm text-gray-600 font-mono">
                              {generateTableUrl(mesa.numero)}
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => visualizarQRCode(mesa.numero)}
                                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 hover:bg-blue-600"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>Visualizar</span>
                                </button>
                                <button
                                  onClick={() => baixarQRCode(mesa.numero)}
                                  className="bg-green-500 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 hover:bg-green-600"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>Baixar</span>
                                </button>
                              </div>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => removerMesa(mesa.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 hover:bg-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Remover</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Adicionar Mesa */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Adicionar Nova Mesa</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNovaMesa('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número da Mesa
                </label>
                <input
                  type="text"
                  value={novaMesa}
                  onChange={(e) => setNovaMesa(e.target.value)}
                  placeholder="Ex: 15"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && adicionarMesa()}
                  autoFocus
                />
              </div>
              <div className="flex space-x-2 justify-end">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNovaMesa('');
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarMesa}
                  disabled={!novaMesa.trim()}
                  className={`px-4 py-2 rounded ${
                    novaMesa.trim() 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal do QR Code */}
      {qrCodeModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">QR Code - Mesa {qrCodeModal.numero}</h3>
              <button
                onClick={() => setQrCodeModal({ show: false, url: '', numero: '' })}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="text-center">
              <img 
                src={qrCodeModal.url} 
                alt={`QR Code Mesa ${qrCodeModal.numero}`}
                className="mx-auto mb-4"
              />
              <p className="text-sm text-gray-600 mb-4">
                URL: {generateTableUrl(qrCodeModal.numero)}
              </p>
              <div className="flex space-x-2 justify-center">
                <button
                  onClick={() => baixarQRCode(qrCodeModal.numero)}
                  className="bg-green-500 text-white px-4 py-2 rounded flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar</span>
                </button>
                <button
                  onClick={() => setQrCodeModal({ show: false, url: '', numero: '' })}
                  className="bg-gray-500 text-white px-4 py-2 rounded"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 