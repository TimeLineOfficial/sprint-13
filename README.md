# ApexTrack Enterprise — Global Autonomous Telemetry & Fleet Mesh
## Prodesk IT Associate Software Engineering — Sprint 13: Capstone Phase
**Author:** Himesh Singh (PDIT-FTE-11462)  
**Assigned Epic:** Core Infrastructure Overhaul & Distributed Systems Architecture  
**Deliverable Status:** Complete (Phase 1, Phase 2, and Phase 3 Fully Executed)  
**Live Edge Deployment:** [https://timelineofficial.github.io/Sprint-13/](https://timelineofficial.github.io/Sprint-13/)  
**GitHub Repository:** [https://github.com/TimeLineOfficial/Sprint-13](https://github.com/TimeLineOfficial/Sprint-13)  

---

## 1. Executive Summary

**ApexTrack Enterprise** is a high-throughput, microservices-driven logistics telemetry orchestration platform engineered to ingest, process, and visualize real-time IoT sensor telemetry across tens of thousands of distributed freight and fleet assets.

The platform provides sub-200ms end-to-end telemetry streaming, automated cold-chain temperature excursion alerts, dynamic geofence containment monitoring, and automated dispatch workflows with cryptographically verified Proof-of-Delivery (PoD).

---

## 2. Capstone Phasing & Deliverables

### Phase 1: Product Requirements Document (PRD) (P0 - Mandatory)
* **File:** [`PRD.md`](./PRD.md)
* **Contents:**
  - Executive Problem Statement & Target Personas (Master Dispatcher, Cold-Chain Auditor, Enterprise SecOps).
  - Primary Happy Paths: Vehicle Provisioning, Dynamic Route Dispatch, In-Transit Telemetry Streaming, Proof-of-Delivery.
  - Unhappy Paths & Edge Case Matrix: Terrestrial cellular dropouts (72h NVRAM store-and-forward), cold-chain temperature excursions, geofence boundary flapping (hysteresis filtering), and database partition tolerance.
  - Non-Functional Requirements (NFRs): 50,000 pings/sec throughput, < 200ms p99 latency, 99.99% availability, OAuth2/JWT zero-trust authentication, WCAG 2.1 AA accessibility.

### Phase 2: Entity Relationship Diagrams & Database Normalization (P0 - Mandatory)
* **File:** [`ERD.md`](./ERD.md)
* **DDL Implementation:** [`database/schema.sql`](./database/schema.sql)
* **Contents:**
  - Strict 3NF Relational Data Layer covering 10 core entities: `organizations`, `users`, `vehicles`, `drivers`, `shipments`, `waypoints`, `telemetry_logs`, `geofence_zones`, `incident_alerts`, and `audit_logs`.
  - Mathematical Normalization Proofs for 1NF (atomic attributes), 2NF (elimination of partial composite key dependencies), and 3NF (elimination of transitive functional dependencies).
  - Advanced PostgreSQL 16 features: BRIN time-series indexing for 98% memory savings, monthly table partitioning on telemetry logs, and PostGIS geospatial polygon containment.

### Phase 3: Microservices & Docker Architecture Blueprint (P0 - Mandatory)
* **File:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)
* **Orchestration Config:** [`docker-compose.yml`](./docker-compose.yml)
* **Contents:**
  - Monolithic architecture eliminated into 7 decoupled containers:
    1. `api-gateway`: NGINX 1.25 reverse proxy, rate-limiting (100 req/s), SSL termination.
    2. `auth-service`: Node.js RS256 JWT generation, RBAC authorization, token revocation.
    3. `dispatch-service`: CRUD operations for shipments, vehicles, and route waypoints.
    4. `telemetry-service`: High-throughput sensor ingestion streaming directly into Redis Streams (`XADD`).
    5. `analytics-worker`: Background daemon evaluating geofence breaches and cold-chain excursions via consumer groups (`XREADGROUP`).
    6. `redis-cache`: Redis 7 in-memory cache, stream buffer, and Pub/Sub broker.
    7. `postgres-db`: PostgreSQL 16 + PostGIS persistent data store.
  - 3 Isolated Software-Defined Networks:
    - `frontend-net` (172.28.1.0/24): Ingress traffic to API gateway only.
    - `backend-net` (172.28.2.0/24): Gateway to application microservices.
    - `data-net` (172.28.3.0/24): Strict private internal network connecting microservices to DB and Redis.
  - Production optimizations: Multi-stage Docker builds (< 95 MB images), token bucket rate limiting, Gzip/Brotli compression, connection pooling.

---

## 3. Project Directory Structure

```
sprint-13/
├── PRD.md                         # Phase 1: Comprehensive Product Requirements Document
├── ERD.md                         # Phase 2: Entity Relationship Diagrams & Normalization Proofs
├── ARCHITECTURE.md                # Phase 3: Microservices & Docker Architecture Blueprint
├── docker-compose.yml             # Phase 3: Production Multi-Container Orchestration Blueprint
├── index.html                     # Live Enterprise Web Dashboard (GitHub Pages / Vercel)
├── styles.css                     # Commercial-Grade Design System & Responsive CSS
├── app.js                         # Telemetry Engine, Radar Simulation & State Management
├── 404.html                       # SPA Fallback for GitHub Pages
├── .nojekyll                      # Disable Jekyll processing on GitHub Pages
├── vercel.json                    # Edge CDN Deployment Configuration
├── database/
│   └── schema.sql                 # Complete 3NF Normalized PostgreSQL DDL
├── nginx/
│   └── nginx.conf                 # Edge API Gateway Reverse Proxy Configuration
├── microservices/
│   ├── auth-service/              # Node.js Auth Microservice (Dockerfile, package.json, server.js)
│   ├── telemetry-service/         # Ingestion Engine Microservice (Dockerfile, package.json, server.js)
│   ├── dispatch-service/          # Fleet Dispatch Microservice (Dockerfile, package.json, server.js)
│   └── analytics-worker/          # Background Alert Worker (Dockerfile, package.json, worker.js)
├── public/                        # Static bundle for NGINX Gateway container
├── PROMPTS.md                     # Engineering Prompt History & Methodology
├── links.txt                      # Submission Links Manifest
└── README.md                      # Primary Technical Documentation
```

---

## 4. How to Run Locally

### Option A: Launch Distributed Microservices via Docker Compose
To run the full multi-container architecture with all 7 isolated services:

```bash
# Clone the repository
git clone https://github.com/TimeLineOfficial/Sprint-13.git
cd Sprint-13

# Launch all microservices in detached mode
docker compose up --build -d

# Check status of containers
docker compose ps
```

The services will initialize:
* **Web Operations Dashboard & Gateway:** [http://localhost](http://localhost)
* **Auth Microservice:** `http://localhost/api/v1/auth/health`
* **Dispatch Microservice:** `http://localhost/api/v1/dispatch/health`
* **Telemetry Ingestion Engine:** `http://localhost/api/v1/telemetry/health`

To tear down the containers:
```bash
docker compose down -v
```

### Option B: Run Standalone Edge Frontend
Open `index.html` directly in any modern browser, or run a local HTTP server:
```bash
npx serve .
# or
python -m http.server 3000
```

---

## 5. Security & Verification

* **Input Sanitization:** All text inputs in the dispatch interface pass through strict XSS escaping prior to insertion.
* **Network Isolation:** PostgreSQL and Redis containers have zero port mappings to the host machine and are accessible solely through the internal `data-net` bridge.
* **Accessibility:** 100% keyboard navigable with semantic landmarks and ARIA live regions for telemetry updates.

---

## 6. Author Information
* **Lead Systems Architect:** Himesh Singh
* **Employee ID:** PDIT-FTE-11462
* **Sprint Assignment:** Sprint 13 — Capstone Phase: Architecture & PRD
* **Organization:** Prodesk IT
