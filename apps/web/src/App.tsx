import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProductionOrdersList from './components/ProductionOrdersList';
import ProductionOrderDetail from './components/ProductionOrderDetail';
import SalesOrdersList from './components/SalesOrdersList';
import SalesOrderDetail from './components/SalesOrderDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/production" replace />} />
        <Route path="/production" element={<ProductionOrdersList />} />
        <Route path="/production/:id" element={<ProductionOrderDetail />} />
        <Route path="/sales" element={<SalesOrdersList />} />
        <Route path="/sales/:id" element={<SalesOrderDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
