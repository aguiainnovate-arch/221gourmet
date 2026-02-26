import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Settings from './pages/Settings';
import Owner from './pages/Owner';
import Register from './pages/Register';
import Delivery from './pages/Delivery';
import DeliveryAuth from './pages/DeliveryAuth';
import DeliveryMenu from './pages/DeliveryMenu';
import Orders from './pages/Orders';
import RestaurantAuth from './pages/RestaurantAuth';
import MotoboyDashboard from './pages/MotoboyDashboard';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import MotoboyRoute from './components/MotoboyRoute';
import { OrderProvider } from './contexts/OrderContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';
import { TestModeProvider } from './contexts/TestModeContext';
import { DeliveryAuthProvider } from './contexts/DeliveryAuthContext';
import { RestaurantAuthProvider } from './contexts/RestaurantAuthContext';

// Variável de ambiente para habilitar/desabilitar rota de testing
// Para desabilitar em produção, defina VITE_ENABLE_TESTING_ROUTE=false no .env
const ENABLE_TESTING_ROUTE = import.meta.env.VITE_ENABLE_TESTING_ROUTE !== 'false';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <TestModeProvider>
          <SettingsProvider>
            <OrderProvider>
              <Routes>
                {/* Rota padrão redireciona para /delivery */}
                <Route path="/" element={<Navigate to="/delivery" replace />} />
                
                {/* Rotas específicas primeiro (antes da rota genérica /:restaurantId) */}
                
                {/* Rota administrativa */}
                <Route path="/owner" element={
                  <AdminRoute>
                    <Owner />
                  </AdminRoute>
                } />

                {/* Rota de cadastro de restaurante (pública) */}
                <Route path="/register/:token" element={<Register />} />

                {/* Rota de login (restaurante e motoboy) */}
                <Route path="/restaurant/auth" element={
                  <RestaurantAuthProvider>
                    <RestaurantAuth />
                  </RestaurantAuthProvider>
                } />

                {/* Painel do motoboy */}
                <Route path="/motoboy" element={
                  <RestaurantAuthProvider>
                    <MotoboyRoute>
                      <MotoboyDashboard />
                    </MotoboyRoute>
                  </RestaurantAuthProvider>
                } />

                {/* Rotas de delivery */}
                <Route path="/delivery" element={
                  <DeliveryAuthProvider>
                    <Delivery />
                  </DeliveryAuthProvider>
                } />
                <Route path="/delivery/auth" element={
                  <DeliveryAuthProvider>
                    <RestaurantAuthProvider>
                      <DeliveryAuth />
                    </RestaurantAuthProvider>
                  </DeliveryAuthProvider>
                } />
                <Route path="/delivery/:restaurantId" element={
                  <DeliveryAuthProvider>
                    <DeliveryMenu />
                  </DeliveryAuthProvider>
                } />
                <Route path="/delivery/:restaurantId/settings" element={<DeliverySettingsRedirect />} />
                <Route path="/delivery/orders" element={
                  <DeliveryAuthProvider>
                    <Orders />
                  </DeliveryAuthProvider>
                } />

                {/* QR code da mesa: /:restaurantId/mesa/1 abre o cardápio do restaurante */}
                <Route
                  path="/:restaurantId/mesa/:mesaId"
                  element={
                    <PrivateRoute>
                      <Menu />
                    </PrivateRoute>
                  }
                />
                {/* Antigo /mesa/1 sem restaurante: redireciona para delivery */}
                <Route path="/mesa/:mesaId" element={<Navigate to="/delivery" replace />} />

                {/* Rota de testing (pode ser desabilitada em produção) */}
                {ENABLE_TESTING_ROUTE && (
                  <Route path="/testing" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="mesa/:mesaId" element={
                      <PrivateRoute>
                        <Menu />
                      </PrivateRoute>
                    } />
                    <Route path="settings" element={
                      <RestaurantAuthProvider>
                        <Settings />
                      </RestaurantAuthProvider>
                    } />
                  </Route>
                )}
                
                {/* Rotas de teste para restaurantes (mantido para compatibilidade) */}
                <Route path="/test/:restaurantSlug" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="mesa/:mesaId" element={
                    <PrivateRoute>
                      <Menu />
                    </PrivateRoute>
                  } />
                  <Route path="settings" element={
                    <RestaurantAuthProvider>
                      <Settings />
                    </RestaurantAuthProvider>
                  } />
                </Route>
                
                {/* Rotas de restaurante por ID */}
                <Route
                  path="/:restaurantId/settings"
                  element={
                    <RestaurantAuthProvider>
                      <Settings />
                    </RestaurantAuthProvider>
                  }
                />
                <Route path="/:restaurantId" element={<RestaurantRedirect />} />
              </Routes>
            </OrderProvider>
          </SettingsProvider>
        </TestModeProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

function RestaurantRedirect() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  if (!restaurantId) {
    return <Navigate to="/delivery" replace />;
  }
  return <Navigate to={`/delivery/${restaurantId}`} replace />;
}

function DeliverySettingsRedirect() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  if (!restaurantId) {
    return <Navigate to="/delivery" replace />;
  }
  return <Navigate to={`/${restaurantId}/settings`} replace />;
}

export default App;
