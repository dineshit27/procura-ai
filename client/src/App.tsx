import React, { useState, useEffect, useCallback } from 'react';
import { NavigationTab, PurchaseRequest, CatalogItem, RequestStatus, ProcurementSettings } from './types';
import {
  INITIAL_CATALOG_ITEMS,
  INITIAL_PURCHASE_REQUESTS,
  INITIAL_ACTIVITY_ITEMS,
  INITIAL_SETTINGS,
} from './data/demoData';
import { checkBackendHealth, fetchPurchaseRequests, HealthCheckResult } from './services/api';
import { Navigation } from './components/Navigation';
import { Header } from './components/Header';
import { OverviewView } from './views/OverviewView';
import { NewRequestView } from './views/NewRequestView';
import { CatalogView } from './views/CatalogView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';

export const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  // Core Data State (authoritatively synchronized with backend)
  const [requests, setRequests] = useState<PurchaseRequest[]>(INITIAL_PURCHASE_REQUESTS);
  const [catalogItems] = useState<CatalogItem[]>(INITIAL_CATALOG_ITEMS);
  const [activity, setActivity] = useState(INITIAL_ACTIVITY_ITEMS);
  const [settings, setSettings] = useState<ProcurementSettings>(INITIAL_SETTINGS);

  // Drilldown selection state
  const [inspectedRequest, setInspectedRequest] = useState<PurchaseRequest | null>(null);
  const [prefilledCatalogItem, setPrefilledCatalogItem] = useState<CatalogItem | null>(null);

  // Synchronize purchase requests from authoritative backend store
  const refreshRequests = useCallback(async () => {
    try {
      const live = await fetchPurchaseRequests();
      if (live && live.length > 0) {
        setRequests(live);
        return live;
      }
    } catch (err) {
      console.debug('[App] Backend requests sync failed, using fallback state:', err);
    }
    return requests;
  }, [requests]);

  useEffect(() => {
    refreshRequests();
  }, []);

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
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-6 antialiased font-sans">
        <div className="bg-white border-2 border-neutral-900 p-6 shadow-brutal max-w-sm w-full text-center space-y-4">
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

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewView
              requests={requests}
              activity={activity}
              onNavigate={setActiveTab}
              onSelectRequest={handleSelectRequestFromOverview}
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
              catalogItems={catalogItems}
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
        <footer className="border-t-2 border-neutral-900 bg-paper-100 py-6 px-6 sm:px-8 mt-12">
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

export default App;
