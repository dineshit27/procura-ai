import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Building,
  Calendar,
  X,
  ShieldAlert,
  CreditCard,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { PurchaseRequest, RequestStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PayPalCheckoutModal } from '../components/PayPalCheckoutModal';
import { updateRequestStatusOnServer } from '../services/api';

interface HistoryViewProps {
  requests: PurchaseRequest[];
  onUpdateRequestStatus: (id: string, newStatus: RequestStatus) => void;
  selectedRequestFromOverview?: PurchaseRequest | null;
  onClearSelectedRequest: () => void;
  onPaymentSuccess: (updatedRequest: PurchaseRequest) => void;
  onRefreshRequests?: () => Promise<PurchaseRequest[] | void>;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  requests,
  onUpdateRequestStatus,
  selectedRequestFromOverview,
  onClearSelectedRequest,
  onPaymentSuccess,
  onRefreshRequests,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeRequest, setActiveRequest] = useState<PurchaseRequest | null>(
    selectedRequestFromOverview || null
  );
  const [checkoutRequest, setCheckoutRequest] = useState<PurchaseRequest | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);


  // Synchronize activeRequest in drawer whenever authoritative requests array updates
  useEffect(() => {
    if (activeRequest) {
      const fresh = requests.find((r) => r.id === activeRequest.id);
      if (
        fresh &&
        (fresh.status !== activeRequest.status ||
          fresh.paymentDetails?.status !== activeRequest.paymentDetails?.status ||
          fresh.complianceNotes !== activeRequest.complianceNotes)
      ) {
        setActiveRequest(fresh);
      }
    }
  }, [requests]);

  const handleManualRefresh = async () => {
    if (!onRefreshRequests) return;
    setIsRefreshing(true);
    try {
      await onRefreshRequests();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const statusTabs: { id: string; label: string }[] = [
    { id: 'all', label: 'All Records' },
    { id: 'draft', label: 'Drafts' },
    { id: 'pending_approval', label: 'Pending Approval' },
    { id: 'approved', label: 'Approved' },
    { id: 'paid', label: 'Paid (Demo)' },
    { id: 'failed', label: 'Failed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = r.id.toLowerCase().includes(q);
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesSupplier = r.selectedSupplier?.toLowerCase().includes(q);
        const matchesPrompt = r.prompt.toLowerCase().includes(q);
        return matchesId || matchesTitle || matchesSupplier || matchesPrompt;
      }
      return true;
    });
  }, [requests, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search & Status Filters */}
      <div className="bg-white border-2 border-neutral-900 p-4 sm:p-5 shadow-brutal space-y-4">
        {/* Search & Refresh */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records by Request ID, title, item name, or vendor..."
              className="w-full pl-10 pr-4 py-2.5 border-2 border-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt-700 shadow-brutal-xs"
              id="history-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {onRefreshRequests && (
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 border-2 border-neutral-900 bg-paper-100 hover:bg-paper-200 text-neutral-900 font-bold text-xs uppercase tracking-wider shadow-brutal-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Synchronize with backend authoritative database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cobalt-700' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-2 border-t border-neutral-200">
          <Filter className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
          <span className="text-xs font-mono font-bold text-neutral-700 mr-1 uppercase">
            Status:
          </span>
          {statusTabs.map((tab) => {
            const count =
              tab.id === 'all'
                ? requests.length
                : requests.filter((r) => r.status === tab.id).length;

            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 text-xs font-bold whitespace-nowrap border-2 transition flex items-center space-x-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-brutal-xs'
                    : 'bg-paper-100 text-neutral-700 border-neutral-400 hover:border-neutral-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white border-2 border-neutral-900 shadow-brutal overflow-hidden">
        {/* Mobile uses compact request cards; the complete audit table remains available from sm upward. */}
        <div className="sm:hidden divide-y divide-neutral-200">
          {filteredRequests.length === 0 ? (
            <div className="py-12 px-4 text-center text-neutral-500 text-xs">
              No purchase history records found matching criteria.
            </div>
          ) : (
            filteredRequests.map((req) => (
              <article key={req.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-neutral-900 leading-snug">{req.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-neutral-500">
                      <span className="font-bold text-neutral-700">{req.id}</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" aria-hidden="true" />
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={req.status} size="sm" />
                </div>
                <div className="text-xs text-neutral-600 leading-snug line-clamp-2">
                  {req.selectedItemName || req.prompt}
                </div>
                <div className="flex items-end justify-between gap-3 border-t border-neutral-200 pt-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-neutral-500">Committed total</div>
                    <div className="font-mono font-bold text-base text-neutral-900">${req.estimatedTotal.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => setActiveRequest(req)}
                    className="min-h-10 px-3 py-2 text-xs font-bold border-2 border-neutral-900 bg-paper-100 hover:bg-neutral-900 hover:text-white transition shadow-brutal-xs"
                    aria-label={`View details for ${req.title}`}
                  >
                    View details
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden sm:block overflow-x-auto" aria-label="Purchase history table. Scroll horizontally to view all columns.">
          <table className="min-w-[720px] w-full text-left border-collapse" id="history-data-table">
            <thead>
              <tr className="bg-paper-200 border-b-2 border-neutral-900 text-xs font-mono uppercase tracking-wider text-neutral-700">
                <th className="py-3.5 px-4">Request ID & Date</th>
                <th className="py-3.5 px-4">Description / Product</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Committed Total</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500 text-xs">
                    No purchase history records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-paper-100 transition-colors">
                    {/* ID & Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-neutral-900">{req.id}</div>
                      <div className="text-xs font-mono text-neutral-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>

                    {/* Title & Product */}
                    <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                      <div className="font-bold text-neutral-900 truncate">{req.title}</div>
                      <div className="text-xs text-neutral-600 truncate mt-0.5">
                        {req.selectedItemName || req.prompt}
                      </div>
                      {req.selectedSupplier && (
                        <div className="text-[11px] font-mono text-neutral-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-neutral-400" />
                          <span>{req.selectedSupplier}</span>
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-xs font-semibold text-neutral-700 whitespace-nowrap">
                      {req.category}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={req.status} size="sm" />
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900 whitespace-nowrap">
                      ${req.estimatedTotal.toFixed(2)}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setActiveRequest(req)}
                        className="px-2.5 py-1.5 text-xs font-bold border-2 border-neutral-900 bg-paper-100 hover:bg-neutral-900 hover:text-white transition shadow-brutal-xs"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-paper-100 border-t-2 border-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-neutral-600 font-mono">
          <span>Showing {filteredRequests.length} of {requests.length} total demo transactions</span>
          <span className="text-[11px] text-neutral-500">Local Sandbox Ledger</span>
        </div>
      </div>

      {/* Transaction Inspection Drawer / Modal */}
      {activeRequest && (
        <div className="fixed inset-0 bg-neutral-900/60 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-[#FBF9F5] border-2 border-neutral-900 max-w-2xl w-full p-4 sm:p-8 shadow-brutal-lg max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] overflow-y-auto space-y-6" role="dialog" aria-modal="true" aria-label={`Purchase request details for ${activeRequest.id}`}>
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-neutral-600">{activeRequest.id}</span>
                  <StatusBadge status={activeRequest.status} size="sm" />
                </div>
                <h3 className="text-xl font-extrabold text-neutral-900 mt-2">
                  {activeRequest.title}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActiveRequest(null);
                  onClearSelectedRequest();
                }}
                className="p-1.5 border-2 border-neutral-900 bg-white hover:bg-paper-200 shadow-brutal-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment status display */}
            {activeRequest.status === 'paid' && activeRequest.paymentDetails ? (
              <div className="p-3 bg-emerald-50 border-2 border-emerald-700 text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold uppercase tracking-wide">PayPal Sandbox Settlement Confirmed.</span>{' '}
                  <span>Order: <code className="font-mono">{activeRequest.paymentDetails.paypalOrderId}</code></span>
                  {activeRequest.paymentDetails.captureId && (
                    <span> · Capture: <code className="font-mono">{activeRequest.paymentDetails.captureId}</code></span>
                  )}
                  {activeRequest.paymentDetails.capturedAt && (
                    <span> · {new Date(activeRequest.paymentDetails.capturedAt).toLocaleString()}</span>
                  )}
                  <span className="block text-[11px] mt-0.5 text-emerald-700 font-mono">SANDBOX — NO REAL FUNDS MOVED</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-paper-200 border border-neutral-900 text-xs text-neutral-700 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-neutral-800 flex-shrink-0 mt-0.5" />
                <span>
                  All purchase data is stored in server memory for this development sandbox session.
                  PayPal Sandbox checkout is available for approved requests.
                </span>
              </div>
            )}

            {/* Prompt details */}
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold uppercase text-neutral-700">Original Purchasing Need:</div>
              <p className="p-3 bg-white border border-neutral-900 text-xs text-neutral-800 font-sans leading-relaxed">
                "{activeRequest.prompt}"
              </p>
            </div>

            {/* Metadata Table */}
            <div className="bg-white border-2 border-neutral-900 divide-y divide-neutral-200 text-xs font-mono">
              <div className="p-2.5 flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span className="text-neutral-500">Category:</span>
                <span className="font-bold text-neutral-900">{activeRequest.category}</span>
              </div>
              <div className="p-2.5 flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span className="text-neutral-500">Fulfillment Supplier:</span>
                <span className="font-bold text-neutral-900">
                  {activeRequest.selectedSupplier || 'TBD (Catalog Option Selection)'}
                </span>
              </div>
              <div className="p-2.5 flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span className="text-neutral-500">Quantity Ordered:</span>
                <span className="font-bold text-neutral-900">{activeRequest.quantity} units</span>
              </div>
              <div className="p-2.5 flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span className="text-neutral-500">Authorized Budget Limit:</span>
                <span className="font-bold text-neutral-900">
                  ${activeRequest.budgetLimit.toFixed(2)} USD
                </span>
              </div>
              <div className="p-2.5 flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span className="text-neutral-500">Estimated Total:</span>
                <span className="font-bold text-cobalt-700 text-sm">
                  ${activeRequest.estimatedTotal.toFixed(2)} USD
                </span>
              </div>
              <div className="p-2.5 flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span className="text-neutral-500">Delivery SLA:</span>
                <span className="font-bold text-neutral-900 uppercase">
                  {activeRequest.urgency}
                </span>
              </div>
              {activeRequest.policyDecision && (
                <div className="p-2.5 flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                  <span className="text-neutral-500">Policy Engine Decision:</span>
                  <span
                    className={`px-2 py-0.5 text-[11px] font-extrabold uppercase border border-neutral-900 ${
                      activeRequest.policyDecision === 'ALLOWED'
                        ? 'bg-emerald-100 text-emerald-900'
                        : activeRequest.policyDecision === 'NEEDS_APPROVAL'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-rose-100 text-rose-900'
                    }`}
                  >
                    {activeRequest.policyDecision}
                  </span>
                </div>
              )}
            </div>

            {/* SpendGuard Rules Evaluation Matrix */}
            {activeRequest.policyResult?.rules && activeRequest.policyResult.rules.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-800">
                  SpendGuard Automated Rules Matrix:
                </div>
                <div className="bg-white border-2 border-neutral-900 divide-y divide-neutral-200">
                  {activeRequest.policyResult.rules.map((rule, idx) => (
                    <div key={idx} className="p-2.5 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-neutral-900 font-mono text-[11px]">{rule.ruleName}</div>
                        <div className="text-neutral-600 leading-snug">{rule.message}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 font-mono font-bold text-[10px] uppercase border border-neutral-900 flex-shrink-0 ${
                          rule.status === 'PASSED'
                            ? 'bg-emerald-100 text-emerald-950'
                            : rule.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-950'
                            : 'bg-amber-100 text-amber-950'
                        }`}
                      >
                        {rule.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compliance notes */}
            {activeRequest.complianceNotes && (
              <div className="p-3 bg-white border border-neutral-900 text-xs">
                <div className="font-bold text-neutral-900 uppercase text-[11px] font-mono mb-1">
                  Compliance & Evaluation Notes:
                </div>
                <p className="text-neutral-700">{activeRequest.complianceNotes}</p>
              </div>
            )}

            {/* Inline Action Error Alert */}
            {actionError && (
              <div className="p-3 bg-rose-50 border-2 border-rose-900 text-xs text-rose-950 flex items-start gap-2 shadow-brutal-xs">
                <ShieldAlert className="w-4 h-4 text-rose-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <span className="font-bold uppercase font-mono tracking-wide">SpendGuard Action Blocked:</span>
                  <p className="leading-snug">{actionError}</p>
                </div>
              </div>
            )}

            {/* Workflow status transitions */}
            <div className="pt-4 border-t-2 border-neutral-900 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-mono text-neutral-600">Workflow actions:</div>
              <div className="flex w-full sm:w-auto flex-col sm:flex-row flex-wrap gap-2">
                {/* PayPal Sandbox Checkout — only for approved, not yet paid */}
                {activeRequest.status === 'approved' && (
                  <button
                    onClick={() => {
                      setActionError(null);
                      setCheckoutRequest(activeRequest);
                    }}
                    className="w-full sm:w-auto px-3 py-2 text-xs font-bold border-2 border-neutral-900 bg-cobalt-700 hover:bg-cobalt-800 text-white shadow-brutal-xs brutal-btn flex items-center justify-center gap-1.5"
                    id="paypal-checkout-btn"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>PayPal Sandbox Checkout</span>
                  </button>
                )}

                {activeRequest.status === 'pending_approval' && (
                  <button
                    disabled={actionLoading}
                    onClick={async () => {
                      setActionLoading(true);
                      setActionError(null);
                      try {
                        const updated = await updateRequestStatusOnServer(activeRequest.id, 'approved');
                        onUpdateRequestStatus(activeRequest.id, 'approved');
                        setActiveRequest(updated);
                        if (onRefreshRequests) await onRefreshRequests();
                      } catch (err) {
                        console.error('[HistoryView] Failed to approve request on server:', err);
                        setActionError(err instanceof Error ? err.message : 'Approval rejected by SpendGuard policy engine.');
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="w-full sm:w-auto px-3 py-2 text-xs font-bold border-2 border-neutral-900 bg-emerald-600 hover:bg-emerald-700 text-white shadow-brutal-xs brutal-btn disabled:opacity-50"
                  >
                    {actionLoading ? 'Verifying Budget...' : '✓ Approve Request'}
                  </button>
                )}
                {activeRequest.status === 'draft' && (
                  <button
                    disabled={actionLoading}
                    onClick={async () => {
                      setActionLoading(true);
                      setActionError(null);
                      try {
                        const updated = await updateRequestStatusOnServer(activeRequest.id, 'pending_approval');
                        onUpdateRequestStatus(activeRequest.id, 'pending_approval');
                        setActiveRequest(updated);
                        if (onRefreshRequests) await onRefreshRequests();
                      } catch (err) {
                        console.error('[HistoryView] Failed to submit request on server:', err);
                        setActionError(err instanceof Error ? err.message : 'Server error');
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="w-full sm:w-auto px-3 py-2 text-xs font-bold border-2 border-neutral-900 bg-amber-400 text-amber-950 shadow-brutal-xs brutal-btn disabled:opacity-50"
                  >
                    Submit for Approval
                  </button>
                )}
                {activeRequest.status !== 'cancelled' && activeRequest.status !== 'paid' && (
                  <button
                    disabled={actionLoading}
                    onClick={async () => {
                      setActionLoading(true);
                      setActionError(null);
                      try {
                        const updated = await updateRequestStatusOnServer(activeRequest.id, 'cancelled');
                        onUpdateRequestStatus(activeRequest.id, 'cancelled');
                        setActiveRequest(updated);
                        if (onRefreshRequests) await onRefreshRequests();
                      } catch (err) {
                        console.error('[HistoryView] Failed to cancel request on server:', err);
                        setActionError(err instanceof Error ? err.message : 'Server error');
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="w-full sm:w-auto px-3 py-2 text-xs font-bold border-2 border-neutral-900 bg-stone-200 text-stone-800 hover:bg-stone-300 shadow-brutal-xs brutal-btn disabled:opacity-50"
                  >
                    Cancel Request
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveRequest(null);
                    setActionError(null);
                    onClearSelectedRequest();
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold border-2 border-neutral-900 bg-white hover:bg-paper-100 shadow-brutal-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* PayPal Checkout Modal */}
      {checkoutRequest && (
        <PayPalCheckoutModal
          request={checkoutRequest}
          onClose={() => setCheckoutRequest(null)}
          onPaymentSuccess={(updatedReq) => {
            onPaymentSuccess(updatedReq);
            setActiveRequest(updatedReq);
            // Notice: Modal remains mounted to present its cryptographic capture confirmation screen.
            // When the user clicks "Close & Return to History", onClose fires and unmounts the modal.
          }}
        />
      )}
    </div>
  );
};
