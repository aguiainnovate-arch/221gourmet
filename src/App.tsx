import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Settings from './pages/Settings';
import Owner from './pages/Owner';
import Delivery from './pages/Delivery';
import DeliveryMenu from './pages/DeliveryMenu';
import Orders from './pages/Orders';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import TestModeBanner from './components/TestModeBanner';
import { OrderProvider } from './contexts/OrderContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';
import { TestModeProvider } from './contexts/TestModeContext';

function App() {
  return (
    <AuthProvider>
      <TestModeProvider>
        <SettingsProvider>
          <OrderProvider>
            <BrowserRouter>
              <TestModeBanner />
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
                {/* Rotas de teste para restaurantes */}
                <Route path="/test/:restaurantSlug" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="mesa/:mesaId" element={
                    <PrivateRoute>
                      <Menu />
                    </PrivateRoute>
                  } />
                  <Route path="settings" element={<Settings />} />
                </Route>

                {/* Rota administrativa */}
                <Route path="/owner" element={
                  <AdminRoute>
                    <Owner />
                  </AdminRoute>
                } />

                {/* Rotas de delivery */}
                <Route path="/delivery" element={<Delivery />} />
                <Route path="/delivery/:restaurantId" element={<DeliveryMenu />} />
                <Route path="/orders" element={<Orders />} />
              </Routes>
            </BrowserRouter>
          </OrderProvider>
        </SettingsProvider>
      </TestModeProvider>
    </AuthProvider>
  );
}

export default App;
