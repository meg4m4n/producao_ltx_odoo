import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/production-orders', async (req, res) => {
  try {
    const {
      code,
      sale_ref,
      customer_name,
      service_current = 'planning',
      state = 'draft',
      date_order,
      date_delivery_requested,
      date_start_plan,
      date_end_estimated
    } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'code is required' });
    }

    const validServiceStages = ['planning', 'cutting', 'services', 'sewing', 'finishing'];
    if (!validServiceStages.includes(service_current)) {
      return res.status(400).json({ error: 'Invalid service_current value' });
    }

    const validStates = ['draft', 'planned', 'in_production', 'issue', 'produced', 'invoiced', 'shipped'];
    if (!validStates.includes(state)) {
      return res.status(400).json({ error: 'Invalid state value' });
    }

    const order = await prisma.production_orders.create({
      data: {
        code,
        sale_ref: sale_ref || null,
        customer_name: customer_name || null,
        service_current,
        state,
        date_order: date_order ? new Date(date_order) : null,
        date_delivery_requested: date_delivery_requested ? new Date(date_delivery_requested) : null,
        date_start_plan: date_start_plan ? new Date(date_start_plan) : null,
        date_end_estimated: date_end_estimated ? new Date(date_end_estimated) : null
      }
    });

    res.status(201).json(order);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Production order code already exists' });
    }
    console.error('Error creating production order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/production-orders', async (req, res) => {
  try {
    const { state, service_current, q } = req.query;

    const where = {};

    if (state) {
      where.state = state;
    }

    if (service_current) {
      where.service_current = service_current;
    }

    if (q) {
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { sale_ref: { contains: q, mode: 'insensitive' } },
        { customer_name: { contains: q, mode: 'insensitive' } }
      ];
    }

    const orders = await prisma.production_orders.findMany({
      where,
      orderBy: { updated_at: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching production orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/production-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.production_orders.findUnique({
      where: { id },
      include: {
        production_order_lines: {
          orderBy: { seq: 'asc' },
          include: {
            line_sizes: {
              orderBy: { size: 'asc' }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    const anomalies = await prisma.production_anomalies.findMany({
      where: {
        OR: [
          { production_order_id: id },
          { production_order_line_id: { in: order.production_order_lines.map(l => l.id) } }
        ]
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ ...order, anomalies });
  } catch (error) {
    console.error('Error fetching production order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/production-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sale_ref,
      customer_name,
      service_current,
      state,
      date_order,
      date_delivery_requested,
      date_start_plan,
      date_end_estimated
    } = req.body;

    const data = {};

    if (sale_ref !== undefined) data.sale_ref = sale_ref;
    if (customer_name !== undefined) data.customer_name = customer_name;
    if (service_current !== undefined) {
      const validServiceStages = ['planning', 'cutting', 'services', 'sewing', 'finishing'];
      if (!validServiceStages.includes(service_current)) {
        return res.status(400).json({ error: 'Invalid service_current value' });
      }
      data.service_current = service_current;
    }
    if (state !== undefined) {
      const validStates = ['draft', 'planned', 'in_production', 'issue', 'produced', 'invoiced', 'shipped'];
      if (!validStates.includes(state)) {
        return res.status(400).json({ error: 'Invalid state value' });
      }
      data.state = state;
    }
    if (date_order !== undefined) data.date_order = date_order ? new Date(date_order) : null;
    if (date_delivery_requested !== undefined) data.date_delivery_requested = date_delivery_requested ? new Date(date_delivery_requested) : null;
    if (date_start_plan !== undefined) data.date_start_plan = date_start_plan ? new Date(date_start_plan) : null;
    if (date_end_estimated !== undefined) data.date_end_estimated = date_end_estimated ? new Date(date_end_estimated) : null;

    const order = await prisma.production_orders.update({
      where: { id },
      data
    });

    res.json(order);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Production order not found' });
    }
    console.error('Error updating production order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/production-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.production_orders.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Production order not found' });
    }
    console.error('Error deleting production order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/production-orders/:id/lines', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      article_ref,
      color,
      qty_ordered = 0,
      qty_to_produce,
      service_current = 'planning',
      state = 'draft'
    } = req.body;

    if (!article_ref) {
      return res.status(400).json({ error: 'article_ref is required' });
    }

    const order = await prisma.production_orders.findUnique({
      where: { id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    const maxSeqResult = await prisma.production_order_lines.findFirst({
      where: { production_order_id: id },
      orderBy: { seq: 'desc' },
      select: { seq: true }
    });

    const nextSeq = maxSeqResult ? maxSeqResult.seq + 1 : 1;
    const code = `${order.code}.${nextSeq}`;

    const finalQtyToProduce = qty_to_produce !== undefined ? qty_to_produce : qty_ordered;

    const validServiceStages = ['planning', 'cutting', 'services', 'sewing', 'finishing'];
    if (!validServiceStages.includes(service_current)) {
      return res.status(400).json({ error: 'Invalid service_current value' });
    }

    const validStates = ['draft', 'planned', 'in_production', 'issue', 'produced', 'invoiced', 'shipped'];
    if (!validStates.includes(state)) {
      return res.status(400).json({ error: 'Invalid state value' });
    }

    try {
      const line = await prisma.production_order_lines.create({
        data: {
          production_order_id: id,
          seq: nextSeq,
          code,
          article_ref,
          color: color || null,
          qty_ordered,
          qty_to_produce: finalQtyToProduce,
          qty_produced: 0,
          qty_defect: 0,
          service_current,
          state
        }
      });

      await recalculateProductionOrderState(id);

      res.status(201).json(line);
    } catch (error) {
      if (error.code === 'P2002') {
        const retrySeq = nextSeq + 1;
        const retryCode = `${order.code}.${retrySeq}`;

        const line = await prisma.production_order_lines.create({
          data: {
            production_order_id: id,
            seq: retrySeq,
            code: retryCode,
            article_ref,
            color: color || null,
            qty_ordered,
            qty_to_produce: finalQtyToProduce,
            qty_produced: 0,
            qty_defect: 0,
            service_current,
            state
          }
        });

        await recalculateProductionOrderState(id);

        return res.status(201).json(line);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating production order line:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/production-order-lines/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    const {
      article_ref,
      color,
      qty_ordered,
      qty_to_produce,
      qty_produced,
      qty_defect,
      service_current,
      state
    } = req.body;

    const data = {};

    if (article_ref !== undefined) data.article_ref = article_ref;
    if (color !== undefined) data.color = color;
    if (qty_ordered !== undefined) data.qty_ordered = qty_ordered;
    if (qty_to_produce !== undefined) data.qty_to_produce = qty_to_produce;
    if (qty_produced !== undefined) data.qty_produced = qty_produced;
    if (qty_defect !== undefined) data.qty_defect = qty_defect;

    if (service_current !== undefined) {
      const validServiceStages = ['planning', 'cutting', 'services', 'sewing', 'finishing'];
      if (!validServiceStages.includes(service_current)) {
        return res.status(400).json({ error: 'Invalid service_current value' });
      }
      data.service_current = service_current;
    }

    if (state !== undefined) {
      const validStates = ['draft', 'planned', 'in_production', 'issue', 'produced', 'invoiced', 'shipped'];
      if (!validStates.includes(state)) {
        return res.status(400).json({ error: 'Invalid state value' });
      }
      data.state = state;
    }

    const line = await prisma.production_order_lines.update({
      where: { id: lineId },
      data
    });

    res.json(line);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Production order line not found' });
    }
    console.error('Error updating production order line:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/production-order-lines/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;

    const line = await prisma.production_order_lines.findUnique({
      where: { id: lineId }
    });

    if (!line) {
      return res.status(404).json({ error: 'Production order line not found' });
    }

    const productionOrderId = line.production_order_id;

    await prisma.production_order_lines.delete({
      where: { id: lineId }
    });

    await recalculateProductionOrderState(productionOrderId);

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Production order line not found' });
    }
    console.error('Error deleting production order line:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/production-order-lines/:lineId/advance', async (req, res) => {
  try {
    const { lineId } = req.params;

    const line = await prisma.production_order_lines.findUnique({
      where: { id: lineId }
    });

    if (!line) {
      return res.status(404).json({ error: 'Production order line not found' });
    }

    const blockingAnomaly = await prisma.production_anomalies.findFirst({
      where: {
        production_order_line_id: lineId,
        is_blocking: true,
        resolved: false
      }
    });

    if (blockingAnomaly) {
      return res.status(409).json({ error: 'Blocking anomaly unresolved' });
    }

    const stageMap = {
      'planning': 'cutting',
      'cutting': 'services',
      'services': 'sewing',
      'sewing': 'finishing',
      'finishing': 'produced'
    };

    if (line.service_current === 'cutting') {
      if (line.qty_produced === 0) {
        return res.status(409).json({ error: 'Cutting not completed' });
      }
    }

    if (line.service_current === 'finishing') {
      if (line.qty_produced < line.qty_to_produce) {
        return res.status(409).json({ error: 'Produced quantity insufficient' });
      }
    }

    const nextStage = stageMap[line.service_current];

    if (!nextStage) {
      return res.status(400).json({ error: 'Already produced' });
    }

    const updateData = {
      service_current: nextStage
    };

    if (nextStage === 'produced') {
      updateData.state = 'produced';
    }

    const updatedLine = await prisma.production_order_lines.update({
      where: { id: lineId },
      data: updateData
    });

    await recalculateProductionOrderState(line.production_order_id);

    res.json(updatedLine);
  } catch (error) {
    console.error('Error advancing production order line:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function recalculateProductionOrderState(productionOrderId) {
  const lines = await prisma.production_order_lines.findMany({
    where: { production_order_id: productionOrderId }
  });

  if (lines.length === 0) {
    return;
  }

  let newState;

  const hasIssue = lines.some(line => line.state === 'issue');
  if (hasIssue) {
    newState = 'issue';
  } else {
    const allProduced = lines.every(line => line.state === 'produced');
    if (allProduced) {
      newState = 'produced';
    } else {
      const anyInProgress = lines.some(line => line.service_current !== 'planning');
      if (anyInProgress) {
        newState = 'in_production';
      } else {
        newState = 'planned';
      }
    }
  }

  await prisma.production_orders.update({
    where: { id: productionOrderId },
    data: { state: newState }
  });
}

async function updateIssueStates(affectedLineIds = [], affectedOrderIds = []) {
  const lineIdsSet = new Set(affectedLineIds);
  const orderIdsSet = new Set(affectedOrderIds);

  for (const lineId of lineIdsSet) {
    const line = await prisma.production_order_lines.findUnique({
      where: { id: lineId },
      include: { production_order: true }
    });

    if (!line) continue;

    if (line.production_order_id) {
      orderIdsSet.add(line.production_order_id);
    }

    const blockingAnomaly = await prisma.production_anomalies.findFirst({
      where: {
        production_order_line_id: lineId,
        is_blocking: true,
        resolved: false
      }
    });

    if (blockingAnomaly) {
      if (line.state !== 'issue') {
        await prisma.production_order_lines.update({
          where: { id: lineId },
          data: { state: 'issue' }
        });
      }
    } else {
      if (line.state === 'issue') {
        const parentState = line.production_order?.state || 'draft';
        const newState = parentState === 'issue' ? 'draft' : parentState;
        await prisma.production_order_lines.update({
          where: { id: lineId },
          data: { state: newState }
        });
      }
    }
  }

  for (const orderId of orderIdsSet) {
    const linesWithIssue = await prisma.production_order_lines.findFirst({
      where: {
        production_order_id: orderId,
        state: 'issue'
      }
    });

    const order = await prisma.production_orders.findUnique({
      where: { id: orderId }
    });

    if (!order) continue;

    if (linesWithIssue) {
      if (order.state !== 'issue') {
        await prisma.production_orders.update({
          where: { id: orderId },
          data: { state: 'issue' }
        });
      }
    } else {
      if (order.state === 'issue') {
        const newState = ['produced', 'invoiced', 'shipped'].includes(order.state) ? 'in_production' : 'draft';
        await prisma.production_orders.update({
          where: { id: orderId },
          data: { state: newState }
        });
      }
    }
  }
}

app.post('/api/production-order-lines/:lineId/sizes', async (req, res) => {
  try {
    const { lineId } = req.params;
    const { size, qty_ordered = 0, qty_to_produce } = req.body;

    if (!size) {
      return res.status(400).json({ error: 'size is required' });
    }

    const line = await prisma.production_order_lines.findUnique({
      where: { id: lineId }
    });

    if (!line) {
      return res.status(404).json({ error: 'Production order line not found' });
    }

    const finalQtyToProduce = qty_to_produce !== undefined ? qty_to_produce : qty_ordered;

    await prisma.production_order_line_sizes.upsert({
      where: {
        production_order_line_id_size: {
          production_order_line_id: lineId,
          size: size
        }
      },
      update: {
        qty_ordered,
        qty_to_produce: finalQtyToProduce
      },
      create: {
        production_order_line_id: lineId,
        size,
        qty_ordered,
        qty_to_produce: finalQtyToProduce,
        qty_produced: 0,
        qty_defect: 0
      }
    });

    const sizes = await prisma.production_order_line_sizes.findMany({
      where: { production_order_line_id: lineId },
      orderBy: { size: 'asc' }
    });

    res.json(sizes);
  } catch (error) {
    console.error('Error upserting size:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/production-order-lines/:lineId/sizes', async (req, res) => {
  try {
    const { lineId } = req.params;

    const sizes = await prisma.production_order_line_sizes.findMany({
      where: { production_order_line_id: lineId },
      orderBy: { size: 'asc' }
    });

    res.json(sizes);
  } catch (error) {
    console.error('Error fetching sizes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/production-order-line-sizes/:sizeId', async (req, res) => {
  try {
    const { sizeId } = req.params;
    const { size, qty_ordered, qty_to_produce, qty_produced, qty_defect } = req.body;

    const data = {};

    if (size !== undefined) data.size = size;
    if (qty_ordered !== undefined) data.qty_ordered = qty_ordered;
    if (qty_to_produce !== undefined) data.qty_to_produce = qty_to_produce;
    if (qty_produced !== undefined) data.qty_produced = qty_produced;
    if (qty_defect !== undefined) data.qty_defect = qty_defect;

    const sizeRecord = await prisma.production_order_line_sizes.update({
      where: { id: sizeId },
      data
    });

    res.json(sizeRecord);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Size record not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Size already exists for this line' });
    }
    console.error('Error updating size:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/production-order-line-sizes/:sizeId', async (req, res) => {
  try {
    const { sizeId } = req.params;

    await prisma.production_order_line_sizes.delete({
      where: { id: sizeId }
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Size record not found' });
    }
    console.error('Error deleting size:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/production-orders/:id/import-sales', async (req, res) => {
  try {
    const { id } = req.params;

    const productionOrder = await prisma.production_orders.findUnique({
      where: { id },
      include: {
        production_order_lines: true
      }
    });

    if (!productionOrder) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    if (!productionOrder.sale_ref) {
      return res.status(400).json({ error: 'Production order has no sale_ref' });
    }

    if (productionOrder.production_order_lines.length > 0) {
      return res.status(409).json({ error: 'Production order already has lines. Clear lines first.' });
    }

    const salesOrder = await prisma.sales_orders.findFirst({
      where: { code: productionOrder.sale_ref },
      include: {
        sales_order_lines: true
      }
    });

    if (!salesOrder) {
      return res.status(404).json({ error: `Sales order ${productionOrder.sale_ref} not found` });
    }

    if (!salesOrder.sales_order_lines || salesOrder.sales_order_lines.length === 0) {
      return res.status(400).json({ error: 'Sales order has no lines to import' });
    }

    const groups = {};
    for (const line of salesOrder.sales_order_lines) {
      const key = `${line.article_ref}|${line.color || ''}`;
      if (!groups[key]) {
        groups[key] = {
          article_ref: line.article_ref,
          color: line.color,
          sizes: []
        };
      }
      groups[key].sizes.push({
        size: line.size,
        qty: line.qty
      });
    }

    const details = [];
    let seq = 1;

    for (const key of Object.keys(groups).sort()) {
      const group = groups[key];
      const totalQty = group.sizes.reduce((sum, s) => sum + s.qty, 0);
      const lineCode = `${productionOrder.code}.${seq}`;

      const productionLine = await prisma.production_order_lines.create({
        data: {
          production_order_id: id,
          seq: seq,
          code: lineCode,
          article_ref: group.article_ref,
          color: group.color || null,
          qty_ordered: totalQty,
          qty_to_produce: totalQty,
          qty_produced: 0,
          qty_defect: 0,
          service_current: 'planning',
          state: 'draft'
        }
      });

      for (const sizeEntry of group.sizes) {
        await prisma.production_order_line_sizes.create({
          data: {
            production_order_line_id: productionLine.id,
            size: sizeEntry.size,
            qty_ordered: sizeEntry.qty,
            qty_to_produce: sizeEntry.qty,
            qty_produced: 0,
            qty_defect: 0
          }
        });
      }

      details.push({
        line_code: lineCode,
        article_ref: group.article_ref,
        color: group.color,
        sizes: group.sizes.map(s => ({ size: s.size, qty: s.qty }))
      });

      seq++;
    }

    await recalculateProductionOrderState(id);

    res.status(201).json({
      created_lines: details.length,
      details: details
    });
  } catch (error) {
    console.error('Error importing sales lines:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/anomalies', async (req, res) => {
  try {
    const {
      production_order_id,
      production_order_line_id,
      service,
      severity,
      description,
      is_blocking = false,
      resolved = false
    } = req.body;

    if (!production_order_id && !production_order_line_id) {
      return res.status(400).json({ error: 'Must provide at least one of production_order_id or production_order_line_id' });
    }

    if (!service || !severity || !description) {
      return res.status(400).json({ error: 'service, severity, and description are required' });
    }

    const validServiceStages = ['planning', 'cutting', 'services', 'sewing', 'finishing'];
    if (!validServiceStages.includes(service)) {
      return res.status(400).json({ error: 'Invalid service value' });
    }

    const validSeverities = ['low', 'medium', 'high'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({ error: 'Invalid severity value' });
    }

    let finalOrderId = production_order_id;

    if (production_order_line_id && !finalOrderId) {
      const line = await prisma.production_order_lines.findUnique({
        where: { id: production_order_line_id }
      });

      if (!line) {
        return res.status(404).json({ error: 'Production order line not found' });
      }

      finalOrderId = line.production_order_id;
    }

    const anomaly = await prisma.production_anomalies.create({
      data: {
        production_order_id: finalOrderId || null,
        production_order_line_id: production_order_line_id || null,
        service,
        severity,
        description,
        is_blocking,
        resolved
      }
    });

    const affectedLineIds = production_order_line_id ? [production_order_line_id] : [];
    const affectedOrderIds = finalOrderId ? [finalOrderId] : [];
    await updateIssueStates(affectedLineIds, affectedOrderIds);

    if (finalOrderId) {
      await recalculateProductionOrderState(finalOrderId);
    }

    res.status(201).json(anomaly);
  } catch (error) {
    console.error('Error creating anomaly:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/anomalies', async (req, res) => {
  try {
    const { production_order_id, production_order_line_id, resolved } = req.query;

    const where = {};

    if (production_order_id) {
      where.production_order_id = production_order_id;
    }

    if (production_order_line_id) {
      where.production_order_line_id = production_order_line_id;
    }

    if (resolved !== undefined) {
      where.resolved = resolved === 'true';
    }

    const anomalies = await prisma.production_anomalies.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });

    res.json(anomalies);
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/anomalies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { service, severity, description, is_blocking, resolved } = req.body;

    const data = {};

    if (service !== undefined) {
      const validServiceStages = ['planning', 'cutting', 'services', 'sewing', 'finishing'];
      if (!validServiceStages.includes(service)) {
        return res.status(400).json({ error: 'Invalid service value' });
      }
      data.service = service;
    }

    if (severity !== undefined) {
      const validSeverities = ['low', 'medium', 'high'];
      if (!validSeverities.includes(severity)) {
        return res.status(400).json({ error: 'Invalid severity value' });
      }
      data.severity = severity;
    }

    if (description !== undefined) data.description = description;
    if (is_blocking !== undefined) data.is_blocking = is_blocking;
    if (resolved !== undefined) data.resolved = resolved;

    const existingAnomaly = await prisma.production_anomalies.findUnique({
      where: { id }
    });

    if (!existingAnomaly) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    const anomaly = await prisma.production_anomalies.update({
      where: { id },
      data
    });

    const affectedLineIds = anomaly.production_order_line_id ? [anomaly.production_order_line_id] : [];
    const affectedOrderIds = anomaly.production_order_id ? [anomaly.production_order_id] : [];
    await updateIssueStates(affectedLineIds, affectedOrderIds);

    let productionOrderId = anomaly.production_order_id;
    if (!productionOrderId && anomaly.production_order_line_id) {
      const line = await prisma.production_order_lines.findUnique({
        where: { id: anomaly.production_order_line_id }
      });
      if (line) {
        productionOrderId = line.production_order_id;
      }
    }

    if (productionOrderId) {
      await recalculateProductionOrderState(productionOrderId);
    }

    res.json(anomaly);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Anomaly not found' });
    }
    console.error('Error updating anomaly:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/anomalies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingAnomaly = await prisma.production_anomalies.findUnique({
      where: { id }
    });

    if (!existingAnomaly) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    await prisma.production_anomalies.delete({
      where: { id }
    });

    const affectedLineIds = existingAnomaly.production_order_line_id ? [existingAnomaly.production_order_line_id] : [];
    const affectedOrderIds = existingAnomaly.production_order_id ? [existingAnomaly.production_order_id] : [];
    await updateIssueStates(affectedLineIds, affectedOrderIds);

    let productionOrderId = existingAnomaly.production_order_id;
    if (!productionOrderId && existingAnomaly.production_order_line_id) {
      const line = await prisma.production_order_lines.findUnique({
        where: { id: existingAnomaly.production_order_line_id }
      });
      if (line) {
        productionOrderId = line.production_order_id;
      }
    }

    if (productionOrderId) {
      await recalculateProductionOrderState(productionOrderId);
    }

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Anomaly not found' });
    }
    console.error('Error deleting anomaly:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/sales-orders', async (req, res) => {
  try {
    const {
      code,
      customer_name,
      date_order,
      date_delivery_requested,
      lines
    } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'code is required' });
    }

    const salesOrderData = {
      code,
      customer_name: customer_name || null,
      date_order: date_order ? new Date(date_order) : null,
      date_delivery_requested: date_delivery_requested ? new Date(date_delivery_requested) : null
    };

    if (lines && Array.isArray(lines) && lines.length > 0) {
      salesOrderData.sales_order_lines = {
        create: lines.map(line => ({
          article_ref: line.article_ref,
          color: line.color || null,
          size: line.size,
          qty: line.qty || 0
        }))
      };
    }

    const salesOrder = await prisma.sales_orders.create({
      data: salesOrderData,
      include: {
        sales_order_lines: true
      }
    });

    res.status(201).json(salesOrder);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Sales order code already exists' });
    }
    console.error('Error creating sales order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/sales-orders', async (req, res) => {
  try {
    const { q } = req.query;

    const where = {};

    if (q) {
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { customer_name: { contains: q, mode: 'insensitive' } }
      ];
    }

    const salesOrders = await prisma.sales_orders.findMany({
      where,
      orderBy: { updated_at: 'desc' }
    });

    res.json(salesOrders);
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/sales-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const salesOrder = await prisma.sales_orders.findUnique({
      where: { id },
      include: {
        sales_order_lines: {
          orderBy: [
            { article_ref: 'asc' },
            { color: 'asc' },
            { size: 'asc' }
          ]
        }
      }
    });

    if (!salesOrder) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    res.json(salesOrder);
  } catch (error) {
    console.error('Error fetching sales order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/sales-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      customer_name,
      date_order,
      date_delivery_requested
    } = req.body;

    const data = {};

    if (code !== undefined) data.code = code;
    if (customer_name !== undefined) data.customer_name = customer_name;
    if (date_order !== undefined) data.date_order = date_order ? new Date(date_order) : null;
    if (date_delivery_requested !== undefined) data.date_delivery_requested = date_delivery_requested ? new Date(date_delivery_requested) : null;

    const salesOrder = await prisma.sales_orders.update({
      where: { id },
      data
    });

    res.json(salesOrder);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Sales order not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Sales order code already exists' });
    }
    console.error('Error updating sales order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/sales-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.sales_orders.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Sales order not found' });
    }
    console.error('Error deleting sales order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/sales-orders/:id/lines', async (req, res) => {
  try {
    const { id } = req.params;
    const { article_ref, color, size, qty = 0 } = req.body;

    if (!article_ref) {
      return res.status(400).json({ error: 'article_ref is required' });
    }

    if (!size) {
      return res.status(400).json({ error: 'size is required' });
    }

    const salesOrder = await prisma.sales_orders.findUnique({
      where: { id }
    });

    if (!salesOrder) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    const line = await prisma.sales_order_lines.create({
      data: {
        sales_order_id: id,
        article_ref,
        color: color || null,
        size,
        qty
      }
    });

    res.status(201).json(line);
  } catch (error) {
    console.error('Error creating sales order line:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/sales-order-lines/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    const { article_ref, color, size, qty } = req.body;

    const data = {};

    if (article_ref !== undefined) data.article_ref = article_ref;
    if (color !== undefined) data.color = color;
    if (size !== undefined) data.size = size;
    if (qty !== undefined) data.qty = qty;

    const line = await prisma.sales_order_lines.update({
      where: { id: lineId },
      data
    });

    res.json(line);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Sales order line not found' });
    }
    console.error('Error updating sales order line:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/sales-order-lines/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;

    await prisma.sales_order_lines.delete({
      where: { id: lineId }
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Sales order line not found' });
    }
    console.error('Error deleting sales order line:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
