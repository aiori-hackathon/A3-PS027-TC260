# IPv6 Website and Dependency Readiness Auditor (PS-027)

> **AIORI Hackathon 3 · Problem PS-027**  
> Finding where IPv6 fails during real resource loading: **DNS, TCP, TLS, and HTTP**.  
> Author: Devang Gangwar (`devanggangwar3@gmail.com`)

---

## 1. Executive Summary & Problem Context

A modern website is **not** IPv6-ready simply because its apex domain publishes a DNS `AAAA` record. Web applications pull dozens of critical scripts, stylesheets, fonts, images, and API endpoints from multiple CDNs and third parties—many of which remain IPv4-only.

On pure IPv6-only networks or NAT64/DNS64 boundaries (such as cellular networks like Reliance Jio or T-Mobile), a single IPv4-only dependency causes broken page styling, missing fonts, authentication failure, or dead interactive widgets. Furthermore, modern desktop and mobile browsers implement **RFC 8305 Happy Eyeballs v2**, which races IPv6 against IPv4 and silently falls back to IPv4 in ~250ms whenever an IPv6 path fails. This conceals severe IPv6 deployment faults from network operators.

This project implements a commercial-grade, responsive cybersecurity and network diagnostics frontend for **PS-027: IPv6 Website and Dependency Readiness Auditor**. It isolates every sub-resource across both address families and reports the exact first failing stage (**DNS, TCP, TLS, or HTTP**) without false assumptions.

---

## 2. Technology Stack

- **Core & Runtime**: HTML5, Vanilla CSS3 (Custom Properties Design System), JavaScript (ES6+), React 18
- **Build Tool**: Vite 5
- **Routing**: React Router DOM 6
- **Data Visualization & Charts**: Recharts
- **Dependency Flow & Node Graphs**: `@xyflow/react` (React Flow v12)
- **Icons**: Lucide React
- **Typography**: Inter (UI) & JetBrains Mono (IPs, DNS records, traces, latency)

---

## 3. Project Architecture & Directory Layout

```
A3-PS027-TC260/
├── .env.example                  # Environment configuration template
├── .env                          # Local environment settings
├── index.html                    # Single-Page Application root HTML with SEO meta tags
├── package.json                  # Dependencies and build scripts
├── vite.config.js                # Vite bundler configuration
├── src/
│   ├── assets/                   # Static media and brand assets
│   ├── components/
│   │   ├── common/
│   │   │   ├── DemoNotice.jsx    # Benchmark / Simulated Mode indicator banner
│   │   │   ├── ExportButtons.jsx # One-click CSV and JSON report export buttons
│   │   │   ├── Header.jsx        # Top navbar with live status pill, target selector & theme toggle
│   │   │   ├── Modal.jsx         # Accessible modal dialog
│   │   │   ├── Sidebar.jsx       # Collapsible cybersecurity sidebar navigation
│   │   │   ├── StatCard.jsx      # Cyber KPI stat cards with colored accents
│   │   │   ├── StatusBadge.jsx   # Diagnostic status pills (Ready, Degraded, Failed, IPv4)
│   │   │   └── Toast.jsx         # Real-time toast notifications container
│   │   ├── diagnostics/
│   │   │   └── FailureDetails.jsx# Stage-classified failure cards with empirical socket evidence
│   │   ├── graph/
│   │   │   ├── CustomResourceNode.jsx # React Flow custom node with timing and status badges
│   │   │   ├── DependencyGraph.jsx    # Interactive graph canvas with controls, minimap & filters
│   │   │   └── NodeDetailDrawer.jsx   # Slide-in deep inspector for sub-resources
│   │   ├── results/
│   │   │   ├── DiagnosticChecklist.jsx# 4-stage apex checklist (DNS -> TCP -> TLS -> HTTP)
│   │   │   └── ResourceTable.jsx      # Sub-resource table with search, sorting & pagination
│   │   └── scanner/
│   │       ├── AuditProgress.jsx # Visual 4-stage pipeline tracker & streaming terminal console
│   │       └── ScanForm.jsx      # Audit URL configuration with benchmark & fault presets
│   ├── context/
│   │   └── AuditContext.jsx      # Global state for audits, scans, theme, and backend health
│   ├── layouts/
│   │   └── MainLayout.jsx        # App layout wrapper (Sidebar + Header + Outlet + Toasts)
│   ├── pages/
│   │   ├── DashboardPage.jsx     # High-level network health, protocol charts & recent audits
│   │   ├── ScannerPage.jsx       # Target website scanner with real-time probe progress
│   │   ├── ResultsPage.jsx       # 4-Stage apex checklist, KPIs & sub-resource inventory
│   │   ├── DependencyGraphPage.jsx# React Flow graph visualizing bottlenecks & initiators
│   │   ├── FailureAnalysisPage.jsx# Taxonomy isolating DNS, TCP, TLS, and HTTP failures
│   │   ├── ComparisonPage.jsx    # 30-site benchmark comparison table + side-by-side diff
│   │   ├── ReportsPage.jsx       # Executive summary, printable audit report & CSV/JSON export
│   │   ├── ControlledTestSitePage.jsx # Ground-truth lab matrix with 6 seeded fault subdomains
│   │   ├── SettingsPage.jsx      # Backend API URL, scan timeout, and vantage context
│   │   └── NotFoundPage.jsx      # 404 handler
│   ├── services/
│   │   ├── api.js                # API service module supporting all REST endpoints
│   │   └── mockData.js           # 30 real-world benchmark sites + 6 seeded controlled subdomains
│   ├── utils/
│   │   └── formatters.js         # Latency, bytes, date, and CSV file generation helpers
│   ├── App.jsx                   # React Router routing configuration
│   ├── index.css                 # Vanilla CSS cyber dark & light design system
│   └── main.jsx                  # Application entry point
```

