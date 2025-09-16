import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Settings from './pages/Settings';
import Owner from './pages/Owner';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import { OrderProvider } from './contexts/OrderContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <OrderProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="mesa/:mesaId" element={
                <PrivateRoute>
                  <Menu />
                </PrivateRoute>
              } />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="/owner" element={
              <AdminRoute>
                <Owner />
              </AdminRoute>
            } />
          </Routes>
          </BrowserRouter>
        </OrderProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
