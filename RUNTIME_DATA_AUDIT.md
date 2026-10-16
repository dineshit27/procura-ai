# Procura AI — Runtime Data Source Audit Report

**Date**: October 16, 2026  
**Auditor**: Senior Full-Stack & Systems Security Auditor  
**Environment**: Windows 11, Node.js `v22.14.0`, Backend: `http://localhost:5000`, Frontend: `http://localhost:5173`  
**Git Commit**: `9d28d89`  

---

## Executive Summary

This audit assesses the runtime data provenance across the Procura AI application to determine whether the running dashboard, procurement workflows, and policy engines display **real backend records** or **simulated demo data** from `client/src/data/demoData.ts`.

### Summary of Findings:
1. **SpendGuard Financial Metrics**: **REAL**. The overview budget numbers, committed/paid/reserved calculations, utilization bar, and live alerts are fetched directly from `/api/spendguard/summary` and are 100% reconciled with authoritative server storage.
2. **Purchase Requests & Workflow**: **REAL** (with demo fallback on network failure). Requests are fetched from `/api/requests`, persisted to disk on creation, approved via `PATCH /status`, and paid via PayPal Orders REST API.
3. **Overview Activity Feed (Audit Trail)**: **SIMULATED**. Despite the backend providing a live `recentActivity` list in `/api/spendguard/summary`, the frontend Overview dashboard renders `activity` state from `App.tsx` initialized with hardcoded items (`ACT-501` to `ACT-505`) from `demoData.ts`.
4. **Catalog Items**: **SIMULATED / STATIC**. The frontend renders `INITIAL_CATALOG_ITEMS` from `demoData.ts`. Although the backend has an identical catalog in `server/src/data/catalog.ts`, there is no `GET /api/catalog` API endpoint.
5. **Gemini AI Procurement Intelligence**: **REAL API ATTEMPTED / REAL FALLBACK ENGAGED**. The server contacted Google's Generative Language API (`generativelanguage.googleapis.com`), encountered HTTP 429 quota exhaustion (`RESOURCE_EXHAUSTED`, 20 req/day limit), and transparently activated the deterministic rules engine (`provider: "rules-engine"`, `model: "local-deterministic-v1"`). No fabricated AI claims are made.
6. **PayPal Sandbox**: **REAL**. Real PayPal OAuth2 tokens are minted and real PayPal Sandbox orders (e.g. `5UX92151US059161P`, status `CREATED`) are generated through the PayPal Orders v2 REST API.

---

## 1. Runtime Data Source Audit Matrix

