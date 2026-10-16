import fs from 'node:fs';
import path from 'node:path';
import { ServerPurchaseRequest, PurchaseRequestStatus } from '../types/checkout.js';
import { CATALOG_ITEMS } from './catalog.js';
import { evaluatePurchasingPolicy } from '../services/policyEngine.js';

/**
 * In-memory authoritative store for Purchase Requests.
 *
 * NOTE ON APPLICATION LIMITATION:
 * This in-memory store serves development and sandbox validation. It is not
 * backed by persistent database storage or authenticated user sessions.
 * Server restarts will reset requests to their initial demonstration seed.
 */

function buildInitialRequests(): ServerPurchaseRequest[] {
  const initialData: Omit<ServerPurchaseRequest, 'authoritativeUnitPrice' | 'authoritativeTotal' | 'currency' | 'policyDecision' | 'policyResult'>[] = [
    {
      id: 'REQ-2026-081',
      title: 'Dual 4K Workstation Monitors for New Senior Frontend Dev',
      category: 'IT & Hardware',
      prompt: 'Need two 27-inch 4K color-calibrated monitors with USB-C single cable dock connection for onboarding workstation.',
      budgetLimit: 1200.0,
      quantity: 2,
      catalogItemId: 'CAT-101',
      preferredSupplier: 'Apex Business Hardware (Demo Supplier)',
      createdAt: '2026-10-12T14:32:00Z',
      status: 'approved',
      selectedSupplier: 'Apex Business Hardware (Demo Supplier)',
      selectedItemName: 'Dell UltraSharp 27" 4K USB-C Hub Monitor (U2723QE)',
      urgency: 'standard',
      complianceNotes: 'Within $1,200 budget limit ($142 savings). Approved by Engineering Lead.',
    },
    {
      id: 'REQ-2026-080',
      title: 'Ergonomic Task Seating for Remote Operations Manager',
      category: 'Office Ergonomics',
      prompt: 'Require high-back ergonomic lumbar support chair for remote home office setup with heavy daily usage.',
      budgetLimit: 1000.0,
      quantity: 1,
      catalogItemId: 'CAT-105',
      preferredSupplier: 'Kinetic Workspaces Ltd. (Demo Supplier)',
      createdAt: '2026-10-11T09:15:00Z',
      status: 'pending_approval',
      selectedSupplier: 'Kinetic Workspaces Ltd. (Demo Supplier)',
      selectedItemName: 'Steelcase Gesture Ergonomic Office Task Chair',
      urgency: 'flexible',
      complianceNotes: 'Matches $1,000 threshold. Awaiting Finance department final signoff.',
    },
    {
      id: 'REQ-2026-079',
      title: 'Q4 Annual Cloud Developer Seat Subscriptions (5 seats)',
      category: 'Software & Cloud',
      prompt: 'Annual renewal for 5 GitHub Enterprise developer seats to maintain automated code scanning and CI/CD pipelines.',
      budgetLimit: 1300.0,
      quantity: 5,
      catalogItemId: 'CAT-107',
      preferredSupplier: 'CloudScale Distribution (Demo Supplier)',
      createdAt: '2026-10-09T11:20:00Z',
      status: 'paid',
      selectedSupplier: 'CloudScale Distribution (Demo Supplier)',
      selectedItemName: 'GitHub Enterprise Cloud (Annual Organization Seat)',
      urgency: 'standard',
      complianceNotes: 'Processed via PayPal Sandbox Mock Settlement. Verification ref: #DEMO-PAY-9812.',
      paymentDetails: {
        paypalOrderId: 'DEMO-ORDER-9812',
        captureId: 'DEMO-CAP-9812',
        status: 'COMPLETED',
        amount: 1260.0,
        currency: 'USD',
        capturedAt: '2026-10-09T11:25:00Z',
        isSandbox: true,
      },
    },
    {
      id: 'REQ-2026-078',
      title: 'Standing Desk Setup for Customer Support Pod',
      category: 'Office Ergonomics',
      prompt: 'Two motorized height-adjustable desks with cable trays for rotating support reps.',
      budgetLimit: 950.0,
      quantity: 2,
      catalogItemId: 'CAT-103',
      preferredSupplier: 'Kinetic Workspaces Ltd. (Demo Supplier)',
      createdAt: '2026-10-05T16:45:00Z',
      status: 'draft',
      selectedSupplier: 'Kinetic Workspaces Ltd. (Demo Supplier)',
      selectedItemName: 'ErgoPro Electric Height-Adjustable Standing Desk (60" x 30")',
      urgency: 'flexible',
      complianceNotes: 'Exceeds target budget by $28. Draft preserved for budget revision.',
    },
    {
      id: 'REQ-2026-082',
      title: 'Massive Ergonomic Suite (Exceeds Single Order Budget)',
      category: 'Office Ergonomics',
      prompt: 'Order 10 executive ergonomic chairs for regional meeting rooms.',
      budgetLimit: 15000.0,
      quantity: 10,
      catalogItemId: 'CAT-104',
      preferredSupplier: 'Kinetic Workspaces Ltd. (Demo Supplier)',
      createdAt: '2026-10-13T10:00:00Z',
      status: 'draft',
      selectedSupplier: 'Kinetic Workspaces Ltd. (Demo Supplier)',
      selectedItemName: 'Herman Miller Aeron Chair (Size B - Fully Loaded)',
      urgency: 'flexible',
      complianceNotes: 'Exceeds organizational single-order policy cap ($10,000).',
    },
  ];

  return initialData.map((req) => {
    const item = CATALOG_ITEMS.find((c) => c.id === req.catalogItemId);
    const unitPrice = item ? item.price : 0;
    const total = Number((unitPrice * req.quantity).toFixed(2));
    const currency = item?.currency || 'USD';
    const policyResult = evaluatePurchasingPolicy({
      catalogItemId: req.catalogItemId,
      quantity: req.quantity,
      userSpecifiedBudget: req.budgetLimit,
    });

    return {
      ...req,
      authoritativeUnitPrice: unitPrice,
      authoritativeTotal: total,
      currency,
      policyDecision: policyResult.decision,
      policyResult,
    };
  });
}

