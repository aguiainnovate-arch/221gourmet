import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Settings from './pages/Settings';
import PrivateRoute from './components/PrivateRoute';
import { OrderProvider } from './contexts/OrderContext';
import { SettingsProvider } from './contexts/SettingsContext';

function App() {
  return (
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
        </Routes>
        </BrowserRouter>
      </OrderProvider>
    </SettingsProvider>
  );
}

export default App;
