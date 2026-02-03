import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SalesOrder, SalesOrderLine } from '../types';
import {
  fetchSalesOrder,
  updateSalesOrder,
  createSalesOrderLine,
  updateSalesOrderLine,
  deleteSalesOrderLine
} from '../api';

export default function SalesOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingHeader, setEditingHeader] = useState(false);
  const [showAddLineModal, setShowAddLineModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  async function loadOrder() {
    try {
      setLoading(true);
      const data = await fetchSalesOrder(id!);
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
          <button
            onClick={() => navigate('/sales')}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Back to Sales Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/sales')}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            &larr; Back to Sales Orders
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Sales Order: {order.code}</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
            <button
              onClick={() => setEditingHeader(!editingHeader)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              {editingHeader ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editingHeader ? (
            <EditHeaderForm
              order={order}
              onSave={async (data) => {
                await updateSalesOrder(order.id, data);
                await loadOrder();
                setEditingHeader(false);
              }}
              onCancel={() => setEditingHeader(false)}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <p className="text-gray-900">{order.code}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <p className="text-gray-900">{order.customer_name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                <p className="text-gray-900">{order.date_order ? new Date(order.date_order).toLocaleDateString() : '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Requested</label>
                <p className="text-gray-900">{order.date_delivery_requested ? new Date(order.date_delivery_requested).toLocaleDateString() : '-'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Order Lines</h2>
            <button
              onClick={() => setShowAddLineModal(true)}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            >
              Add Line
            </button>
          </div>

          {!order.sales_order_lines || order.sales_order_lines.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No lines added yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Article Ref
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Color
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.sales_order_lines.map((line) => (
                    <LineRow
                      key={line.id}
                      line={line}
                      onUpdate={loadOrder}
                      onDelete={async () => {
                        await deleteSalesOrderLine(line.id);
                        await loadOrder();
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAddLineModal && (
        <AddLineModal
          orderId={order.id}
          onClose={() => setShowAddLineModal(false)}
          onSuccess={async () => {
            setShowAddLineModal(false);
            await loadOrder();
          }}
        />
      )}
    </div>
  );
}

function EditHeaderForm({ order, onSave, onCancel }: {
  order: SalesOrder;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(order.code);
  const [customerName, setCustomerName] = useState(order.customer_name || '');
  const [dateOrder, setDateOrder] = useState(formatDate(order.date_order));
  const [dateDeliveryRequested, setDateDeliveryRequested] = useState(formatDate(order.date_delivery_requested));
  const [saving, setSaving] = useState(false);

  function formatDate(dateString: string | null) {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave({
        code: code.trim(),
        customer_name: customerName.trim() || undefined,
        date_order: dateOrder || undefined,
        date_delivery_requested: dateDeliveryRequested || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
          <input
            type="date"
            value={dateOrder}
            onChange={(e) => setDateOrder(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Requested</label>
          <input
            type="date"
            value={dateDeliveryRequested}
            onChange={(e) => setDateDeliveryRequested(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function LineRow({ line, onUpdate, onDelete }: {
  line: SalesOrderLine;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [articleRef, setArticleRef] = useState(line.article_ref);
  const [color, setColor] = useState(line.color || '');
  const [size, setSize] = useState(line.size);
  const [qty, setQty] = useState(line.qty);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    try {
      setSaving(true);
      await updateSalesOrderLine(line.id, {
        article_ref: articleRef.trim(),
        color: color.trim() || undefined,
        size: size.trim(),
        qty,
      });
      setEditing(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <tr>
        <td className="px-6 py-4">
          <input
            type="text"
            value={articleRef}
            onChange={(e) => setArticleRef(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded"
            required
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded"
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded"
            required
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value) || 0)}
            className="w-full px-2 py-1 border border-gray-300 rounded"
            min="0"
          />
        </td>
        <td className="px-6 py-4">
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm text-gray-800 hover:text-gray-600 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {line.article_ref}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {line.color || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {line.size}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {line.qty}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div className="flex space-x-2">
          <button
            onClick={() => setEditing(true)}
            className="text-gray-800 hover:text-gray-600"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this line?')) {
                onDelete();
              }
            }}
            className="text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddLineModal({ orderId, onClose, onSuccess }: {
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [articleRef, setArticleRef] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!articleRef.trim()) {
      setError('Article reference is required');
      return;
    }

    if (!size.trim()) {
      setError('Size is required');
      return;
    }

    try {
      setSubmitting(true);
      await createSalesOrderLine(orderId, {
        article_ref: articleRef.trim(),
        color: color.trim() || undefined,
        size: size.trim(),
        qty,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add line');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Order Line</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Article Reference *
              </label>
              <input
                type="text"
                value={articleRef}
                onChange={(e) => setArticleRef(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                placeholder="e.g., 26011"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                placeholder="e.g., BLACK"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size *
              </label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                placeholder="e.g., S, M, L, XL"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                min="0"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