| Feature / UI Component | Data Source | Actual Runtime Evidence | Status | Required Fix (if any) |
| :--- | :--- | :--- | :---: | :--- |
| **SpendGuard Budget Metrics**<br>(`OverviewView.tsx` header cards) | Backend API (`/api/spendguard/summary`) | Direct call to `/api/spendguard/summary` returned:<br>`configuredBudget: $20,000`<br>`paidSpending: $1,260.00`<br>`reservedSpending: $6,348.00`<br>`remainingBudget: $12,392.00`<br>`utilizationPercent: 38%` | **REAL** | None. Fully synchronized with authoritative backend. |
| **SpendGuard Active Alerts**<br>(`OverviewView.tsx` alert banner) | Backend API (`/api/spendguard/summary`) | Received 2 deterministic alerts from backend:<br>1. `APPROVAL_REQUIRED` (1 request totaling $940 pending review)<br>2. `PURCHASE_BLOCKED` (2 attempts blocked by policy) | **REAL** | None. Evaluated server-side from live requests. |
| **Recent Purchase Requests**<br>(`OverviewView.tsx` left table) | Backend API (`/api/requests`) via `App.tsx` | Initialized with `INITIAL_PURCHASE_REQUESTS`, but `useEffect` calls `fetchPurchaseRequests()`. Loaded 9 live records from `/api/requests` (including `REQ-LIVE-BLOCK-001`, `REQ-LIVE-APPROVAL-001`). | **REAL**<br>*(Fallback on empty)* | Change `if (live && live.length > 0)` in `App.tsx:37` to `if (live)` so an empty backend array `[]` cleanly clears demo data instead of falling back to `INITIAL_PURCHASE_REQUESTS`. |
| **Activity Feed / Audit Trail**<br>(`OverviewView.tsx` right column) | Local React state in `App.tsx` initialized from `INITIAL_ACTIVITY_ITEMS` in `demoData.ts` | The UI displays hardcoded events:<br>• `ACT-501`: REQ-2026-081 approved (2 hours ago)<br>• `ACT-502`: REQ-2026-080 queued (Yesterday at 09:15)<br>• `ACT-503`: Catalog Price Synchronized (2 days ago)<br>• `ACT-504`: Demo Settlement Completed (5 days ago)<br>• `ACT-505`: Policy Updated (1 week ago)<br>The real `summary.recentActivity` returned by `/api/spendguard/summary` is completely ignored! | **SIMULATED** | Update `OverviewView.tsx` to render `summary.recentActivity` from `/api/spendguard/summary` rather than the static `activity` prop. |
| **Product Catalog**<br>(`CatalogView.tsx`) | Local bundle constant `INITIAL_CATALOG_ITEMS` in `demoData.ts` | Filter and search work on static in-memory array of 10 items (`CAT-101` through `CAT-110`). No network request is made. Backend catalog in `server/src/data/catalog.ts` is identical but isolated. | **SIMULATED** | Implement `GET /api/catalog` on backend and fetch catalog dynamically on client mount. |
| **AI Purchase Analysis**<br>(`NewRequestView.tsx`) | Backend API (`/api/ai/analyze-purchase`) | Network request made to `/api/ai/analyze-purchase`. Server called Google Gemini API (`gemini-3.8-flash`), encountered 429 quota exhaustion, and returned `provider: "rules-engine"`, `model: "local-deterministic-v1"` with 3 ranked options. | **REAL**<br>*(Rules engine fallback)* | When Gemini API quota resets or paid tier is used, Gemini LLM executes. System handles fallback transparently without misrepresenting the source. |
| **Real-Time Policy Evaluation**<br>(`NewRequestView.tsx` policy badge) | Backend API (`/api/policies/evaluate`) | Fires debounced `POST /api/policies/evaluate` as user types/changes parameters. Returns live decision (`ALLOWED`, `NEEDS_APPROVAL`, `BLOCKED`) with rule-by-rule breakdown. | **REAL** | None. Real server-side rules engine evaluation. |
| **Request Creation & Submission**<br>(`NewRequestView.tsx` submit) | Backend API (`POST /api/requests`) | Submits payload to `/api/requests`. Server authoritatively recalculates price from catalog (`authoritativeUnitPrice`), evaluates cumulative budget with mutex lock, and persists to `purchaseRequests.json`. | **REAL** | None. Fully authoritative backend persistence. |
| **Purchase Request History**<br>(`HistoryView.tsx`) | Backend API (`/api/requests`) | Displays live requests synchronized from `/api/requests`. Filter tabs and inspection drawer read authoritative backend fields. | **REAL** | None. |
| **Manager Approval & Cancellation**<br>(`HistoryView.tsx` actions) | Backend API (`PATCH /api/requests/:id/status`) | Calls `PATCH /api/requests/:id/status`. Server atomically verifies budget headroom, updates status to `approved`, and increases `reservedSpending`. Cancellation immediately decrements `reservedSpending`. | **REAL** | None. Direct mutation of backend store. |
| **PayPal Sandbox Checkout**<br>(`PayPalCheckoutModal.tsx`) | Backend API (`/api/checkout/*`) + PayPal REST v2 API | 1. Calls `/api/checkout/config` (loads client ID)<br>2. Calls `/api/checkout/create-order` (creates order `5UX92151US059161P` on real PayPal Sandbox)<br>3. After buyer approval, calls `/api/checkout/capture-order`<br>4. Captures payment on PayPal Sandbox REST API, validates currency and amount, marks request `paid`. | **REAL** | None. End-to-end integration with live PayPal Sandbox. |
| **Policy Settings**<br>(`SettingsView.tsx`) | Backend API (`/api/policies/current` and `/api/policies/reset`) | On mount, fetches live settings via `GET /api/policies/current`. Form submit calls `PUT /api/policies/current` with `x-user-role: admin`. Reset calls `POST /api/policies/reset`. Persisted to `policySettings.json`. | **REAL** | None. |

---

## 2. In-Depth Component Tracing

### A. Trace of `OverviewView.tsx`
1. **Summary Cards (`configuredBudget`, `paidSpending`, `reservedSpending`, `remainingBudget`, `utilizationPercent`)**:
   - Primary: Loaded via `fetchSpendGuardSummary()` -> `GET /api/spendguard/summary`.
   - Fallback: If network request fails, computed from `requests` prop in local memory.
   - **Verdict**: **REAL**. When backend is online (current state), all metrics shown come from the backend.
2. **Alerts (`activeAlerts`)**:
   - Loaded from `summary?.alerts`.
   - **Verdict**: **REAL**.
3. **Recent Purchase Requests Table**:
   - Renders `requests.slice(0, 5)`.
   - Populated by `App.tsx` via `fetchPurchaseRequests()` -> `GET /api/requests`.
   - **Verdict**: **REAL**.
