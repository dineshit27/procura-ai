import React, { useState, useEffect, useCallback } from 'react';
import { NavigationTab, PurchaseRequest, CatalogItem, RequestStatus, ProcurementSettings } from '../types';
import {
  INITIAL_PURCHASE_REQUESTS,
  INITIAL_ACTIVITY_ITEMS,
  INITIAL_SETTINGS,
} from '../data/demoData';
import { checkBackendHealth, fetchPurchaseRequests, HealthCheckResult, isAuthorizationError } from '../services/api';
import { Navigation } from '../components/Navigation';
import { Header } from '../components/Header';
import { OverviewView } from '../views/OverviewView';
import { NewRequestView } from '../views/NewRequestView';
import { CatalogView } from '../views/CatalogView';
import { HistoryView } from '../views/HistoryView';
import { SettingsView } from '../views/SettingsView';
import { useAuth } from '../auth/AuthContext';

const DASHBOARD_TABS: NavigationTab[] = [
  'overview',
  'new-request',
  'catalog',
  'history',
  'settings',
];

function readInitialTab(search: string): NavigationTab {
  const params = new URLSearchParams(search);
  if (params.get('paypal_return') === 'true' || params.get('paypal_cancel') === 'true') {
    return 'overview';
  }
  const tab = params.get('tab');
  if (tab && DASHBOARD_TABS.includes(tab as NavigationTab)) {
    return tab as NavigationTab;
  }
  return 'overview';
}

