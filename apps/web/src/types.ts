export type ServiceStage = 'planning' | 'cutting' | 'services' | 'sewing' | 'finishing';

export type ProductionState = 'draft' | 'planned' | 'in_production' | 'issue' | 'produced' | 'invoiced' | 'shipped';

export interface ProductionOrder {
  id: string;
  code: string;
  sale_ref: string | null;
  customer_name: string | null;
  service_current: ServiceStage;
  state: ProductionState;
  date_order: string | null;
  date_delivery_requested: string | null;
  date_start_plan: string | null;
  date_end_estimated: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionOrderData {
  code: string;
  sale_ref?: string;
  customer_name?: string;
  date_delivery_requested?: string;
  service_current?: ServiceStage;
  state?: ProductionState;
}

export interface UpdateProductionOrderData {
  sale_ref?: string;
  customer_name?: string;
  date_delivery_requested?: string;
  date_start_plan?: string;
  date_end_estimated?: string;
  service_current?: ServiceStage;
  state?: ProductionState;
}
