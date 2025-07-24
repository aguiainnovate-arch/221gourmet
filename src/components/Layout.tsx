import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <nav className="bg-white border-b p-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">
            221Gourmet
          </Link>
          <div className="flex space-x-4">
            <Link to="/" className="text-gray-600">
              Home
            </Link>
            <Link to="/about" className="text-gray-600">
              Sobre
            </Link>
          </div>
        </div>
      </nav>
      
      <main className="flex-grow">
        <Outlet />
      </main>
      
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>© 2024 221Gourmet</p>
      </footer>
    </div>
  );
} 