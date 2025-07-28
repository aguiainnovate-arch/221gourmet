import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">221 Gourmet</h1>
          <div className="space-x-4">
            <a href="/" className="text-gray-600 hover:text-gray-900">Home</a>
            <a href="/staff" className="text-gray-600 hover:text-gray-900">Cozinha</a>
          </div>
        </div>
      </nav>
      
      <main>
        <Outlet />
      </main>
      
      <footer className="bg-white shadow p-4 mt-8">
        <div className="max-w-4xl mx-auto text-center text-gray-600">
          <p>© 2024 221 Gourmet. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
} 