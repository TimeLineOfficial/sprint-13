# Product Requirements Document (PRD)
## Project ApexTrack: Global Autonomous Logistics & Telemetry Orchestration Platform
**Document Version:** 2.4.0  
**Classification:** Enterprise Tier (P0 Capstone Deliverable)  
**Author:** Himesh Singh (PDIT-FTE-11462), Lead Systems Architect  
**Reviewer:** Amit Sharma (Senior Staff Engineer, Prodesk IT)  
**Status:** Approved for Commercial Production Deployment  

---

## 1. Executive Summary & Problem Statement

Modern enterprise logistics networks operate across multinational transit corridors carrying high-value freight, perishable pharmaceuticals, and time-critical industrial assets. Traditional telematics systems suffer from fragmented architectures, siloed communication protocols, high telemetry ingestion latency (>10 seconds), and zero resilience during terrestrial cellular dropouts.

**ApexTrack Enterprise** is a high-throughput, microservice-driven telemetry orchestration platform engineered to ingest, process, and visualize real-time IoT sensor telemetry across tens of thousands of distributed fleet assets. The platform provides sub-200ms end-to-end telemetry streaming, automated cold-chain temperature excursion alerts, dynamic geofence containment monitoring, and automated dispatch workflows with cryptographically verified Proof-of-Delivery (PoD).

---

## 2. Business Objectives & Success Metrics (KPIs)

| Metric | Baseline (Legacy) | Target (ApexTrack Enterprise) | Business Impact |
| :--- | :--- | :--- | :--- |
| **Telemetry Ingestion Latency (p99)** | 12.4 seconds | **< 200 milliseconds** | Real-time hazard intervention and routing agility |
| **Cold-Chain Spoilage Rate** | 4.8% of transits | **< 0.15% of transits** | Prevention of multi-million dollar pharmaceutical losses |
| **Fleet Asset Utilization** | 68.2% | **>= 92.5%** | Elimination of dead-head miles and idle dwell times |
| **Driver Dwell Time at Depots** | 54 minutes | **<= 14 minutes** | Automated geofence bay assignment upon arrival |
| **System Availability** | 99.2% | **99.99% (High Availability)** | Zero downtime during critical logistics peak seasons |

---

## 3. User Personas & Stakeholders

### 3.1. Master Fleet Dispatcher (*Elena Rostova*)
* **Role:** Operations Center Controller overseeing 150+ regional transit vehicles simultaneously.
* **Core Needs:** Instant radar/map visibility of all in-transit vehicles, one-click route re-assignment, live telemetry gauges (speed, fuel, battery, tire pressure, cargo temperature), and real-time incident notifications.
* **Pain Points:** Information overload, lagging web interfaces, and lack of automated alerts during off-route diversions.

### 3.2. Cold-Chain Compliance Auditor (*Marcus Vance*)
* **Role:** Pharmaceutical & Food Safety Regulatory Officer.
* **Core Needs:** Continuous tamper-proof temperature/humidity audit logs, threshold excursion detection, and verifiable cryptographic compliance reports.
* **Pain Points:** Post-facto discovery of temperature spikes, uncalibrated sensor drift, and non-compliance fines.

### 3.3. Enterprise SecOps & Infrastructure Engineer (*Sarah Chen*)
* **Role:** Systems Administrator & Platform Security Lead.
* **Core Needs:** Zero-trust architecture, Role-Based Access Control (RBAC), end-to-end mutual TLS, microservice container isolation, and sub-second rate-limiting at the API Gateway.
* **Pain Points:** Monolithic cascade failures, exposed database credentials, and unpartitioned telemetry tables locking down transactional queries.

---

## 4. End-to-End User Journeys (Primary Happy Paths)

```
[IoT Asset/Vehicle] --> (MQTT/TLS) --> [Ingestion Gateway] --> [Redis Telemetry Stream]
                                                                        |
                                                                        v
[Dispatch Dashboard] <-- (WebSocket) <-- [Analytics Worker] <-- [Processing Engine]
         |                                                              |
         +------------> (REST / Dispatch) -------------> [PostgreSQL 3NF Data Layer]
```

### Flow 1: Vehicle Provisioning & Telemetry Pairing
1. Fleet Administrator registers a new autonomous vehicle or tractor unit with VIN, license plate, chassis model, fuel/EV profile, and hardware IoT IMEI.
2. The platform generates an ephemeral pairing token and provisions an isolated MQTT topic (`/fleets/{tenant_id}/vehicles/{vehicle_id}/telemetry`).
3. Hardware sensor initializes, performs mTLS handshake with the Ingestion Gateway, and begins emitting 1Hz telemetry heartbeats.

### Flow 2: Shipment Creation, Dynamic Route Assignment & Dispatch
1. Dispatcher selects origin depot, destination hub, cargo classification (Dry Goods, HazMat, Ultra-Cold Cryo), and target delivery window.
2. The Dispatch Microservice calculates optimal waypoints, allocates an eligible vehicle based on payload capacity and current SOC (State of Charge), and commits the route.
3. Shipment transitions to `DISPATCHED` state; driver telemetry unit receives turn-by-turn waypoints and manifests.

### Flow 3: Real-Time In-Transit Telemetry & Geofence Containment
1. The vehicle emits continuous telemetry: GPS coordinates, velocity, engine RPM, battery temperature, and ambient cargo compartment climate readings.
2. The Telemetry Ingestion Service pushes payloads to a high-capacity Redis buffer (`XADD telemetry:stream`).
3. The Analytics Worker evaluates incoming coordinates against active polygonal geofences using PostGIS spatial algorithms.
4. When inside tolerance, the Dispatch Dashboard UI updates the vehicle's position marker smoothly using client-side dead reckoning interpolation.

