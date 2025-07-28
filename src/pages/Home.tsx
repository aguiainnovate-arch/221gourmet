import { Link } from 'react-router-dom';

export default function Home() {
  const limparSessao = () => {
    sessionStorage.removeItem('mesa_id');
    alert('Sessão limpa!');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">221Gourmet</h1>
        <Link 
          to="/staff" 
          className="bg-orange-500 text-white px-4 py-2 rounded font-semibold"
        >
          🍳 Visão da Cozinha
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Teste de Mesas</h2>
          <button
            onClick={limparSessao}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Limpar Sessão
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/mesa/1" className="bg-blue-500 text-white p-3 rounded text-center">
            Mesa 1
          </Link>
          <Link to="/mesa/5" className="bg-blue-500 text-white p-3 rounded text-center">
            Mesa 5
          </Link>
          <Link to="/mesa/10" className="bg-blue-500 text-white p-3 rounded text-center">
            Mesa 10
          </Link>
          <Link to="/mesa/293" className="bg-blue-500 text-white p-3 rounded text-center">
            Mesa 293
          </Link>
        </div>
      </div>

      <div className="bg-white p-6 rounded">
        <h2 className="text-xl font-semibold mb-4">Como Funciona</h2>
        <p className="text-gray-600 mb-4">
          Cada mesa tem seu próprio QR code que direciona para uma URL específica.
        </p>
        <ul className="text-sm text-gray-600">
          <li>QR Code da Mesa 1 → /mesa/1</li>
          <li>QR Code da Mesa 5 → /mesa/5</li>
          <li>QR Code da Mesa 10 → /mesa/10</li>
        </ul>
      </div>
    </div>
  );
} 