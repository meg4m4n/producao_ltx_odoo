import {
  ProductionOrder,
  CreateProductionOrderData,
  UpdateProductionOrderData,
  ProductionOrderLine,
  CreateProductionOrderLineData,
  UpdateProductionOrderLineData,
  ProductionOrderLineSize,
  UpsertSizeData,
  UpdateSizeData,
  ProductionAnomaly,
  CreateAnomalyData,
  UpdateAnomalyData,
  SalesOrder,
  CreateSalesOrderData,
  UpdateSalesOrderData,
  SalesOrderLine,
  CreateSalesOrderLineData,
  UpdateSalesOrderLineData
} from './types';

const API_BASE_URL = 'http://localhost:3001';

export async function fetchProductionOrders(): Promise<ProductionOrder[]> {
  const response = await fetch(`${API_BASE_URL}/api/production-orders`);
  if (!response.ok) {
    throw new Error('Failed to fetch production orders');
  }
  return response.json();
}

export async function fetchProductionOrder(id: string): Promise<ProductionOrder> {
  const response = await fetch(`${API_BASE_URL}/api/production-orders/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch production order');
  }
  return response.json();
}

export async function createProductionOrder(data: CreateProductionOrderData): Promise<ProductionOrder> {
  const response = await fetch(`${API_BASE_URL}/api/production-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create production order');
  }

  return response.json();
}

export async function updateProductionOrder(id: string, data: UpdateProductionOrderData): Promise<ProductionOrder> {
  const response = await fetch(`${API_BASE_URL}/api/production-orders/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update production order');
  }

  return response.json();
}

export async function createProductionOrderLine(orderId: string, data: CreateProductionOrderLineData): Promise<ProductionOrderLine> {
  const response = await fetch(`${API_BASE_URL}/api/production-orders/${orderId}/lines`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create production order line');
  }

  return response.json();
}

export async function updateProductionOrderLine(lineId: string, data: UpdateProductionOrderLineData): Promise<ProductionOrderLine> {
  const response = await fetch(`${API_BASE_URL}/api/production-order-lines/${lineId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update production order line');
  }

  return response.json();
}

export async function deleteProductionOrderLine(lineId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/production-order-lines/${lineId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete production order line');
  }
}

export async function fetchLineSizes(lineId: string): Promise<ProductionOrderLineSize[]> {
  const response = await fetch(`${API_BASE_URL}/api/production-order-lines/${lineId}/sizes`);
  if (!response.ok) {
    throw new Error('Failed to fetch sizes');
  }
  return response.json();
}

export async function upsertLineSize(lineId: string, data: UpsertSizeData): Promise<ProductionOrderLineSize[]> {
  const response = await fetch(`${API_BASE_URL}/api/production-order-lines/${lineId}/sizes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upsert size');
  }

  return response.json();
}

export async function updateLineSize(sizeId: string, data: UpdateSizeData): Promise<ProductionOrderLineSize> {
  const response = await fetch(`${API_BASE_URL}/api/production-order-line-sizes/${sizeId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update size');
  }

  return response.json();
}

export async function deleteLineSize(sizeId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/production-order-line-sizes/${sizeId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete size');
  }
}

export async function createAnomaly(data: CreateAnomalyData): Promise<ProductionAnomaly> {
  const response = await fetch(`${API_BASE_URL}/api/anomalies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create anomaly');
  }

  return response.json();
}

export async function updateAnomaly(id: string, data: UpdateAnomalyData): Promise<ProductionAnomaly> {
  const response = await fetch(`${API_BASE_URL}/api/anomalies/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update anomaly');
  }

  return response.json();
}

export async function deleteAnomaly(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/anomalies/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete anomaly');
  }
}

export async function fetchSalesOrders(q?: string): Promise<SalesOrder[]> {
  const url = new URL(`${API_BASE_URL}/api/sales-orders`);
  if (q) {
    url.searchParams.append('q', q);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch sales orders');
  }
  return response.json();
}

export async function fetchSalesOrder(id: string): Promise<SalesOrder> {
  const response = await fetch(`${API_BASE_URL}/api/sales-orders/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch sales order');
  }
  return response.json();
}

export async function createSalesOrder(data: CreateSalesOrderData): Promise<SalesOrder> {
  const response = await fetch(`${API_BASE_URL}/api/sales-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create sales order');
  }

  return response.json();
}

export async function updateSalesOrder(id: string, data: UpdateSalesOrderData): Promise<SalesOrder> {
  const response = await fetch(`${API_BASE_URL}/api/sales-orders/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update sales order');
  }

  return response.json();
}

export async function deleteSalesOrder(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/sales-orders/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete sales order');
  }
}

export async function createSalesOrderLine(orderId: string, data: CreateSalesOrderLineData): Promise<SalesOrderLine> {
  const response = await fetch(`${API_BASE_URL}/api/sales-orders/${orderId}/lines`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create sales order line');
  }

  return response.json();
}

export async function updateSalesOrderLine(lineId: string, data: UpdateSalesOrderLineData): Promise<SalesOrderLine> {
  const response = await fetch(`${API_BASE_URL}/api/sales-order-lines/${lineId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update sales order line');
  }

  return response.json();
}

export async function deleteSalesOrderLine(lineId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/sales-order-lines/${lineId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete sales order line');
  }
}

export async function importSalesLines(productionOrderId: string): Promise<{ created_lines: number; details: any[] }> {
  const response = await fetch(`${API_BASE_URL}/api/production-orders/${productionOrderId}/import-sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to import sales lines');
  }

  return response.json();
}

export async function advanceLineStage(lineId: string): Promise<ProductionOrderLine> {
  const response = await fetch(`${API_BASE_URL}/api/production-order-lines/${lineId}/advance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to advance line stage');
  }

  return response.json();
}

export async function markOrderAsInvoiced(orderId: string): Promise<ProductionOrder> {
  const response = await fetch(`${API_BASE_URL}/api/production-orders/${orderId}/mark-invoiced`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to mark order as invoiced');
  }

  return response.json();
}

export async function markOrderAsShipped(orderId: string): Promise<ProductionOrder> {
  const response = await fetch(`${API_BASE_URL}/api/production-orders/${orderId}/mark-shipped`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to mark order as shipped');
  }

  return response.json();
}