### Flow 4: Delivery Handshake & Cryptographic Proof-of-Delivery (PoD)
1. Upon vehicle arrival within 50 meters of the destination geofence, the system automatically triggers the "Arrival Verified" state.
2. The recipient inspects cargo seals and provides a digital signature or hardware token tap.
3. The system captures geo-stamp, timestamp, and signature hash, updates shipment status to `DELIVERED`, and dispatches the billing webhook.

---

## 5. Unhappy Paths & Edge Case Matrix

| Edge Case / Failure Mode | Root Cause | System Behavior & Mitigation Protocol |
| :--- | :--- | :--- |
| **Terrestrial Cellular Dropout** | Mountainous transit corridors or undersea tunnel passages. | **Store-and-Forward Buffer:** IoT unit buffers up to 72 hours of telemetry in local NVRAM. Upon signal reconnection, telemetry is streamed with original sensor timestamps. Ingestion engine performs out-of-order deduplication via sliding-window sequence numbers. |
| **Cold-Chain Temperature Excursion** | Refrigeration compressor failure on perishable cargo. | **Critical P0 Alert:** If cargo temp exceeds configured safety corridor (e.g., > -18°C for deep freeze) for > 180 seconds, Analytics Worker fires an immediate P0 push alert to Dispatcher, activates vehicle emergency cab buzzer, and suggests nearest cross-dock facility. |
| **Geofence Boundary Flapping** | GPS multipath jitter bouncing near boundary fence. | **Hysteresis Filtering:** Geofence transitions require 3 consecutive pings outside the polygon plus a minimum speed vector (> 5 km/h) before triggering an `OUT_OF_BOUNDS` event. |
| **Ingestion DDoS / Traffic Spike** | Network storm or compromised IoT node flooding telemetry. | **Gateway Token-Bucket Throttling:** Nginx/API Gateway enforces per-client IP and per-IMEI rate limits (max 5 pings/sec per vehicle). Spikes exceeding 120% burst are redirected to a rate-limiting dead-letter queue (DLQ) without impacting legitimate transit streams. |
| **Stale Auth Token During Active Dispatch** | JWT 15-minute lifetime expires while dispatcher fills manifest. | **Silent Background Refresh:** Client intercepts 401 via Axios/Fetch response interceptor, requests a new access token via HTTP-only rotating refresh token, and replays the dispatch mutation with zero user-visible disruption. |
| **Database Network Partition** | Primary DB replica connectivity severed. | **Circuit Breaker Pattern:** Redis Cache acts as read-fallback for active fleet coordinates; incoming writes are buffered into Redis Streams with a 4-hour durability TTL until PostgreSQL replica healthcheck succeeds. |

---

## 6. Non-Functional Requirements (NFRs)

### 6.1. Performance & Scalability
* **Throughput:** Architecture must sustain minimum **50,000 telemetry events per second** across 10,000 concurrent fleet assets.
* **Latency:** Internal microservice RPC latency <= 15ms; Edge-to-client UI telemetry rendering latency <= 200ms p99.
* **Resource Optimization:** Docker microservices must operate with multi-stage builds and strict container memory caps (`<= 256MB` for API Gateway, `<= 512MB` for Node.js workers).

### 6.2. Security, Compliance & Identity
* **Authentication:** OAuth2.0 / OpenID Connect with JSON Web Tokens (RS256 asymmetric signatures). 15-minute access token lifespan, 7-day sliding refresh tokens.
* **Role-Based Access Control (RBAC):** Strict privileges partitioned across `SUPER_ADMIN`, `DISPATCHER`, `AUDITOR`, and `TELEMETRY_NODE`.
* **Transport Security:** Strict TLS 1.3 enforced across all public endpoints; mTLS (Mutual TLS) on internal Docker service-to-service communication.
* **Data Sanitization:** Strict schema validation with DOMPurify on frontend and parameterized SQL prepared statements to eliminate XSS and SQL Injection vulnerabilities.

### 6.3. Reliability, Availability & Disaster Recovery
* **Availability:** 99.99% annual uptime.
* **Recovery Point Objective (RPO):** < 1 second (streamed write-ahead logs to multi-AZ storage).
* **Recovery Time Objective (RTO):** < 30 seconds (automated container restart policies and Docker swarm/Kubernetes replica failover).

### 6.4. Accessibility (a11y) & Usability
* **Standard:** Full conformance with **WCAG 2.1 Level AA** standards.
* **Keyboard Navigation:** 100% of interactive controls (filters, modals, telemetry tabs) navigable via standard Tab / Shift+Tab / Space / Enter keys.
* **Screen Reader Support:** Semantic HTML5 landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), ARIA live regions (`aria-live="polite"`) for real-time telemetry updates.
* **Viewport Adaptability:** Seamless responsive layout across 320px (Mobile), 768px (Tablet), 1024px (Laptop), and 1440px+ (4K Operations Wall Display) with zero horizontal scroll clipping.

---

## 7. Release Milestones & Approval Sign-Off

* **Phase 1 (Complete):** PRD specification, user flows, edge case matrix, and NFR definition.
* **Phase 2 (Target):** 3NF Normalized Relational Schema, DDL SQL Scripts, and UI/UX Wireframe specifications.
* **Phase 3 (Target):** Microservices architecture, Docker network topology, and live edge production deployment.
