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

List all active (non-archived) orders:

```bash
curl http://localhost:3001/api/production-orders
```

List all orders including archived:

```bash
curl "http://localhost:3001/api/production-orders?include_archived=true"
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

Expected response: 200 OK with array of orders, sorted by `updated_at` descending. By default, archived orders (where `archived_at` is not null) are excluded.

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

## 4. Add Sizes to Production Order Line

Replace `{LINE_ID}` with an actual line ID from step 3.

Add size S (upsert - creates or updates):

```bash
curl -X POST http://localhost:3001/api/production-order-lines/{LINE_ID}/sizes \
  -H "Content-Type: application/json" \
  -d '{
    "size": "S",
    "qty_ordered": 20,
    "qty_to_produce": 20
  }'
```

Add size M:

```bash
curl -X POST http://localhost:3001/api/production-order-lines/{LINE_ID}/sizes \
  -H "Content-Type: application/json" \
  -d '{
    "size": "M",
    "qty_ordered": 30
  }'
```

Add size L:

```bash
curl -X POST http://localhost:3001/api/production-order-lines/{LINE_ID}/sizes \
  -H "Content-Type: application/json" \
  -d '{
    "size": "L",
    "qty_ordered": 25,
    "qty_to_produce": 25
  }'
```

Expected response: 200 OK with full array of sizes for that line, sorted by size ascending.

## 5. List Sizes for a Line

Replace `{LINE_ID}` with an actual line ID.

```bash
curl http://localhost:3001/api/production-order-lines/{LINE_ID}/sizes
```

Expected response: 200 OK with array of sizes sorted by size ascending.

## 6. Update Size Record

Replace `{SIZE_ID}` with an actual size record ID.

```bash
curl -X PATCH http://localhost:3001/api/production-order-line-sizes/{SIZE_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "qty_produced": 18,
    "qty_defect": 2
  }'
```

Expected response: 200 OK with updated size record.

## 7. Get Production Order Detail

Replace `{ORDER_ID}` with an actual order ID.

```bash
curl http://localhost:3001/api/production-orders/{ORDER_ID}
```

Expected response: 200 OK with order object including nested `production_order_lines` array sorted by `seq`, each line with nested `line_sizes` sorted by size, and `anomalies` array at top level.

## 8. Create Anomaly (Blocking)

Replace `{LINE_ID}` with an actual line ID. This will demonstrate the issue state rule.

First, check the current state of the line and order:

```bash
curl http://localhost:3001/api/production-orders/{ORDER_ID}
```

Note the `state` fields of both order and line (should be "draft" initially).

Create a blocking anomaly for the line:

```bash
curl -X POST http://localhost:3001/api/anomalies \
  -H "Content-Type: application/json" \
  -d '{
    "production_order_line_id": "{LINE_ID}",
    "service": "cutting",
    "severity": "high",
    "description": "Fabric defect detected in roll",
    "is_blocking": true,
    "resolved": false
  }'
```

Expected response: 201 Created with anomaly object. The `production_order_id` is automatically inferred from the line.

Now check the order detail again:

```bash
curl http://localhost:3001/api/production-orders/{ORDER_ID}
```

You should see:
- The affected line now has `state: "issue"`
- The order now has `state: "issue"` (because at least one line is in issue state)
- The anomaly appears in the `anomalies` array

## 9. List Anomalies

List all anomalies:

```bash
curl http://localhost:3001/api/anomalies
```

Filter by order:

```bash
curl "http://localhost:3001/api/anomalies?production_order_id={ORDER_ID}"
```

Filter by line:

```bash
curl "http://localhost:3001/api/anomalies?production_order_line_id={LINE_ID}"
```

Filter unresolved anomalies:

```bash
curl "http://localhost:3001/api/anomalies?resolved=false"
```

Expected response: 200 OK with array of anomalies sorted by newest first.

## 10. Resolve Anomaly (State Reset)

Replace `{ANOMALY_ID}` with the ID from step 8.

Mark the anomaly as resolved:

```bash
curl -X PATCH http://localhost:3001/api/anomalies/{ANOMALY_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "resolved": true
  }'
