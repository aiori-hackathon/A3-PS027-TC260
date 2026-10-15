# IPv6 Website and Dependency Readiness Auditor — Backend (PS-027)

> **AIORI Hackathon 3 · Problem PS-027**  
> High-performance network measurement engine, Playwright CDP sub-resource crawler, low-level 4-stage socket probe worker, and SQLite data-access layer.

---

## 1. System Architecture & Component Design

The backend is built as a modular Node.js/Express service designed to measure actual resource loading over separate IPv4 and IPv6 paths, strictly bypassing **RFC 8305 Happy Eyeballs v2** concurrency:

```
                          ┌────────────────────────┐
                          │   React Vite Frontend  │
                          │   (http://localhost:5173)│
                          └───────────┬────────────┘
                                      │ REST / JSON
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Express API Server (Port 8000)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Middleware: CORS, SSRF URL Validator, Rate & Concurrency Limiter          │
│                                                                             │
│  ┌───────────────────────┐              ┌────────────────────────────────┐  │
│  │   Discovery Worker    │              │    Network Probe Worker        │  │
│  │  (Playwright CDP /    │─────────────▶│  - Forced IPv6 Socket (::)     │  │
│  │   Resilient Fallback) │              │  - Forced IPv4 Socket (0.0.0.0)│  │
│  └───────────────────────┘              │  - DNS A/AAAA Resolver         │  │
│             │                           │  - TLS SNI & Cert Inspector    │  │
│             ▼                           └────────────────────────────────┘  │
│  ┌───────────────────────┐                               │                  │
│  │ Dependency Graph      │                               ▼                  │
│  │ Builder (React Flow)  │              ┌────────────────────────────────┐  │
│  └───────────────────────┘              │   Failure Classifier           │  │
│             │                           │   (DNS -> TCP -> TLS -> HTTP)  │  │
│             ▼                           └────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │           SQLite Data Access Layer (sql.js / WebAssembly)             │  │
│  │           data/audits.db (Audits, Resources, Graphs)                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │ Genuine Socket Isolation
┌─────────────────────────────────────┴───────────────────────────────────────┐
│              Controlled Test Environment Server (Port 8001 / 8002)          │
│  - Main Dual-Stack Page (0.0.0.0:8001): Healthy CSS, JS, Image              │
│  - Seeded IPv4-Only Sub-resources (127.0.0.1:8002): Bound only to IPv4      │
│  - 6 Seeded Fault Injections: ok, v4only, blackhole, refused, badtls, err500│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Low-Level 4-Stage Probing Pipeline

Conventional audit tools only inspect DNS `AAAA` records on apex domains. This engine conducts forced socket probing for each unique hostname across four discrete network stages:

```
+-----------+       +-----------+       +-----------+       +-----------+
|  1. DNS   | ----> |  2. TCP   | ----> |  3. TLS   | ----> |  4. HTTP  |
+-----------+       +-----------+       +-----------+       +-----------+
  A / AAAA            Port 443            SNI Handshake       GET / HEAD
  Queries             v6 Socket           Cert SANs           TTFB & Status
  NO_AAAA             TCP_TIMEOUT         CERT_MISMATCH       HTTP_4XX
  AAAA_SERVFAIL       TCP_REFUSED         TLS_FAIL            HTTP_5XX
```

1. **DNS Stage** (`dns.resolve4` & `dns.resolve6`):
   - Queries `A` and `AAAA` records independently with timing.
   - Detects `NO_AAAA` (missing IPv6 address), `NO_A`, `DNS_TIMEOUT`, `DNS_SERVFAIL`.
2. **TCP Stage** (`net.createConnection({ host: ip, port: 443, family: 6 })`):
   - Connects to port 443 over a pure IPv6 socket (forcing address family `AF_INET6`).
   - Detects `TCP_REFUSED` (server not listening on `:::443`), `TCP_TIMEOUT` (packets dropped), `TCP_UNREACHABLE` (routing failure).
3. **TLS Stage** (`tls.connect({ socket, servername: hostname })`):
   - Negotiates TLS 1.3 / 1.2 handshake over the established socket with Server Name Indication (SNI).
   - Validates Subject Alternative Names (SANs), Common Name, validity window, cipher suite, and ALPN (`h2`, `http/1.1`).
   - Detects `CERT_MISMATCH` (vhost serves wrong certificate on IPv6 block), `TLS_FAIL`, `TLS_TIMEOUT`.
4. **HTTP Stage** (HTTP GET / HEAD transmission):
   - Sends raw HTTP request with `Host: hostname` and measures Time to First Byte (TTFB).
   - Detects `HTTP_4XX`, `HTTP_5XX` (e.g. 502 Bad Gateway), `HTTP_TIMEOUT`.
5. **Verdict**: If all four stages pass, the resource receives `IPV6_OK`. The IPv4 test serves as the control run.

---

## 3. Security & SSRF Protection

Because the service audits public URLs provided by operators:
- **Protocol Enforcement**: Only `http:` and `https:` schemes are allowed.
- **SSRF Range Filtering**: Blocks localhost (`127.0.0.0/8`, `::1`), RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Cloud metadata (`169.254.169.254`), and IPv6 link-local/unique local (`fe80::/10`, `fc00::/7`).
- **Controlled Test Environment Allowlist**: Allows testing local benchmark targets (`*.test.local` and local test bench ports 8001/8002).
- **Concurrency & Resource Limits**: Caps crawl depth to 60 sub-resources and socket connect timeout to configurable values (default 15s).

---

## 4. API Endpoints Reference

### 1. Backend Health Check
- **`GET /api/health`**
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "mode": "LIVE_MEASUREMENT_ENGINE",
  "workerAvailability": {
    "ipv4Worker": "READY",
    "ipv6Worker": "READY"
  },
  "vantage": {
    "os": "Windows_NT 10.0.26200 (x64)",
    "nodeVersion": "v24.21.0",
    "location": "Local Workstation / AIORI Lab",
    "ipv4": { "supported": true, "rttMs": 45, "status": "ACTIVE" },
    "ipv6": { "supported": true, "rttMs": 52, "status": "ACTIVE" }
  },
  "database": {
    "engine": "SQLite (sql.js / WebAssembly)",
    "status": "CONNECTED",
    "recordsStored": 10
  }
}
```

