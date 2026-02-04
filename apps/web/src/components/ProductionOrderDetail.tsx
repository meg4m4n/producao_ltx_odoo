import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ProductionOrder,
  ServiceStage,
  ProductionState,
  ProductionOrderLine,
  ProductionOrderLineSize,
  ProductionAnomaly,
  Severity
} from '../types';
import {
  fetchProductionOrder,
  updateProductionOrder,
  createProductionOrderLine,
  updateProductionOrderLine,
  deleteProductionOrderLine,
  fetchLineSizes,
  upsertLineSize,
  updateLineSize,
  deleteLineSize,
  createAnomaly,
  updateAnomaly,
  deleteAnomaly,
  importSalesLines,
  advanceLineStage
} from '../api';

export default function ProductionOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddLineModal, setShowAddLineModal] = useState(false);
  const [selectedLine, setSelectedLine] = useState<ProductionOrderLine | null>(null);
  const [showAddAnomalyModal, setShowAddAnomalyModal] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [advancingLineId, setAdvancingLineId] = useState<string | null>(null);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

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

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  function getLineRowClassName(state: ProductionState, serviceCurrent: ServiceStage) {
    if (state === 'issue') {
      return 'bg-red-50 hover:bg-red-100 cursor-pointer';
    }
    if (serviceCurrent === 'produced' || ['produced', 'invoiced', 'shipped'].includes(state)) {
      return 'bg-green-50 hover:bg-green-100 cursor-pointer';
    }
    return 'hover:bg-gray-50 cursor-pointer';
  }

  function getAdvanceButtonLabel(serviceCurrent: ServiceStage): string {
    const labelMap: Record<ServiceStage, string> = {
      'planning': 'Advance to cutting',
      'cutting': 'Advance to services',
      'services': 'Advance to sewing',
      'sewing': 'Advance to finishing',
      'finishing': 'Advance to produced'
    };
    return labelMap[serviceCurrent] || 'Done';
  }

  async function handleAdvanceLine(lineId: string) {
    try {
      setAdvancingLineId(lineId);
      setAdvanceError(null);
      await advanceLineStage(lineId);
      if (id) await loadOrder(id);
    } catch (err) {
      setAdvanceError(err instanceof Error ? err.message : 'Failed to advance');
      setTimeout(() => setAdvanceError(null), 5000);
    } finally {
      setAdvancingLineId(null);
    }
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/production')}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← Back to List
          </button>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Production Order: {order.code}</h1>
              {order.state === 'issue' && (
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded">
                  ISSUE
                </span>
              )}
            </div>
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

        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Lines</h2>
            <div className="flex space-x-3">
              {order.sale_ref && (!order.production_order_lines || order.production_order_lines.length === 0) && (
                <button
                  onClick={() => setShowImportConfirm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Importar linhas da SALES
                </button>
              )}
              <button
                onClick={() => setShowAddLineModal(true)}
                className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
              >
                Add Line
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
              {successMessage}
            </div>
          )}

          {advanceError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {advanceError}
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Produce</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produced</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Defect</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!order.production_order_lines || order.production_order_lines.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      No lines yet. Click "Add Line" to create one.
                    </td>
                  </tr>
                ) : (
                  order.production_order_lines.map((line) => {
                    const isProduced = line.service_current === 'produced';
                    const isAdvancing = advancingLineId === line.id;

                    return (
                      <tr
                        key={line.id}
                        className={getLineRowClassName(line.state, line.service_current)}
                      >
                        <td
                          onClick={() => setSelectedLine(line)}
                          className="px-4 py-3 text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          {line.code}
                        </td>
                        <td
                          onClick={() => setSelectedLine(line)}
                          className="px-4 py-3 text-sm text-gray-600 cursor-pointer"
                        >
                          {line.article_ref}
                        </td>
                        <td
                          onClick={() => setSelectedLine(line)}
                          className="px-4 py-3 text-sm text-gray-600 cursor-pointer"
                        >
                          {line.color || '-'}
                        </td>
                        <td
                          onClick={() => setSelectedLine(line)}
                          className="px-4 py-3 text-sm text-gray-600 cursor-pointer"
                        >
                          {line.qty_ordered}
                        </td>
                        <td
                          onClick={() => setSelectedLine(line)}
                          className="px-4 py-3 text-sm text-gray-600 cursor-pointer"
                        >
                          {line.qty_to_produce}
                        </td>
                        <td
                          onClick={() => setSelectedLine(line)}
                          className="px-4 py-3 text-sm text-gray-600 cursor-pointer"
                        >
                          {line.qty_produced}
                        </td>
                        <td
                          onClick={() => setSelectedLine(line)}
                          className="px-4 py-3 text-sm text-gray-600 cursor-pointer"
                        >
                          {line.qty_defect}
                        </td>
                        <td
                          onClick={() => setSelectedLine(line)}
                          className="px-4 py-3 text-sm cursor-pointer"
                        >
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            line.state === 'issue' ? 'bg-red-100 text-red-800' :
                            ['produced', 'invoiced', 'shipped'].includes(line.state) ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {line.state}
                          </span>
                        </td>
                        <td
                          onClick={() => setSelectedLine(line)}
                          className="px-4 py-3 text-sm cursor-pointer"
                        >
                          <span className={`${
                            isProduced ? 'text-gray-400' : 'text-gray-900'
                          }`}>
                            {line.service_current}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdvanceLine(line.id);
                            }}
                            disabled={isProduced || isAdvancing}
                            className={`px-3 py-1 text-xs rounded ${
                              isProduced
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : isAdvancing
                                ? 'bg-gray-300 text-gray-600 cursor-wait'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isAdvancing ? '...' : isProduced ? 'Done' : getAdvanceButtonLabel(line.service_current)}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Anomalies</h2>
            <button
              onClick={() => setShowAddAnomalyModal(true)}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            >
              Add Anomaly
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!order.anomalies || order.anomalies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No anomalies recorded.
                    </td>
                  </tr>
                ) : (
                  order.anomalies.map((anomaly) => {
                    const targetLine = anomaly.production_order_line_id
                      ? order.production_order_lines?.find(l => l.id === anomaly.production_order_line_id)
                      : null;
                    const isBlocking = anomaly.is_blocking && !anomaly.resolved;

                    return (
                      <tr key={anomaly.id} className={isBlocking ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {targetLine ? `Line ${targetLine.code}` : 'Order'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{anomaly.service}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            anomaly.severity === 'high' ? 'bg-red-100 text-red-800' :
                            anomaly.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {anomaly.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{anomaly.description}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-col gap-1">
                            {anomaly.is_blocking && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                                BLOCKING
                              </span>
                            )}
                            {anomaly.resolved ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                RESOLVED
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                                OPEN
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(anomaly.created_at)}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await updateAnomaly(anomaly.id, { resolved: !anomaly.resolved });
                                  if (id) loadOrder(id);
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : 'Failed to update anomaly');
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {anomaly.resolved ? 'Reopen' : 'Resolve'}
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Delete this anomaly?')) {
                                  try {
                                    await deleteAnomaly(anomaly.id);
                                    if (id) loadOrder(id);
                                  } catch (err) {
                                    alert(err instanceof Error ? err.message : 'Failed to delete anomaly');
                                  }
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
                  })
                )}
              </tbody>
            </table>
          </div>
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

      {showAddLineModal && (
        <AddLineModal
          orderId={order.id}
          onClose={() => setShowAddLineModal(false)}
          onSuccess={() => {
            setShowAddLineModal(false);
            if (id) loadOrder(id);
          }}
        />
      )}

      {selectedLine && (
        <LineDetailModal
          line={selectedLine}
          onClose={() => setSelectedLine(null)}
          onSuccess={() => {
            if (id) loadOrder(id);
          }}
          onDelete={() => {
            setSelectedLine(null);
            if (id) loadOrder(id);
          }}
        />
      )}

      {showAddAnomalyModal && (
        <AddAnomalyModal
          orderId={order.id}
          lines={order.production_order_lines || []}
          onClose={() => setShowAddAnomalyModal(false)}
          onSuccess={() => {
            setShowAddAnomalyModal(false);
            if (id) loadOrder(id);
          }}
        />
      )}

      {showImportConfirm && (
        <ImportConfirmModal
          saleRef={order.sale_ref || ''}
          onClose={() => setShowImportConfirm(false)}
          onConfirm={async () => {
            try {
              setShowImportConfirm(false);
              setLoading(true);
              const result = await importSalesLines(order.id);
              await loadOrder(id!);
              setSuccessMessage(`Successfully imported ${result.created_lines} line(s) from sales order ${order.sale_ref}`);
              setTimeout(() => setSuccessMessage(null), 5000);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to import sales lines');
              setTimeout(() => setError(null), 5000);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
    </div>
  );
}

function AddAnomalyModal({ orderId, lines, onClose, onSuccess }: {
  orderId: string;
  lines: ProductionOrderLine[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [target, setTarget] = useState<'order' | 'line'>('order');
  const [lineId, setLineId] = useState('');
  const [service, setService] = useState<ServiceStage>('planning');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [description, setDescription] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    if (target === 'line' && !lineId) {
      setError('Please select a line');
      return;
    }

    try {
      setSubmitting(true);
      await createAnomaly({
        production_order_id: target === 'order' ? orderId : undefined,
        production_order_line_id: target === 'line' ? lineId : undefined,
        service,
        severity,
        description: description.trim(),
        is_blocking: isBlocking,
        resolved,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create anomaly');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Anomaly</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="order"
                    checked={target === 'order'}
                    onChange={() => setTarget('order')}
                    className="mr-2"
                  />
                  Order
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="line"
                    checked={target === 'line'}
                    onChange={() => setTarget('line')}
                    className="mr-2"
                  />
                  Line
                </label>
              </div>
            </div>

            {target === 'line' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Line *
                </label>
                <select
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                  required
                >
                  <option value="">Select a line</option>
                  {lines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.code} - {line.article_ref}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service
              </label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value as ServiceStage)}
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
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                rows={3}
                placeholder="Describe the issue..."
                required
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isBlocking}
                  onChange={(e) => setIsBlocking(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Blocking (triggers issue state)</span>
              </label>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={resolved}
                  onChange={(e) => setResolved(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Resolved</span>
              </label>
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
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddLineModal({ orderId, onClose, onSuccess }: {
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [articleRef, setArticleRef] = useState('');
  const [color, setColor] = useState('');
  const [qtyOrdered, setQtyOrdered] = useState('0');
  const [qtyToProduce, setQtyToProduce] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!articleRef.trim()) {
      setError('Article reference is required');
      return;
    }

    try {
      setSubmitting(true);
      const finalQtyToProduce = qtyToProduce.trim() ? parseInt(qtyToProduce) : parseInt(qtyOrdered);
      await createProductionOrderLine(orderId, {
        article_ref: articleRef.trim(),
        color: color.trim() || undefined,
        qty_ordered: parseInt(qtyOrdered),
        qty_to_produce: finalQtyToProduce,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create line');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Line</h2>

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
                placeholder="e.g., ART-001"
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
                placeholder="e.g., Blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity Ordered
              </label>
              <input
                type="number"
                value={qtyOrdered}
                onChange={(e) => setQtyOrdered(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity To Produce
              </label>
              <input
                type="number"
                value={qtyToProduce}
                onChange={(e) => setQtyToProduce(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                placeholder={`Default: ${qtyOrdered}`}
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">If empty, defaults to quantity ordered</p>
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
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LineDetailModal({ line, onClose, onSuccess, onDelete }: {
  line: ProductionOrderLine;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: () => void;
}) {
  const [qtyOrdered, setQtyOrdered] = useState(line.qty_ordered.toString());
  const [qtyToProduce, setQtyToProduce] = useState(line.qty_to_produce.toString());
  const [qtyProduced, setQtyProduced] = useState(line.qty_produced.toString());
  const [qtyDefect, setQtyDefect] = useState(line.qty_defect.toString());
  const [state, setState] = useState<ProductionState>(line.state);
  const [serviceCurrent, setServiceCurrent] = useState<ServiceStage>(line.service_current);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [sizes, setSizes] = useState<ProductionOrderLineSize[]>([]);
  const [sizesLoading, setSizesLoading] = useState(true);
  const [showAddSizeForm, setShowAddSizeForm] = useState(false);
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);

  useEffect(() => {
    loadSizes();
  }, []);

  async function loadSizes() {
    try {
      setSizesLoading(true);
      const data = await fetchLineSizes(line.id);
      setSizes(data);
    } catch (err) {
      console.error('Failed to load sizes:', err);
    } finally {
      setSizesLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      setSubmitting(true);
      await updateProductionOrderLine(line.id, {
        qty_ordered: parseInt(qtyOrdered),
        qty_to_produce: parseInt(qtyToProduce),
        qty_produced: parseInt(qtyProduced),
        qty_defect: parseInt(qtyDefect),
        state,
        service_current: serviceCurrent,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update line');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      setSubmitting(true);
      await deleteProductionOrderLine(line.id);
      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete line');
      setSubmitting(false);
    }
  }

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Line?</h2>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete line <strong>{line.code}</strong>? This action cannot be undone.
          </p>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-sm mb-4">
              {error}
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Line Details: {line.code}</h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Line Info</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Article Reference</label>
                  <p className="text-gray-900">{line.article_ref}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Color</label>
                  <p className="text-gray-900">{line.color || '-'}</p>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Ordered
                  </label>
                  <input
                    type="number"
                    value={qtyOrdered}
                    onChange={(e) => setQtyOrdered(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity To Produce
                  </label>
                  <input
                    type="number"
                    value={qtyToProduce}
                    onChange={(e) => setQtyToProduce(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Produced
                  </label>
                  <input
                    type="number"
                    value={qtyProduced}
                    onChange={(e) => setQtyProduced(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Defect
                  </label>
                  <input
                    type="number"
                    value={qtyDefect}
                    onChange={(e) => setQtyDefect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value as ProductionState)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                  >
                    <option value="draft">Draft</option>
                    <option value="planned">Planned</option>
                    <option value="in_production">In Production</option>
                    <option value="issue">Issue</option>
                    <option value="produced">Produced</option>
                    <option value="invoiced">Invoiced</option>
                    <option value="shipped">Shipped</option>
                  </select>
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

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-sm">
                    {error}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Sizes</h3>
              <button
                onClick={() => setShowAddSizeForm(!showAddSizeForm)}
                className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
              >
                {showAddSizeForm ? 'Cancel' : 'Add Size'}
              </button>
            </div>

            {showAddSizeForm && (
              <AddSizeForm
                lineId={line.id}
                onSuccess={() => {
                  setShowAddSizeForm(false);
                  loadSizes();
                }}
              />
            )}

            {sizesLoading ? (
              <p className="text-gray-600 text-sm">Loading sizes...</p>
            ) : (
              <div className="border rounded overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">To Produce</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produced</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Defect</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sizes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                          No sizes yet
                        </td>
                      </tr>
                    ) : (
                      sizes.map((size) => (
                        <SizeRow
                          key={size.id}
                          size={size}
                          isEditing={editingSizeId === size.id}
                          onEdit={() => setEditingSizeId(size.id)}
                          onCancelEdit={() => setEditingSizeId(null)}
                          onSave={() => {
                            setEditingSizeId(null);
                            loadSizes();
                          }}
                          onDelete={() => loadSizes()}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddSizeForm({ lineId, onSuccess }: {
  lineId: string;
  onSuccess: () => void;
}) {
  const [size, setSize] = useState('');
  const [qtyOrdered, setQtyOrdered] = useState('0');
  const [qtyToProduce, setQtyToProduce] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!size.trim()) {
      setError('Size is required');
      return;
    }

    try {
      setSubmitting(true);
      await upsertLineSize(lineId, {
        size: size.trim(),
        qty_ordered: parseInt(qtyOrdered),
        qty_to_produce: qtyToProduce.trim() ? parseInt(qtyToProduce) : parseInt(qtyOrdered),
      });
      setSize('');
      setQtyOrdered('0');
      setQtyToProduce('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add size');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-3 bg-gray-50 rounded border">
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Size *</label>
          <input
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
            placeholder="e.g., S, M, L"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Qty Ordered</label>
            <input
              type="number"
              value={qtyOrdered}
              onChange={(e) => setQtyOrdered(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Qty To Produce</label>
            <input
              type="number"
              value={qtyToProduce}
              onChange={(e) => setQtyToProduce(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
              placeholder={qtyOrdered}
              min="0"
            />
          </div>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-2 py-1 rounded text-xs">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? 'Adding...' : 'Add Size'}
        </button>
      </div>
    </form>
  );
}

function SizeRow({ size, isEditing, onEdit, onCancelEdit, onSave, onDelete }: {
  size: ProductionOrderLineSize;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [qtyOrdered, setQtyOrdered] = useState(size.qty_ordered.toString());
  const [qtyToProduce, setQtyToProduce] = useState(size.qty_to_produce.toString());
  const [qtyProduced, setQtyProduced] = useState(size.qty_produced.toString());
  const [qtyDefect, setQtyDefect] = useState(size.qty_defect.toString());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setError(null);
    try {
      setSubmitting(true);
      await updateLineSize(size.id, {
        qty_ordered: parseInt(qtyOrdered),
        qty_to_produce: parseInt(qtyToProduce),
        qty_produced: parseInt(qtyProduced),
        qty_defect: parseInt(qtyDefect),
      });
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update size');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (confirm(`Delete size ${size.size}?`)) {
      try {
        await deleteLineSize(size.id);
        onDelete();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete size');
      }
    }
  }

  if (isEditing) {
    return (
      <>
        <tr className="bg-blue-50">
          <td className="px-3 py-2 text-sm font-medium text-gray-900">{size.size}</td>
          <td className="px-3 py-2">
            <input
              type="number"
              value={qtyOrdered}
              onChange={(e) => setQtyOrdered(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              min="0"
            />
          </td>
          <td className="px-3 py-2">
            <input
              type="number"
              value={qtyToProduce}
              onChange={(e) => setQtyToProduce(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              min="0"
            />
          </td>
          <td className="px-3 py-2">
            <input
              type="number"
              value={qtyProduced}
              onChange={(e) => setQtyProduced(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              min="0"
            />
          </td>
          <td className="px-3 py-2">
            <input
              type="number"
              value={qtyDefect}
              onChange={(e) => setQtyDefect(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              min="0"
            />
          </td>
          <td className="px-3 py-2">
            <div className="flex gap-1">
              <button
                onClick={handleSave}
                disabled={submitting}
                className="text-green-600 hover:text-green-800 text-xs disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={onCancelEdit}
                disabled={submitting}
                className="text-gray-600 hover:text-gray-800 text-xs disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </td>
        </tr>
        {error && (
          <tr>
            <td colSpan={6} className="px-3 py-1 bg-red-50 border-t-0">
              <div className="text-red-600 text-xs">{error}</div>
            </td>
          </tr>
        )}
      </>
    );
  }

  return (
    <tr>
      <td className="px-3 py-2 text-sm font-medium text-gray-900">{size.size}</td>
      <td className="px-3 py-2 text-sm text-gray-600">{size.qty_ordered}</td>
      <td className="px-3 py-2 text-sm text-gray-600">{size.qty_to_produce}</td>
      <td className="px-3 py-2 text-sm text-gray-600">{size.qty_produced}</td>
      <td className="px-3 py-2 text-sm text-gray-600">{size.qty_defect}</td>
      <td className="px-3 py-2 text-sm">
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-800 text-xs"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-800 text-xs"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
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

function ImportConfirmModal({ saleRef, onClose, onConfirm }: {
  saleRef: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Import Lines from Sales</h2>

        <p className="text-gray-700 mb-6">
          This will create production lines from sales order <strong>{saleRef}</strong>.
          Lines will be grouped by article reference and color, with size grids created automatically.
        </p>

        <p className="text-sm text-gray-600 mb-6">
          Continue?
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