```

Expected response: 200 OK with updated anomaly.

Now check the order detail again:

```bash
curl http://localhost:3001/api/production-orders/{ORDER_ID}
```

You should see:
- The line state has reverted to "draft" (or the parent order's state if different)
- The order state has reverted to "draft" (since no lines are in issue state anymore)

## 11. Create Non-Blocking Anomaly

Non-blocking anomalies don't trigger issue state:

```bash
curl -X POST http://localhost:3001/api/anomalies \
  -H "Content-Type: application/json" \
  -d '{
    "production_order_line_id": "{LINE_ID}",
    "service": "sewing",
    "severity": "low",
    "description": "Minor thread color mismatch",
    "is_blocking": false,
    "resolved": false
  }'
```

Check the order - states should remain unchanged (not "issue").

## 12. Create Order-Level Anomaly

Anomalies can be attached to the entire order instead of a specific line:

```bash
curl -X POST http://localhost:3001/api/anomalies \
  -H "Content-Type: application/json" \
  -d '{
    "production_order_id": "{ORDER_ID}",
    "service": "planning",
    "severity": "medium",
    "description": "Delayed material delivery",
    "is_blocking": false
  }'
```

## 13. Update Production Order Line Quantities

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

## 14. Delete Anomaly

Replace `{ANOMALY_ID}` with an actual anomaly ID.

```bash
curl -X DELETE http://localhost:3001/api/anomalies/{ANOMALY_ID}
```

This will trigger the issue state update logic. If this was a blocking unresolved anomaly, the line/order states will be reset.

Expected response: 204 No Content (empty body).

## 17. Mark Production Order as Invoiced

Replace `{ORDER_ID}` with an actual order ID in `produced` state.

```bash
curl -X POST http://localhost:3001/api/production-orders/{ORDER_ID}/mark-invoiced \
  -H "Content-Type: application/json"
```

Expected response: 200 OK with updated order object with `state: "invoiced"`.

This endpoint validates that the current order state is `produced` before allowing the transition to `invoiced`.

## 18. Mark Production Order as Shipped

Replace `{ORDER_ID}` with an actual order ID in `invoiced` state.

```bash
curl -X POST http://localhost:3001/api/production-orders/{ORDER_ID}/mark-shipped \
  -H "Content-Type: application/json"
```

Expected response: 200 OK with updated order object with `state: "shipped"` and `archived_at` set to current timestamp.

This endpoint validates that the current order state is `invoiced` before allowing the transition to `shipped`. Orders are automatically archived when marked as shipped.

## 19. Locked Order - Edit Attempt

Once an order is marked as `invoiced` or `shipped`, it becomes locked. Any edit attempts will fail:

Try to add a line to a locked order:

```bash
curl -X POST http://localhost:3001/api/production-orders/{ORDER_ID}/lines \
  -H "Content-Type: application/json" \
  -d '{
    "article_ref": "ART-003",
    "qty_ordered": 50
  }'
```

Expected response: 409 Conflict with message: `{"error": "Order is invoiced/shipped and locked"}`

Similarly, the following operations are blocked on locked orders:
- PATCH /api/production-orders/:id
- POST /api/production-orders/:id/import-sales
- PATCH /api/production-order-lines/:lineId
- DELETE /api/production-order-lines/:lineId
- POST /api/anomalies (for order or its lines)
- PATCH /api/anomalies/:id (for order or its lines)
- DELETE /api/anomalies/:id (for order or its lines)

## 15. Delete Size Record

Replace `{SIZE_ID}` with an actual size record ID.

```bash
curl -X DELETE http://localhost:3001/api/production-order-line-sizes/{SIZE_ID}
```

Expected response: 204 No Content (empty body).

## 16. Delete Production Order

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
