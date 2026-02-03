/*
  # Add Sales Orders

  1. New Tables
    - `sales_orders`
      - `id` (uuid, primary key)
      - `code` (text, unique, required) - Sales order code like S0187
      - `customer_name` (text, nullable)
      - `date_order` (timestamptz, nullable)
      - `date_delivery_requested` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `sales_order_lines`
      - `id` (uuid, primary key)
      - `sales_order_id` (uuid, foreign key to sales_orders)
      - `article_ref` (text, required) - Article reference like 26011
      - `color` (text, nullable) - Color like BLACK
      - `size` (text, required) - Size like S, M, L, XL
      - `qty` (int, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users (temporary - proper auth will be added later)

  3. Notes
    - Sales order lines are per size (matches current business reality)
    - No product catalog or variants (keeping it simple)
    - Production orders can link to sales orders via sale_ref field (already exists)
*/

CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  customer_name text,
  date_order timestamptz,
  date_delivery_requested timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  article_ref text NOT NULL,
  color text,
  size text NOT NULL,
  qty int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to sales_orders"
  ON sales_orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to sales_order_lines"
  ON sales_order_lines
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sales_order_lines_sales_order_id ON sales_order_lines(sales_order_id);