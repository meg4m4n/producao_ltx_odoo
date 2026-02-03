import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProductionOrder, ServiceStage } from '../types';
import { fetchProductionOrder, updateProductionOrder } from '../api';

export default function ProductionOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder(id);
    }
  }, [id]);

  async function loadOrder(orderId: string) {
    try {
      setLoading(true);
      const data = await fetchProductionOrder(orderId);
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
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
            onClick={() => navigate('/production')}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/production')}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← Back to List
          </button>

          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Production Order: {order.code}</h1>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            >
              Edit Header
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">OF Code</label>
              <p className="text-gray-900">{order.code}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Sale Reference</label>
              <p className="text-gray-900">{order.sale_ref || '-'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Customer</label>
              <p className="text-gray-900">{order.customer_name || '-'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Service Current</label>
              <p className="text-gray-900">{order.service_current}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">State</label>
              <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                order.state === 'issue' ? 'bg-red-100 text-red-800' :
                ['produced', 'invoiced', 'shipped'].includes(order.state) ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {order.state}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Delivery Requested</label>
              <p className="text-gray-900">{formatDate(order.date_delivery_requested)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Start Plan</label>
              <p className="text-gray-900">{formatDate(order.date_start_plan)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">End Estimated</label>
              <p className="text-gray-900">{formatDate(order.date_end_estimated)}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-100 rounded-lg p-6 text-center text-gray-600">
          <p>Lines, sizes, and anomalies will be displayed here in the next iteration.</p>
        </div>
      </div>

      {showEditModal && (
        <EditOrderModal
          order={order}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updatedOrder) => {
            setOrder(updatedOrder);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

function EditOrderModal({ order, onClose, onSuccess }: {
  order: ProductionOrder;
  onClose: () => void;
  onSuccess: (order: ProductionOrder) => void;
}) {
  const [saleRef, setSaleRef] = useState(order.sale_ref || '');
  const [customerName, setCustomerName] = useState(order.customer_name || '');
  const [serviceCurrent, setServiceCurrent] = useState<ServiceStage>(order.service_current);
  const [dateDeliveryRequested, setDateDeliveryRequested] = useState(
    order.date_delivery_requested ? order.date_delivery_requested.split('T')[0] : ''
  );
  const [dateStartPlan, setDateStartPlan] = useState(
    order.date_start_plan ? order.date_start_plan.split('T')[0] : ''
  );
  const [dateEndEstimated, setDateEndEstimated] = useState(
    order.date_end_estimated ? order.date_end_estimated.split('T')[0] : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      setSubmitting(true);
      const updatedOrder = await updateProductionOrder(order.id, {
        sale_ref: saleRef.trim() || undefined,
        customer_name: customerName.trim() || undefined,
        service_current: serviceCurrent,
        date_delivery_requested: dateDeliveryRequested || undefined,
        date_start_plan: dateStartPlan || undefined,
        date_end_estimated: dateEndEstimated || undefined,
      });
      onSuccess(updatedOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Production Order</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OF Code
              </label>
              <input
                type="text"
                value={order.code}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sale Reference
              </label>
              <input
                type="text"
                value={saleRef}
                onChange={(e) => setSaleRef(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Current
              </label>
              <select
                value={serviceCurrent}
                onChange={(e) => setServiceCurrent(e.target.value as ServiceStage)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
              >
                <option value="planning">Planning</option>
                <option value="cutting">Cutting</option>
                <option value="services">Services</option>
                <option value="sewing">Sewing</option>
                <option value="finishing">Finishing</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Requested
              </label>
              <input
                type="date"
                value={dateDeliveryRequested}
                onChange={(e) => setDateDeliveryRequested(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Plan
              </label>
              <input
                type="date"
                value={dateStartPlan}
                onChange={(e) => setDateStartPlan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Estimated
              </label>
              <input
                type="date"
                value={dateEndEstimated}
                onChange={(e) => setDateEndEstimated(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
              />
            </div>

            <div className="bg-gray-50 border border-gray-200 text-gray-600 px-3 py-2 rounded text-sm">
              <p className="font-medium mb-1">Note:</p>
              <p>State is automatically managed by the system based on anomalies and cannot be edited directly.</p>
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
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