---

## 4. Required Pages Implemented

### A. Dashboard (`/`)
- Total websites audited, IPv6-ready count, IPv4-only bottlenecks detected, and failed requests.
- **Protocol Comparison Chart**: IPv4 vs IPv6 success rate across DNS, TCP, TLS, and HTTP.
- **Failure Taxonomy Chart**: Categorized distribution of primary failure stages.
- **Sector Breakdown Chart**: Performance across Indian Gov/Edu, Global Tech, and Commercial sectors.
- Recent audit history table with direct inspection links.

### B. Website Scanner (`/scanner`)
- Input for target URL with comprehensive validation (must be valid FQDN / protocol).
- Quick presets for **Indian Gov** (`nic.in`), **Global Tech** (`google.com`, `github.com`), **Commercial Media** (`cnn.com`), and **Controlled Faults** (`v4only.test.local`, `badtls.test.local`).
- Test mode selection: Dual-Stack Baseline (`both`), IPv6-Only (`ipv6`), IPv4-Only (`ipv4`).
- Configurable scan timeout (10s, 15s, 30s, 60s).
- **Interactive 4-Stage Visual Pipeline**: Live animation tracking DNS Resolution, TCP Handshake, TLS Negotiation, and CDP Sub-Resource Mapping.
- **Real-Time Terminal Console**: Auto-scrolling diagnostic stream displaying socket logs.
- Cancel Audit button while a scan is in progress.

### C. Audit Results (`/results`)
- Target URL, test timestamp, and IPv6 readiness score percentage.
- **4-Stage Diagnostic Checklist**:
  - **DNS Resolution**: Checks AAAA record presence vs IPv4 A record.
  - **TCP Connection**: Confirms port 443 handshake on pure IPv6 socket.
  - **TLS Negotiation**: Verifies SNI hostname match, ALPN (`h2`, `http/1.1`), and cipher suite.
  - **HTTP Response**: Validates status code (e.g. 200 OK) and response timing.
- **Sub-Resource Table**:
  - Filter by protocol (`Dual-Stack`, `IPv4-Only`, `Degraded`), resource type (`Script`, `Stylesheet`, `Image`, `Font`, `Fetch/API`), or failure stage (`DNS`, `TCP`, `TLS`, `HTTP`).
  - Search by URL or domain name.
  - Multi-column sorting and pagination.
  - **Side Inspector Drawer**: Click "Inspect" to view latency breakdown, IP addresses, and forensic trace evidence.

### D. Dependency Graph (`/graph`)
- Interactive **React Flow** canvas displaying the full resource dependency tree.
- Custom styled nodes showing resource type icon, domain, and protocol status.
- Color-coded borders: **Emerald** (IPv6 OK), **Amber** (Degraded/Timeout), **Rose** (IPv4 Bottleneck).
- Directed edges connecting document initiator to second-level scripts, CSS, and fonts.
- **Filter Toolbar**: Toggle between "All Resources", "Bottlenecks Only", and "Dual-Stack Ready".
- Clicking any node opens the slide-in detail inspector with socket measurements.

### E. Failure Analysis (`/failures`)
- Detailed diagnostics separated strictly by the **first failing stage**:
  - **DNS**: `NO_AAAA` (missing record), `AAAA_SERVFAIL`, `AAAA_TIMEOUT`
  - **TCP**: `TCP_REFUSED` (port 443 RST), `TCP_TIMEOUT` (packets blackholed), `TCP_UNREACHABLE`
  - **TLS**: `CERT_MISMATCH` (wrong vhost certificate), `TLS_FAIL`, `ALPN_FAIL`
  - **HTTP**: `HTTP_4XX`, `HTTP_5XX` (502 Bad Gateway), `HTTP_TIMEOUT`
  - **Security**: CORS headers omitted over IPv6 endpoints.
- Strict adherence to hackathon principle: *Never classify a failure as an IPv6 failure without empirical evidence*.
- Includes "Copy Evidence" button for socket traces.

