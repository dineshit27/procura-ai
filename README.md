<p align="center">
  <img
    src="Procura AI Banner.png"
    alt="Procura AI | AI-powered procurement with intelligent spending controls"
    width="100%"
  />
</p>

# Procura AI
### AI-powered procurement with intelligent spending controls.

Procura AI helps small businesses make smarter purchasing decisions by combining AI-assisted product recommendations, server-enforced spending policies, human approval, and PayPal checkout in one workflow.
<br> 
**🔗 Procura Live URL:** https://procura-io.onrender.com

**Built for the PayPal AI Hackathon**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-green?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PayPal](https://img.shields.io/badge/Payments-PayPal%20Sandbox-003087?logo=paypal&logoColor=white)](https://developer.paypal.com/)
[![Postman](https://img.shields.io/badge/API-Postman-FF6C37?logo=postman&logoColor=white)](https://www.postman.com/)
[![Render](https://img.shields.io/badge/Hosting-Render-46E3B7?logo=render&logoColor=black)](https://render.com/)
[![Zapier](https://img.shields.io/badge/Automation-Zapier-FF4A00?logo=zapier&logoColor=white)](https://zapier.com/)

> **Demo notice:** Supplier catalogs and purchasing records are simulated. Payments use the PayPal Sandbox and do not represent real financial transactions.

---

## The Problem

Small businesses often manage purchasing across spreadsheets, supplier catalogs, approval messages, and disconnected payment workflows. This makes it difficult to control spending, enforce purchasing policies, and understand how much budget remains available.

## The Solution

Procura AI connects purchasing decisions to financial controls.

- **AI-powered recommendations:** Translate natural-language purchasing needs into catalog-grounded recommendations using Google Gemini.
- **SpendGuard AI:** Enforce order limits, approved-supplier rules, cumulative budgets, and approval thresholds on the backend.
- **Human-in-the-loop approvals:** Flag purchases that require review before payment.
- **PayPal checkout:** Create and capture PayPal Sandbox orders through a server-validated payment workflow.
- **Spending visibility:** Track paid spending, reserved budgets, available headroom, policy violations, and purchase history.

### What makes it different?

Procura AI doesn't rely on AI alone to authorize spending. AI assists with purchasing decisions, while a deterministic backend policy engine enforces financial limits. Approved purchases then follow a controlled payment workflow.

## How It Works

```mermaid
flowchart TD
    A[Describe Purchasing Need] --> B[AI Recommendations]
    B --> C[Catalog and Policy Validation]
    C --> D{Policy Decision}
    D -->|Blocked| E[Explain Violation]
    D -->|Approval Required| F[Human Review]
    D -->|Allowed| G[Payment Workflow]
    F -->|Approved| G
    F -->|Rejected| H[Release Budget Reservation]
    G --> I[PayPal Sandbox Checkout]
    I --> J[Verify Payment Capture]
    J --> K[Update Purchase and Spend Dashboard]
```

## Key Feature: SpendGuard AI

SpendGuard is a backend-enforced spending control system, not just a dashboard.

| Control | Default policy |
|---|---:|
| Maximum single order | $10,000 |
| Maximum order quantity | 250 units |
| Monthly cumulative budget | $20,000 |
| Auto-approval threshold | Up to $500 |
| Higher-value purchases | Manual approval required |
| Supplier restrictions | Configurable allowlist |

These are configurable demo defaults, not universal financial recommendations.

**Budget accounting includes:**
- Paid spend from completed purchases.
- Reserved spend for approved purchases awaiting payment.
- Available budget after accounting for paid and reserved amounts.
- Reservation release when an approved purchase is cancelled or rejected.
- Concurrency controls to prevent simultaneous requests from bypassing budget checks within a single server process.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| AI | Google Gemini API, deterministic rules-engine fallback |
| Payments | PayPal JavaScript SDK, PayPal REST API v2 |
| Validation | Zod |
| Testing | Automated server tests |
| Data persistence | File-backed JSON storage |
| Deployment | Render |
| Version Control | Git & GitHub |

## Architecture

```text
React + TypeScript Client
          |
          v
    Express REST API
          |
    +-----+----------+
    |        |       |
    v        v       v
   Gemini  SpendGuard PayPal REST API
    AI     + Policies      |
    |        |             v
    +--------+        Order Capture
             |
             v
      Purchase Store
```

The backend validates purchase policies and authoritative payment amounts. The PayPal client secret remains server-side and must never be exposed to the browser.

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm
- Google Gemini API key
- PayPal Developer account with Sandbox credentials

### 1. Clone the repository

```bash
git clone https://github.com/dineshit27/procura-ai.git
cd procura-ai
```

### 2. Install dependencies

```bash
npm run install:all
```

Alternatively, install dependencies in the root, `server`, and `client` directories separately.

### 3. Configure environment variables

Copy the server environment template:

```bash
cp server/.env.example server/.env
```

Configure the variables supported by the server template. The primary settings include:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash

PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
```

Configure `PAYPAL_PAYEE_EMAIL` if required by your Sandbox setup. Use the exact variable names and defaults documented in `server/.env.example`.

Optionally, configure `client/.env`:

```env
VITE_API_URL=http://localhost:5000
```

**Never commit real API keys, PayPal secrets, or populated environment files.**

### Supabase authentication and initial administrator

Procura verifies the Supabase access token on the API server and obtains the
application role only from `public.profiles`. A Supabase Auth user is **not**
automatically authorized: the signed-in user must have a valid `profiles` row.

1. In the Supabase SQL Editor, run these files in order:
   - `supabase/migrations/20261020_auth_rbac.sql`
   - `supabase/migrations/20261020_initial_admin_setup.sql`
2. Create and verify the first user's email in Supabase Auth.
3. Set these server-only values locally or in the Render **backend service**:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_publishable_or_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   INITIAL_ADMIN_EMAIL=verified.admin@example.com
   INITIAL_ADMIN_SETUP_CONFIRM=assign-initial-admin
   ```

   Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_URL` in the
   frontend build environment. Never put `SUPABASE_SERVICE_ROLE_KEY` or either
   `INITIAL_ADMIN_*` variable in the frontend.
4. From a trusted machine with the server environment loaded, run:

   ```bash
   npm --prefix server run setup:initial-admin
   ```

   The command finds the verified user by email, then calls a database function
   executable only by `service_role`. It is not an HTTP endpoint and cannot
   accept browser credentials or a browser-selected role. It only succeeds if
   no administrator exists. Remove `INITIAL_ADMIN_EMAIL` and
   `INITIAL_ADMIN_SETUP_CONFIRM` immediately afterward.

For Render, set `CLIENT_URL` to the exact deployed frontend URL and set the
three `SUPABASE_*` values on the backend service. Rebuild the frontend after
setting its `VITE_*` values, because Vite embeds them at build time. Configure
the same frontend URL in Supabase Auth's Site URL and Redirect URLs.

### Roles and demo accounts

`ROLE_NOT_ASSIGNED` means authentication succeeded but the authenticated
Supabase user ID has no valid row in `public.profiles`. It is not a client-side
role error and cannot be fixed with an HTTP header. First assign the initial
administrator as above. That administrator can then use the protected
`POST /api/users/invite` endpoint with `{ "email", "role" }` to invite a user
and create its server-side profile in one operation. `PATCH /api/users/:id/role`
with `{ "role" }` changes an existing profile; both endpoints require a
verified bearer token belonging to an `admin` profile. Never expose the
service-role key to perform these operations from a browser.

For a judge-facing demo, create four separate, disposable Supabase Auth users
and invite/assign them as `admin`, `procurement_manager`, `finance_manager`,
and `requester`. Put only their email identifiers in the frontend build
environment using the `VITE_DEMO_*_EMAIL` variables documented in
`client/.env.example`. The Quick Demo Access cards remain disabled until each
identifier is configured. A `VITE_DEMO_*_PASSWORD` may be used only for an
isolated, intentionally public demo tenant; Vite exposes it to every visitor,
so it must never be a real user or production credential. Rebuild the client
after changing any `VITE_*` variable.

To verify a role assignment, sign in as that user and request `GET
/api/requests` with the session bearer token. A valid role returns authorized
data; a missing profile returns `403 ROLE_NOT_ASSIGNED`; missing or invalid
tokens return `401 UNAUTHENTICATED`. A role lookup outage is returned as `503
ROLE_LOOKUP_UNAVAILABLE` and should be retried after checking the backend's
Supabase server configuration.

### 4. Run the application

```bash
npm run dev
```

Default local URLs:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5000 |
| Health check | http://localhost:5000/api/health |

## Testing and Build

Run the available validation commands from the repository root:

```bash
npm test
npm run typecheck
npm run build
```

The test suite covers policy evaluation, environment validation, PayPal checkout, AI fallback behavior, persistence, spending controls, and security-related scenarios.

The latest reported validation completed with **95 tests passing and zero failures**. Re-run the tests after changes to verify the current result.

## Security and Limitations

- **Authentication and authorization:** Protected API routes verify the current Supabase access token and resolve roles from server-side `profiles` data. A missing role returns an actionable `ROLE_NOT_ASSIGNED` response; it is not treated as live data. The service-role key stays exclusively on the backend.
- **Simulated data:** Suppliers, catalog entries, and preloaded purchase history are demo data, not live supplier integrations.
- **AI reliability:** Gemini output assists purchasing decisions; deterministic backend rules enforce spending policies. AI recommendations are not guaranteed to be correct.
- **Payment environment:** Checkout uses PayPal Sandbox. Live payments require appropriate production credentials, configuration, security controls, and testing.
- **Persistence and scaling:** JSON storage and in-process concurrency controls are intended for the prototype. Production deployment should use a suitable database and distributed concurrency controls for multiple server instances.
- **Payment reconciliation:** Capture confirmation is handled synchronously; a PayPal webhook integration is not currently implemented.

## Future Scope

- Verified Google and email/password authentication with role-based access control.
- Live supplier and inventory integrations.
- Database-backed multi-business workspaces.
- PayPal webhook-based payment reconciliation.
- Advanced procurement analytics and configurable approval workflows.

## License

Released under the [MIT License](./LICENSE).

---

**Procura AI | Smarter purchasing. Controlled spending. Secure payment workflows.**
