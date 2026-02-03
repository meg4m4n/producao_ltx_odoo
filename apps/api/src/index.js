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
          orderBy: { seq: 'asc' }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Production order not found' });
    }

    res.json(order);
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

    await prisma.production_order_lines.delete({
      where: { id: lineId }
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Production order line not found' });
    }
    console.error('Error deleting production order line:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
