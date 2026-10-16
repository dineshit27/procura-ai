# Procura AI — AI-Powered Procurement Assistant for Small Businesses

> Built for the **PayPal AI Hackathon** &bull; Powered by **Google Gemini 2.0 Flash** + **PayPal Checkout SDK** + **SpendGuard AI**

Procura AI is an intelligent procurement assistant designed to empower small businesses by streamlining vendor sourcing, purchase orders, spend analytics, and automated PayPal-backed payments — all from a single, premium UI.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-91%2F91%20passing-brightgreen)](#testing)

---

## 🏗 Architecture Overview

```text
procura-ai/
├── LICENSE                        # MIT open-source license
├── .env.example                   # Root environment configuration reference
├── .gitignore                     # Comprehensive exclusions (credentials, node_modules, dist, runtime JSON)
├── package.json                   # Monorepo orchestration scripts (concurrent dev, build, typecheck, test)
├── README.md                      # Project documentation & setup instructions
│
├── client/                        # Frontend Web Application (React 18 + Vite 6 + Tailwind CSS)
│   ├── .env.example               # Client environment template
│   ├── index.html                 # HTML5 entrypoint with Plus Jakarta Sans & JetBrains Mono
│   ├── src/
│   │   ├── App.tsx                # Multi-screen shell & global PayPal checkout state
│   │   ├── index.css              # Neo-Brutalist design system tokens & animations
│   │   ├── types/                 # Typed domain models (CatalogItem, PurchaseRequest, SpendGuard, etc.)
│   │   ├── data/
│   │   │   └── demoData.ts        # ⚠ DEMO: Simulated suppliers, catalog records, history
│   │   ├── components/
│   │   │   ├── Navigation.tsx     # Sidebar with backend health & "Demo Workspace" label
│   │   │   ├── Header.tsx         # Screen header with demo-catalog context
│   │   │   ├── StatusBadge.tsx    # Status pills (Pending / Approved / Paid (Demo) / etc.)
│   │   │   └── PayPalCheckoutModal.tsx  # PayPal JS SDK approval → backend capture flow
│   │   ├── views/
│   │   │   ├── OverviewView.tsx   # SpendGuard Control Center, KPIs, alerts, blocked-requests drawer
│   │   │   ├── NewRequestView.tsx # Natural-language form → Gemini AI analysis
│   │   │   ├── CatalogView.tsx    # Filterable vendor catalog & specs modal
│   │   │   ├── HistoryView.tsx    # Transaction ledger with SpendGuard rule matrix & checkout trigger
│   │   │   └── SettingsView.tsx   # Policy thresholds, spending period, alert threshold, supplier management
│   │   └── services/
│   │       └── api.ts             # Typed API service layer (Gemini AI + PayPal + SpendGuard endpoints)
│
└── server/                        # Backend API Server (Node.js + Express + TypeScript)
    ├── .env.example               # Server environment template with all variable docs
    ├── data/
    │   └── purchaseRequests.json  # File-backed persistence (survives server restarts)
    │   └── policySettings.json   # File-backed policy persistence (gitignored)
    ├── src/
    │   ├── index.ts               # Entrypoint with graceful SIGINT/SIGTERM shutdown
    │   ├── server.ts              # Express factory, CORS, JSON parsers, route mounting
    │   ├── config/
    │   │   ├── env.ts             # Zod environment schema — strict validation on boot
    │   │   └── policySettings.ts  # Policy schema, defaults, disk persistence (in/out of test)
    │   ├── data/
    │   │   └── purchaseRequests.ts # File-backed purchase store with disk persistence
    │   ├── middleware/
    │   │   ├── adminAuth.ts       # x-user-role allowlist guard (see security notice in file)
    │   │   ├── logger.ts          # Request logger with timing & status coloring
    │   │   └── errorHandler.ts    # 404 & global error handling
    │   ├── routes/
    │   │   ├── api.ts             # API root router — mounts all sub-routers
    │   │   ├── health.ts          # GET /api/health — system diagnostics
    │   │   ├── requests.ts        # GET/POST /api/requests — purchase request CRUD (locked)
    │   │   ├── checkout.ts        # POST /api/checkout/* — PayPal order lifecycle
    │   │   ├── policies.ts        # GET/PUT /api/policies — spending policy management
    │   │   ├── spendGuard.ts      # GET /api/spendguard/* — SpendGuard summary & alerts
    │   │   └── ai.ts              # POST /api/ai/analyze-purchase — Gemini AI
    │   ├── services/
    │   │   ├── geminiService.ts   # Gemini 2.0 Flash + deterministic rules-engine fallback
    │   │   ├── paypalService.ts   # PayPal REST API v2 — order create & capture
    │   │   ├── policyEngine.ts    # Deterministic 9-rule policy evaluator
    │   │   └── spendGuardService.ts # Cumulative spend engine, FIFO mutex, atomic approvals
    │   └── types/
    │       ├── catalog.ts         # Shared procurement domain types
    │       ├── checkout.ts        # Checkout / purchase request types
    │       └── policy.ts          # Policy evaluation types
    └── test/
        ├── policyEngine.test.ts   # 12 policy rule evaluation tests
        ├── env.test.ts            # 9 environment validation tests
        ├── checkout.test.ts       # 19 PayPal lifecycle & idempotency tests
        ├── geminiService.test.ts  # 16 Gemini AI & rules-engine fallback tests
        ├── persistence.test.ts    # 10 disk persistence & request lifecycle tests
        ├── spendGuard.test.ts     # 15 SpendGuard budget & concurrency tests
        └── securityAudit.test.ts  # 10 security & concurrency audit tests
```

---

## 🛡 SpendGuard AI — Intelligent Spending Control

SpendGuard AI is a **backend-enforced** financial control layer embedded directly into Procura AI. It is not a frontend feature — all limits are evaluated and enforced on the server.

### Policy Rules Enforced

| Rule | Limit | Action |
|:---|:---|:---|
| Single Order Ceiling | $10,000 max | `BLOCKED` |
| Order Quantity Limit | 250 units max | `BLOCKED` |
| Approved Supplier List | Configurable allowlist | `BLOCKED` |
| Cumulative Period Budget | $20,000/month default | `BLOCKED` |
| Auto-Approval Threshold | ≤ $500 | `ALLOWED` (instant) |
| Manual Approval Threshold | > $500 | `NEEDS_APPROVAL` |

### Authoritative Budget Accounting

- **Paid Spend**: Sum of all `status === 'paid'` requests in the active period window.
- **Reserved Spend**: Sum of `status === 'approved'` requests awaiting payment.
- **Available Headroom**: `CumulativeBudgetLimit − (Paid + Reserved)`
- **Reservation Release**: Cancelling or rejecting an approved request immediately releases its reserved amount.
- **Double-count Prevention**: Paid requests are excluded from reserved spend. The `excludeRequestId` parameter prevents a request from being counted twice when it transitions between states.
- **Race Condition Prevention**: `withStoreLock` (FIFO promise-chain mutex) serializes all budget check-and-write operations. Concurrent approvals and request creations cannot collectively bypass the budget ceiling.

### SpendGuard Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/spendguard/summary` | Full period metrics, utilization %, blocked requests |
| `GET` | `/api/spendguard/alerts` | Active deterministic alert banners |
| `POST` | `/api/spendguard/check-budget` | Dry-run budget headroom check |
| `GET` | `/api/policies/current` | Read current policy settings |
| `PUT` | `/api/policies/current` | Update policy (admin role required) |
| `POST` | `/api/policies/reset` | Reset to defaults (admin role required) |

### Dashboard

The **Overview** screen displays the SpendGuard Control Center:
- 4 KPI cards: Spending Limit, Settled Paid Spend, Reserved Budget, Available Headroom
- Tri-color progress bar (Green = settled, Amber = reserved, Gray = available)
- Real-time alert banners (EXCEEDED, APPROACHING, APPROVAL_REQUIRED, PURCHASE_BLOCKED)
- Blocked Requests slide-out drawer with exact policy violation reasons

---

## 📋 Prerequisites

| Requirement | Minimum | Tested On |
|:---|:---|:---|
| **Node.js** | v18.0.0 | v22.14.0 |
| **npm** | v9.0.0 | v11.1.0 |
| **Git** | any | — |

---

## 🚀 Quick Start & Installation

### 1. Clone the repository
```bash
git clone https://github.com/dineshit27/procura-ai.git
cd procura-ai
```

### 2. Install all dependencies
```bash
npm run install:all
```
*(Or install individually: `npm install`, `cd server && npm install`, `cd client && npm install`)*

### 3. Configure Environment Variables

**Server (required):**
```bash
cp server/.env.example server/.env
# Then fill in your actual keys in server/.env
```

`server/.env` fields:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Google Gemini AI (from https://aistudio.google.com/apikey)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash   # actual model used by geminiService.ts

# PayPal REST API (from https://developer.paypal.com/dashboard/applications/sandbox)
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com

# CRITICAL for USD Sandbox payments — must be a US-country Sandbox Business account email
# PAYPAL_PAYEE_EMAIL=sb-xxxxxxx@business.example.com
```

**Client (optional — defaults work for local dev):**
```bash
cp client/.env.example client/.env
```
```env
VITE_API_URL=http://localhost:5000
```

> **🔒 Security**: Never commit `server/.env`. `PAYPAL_CLIENT_SECRET` must only live in `server/.env` and is never returned by any API endpoint.

---

## 💻 Running the Application

### Development Mode (Frontend + Backend concurrently)
```bash
npm run dev
```

| Service | URL |
|:---|:---|
| **Frontend Client** | http://localhost:5173 |
| **Backend API** | http://localhost:5000 |
| **Health Endpoint** | http://localhost:5000/api/health |

### Run Services Individually
```bash
npm run dev:server   # Backend only (tsx watch + hot reload)
npm run dev:client   # Frontend only (Vite HMR)
```

---

## 🧪 Testing

```bash
npm test             # All tests (root script — runs npm --prefix server test)
npm --prefix server test   # Server tests directly
```

**Current result: 91/91 tests passing across 7 suites, 0 failures**

| Suite | Tests | Description |
|:---|:---|:---|
| `policyEngine.test.ts` | 12 | Rule evaluation: ALLOWED / NEEDS_APPROVAL / BLOCKED decisions |
| `env.test.ts` | 9 | Environment validation, missing vars, Zod schema |
| `checkout.test.ts` | 19 | PayPal order lifecycle, amount enforcement, idempotency |
| `geminiService.test.ts` | 16 | Gemini AI responses, rules-engine fallback, catalog grounding |
| `persistence.test.ts` | 10 | Disk persistence, request lifecycle, checkout routing |
| `spendGuard.test.ts` | 15 | Budget limits, concurrency mutex, reservations, security |
| `securityAudit.test.ts` | 10 | Spoofed roles, currency mismatch, duplicate orders, concurrent races |

---

## 🩺 Health Check

```http
GET /api/health
```

Sample response:
```json
{
  "status": "healthy",
  "service": "procura-ai-api",
  "version": "0.1.0",
  "timestamp": "2026-10-16T08:00:00.000Z",
  "uptimeSeconds": 120,
  "environment": "development",
  "gemini": {
    "configured": true,
    "model": "gemini-2.0-flash"
  },
  "paypal": {
    "configured": true,
    "checkoutEnabled": true,
    "baseUrl": "https://api-m.sandbox.paypal.com",
    "statusMessage": "PayPal credentials configured. PayPal checkout is enabled."
  }
}
```

---

## 🤖 Gemini AI Integration

Procura AI uses **Google Gemini 2.0 Flash** (`gemini-2.0-flash`) via `@google/genai` to evaluate purchasing requirements against the approved vendor catalog.

> **Note on model naming**: The README previously referenced "Gemini 2.5 Flash", which was a documentation error. The actual model string configured in `geminiService.ts` and used at runtime is `gemini-2.0-flash` (overridden by `GEMINI_MODEL` in `server/.env`).

**Endpoint:**
```http
POST /api/ai/analyze-purchase
Content-Type: application/json

{
  "prompt": "Need ergonomic chairs for 3 remote employees",
  "budget": 1200,
  "quantity": 3,
  "category": "Office Ergonomics",
  "urgency": "standard"
}
```

**Response includes:**
- Ranked catalog matches with AI-generated trade-off rationale
- Budget fit analysis and recommended quantity
- Policy compliance check (spend limits, approved suppliers)
- `provider` field: `"gemini"` (live) or `"rules-engine"` (fallback)

**Fallback behavior:** If `GEMINI_API_KEY` is absent or the Gemini API is unreachable, the service seamlessly switches to a local deterministic rules engine. All responses are structurally identical regardless of provider.

### Known Limitations
- Gemini analysis is grounded only in the pre-loaded demo catalog (not a live supplier database)
- Free-tier Gemini API keys have rate limits; high-volume hackathon demos may fall back to rules-engine
- No streaming — analysis results are returned as a single JSON response

---

## 💳 PayPal Sandbox Integration

Procura AI uses the **PayPal JavaScript SDK** (buyer-side) + **PayPal REST API v2** (server-side capture) for end-to-end checkout.

### Checkout Flow
```
1. Buyer clicks "Pay with PayPal" in HistoryView
2. Frontend: PayPal JS SDK loads from GET /api/checkout/config (clientId only — no secret)
3. Frontend: createOrder() → POST /api/checkout/create-order (server validates authoritative total)
4. PayPal Sandbox approval window opens
5. Buyer approves
6. Frontend: onApprove() → POST /api/checkout/capture-order
7. Server: calls PayPal REST API /v2/checkout/orders/{id}/capture
8. Server: verifies captured currency == authoritative currency AND amount ≈ authoritative total
9. Server: marks purchase PAID only on confirmed status === "COMPLETED"
10. Frontend: dashboard updates to show settlement details
```

### Safety Guarantees
- ✅ Server computes and enforces the authoritative total — client amount is never trusted
- ✅ `PAYPAL_CLIENT_SECRET` is never returned to the browser
- ✅ Captured currency is verified to match authoritative purchase currency before marking paid
- ✅ In-flight capture lock prevents duplicate concurrent captures (`409 CONCURRENT_CAPTURE`)
- ✅ Already-paid requests reject with `409 ALREADY_PAID` — idempotent
- ✅ Non-COMPLETED capture status (FAILED, PENDING) returns 422 — never marks paid
- ✅ Duplicate order creation for an in-progress request returns `409 ORDER_ALREADY_EXISTS`
- ✅ Purchase state persists across server restarts (`server/data/purchaseRequests.json`)

### Known Sandbox Limitations
- **Currency Restriction**: If `PAYPAL_PAYEE_EMAIL` points to a Sandbox Business account created with a non-US country (e.g. India), buyers will see *"This seller doesn't accept payments in your currency."* Fix: create a US-country Sandbox Business account and set `PAYPAL_PAYEE_EMAIL` accordingly.
- **Sandbox Only**: `PAYPAL_BASE_URL` is set to `https://api-m.sandbox.paypal.com`. Change to `https://api-m.paypal.com` for live production (requires a real PayPal merchant account).
- **No webhooks**: Capture confirmation is synchronous via REST — no PayPal webhook listener is implemented.

---

## 🔒 Security & Known Limitations

### Policy Authorization
The `PUT /api/policies/current` and `POST /api/policies/reset` endpoints are protected by the `requireAdminRole` middleware (`server/src/middleware/adminAuth.ts`). In development and test environments, the middleware reads the `x-user-role` HTTP request header and checks it against an **allowlist** of privileged role strings so the hackathon demo flow continues to work.

> ⚠ **SECURITY LIMITATION — HEADER AUTH IS NOT CRYPTOGRAPHIC**
>
> `x-user-role` is an unauthenticated HTTP header. Any client can send `x-user-role: admin` without providing any credential. This provides no protection against malicious or misconfigured callers. It is used here **solely as a development/demo convention** for a hackathon prototype.
>
> **Production fail-closed mitigation:** Because this repository does not yet implement a verified credential mechanism, policy mutations reject header-only authorization when `NODE_ENV=production`. The `x-user-role` header is never treated as production authentication.
>
> **Before any production deployment**, integrate and validate a verified mechanism: signed JWTs, secure HttpOnly session cookies, or OAuth2/OIDC access tokens validated against a JWKS endpoint. The current mitigation is not production-grade authentication and does not identify an administrator.

### Concurrency
- `withStoreLock` serializes all budget check-and-write operations within a single Node.js process using a FIFO promise-chain mutex. This prevents race conditions in single-instance deployments.
- In a **multi-instance / clustered** deployment, replace `withStoreLock` with a distributed lock (e.g. Redis `Redlock` or Postgres `SELECT ... FOR UPDATE`).

### Other Quality Standards
- **Strict Env Validation**: Zod schema validates all env vars on boot (`server/src/config/env.ts`). Missing or invalid values log diagnostics and exit before accepting traffic.
- **Secret Protection**: `PAYPAL_CLIENT_SECRET` and `GEMINI_API_KEY` live only in `server/.env` (gitignored). `GET /api/checkout/config` exposes only the public `clientId`.
- **Strict TypeScript**: `strict: true`, `noImplicitAny: true`, and strict null checks across both workspaces. Zero type errors verified.
- **Graceful Shutdown**: `SIGINT`, `SIGTERM`, and uncaught error handlers close connections cleanly.

---

## 🛠 Available Scripts

| Command | Description |
|:---|:---|
| `npm run dev` | Start server & client concurrently (development) |
| `npm run dev:server` | Start backend only with hot reloading (`tsx watch`) |
| `npm run dev:client` | Start Vite frontend with HMR |
| `npm run build` | Build server (tsc) + client (vite build) for production |
| `npm run typecheck` | TypeScript strict checks on both server and client |
| `npm test` | Run all 91 backend integration tests across 7 suites |
| `npm run install:all` | Install root + server + client dependencies |

---

## ⚠ Demo Data Notice

All catalog items, supplier names, and pre-loaded purchase history are **simulated demo data** for hackathon demonstration purposes only:

- Suppliers are labelled `(Demo Supplier)` in all data records
- The UI sidebar shows **"Demo Workspace"** and **"Preloaded simulated catalog & non-live demo records"**
- Status badges show **"Paid (Demo)"** for sandbox-settled purchases
- No real supplier relationships, real inventory, or real financial transactions are implied

---

## 📄 License

[MIT](./LICENSE) © 2026 Dinesh — Procura AI (PayPal AI Hackathon)
