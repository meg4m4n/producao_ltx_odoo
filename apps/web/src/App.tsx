import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProductionOrdersList from './components/ProductionOrdersList';
import ProductionOrderDetail from './components/ProductionOrderDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/production" replace />} />
        <Route path="/production" element={<ProductionOrdersList />} />
        <Route path="/production/:id" element={<ProductionOrderDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
