/*
  # Add archived_at field to production_orders

  1. Changes
    - Add `archived_at` timestamp field to production_orders table
    - Field is nullable (null = not archived, has value = archived)
    - Used to automatically archive orders when marked as shipped

  2. Notes
    - This completes the Slice 5A implementation (Invoiced/Shipped + Lock + Archive)
    - Archived orders will be filtered out by default in list views
    - Orders are automatically archived when state changes to 'shipped'
*/

ALTER TABLE production_orders
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