export const DashboardPage: React.FC = () => {
  const { signOut } = useAuth();
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavigationTab>(() =>
    readInitialTab(window.location.search)
  );
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  // Core Data State (authoritatively synchronized with backend)
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState<boolean>(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [isUsingDemoFallback, setIsUsingDemoFallback] = useState<boolean>(false);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);
  const [activity, setActivity] = useState(INITIAL_ACTIVITY_ITEMS);
  const [settings, setSettings] = useState<ProcurementSettings>(INITIAL_SETTINGS);

  // Drilldown selection state
  const [inspectedRequest, setInspectedRequest] = useState<PurchaseRequest | null>(null);
  const [prefilledCatalogItem, setPrefilledCatalogItem] = useState<CatalogItem | null>(null);

  // Synchronize purchase requests from authoritative backend store
  const refreshRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const live = await fetchPurchaseRequests();
      if (Array.isArray(live)) {
        // Authoritative API response (even if empty []) replaces list cleanly
        setRequests(live);
        setIsUsingDemoFallback(false);
        setRequestsError(null);
        setAuthorizationError(null);
        return live;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      if (isAuthorizationError(err)) {
        // A signed-in user without a trusted role must never be shown data that
        // could be mistaken for the protected backend dataset.
        setRequests([]);
        setIsUsingDemoFallback(false);
        setAuthorizationError(msg);
        setRequestsError(null);
        return [];
      }
      console.warn('[App] Backend requests sync failed. Explicit demo fallback activated:', err);
      // Demo data is only used for a backend/network failure, and is always
      // visibly marked as simulated. Authorization failures are handled above.
      setRequests((prev) => (prev.length === 0 ? INITIAL_PURCHASE_REQUESTS : prev));
      setIsUsingDemoFallback(true);
      setAuthorizationError(null);
      setRequestsError(msg);
    } finally {
      setRequestsLoading(false);
    }
    return requests;
  }, [requests]);

  useEffect(() => {
    refreshRequests();
  }, []);

  // Auto-recovery: when in fallback mode, periodically poll until backend responds
  useEffect(() => {
    if (!isUsingDemoFallback) return;

    const interval = setInterval(() => {
      refreshRequests();
    }, 12000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshRequests();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isUsingDemoFallback, refreshRequests]);

  // Backend Health Integration (Preserving Phase 1)
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);

  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true);
    const res = await checkBackendHealth();
    setHealthResult(res);
    setLoadingHealth(false);
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // PayPal Sandbox redirect return handler (supports popup postMessage and direct navigation)
  const [popupNotice, setPopupNotice] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isReturn = params.get('paypal_return') === 'true';
    const isCancel = params.get('paypal_cancel') === 'true';
    const token = params.get('token');
    const reqId = params.get('purchaseRequestId');
    const payerId = params.get('PayerID');

    if (isReturn) {
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(
            {
              type: 'PAYPAL_ORDER_APPROVED',
              token,
              purchaseRequestId: reqId,
              payerId,
            },
            window.location.origin
          );
        } catch (e) {
          console.debug('[App] Failed to postMessage to opener:', e);
        }
        setPopupNotice('PayPal Sandbox approval complete! Closing window...');
        setTimeout(() => {
          window.close();
        }, 1200);
      } else if (reqId) {
        setActiveTab('history');
        refreshRequests().then((liveList) => {
          const found = liveList.find((r) => r.id === reqId);
          if (found) setInspectedRequest(found);
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else if (isCancel) {
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(
            {
              type: 'PAYPAL_ORDER_CANCELLED',
              purchaseRequestId: reqId,
            },
            window.location.origin
          );
        } catch (e) {
          console.debug('[App] Failed to postMessage to opener:', e);
        }
        setPopupNotice('PayPal Sandbox checkout cancelled. Closing window...');
        setTimeout(() => {
          window.close();
        }, 1200);
      } else if (reqId) {
        setActiveTab('history');
        const found = requests.find((r) => r.id === reqId);
        if (found) setInspectedRequest(found);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [requests, refreshRequests]);

  // Handlers
  const handleAddRequest = (newReq: PurchaseRequest) => {
    setRequests((prev) => [newReq, ...prev]);

    // Record in activity feed
    setActivity((prev) => [
      {
        id: `ACT-${Date.now()}`,
        title: newReq.status === 'draft' ? 'New Draft Created' : 'Request Submitted',
        description: `${newReq.id} (${newReq.title.slice(0, 35)}...) added to pipeline.`,
        timestamp: 'Just now',
        type: 'request_created',
        amount: newReq.estimatedTotal,
      },
      ...prev,
    ]);
    setPrefilledCatalogItem(null);
  };

  const handleUpdateRequestStatus = (id: string, newStatus: RequestStatus) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );

    const targetReq = requests.find((r) => r.id === id);
    setActivity((prev) => [
      {
        id: `ACT-${Date.now()}`,
        title: 'Status Updated',
        description: `${id} transitioned to ${newStatus.toUpperCase().replace('_', ' ')}.`,
        timestamp: 'Just now',
        type: 'status_changed',
        amount: targetReq?.estimatedTotal,
      },
      ...prev,
    ]);
  };

  const handlePaymentSuccess = (updatedReq: PurchaseRequest) => {
    // Immediate optimistic update
    setRequests((prev) =>
      prev.map((r) => (r.id === updatedReq.id ? updatedReq : r))
    );

    // Re-synchronize with authoritative backend store
    refreshRequests();

    setActivity((prev) => [
      {
        id: `ACT-${Date.now()}`,
        title: 'PayPal Sandbox Settlement Confirmed',
        description: `${updatedReq.id} settled in PayPal Sandbox (${updatedReq.paymentDetails?.captureId || updatedReq.paymentDetails?.paypalOrderId || 'COMPLETED'}).`,
        timestamp: 'Just now',
        type: 'status_changed',
        amount: updatedReq.estimatedTotal,
      },
      ...prev,
    ]);
  };

  const handleSelectCatalogItemForRequest = (item: CatalogItem) => {
    setPrefilledCatalogItem(item);
    setActiveTab('new-request');
  };

  const handleSelectRequestFromOverview = (req: PurchaseRequest) => {
    setInspectedRequest(req);
    setActiveTab('history');
  };

  const handleSaveSettings = (newSettings: ProcurementSettings) => {
    setSettings(newSettings);
    setActivity((prev) => [
      {
        id: `ACT-${Date.now()}`,
        title: 'Policy Configuration Saved',
        description: `Department spending limits updated to $${newSettings.defaultBudgetLimit.toFixed(2)}.`,
        timestamp: 'Just now',
        type: 'settings_saved',
      },
      ...prev,
    ]);
  };

  const handleResetSettings = () => {
    setSettings(INITIAL_SETTINGS);
  };

  if (popupNotice) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-4 sm:p-6 antialiased font-sans">
        <div className="bg-white border-2 border-neutral-900 p-4 sm:p-6 shadow-brutal max-w-sm w-full text-center space-y-4">
          <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-100 border border-neutral-900 text-emerald-950 font-mono text-[11px] font-bold">
            <span>PAYPAL SANDBOX</span>
          </div>
          <div className="text-sm font-mono font-bold text-neutral-900">{popupNotice}</div>
          <button
            onClick={() => window.close()}
            className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase border-2 border-neutral-900 shadow-brutal-xs"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-neutral-900 flex flex-col lg:flex-row antialiased font-sans">
      {/* Navigation Sidebar */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'history') setInspectedRequest(null);
        }}
        healthResult={healthResult}
        loadingHealth={loadingHealth}
        onRefreshHealth={fetchHealth}
        mobileOpen={mobileNavOpen}
        onToggleMobile={() => setMobileNavOpen(!mobileNavOpen)}
        onSignOut={() => { void signOut(); }}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          onNewRequestClick={() => {
            setActiveTab('new-request');
            setInspectedRequest(null);
          }}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-8">
          {/* Explicit Offline Demo Fallback Banner */}
          {authorizationError && (
            <div className="mb-6 bg-red-50 border-2 border-red-700 p-4 text-xs font-mono text-red-950 shadow-brutal-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="w-fit px-2 py-0.5 bg-red-200 border border-red-700 font-bold uppercase text-[10px]">
                  Authorization Required
                </span>
                <span className="font-semibold">Live procurement records are unavailable until your Procura role is assigned.</span>
                <p className="text-[11px] text-red-900/80 break-words">Connection detail: {authorizationError}</p>
              </div>
              <button
                onClick={() => refreshRequests()}
                disabled={requestsLoading}
                className="self-start sm:self-auto px-3 py-1 bg-white border-2 border-neutral-900 text-neutral-900 font-bold text-xs hover:bg-neutral-100 shadow-brutal-xs cursor-pointer disabled:opacity-50"
              >
                {requestsLoading ? 'Checking Access...' : 'Retry Access Check'}
              </button>
            </div>
          )}
          {isUsingDemoFallback && (
            <div className="mb-6 bg-amber-50 border-2 border-amber-600 p-4 text-xs font-mono text-amber-950 shadow-brutal-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-200 border border-amber-600 font-bold uppercase text-[10px]">
                    Offline Demo Fallback
                  </span>
                  <span className="font-semibold">
                    Backend synchronization paused — displaying simulated demonstration records.
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 border border-amber-300">
                    Auto-recovering
                  </span>
                </div>
                {requestsError && (
                  <p className="text-[11px] text-amber-900/80 break-words pl-0.5">
                    Connection detail: {requestsError}
                  </p>
                )}
              </div>
              <button
                onClick={() => refreshRequests()}
                disabled={requestsLoading}
                className="self-start sm:self-auto px-3 py-1 bg-white border-2 border-neutral-900 text-neutral-900 font-bold text-xs hover:bg-neutral-100 shadow-brutal-xs cursor-pointer disabled:opacity-50"
              >
                {requestsLoading ? 'Connecting...' : 'Retry Connection'}
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <OverviewView
              requests={requests}
              activity={activity}
              isUsingDemoFallback={isUsingDemoFallback}
              onNavigate={setActiveTab}
              onSelectRequest={handleSelectRequestFromOverview}
              onRefreshRequests={refreshRequests}
            />
          )}

          {activeTab === 'new-request' && (
            <NewRequestView
              onAddRequest={handleAddRequest}
              onNavigate={setActiveTab}
              approvedSuppliers={settings.approvedSuppliers}
              prefilledItem={prefilledCatalogItem}
            />
          )}

          {activeTab === 'catalog' && (
            <CatalogView
              onSelectForRequest={handleSelectCatalogItemForRequest}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              requests={requests}
              onUpdateRequestStatus={handleUpdateRequestStatus}
              selectedRequestFromOverview={inspectedRequest}
              onClearSelectedRequest={() => setInspectedRequest(null)}
              onPaymentSuccess={handlePaymentSuccess}
              onRefreshRequests={refreshRequests}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onResetSettings={handleResetSettings}
            />
          )}
        </main>

        {/* Editorial Footer */}
        <footer className="border-t-2 border-neutral-900 bg-paper-100 py-5 px-4 sm:px-8 mt-8 sm:mt-12">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-600">
            <div>
              <strong>Procura AI</strong> &bull; Phase 2 Neo-Brutalist Procurement System &bull; PayPal AI Hackathon
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-paper-300 border border-neutral-900 px-2 py-0.5 text-[10px] uppercase font-bold text-neutral-800">
                Demo Workspace
              </span>
              <span>All catalog items & orders are simulated records</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardPage;