### F. Website Comparison (`/comparison`)
- Tabular benchmark comparison of 30 websites by IPv4 status, IPv6 status, total sub-resources, IPv4-only bottlenecks, and scan duration.
- Search, filter by sector, and column sorting.
- **Side-by-Side Comparison Matrix**: Check any 2 or 3 sites to view an instant side-by-side comparative card matrix.

### G. Reports & Export (`/reports`)
- Executive audit readiness summary and compliance statement.
- Stage-by-stage resource count breakdown.
- **Export CSV**: Generates standard comma-separated audit metrics for spreadsheet analysis.
- **Export JSON**: Exports complete structured audit payload including CDP traces.
- Printable styling with `Print Report` button.

### H. Controlled Test Site (`/test-site`)
- Dedicated page for the 6 seeded network fault subdomains:
  1. `ok.test.local`: A + AAAA healthy dual-stack -> Expected: `IPV6_OK`
  2. `v4only.test.local`: A record only -> Expected: `NO_AAAA`
  3. `blackhole.test.local`: AAAA exists, IPv6 packets dropped -> Expected: `TCP_TIMEOUT`
  4. `refused.test.local`: AAAA exists, port 443 closed -> Expected: `TCP_REFUSED`
  5. `badtls.test.local`: IPv6 vhost serves invalid certificate -> Expected: `CERT_MISMATCH`
  6. `err500.test.local`: IPv6 backend returns 500 error -> Expected: `HTTP_5XX`
- Interactive **"Run All 6 Fault Verifications"** test runner computing classifier accuracy (100% agreement).

### I. Settings & API (`/settings`)
- Configurable **Backend API Base URL** (persisted in `localStorage` with fallback to `VITE_API_BASE_URL`).
- **Test Backend Connection** button probing `/api/health`.
- Default scan timeout selector.
- Dark Cyber Navy vs Light Engineering theme toggle.
- Measurement vantage context display (Client OS, User-Agent, RFC 8305 parameters).

---

## 5. Backend Integration Preparation

The frontend is fully decoupled and connects to backend REST endpoints via `src/services/api.js`:

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Probes measurement engine connectivity |
| `/api/audits` | `POST` | Starts a new audit with `{ url, mode, timeout }` |
| `/api/audits` | `GET` | Retrieves audit history list |
| `/api/audits/:id` | `GET` | Fetches details and apex checklist for a specific audit |
| `/api/audits/:id/resources` | `GET` | Fetches discovered sub-resources and stage verdicts |
| `/api/audits/:id/graph` | `GET` | Fetches dependency graph nodes and edges for React Flow |
| `/api/audits/:id/report?format=csv` | `GET` | Exports CSV dataset |
| `/api/audits/:id/report?format=json` | `GET` | Exports complete JSON report |

### Connecting to Your Real Backend
1. Start your FastAPI / Playwright backend service on `http://localhost:8000` (or your chosen URL).
2. Ensure CORS is enabled on the backend to allow requests from the frontend origin:
   ```python
   from fastapi.middleware.cors import CORSMiddleware
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```
3. Set the base URL in `.env`:
   ```bash
   VITE_API_BASE_URL=http://localhost:8000
   VITE_USE_MOCK_FALLBACK=true
   ```
4. Or configure it on the fly in the **Settings** page (`/settings`) in the application UI. The system automatically detects when your backend is active and switches the status pill from **"Simulated Engine"** to **"Backend Online"**.

---

## 6. How to Run Locally

### Prerequisites
- Node.js version 18+ (tested on Node v24)
- npm version 9+

### 1. Installation
Install root frontend dependencies and backend dependencies:
```bash
npm install
cd server && npm install && cd ..
```

### 2. Run Both Backend and Frontend
In terminal 1 (start Backend on port 8000 & 8001):
```bash
npm run server
```

In terminal 2 (start React Frontend on port 5173):
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173/
```
The frontend top header will illuminate **"Backend Online"** and load live data from the SQLite database.

### 3. Run Automated Tests & Benchmarks
```bash
# Run backend test suite (URL validation, SSRF, DNS probes, SQLite DAO)
npm run server:test

# Run the 30-site benchmark campaign
cd server && npm run test:benchmarks

# Run the 6 seeded faults validation suite
cd server && npm run test:controlled
```

### 4. Production Build
```bash
npm run build
npm run preview
```

---

## 7. AIORI Hackathon Problem PS-027 References
- **RFC 8305**: Happy Eyeballs Version 2: Better Connectivity Using Concurrency
- **RFC 6724**: Default Address Selection for Internet Protocol Version 6 (IPv6)
- **RFC 6146**: Stateful NAT64: Network Address & Protocol Translation
- **RFC 6147**: DNS64: DNS Extensions for NAT64
- **RFC 8200**: Internet Protocol, Version 6 (IPv6) Specification
- **W3C Resource Timing**: Level 2 / Level 3
- **Chrome DevTools Protocol (CDP)**: Network Domain trace models