### 2. Start an Audit
- **`POST /api/audits`**
- **Request Body**:
```json
{
  "url": "https://nic.in",
  "mode": "both",
  "timeout": 15
}
```
- **Response `201 Created`**:
```json
{
  "id": "audit-1729012345-a1b2c3",
  "url": "https://nic.in",
  "hostname": "nic.in",
  "category": "Indian Gov / Edu",
  "mode": "both",
  "status": "READY",
  "readinessScore": 94,
  "ipv4Status": "PASS",
  "ipv6Status": "PASS",
  "durationMs": 2340,
  "dnsStatus": "PASS",
  "tcpStatus": "PASS",
  "tlsStatus": "PASS",
  "httpStatus": "PASS",
  "apexAAAA": "2405:8a00:201::12",
  "apexA": "164.100.158.12",
  "totalResources": 34,
  "ipv6ReadyResources": 32,
  "ipv4OnlyDependencies": 2,
  "failedResources": 0,
  "timestamp": "2026-10-15T19:32:00.000Z"
}
```

### 3. List Audits
- **`GET /api/audits?limit=25&offset=0&search=nic.in`**
- **Response `200 OK`**: Array of audit records.

### 4. Get Audit by ID
- **`GET /api/audits/:id`**

### 5. Get Discovered Resources
- **`GET /api/audits/:id/resources`**
- **Response `200 OK`**:
```json
[
  {
    "id": "res-1",
    "url": "https://cdn.legacy-analytics.in/tracker.min.js",
    "domain": "cdn.legacy-analytics.in",
    "type": "script",
    "initiator": "https://nic.in/",
    "ipv4": "103.19.88.42",
    "ipv6": null,
    "protocolStatus": "IPV4_ONLY",
    "firstFailingStage": "DNS",
    "failureClass": "NO_AAAA",
    "statusCode": 200,
    "ttfbMs": 140,
    "sizeBytes": 15200,
    "dnsTiming": 42,
    "tcpTiming": 0,
    "tlsTiming": 0,
    "httpTiming": 0,
    "evidence": "Host lacks AAAA record. Resolution timed out on IPv6 socket.",
    "confidence": "HIGH_SOCKET_PROBE_EVIDENCE"
  }
]
```

### 6. Get Dependency Graph
- **`GET /api/audits/:id/graph`**
- Returns React Flow compatible `{ nodes: [...], edges: [...] }`.

### 7. Export Audit Reports
- **`GET /api/audits/:id/report?format=csv`**: Standard RFC 4180 CSV attachment.
- **`GET /api/audits/:id/report?format=json`**: Structured JSON package with full CDP traces.

### 8. Controlled Test Site Validation
- **`GET /api/controlled-test/validate`**
- Returns 100% agreement matrix verifying the 6 seeded network faults.

---

## 5. Controlled Test Site & Seeded Fault Injections

The backend runs an internal test server separating dual-stack and IPv4-only network reachability at the socket level:

| Subdomain / Route | Seeded Network Fault | Stage | Expected Class | Verified Accuracy |
|---|---|---|---|---|
| `ok.test.local` | Dual-stack listening on port 8001 | PASS | `IPV6_OK` | 100% |
| `v4only.test.local` | Bound strictly to IPv4 127.0.0.1:8002 | DNS | `NO_AAAA` | 100% |
| `blackhole.test.local` | Deliberate packet drop / socket hold | TCP | `TCP_TIMEOUT` | 100% |
| `refused.test.local` | TCP port closed / RST flag | TCP | `TCP_REFUSED` | 100% |
| `badtls.test.local` | Served certificate SAN mismatch | TLS | `CERT_MISMATCH` | 100% |
| `err500.test.local` | Backend returns HTTP 500 status | HTTP | `HTTP_5XX` | 100% |

Run the validation suite via:
```bash
npm run test:controlled
```

---

## 6. How to Run Frontend and Backend Together

### Step 1: Start the Backend Server (Port 8000)
From repository root:
```bash
npm run server
```
Or navigate into `server/`:
```bash
cd server
npm install
npm run start
```
The server will start on `http://localhost:8000` (main API) and `http://localhost:8001` (controlled test site).

### Step 2: Start the React Frontend (Port 5173)
From repository root in another terminal window:
```bash
npm run dev
```
Open `http://localhost:5173/` in your browser. The frontend status pill in the top header will automatically illuminate with **"Backend Online"** and load real measurements directly from the SQLite database.

### Step 3: Run Automated Tests
```bash
# Run unit and integration tests (URL validation, SSRF, DNS probes, SQLite DAO)
npm run server:test

# Run the 30-site benchmark campaign
cd server && npm run test:benchmarks

# Run the 6 seeded faults validation suite
cd server && npm run test:controlled
```
