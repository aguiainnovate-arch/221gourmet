import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Staff from './pages/Staff';
import PrivateRoute from './components/PrivateRoute';
import { OrderProvider } from './contexts/OrderContext';

function App() {
  return (
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
            <Route path="staff" element={<Staff />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </OrderProvider>
  );
}

export default App;
