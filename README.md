# Procura AI — AI-Powered Procurement Assistant for Small Businesses

> Built for the **PayPal AI Hackathon** &bull; Powered by **Google Gemini 2.5 Flash** + **PayPal Checkout SDK**

Procura AI is an intelligent procurement assistant designed to empower small businesses by streamlining vendor sourcing, purchase orders, spend analytics, and automated PayPal-backed payments — all from a single, premium UI.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-19%2F19%20passing-brightgreen)](#testing)

---

## 🏗 Architecture Overview

```text
procura-ai/
├── LICENSE                        # MIT open-source license
├── .env.example                   # Root environment configuration reference
├── .gitignore                     # Comprehensive exclusions (credentials, node_modules, dist)
├── package.json                   # Monorepo orchestration scripts (concurrent dev, build, typecheck, test)
├── README.md                      # Project documentation & setup instructions
│
├── client/                        # Frontend Web Application (React 18 + Vite 6 + Tailwind CSS)
│   ├── .env.example               # Client environment template
│   ├── index.html                 # HTML5 entrypoint with Plus Jakarta Sans & JetBrains Mono
│   ├── src/
│   │   ├── App.tsx                # Multi-screen shell & global PayPal checkout state
│   │   ├── index.css              # Neo-Brutalist design system tokens & animations
│   │   ├── types/                 # Typed domain models (CatalogItem, PurchaseRequest, etc.)
│   │   ├── data/
│   │   │   └── demoData.ts        # ⚠ DEMO: Simulated suppliers, catalog records, history
│   │   ├── components/
│   │   │   ├── Navigation.tsx     # Sidebar with backend health & "Demo Workspace" label
│   │   │   ├── Header.tsx         # Screen header with demo-catalog context
│   │   │   ├── StatusBadge.tsx    # Status pills (Pending / Approved / Paid (Demo) / etc.)
│   │   │   └── PayPalCheckoutModal.tsx  # PayPal JS SDK approval → backend capture flow
│   │   ├── views/
│   │   │   ├── OverviewView.tsx   # Dashboard KPIs, recent requests, audit feed
│   │   │   ├── NewRequestView.tsx # Natural-language form → Gemini AI analysis
│   │   │   ├── CatalogView.tsx    # Filterable vendor catalog & specs modal
│   │   │   ├── HistoryView.tsx    # Transaction ledger with PayPal checkout trigger
│   │   │   └── SettingsView.tsx   # Policy thresholds & demo supplier management
│   │   └── services/
│   │       └── api.ts             # Typed API service layer (Gemini AI + PayPal endpoints)
│
└── server/                        # Backend API Server (Node.js + Express + TypeScript)
    ├── .env.example               # Server environment template with all variable docs
    ├── data/
    │   └── purchaseRequests.json  # File-backed persistence (survives server restarts)
    ├── src/
    │   ├── index.ts               # Entrypoint with graceful SIGINT/SIGTERM shutdown
    │   ├── server.ts              # Express factory, CORS, JSON parsers, route mounting
    │   ├── config/
    │   │   └── env.ts             # Zod environment schema — strict validation on boot
    │   ├── data/
    │   │   └── purchaseRequests.ts # File-backed purchase store with disk persistence
    │   ├── middleware/
    │   │   ├── logger.ts          # Request logger with timing & status coloring
    │   │   └── errorHandler.ts    # 404 & global error handling
    │   ├── routes/
    │   │   ├── api.ts             # API root router
    │   │   ├── health.ts          # GET /api/health — system diagnostics
    │   │   ├── requests.ts        # GET /api/requests — purchase request CRUD
    │   │   ├── checkout.ts        # POST /api/checkout/* — PayPal order lifecycle
    │   │   └── ai.ts              # POST /api/ai/analyze-purchase — Gemini AI
    │   ├── services/
    │   │   ├── geminiService.ts   # Gemini 2.5 Flash + deterministic rules-engine fallback
    │   │   └── paypalService.ts   # PayPal REST API v2 — order create & capture
    │   └── types/
    │       └── catalog.ts         # Shared procurement domain types
    └── test/
        └── checkout.test.ts       # 19 integration tests (PayPal lifecycle, idempotency, etc.)
```

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
git clone https://github.com/dineshit27/secure-data-erase.git procura-ai
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
GEMINI_MODEL=gemini-2.5-flash

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
npm test
```

**Current result: 19/19 tests passing, 0 failures**

| # | Test Description |
|:--|:---|
| 1–5 | Health check, request CRUD, catalog retrieval |
| 6–7 | Server-side amount enforcement (cannot over/underpay) |
| 8 | Duplicate capture blocked (idempotency lock) |
| 9 | Buyer cancellation — never marks paid |
| 10 | PayPal API 500 error — graceful failure |
| 11 | Non-COMPLETED capture status rejects with 422 |
| 12 | `GET /api/checkout/config` never exposes client secret |
| 13 | `create-order` always returns a non-empty `orderId` |
| 14–15 | Dashboard state reflects settlement after capture |
| 16 | Cancellation records timestamp without invalidating approval |
| 17 | `FAILED` capture status returns 422 and marks `FAILED` |
| 18 | Duplicate capture returns pristine settled record |
| 19 | Persistent JSON store file exists and has valid schema |

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
  "timestamp": "2026-10-15T15:00:00.000Z",
  "uptimeSeconds": 120,
  "environment": "development",
  "gemini": {
    "configured": true,
    "model": "gemini-2.5-flash"
  },
  "paypal": {
    "configured": true,
    "checkoutEnabled": true,
    "baseUrl": "https://api-m.sandbox.paypal.com",
    "statusMessage": "PayPal credentials configured. PayPal checkout is enabled."
  },
  "system": {
    "nodeVersion": "v22.14.0",
    "platform": "win32",
    "memoryMb": { "rss": 48.1, "heapUsed": 22.3, "heapTotal": 28.0 }
  }
}
```

---

## 🤖 Gemini AI Integration

Procura AI uses **Google Gemini 2.5 Flash** via `@google/genai` to evaluate purchasing requirements against the approved vendor catalog.

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
8. Server: marks purchase PAID only on confirmed status === "COMPLETED"
9. Frontend: dashboard updates to show settlement details
```

### Safety Guarantees
- ✅ Server computes and enforces the authoritative total — client amount is never trusted
- ✅ `PAYPAL_CLIENT_SECRET` is never returned to the browser
- ✅ In-flight capture lock prevents duplicate concurrent captures (`409 CONCURRENT_CAPTURE`)
- ✅ Already-paid requests reject with `409 ALREADY_PAID` — idempotent
- ✅ Non-COMPLETED capture status (FAILED, PENDING) returns 422 — never marks paid
- ✅ Purchase state persists across server restarts (`server/data/purchaseRequests.json`)

### Known Sandbox Limitations
- **Currency Restriction**: If `PAYPAL_PAYEE_EMAIL` points to a Sandbox Business account created with a non-US country (e.g. India), buyers will see *"This seller doesn't accept payments in your currency."* Fix: create a US-country Sandbox Business account and set `PAYPAL_PAYEE_EMAIL` accordingly.
- **Sandbox Only**: `PAYPAL_BASE_URL` is set to `https://api-m.sandbox.paypal.com`. Change to `https://api-m.paypal.com` for live production (requires a real PayPal merchant account).
- **No webhooks**: Capture confirmation is synchronous via REST — no PayPal webhook listener is implemented.

---

## ⚠ Demo Data Notice

All catalog items, supplier names, and pre-loaded purchase history are **simulated demo data** for hackathon demonstration purposes only:

- Suppliers are labelled `(Demo Supplier)` in all data records
- The UI sidebar shows **"Demo Workspace"** and **"Preloaded simulated catalog & non-live demo records"**
- Status badges show **"Paid (Demo)"** for sandbox-settled purchases
- No real supplier relationships, real inventory, or real financial transactions are implied

---

## 🛠 Available Scripts

| Command | Description |
|:---|:---|
| `npm run dev` | Start server & client concurrently (development) |
| `npm run dev:server` | Start backend only with hot reloading (`tsx watch`) |
| `npm run dev:client` | Start Vite frontend with HMR |
| `npm run build` | Build server (tsc) + client (vite build) for production |
| `npm run typecheck` | TypeScript strict checks on both server and client |
| `npm test` | Run all 19 backend integration tests |
| `npm run install:all` | Install root + server + client dependencies |

---

## 🔒 Security & Quality Standards

- **Strict Env Validation**: Zod schema validates all env vars on boot (`server/src/config/env.ts`). Missing or invalid values log diagnostics and exit before accepting traffic.
- **Secret Protection**: `PAYPAL_CLIENT_SECRET` and `GEMINI_API_KEY` live only in `server/.env` (gitignored). The `GET /api/checkout/config` endpoint exposes only the public `clientId`.
- **Strict TypeScript**: `strict: true`, `noImplicitAny: true`, and strict null checks across both workspaces. Zero type errors verified at submission.
- **Graceful Shutdown**: `SIGINT`, `SIGTERM`, and uncaught error handlers close connections cleanly.
- **File Persistence**: Purchase state written to `server/data/purchaseRequests.json` after each mutation. Backed up on server restart load.

---

## 📄 License

[MIT](./LICENSE) © 2026 Dinesh — Procura AI (PayPal AI Hackathon)