4. **Audit Trail / Activity Feed**:
   - Renders `activity.slice(0, 6)` passed from `App.tsx`.
   - Initialized from `INITIAL_ACTIVITY_ITEMS` in `client/src/data/demoData.ts`.
   - **Verdict**: **SIMULATED**. The backend produces a live `recentActivity` array in `summary`, but `OverviewView.tsx` does not display it.

### B. Trace of Empty API Response Behavior (`App.tsx`)
In `client/src/App.tsx`, lines 34-45:
```typescript
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
```
- **Finding**: If the server has 0 records (a completely clean deployment where `/api/requests` returns `[]`), `live.length > 0` is `false`. As a consequence, `setRequests([])` is never invoked, leaving the 6 simulated demo records from `INITIAL_PURCHASE_REQUESTS` visible in the UI.
- **Fix**: Change check to `if (Array.isArray(live)) { setRequests(live); return live; }`.

---

## 3. Gemini Live vs. Fallback Verification

### Direct Verification Run Output
```text
POST http://localhost:5000/api/ai/analyze-purchase
HTTP Status: 200
Status Field: success
Provider: rules-engine
Model: local-deterministic-v1
Summary: Rules Engine Evaluation (Gemini request failed ({"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details... Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.8-flash\nPlease retry in 18h9m57s."}): Analyzed 10 catalog items across budget and delivery constraints.
Options returned: 3
Top Option ID: CAT-103
Top Option Name: ErgoPro Electric Height-Adjustable Standing Desk (60" x 30")
Match Score: 93
```

- **API Key Present**: Yes (`GEMINI_API_KEY` configured in `server/.env`).
- **External Network Call Made**: Yes. Node.js connected to Google's Generative Language API endpoint.
- **Result**: Google rejected with HTTP 429 `RESOURCE_EXHAUSTED` (daily limit reached).
- **Graceful Degradation**: Server handled the rejection cleanly, did not crash or fabricate AI output, and truthfully tagged the response with `provider: "rules-engine"` and `model: "local-deterministic-v1"`.

---

## 4. PayPal Sandbox Verification

### Direct Verification Run Output
```text
GET http://localhost:5000/api/checkout/config
HTTP Status: 200
PayPal Enabled: true
PayPal Client ID: Configured (AREXWZMw...)
Base URL: https://api-m.sandbox.paypal.com
Is Sandbox: true
Payee Email: sb-***@business.example.com

POST http://localhost:5000/api/checkout/create-order (Purchase Request: REQ-2026-081)
HTTP Status: 200
Created Order ID: 5UX92151US059161P
Order Status: CREATED
Authoritative Total: 1058 USD
```

- **Real Sandbox API**: Yes. Contacted `api-m.sandbox.paypal.com`.
- **Order Created**: Order `5UX92151US059161P` created directly on PayPal Sandbox Orders v2 API.
- **Payment Settlement**: Authoritative capture occurs at `/api/checkout/capture-order`, which verifies amount and currency before updating request status to `paid`.
- **Credentials Protection**: Client secret is withheld; payee email and client ID are properly handled.

---

## 5. Dashboard Consistency Reconciliation

| Field | `/api/spendguard/summary` | Sum of `/api/requests` | Status |
| :--- | :--- | :--- | :---: |
| **Paid Spending** | `$1,260.00` | `$1,260.00` | **MATCH** |
| **Reserved Spending** | `$6,348.00` | `$6,348.00` | **MATCH** |
| **Pending Approvals Total** | `$940.00` | `$940.00` | **MATCH** |
| **Pending Approvals Count** | `1` | `1` (`REQ-2026-080`) | **MATCH** |
| **Blocked Requests Count** | `2` | `2` (`REQ-2026-082`, `REQ-LIVE-BLOCK-001`) | **MATCH** |
| **Configured Budget** | `$20,000.00` | `$20,000.00` | **MATCH** |
| **Remaining Budget** | `$12,392.00` | `$12,392.00` | **MATCH** |

**Conclusion**: The backend financial accounting engine is 100% consistent and mathematically reconciled across all records.

---

## 6. Actionable Remediation Checklist (Without Rewriting the Project)

1. **Wire Real Audit Trail into `OverviewView.tsx`**:
   - In `OverviewView.tsx`, map the right-hand "Audit Trail" to `summary.recentActivity` instead of the static `activity` prop from `App.tsx`.
2. **Fix Empty-Array Fallback Bug in `App.tsx`**:
   - Update line 37 in `client/src/App.tsx`: change `if (live && live.length > 0)` to `if (Array.isArray(live))` so an empty database shows 0 requests rather than resurfacing initial demo records.
3. **Expose Catalog API Endpoint**:
   - Add `GET /api/catalog` in `server/src/routes/api.ts` to serve `CATALOG_ITEMS` from the backend so `CatalogView.tsx` is powered by real API data.
