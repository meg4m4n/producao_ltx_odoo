# API Usage Examples (curl)

This document provides curl examples for testing the production orders API endpoints.

## Prerequisites

- API server running on `http://localhost:3001`
- Database migrations applied

## 1. Create Production Order

```bash
curl -X POST http://localhost:3001/api/production-orders \
  -H "Content-Type: application/json" \
  -d '{
    "code": "OF2024001",
    "sale_ref": "SO-2024-001",
    "customer_name": "ABC Manufacturing",
    "service_current": "planning",
    "state": "draft",
    "date_order": "2024-01-15T10:00:00Z",
    "date_delivery_requested": "2024-02-15T10:00:00Z"
  }'
```

Expected response: 201 Created with order object including generated `id`.

## 2. List Production Orders

List all orders:

```bash
curl http://localhost:3001/api/production-orders
```

Filter by state:

```bash
curl "http://localhost:3001/api/production-orders?state=draft"
```

Filter by service stage:

```bash
curl "http://localhost:3001/api/production-orders?service_current=planning"
```

Search by code, sale reference, or customer name:

```bash
curl "http://localhost:3001/api/production-orders?q=ABC"
```

Expected response: 200 OK with array of orders, sorted by `updated_at` descending.

## 3. Create Production Order Line (auto-seq)

Replace `{ORDER_ID}` with an actual order ID from step 1.

```bash
curl -X POST http://localhost:3001/api/production-orders/{ORDER_ID}/lines \
  -H "Content-Type: application/json" \
  -d '{
    "article_ref": "ART-001",
    "color": "Blue",
    "qty_ordered": 100,
    "qty_to_produce": 100
  }'
```

The `seq` will be auto-assigned (starting at 1), and `code` will be generated as `OF2024001.1`.

Create a second line:

```bash
curl -X POST http://localhost:3001/api/production-orders/{ORDER_ID}/lines \
  -H "Content-Type: application/json" \
  -d '{
    "article_ref": "ART-002",
    "color": "Red",
    "qty_ordered": 50
  }'
```

This will have `seq=2` and `code=OF2024001.2`. If `qty_to_produce` is omitted, it defaults to `qty_ordered`.

Expected response: 201 Created with line object including auto-generated `seq` and `code`.

## 4. Get Production Order Detail

Replace `{ORDER_ID}` with an actual order ID.

```bash
curl http://localhost:3001/api/production-orders/{ORDER_ID}
```

Expected response: 200 OK with order object including nested `production_order_lines` array sorted by `seq`.

## 5. Update Production Order Line Quantities

Replace `{LINE_ID}` with an actual line ID.

```bash
curl -X PATCH http://localhost:3001/api/production-order-lines/{LINE_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "qty_produced": 45,
    "qty_defect": 5,
    "state": "in_production"
  }'
```

Expected response: 200 OK with updated line object.

## 6. Delete Production Order

Replace `{ORDER_ID}` with an actual order ID.

```bash
curl -X DELETE http://localhost:3001/api/production-orders/{ORDER_ID}
```

This will cascade delete all associated lines.

Expected response: 204 No Content (empty body).

## Error Handling

Duplicate code (409):

```bash
curl -X POST http://localhost:3001/api/production-orders \
  -H "Content-Type: application/json" \
  -d '{"code": "OF2024001"}'
```

Response: `{"error": "Production order code already exists"}`

Not found (404):

```bash
curl http://localhost:3001/api/production-orders/00000000-0000-0000-0000-000000000000
```

Response: `{"error": "Production order not found"}`

Missing required field (400):

```bash
curl -X POST http://localhost:3001/api/production-orders \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response: `{"error": "code is required"}`