function getPersistenceFilePath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'server', 'data', 'purchaseRequests.json'),
    path.resolve(process.cwd(), 'data', 'purchaseRequests.json'),
    path.resolve(__dirname, '../../../data/purchaseRequests.json'),
  ];
  const existing = candidates.find((c) => fs.existsSync(c));
  if (existing) return existing;

  // Default to server/data if directory exists, else cwd/data
  if (fs.existsSync(path.resolve(process.cwd(), 'server'))) {
    return path.resolve(process.cwd(), 'server', 'data', 'purchaseRequests.json');
  }
  return path.resolve(process.cwd(), 'data', 'purchaseRequests.json');
}

function saveToDisk(store: Map<string, ServerPurchaseRequest>): void {
  // Unit tests run on isolated in-memory stores to keep live data safe
  if (process.env.NODE_ENV === 'test') return;
  try {
    const filePath = getPersistenceFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = JSON.stringify(Array.from(store.values()), null, 2);
    fs.writeFileSync(filePath, data, 'utf-8');
  } catch (err) {
    console.warn('[Store] Warning: Failed to persist purchase requests to disk:', err);
  }
}

function loadFromDisk(): ServerPurchaseRequest[] | null {
  if (process.env.NODE_ENV === 'test') return null;
  try {
    const filePath = getPersistenceFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Store] Warning: Failed to load persisted purchase requests:', err);
  }
  return null;
}

function initializeStore(): Map<string, ServerPurchaseRequest> {
  const loaded = loadFromDisk();
  if (loaded) {
    return new Map(loaded.map((r) => [r.id, r]));
  }
  const initial = buildInitialRequests();
  const map = new Map(initial.map((r) => [r.id, r]));
  saveToDisk(map);
  return map;
}

let purchaseRequestsStore: Map<string, ServerPurchaseRequest> = initializeStore();

export function getAllPurchaseRequests(): ServerPurchaseRequest[] {
  return Array.from(purchaseRequestsStore.values());
}

export function getPurchaseRequestById(id: string): ServerPurchaseRequest | undefined {
  return purchaseRequestsStore.get(id);
}

export function setPurchaseRequest(req: ServerPurchaseRequest): ServerPurchaseRequest {
  purchaseRequestsStore.set(req.id, req);
  saveToDisk(purchaseRequestsStore);
  return req;
}

export function updatePurchaseRequestStatus(
  id: string,
  newStatus: PurchaseRequestStatus,
  extraUpdates?: Partial<ServerPurchaseRequest>
): ServerPurchaseRequest | undefined {
  const existing = purchaseRequestsStore.get(id);
  if (!existing) return undefined;

  const updated: ServerPurchaseRequest = {
    ...existing,
    ...extraUpdates,
    status: newStatus,
  };
  purchaseRequestsStore.set(id, updated);
  saveToDisk(purchaseRequestsStore);
  return updated;
}

export function resetPurchaseRequests(): void {
  purchaseRequestsStore = new Map(buildInitialRequests().map((r) => [r.id, r]));
  if (process.env.NODE_ENV !== 'test') {
    saveToDisk(purchaseRequestsStore);
  }
}
