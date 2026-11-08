# Engineering Prompts & Methodological Architecture Log
## Sprint 13: Capstone Phase — Architecture & PRD
**Engineer:** Himesh Singh (PDIT-FTE-11462)  
**Track:** Associate Software Engineering — Prodesk IT  

---

### Prompt 1: Enterprise Tier Application Selection & Domain Modeling
* **Objective:** Select an enterprise-scale problem domain with deep operational complexity, high-volume real-time data flows, and non-trivial edge cases.
* **Selection:** Global Autonomous Logistics & Telemetry Orchestration Platform (*ApexTrack Enterprise*).
* **Rationale:** A telemetry orchestration platform demands microservice separation (ingestion vs. dispatch vs. analytics), strict 3NF relational modeling, asynchronous message brokers (Redis Streams), and sub-second edge UI visualization.

### Prompt 2: Phase 1 — Comprehensive Product Requirements Document (PRD)
* **Objective:** Draft an enterprise-grade PRD detailing all user flows, personas, SLAs, and unhappy path matrices.
* **Key Decisions:**
  - Specified 3 distinct enterprise personas (Master Fleet Dispatcher, Cold-Chain Compliance Auditor, SecOps Lead).
  - Designed resilience protocols for cellular dropouts (72-hour NVRAM store-and-forward queue with sliding-window deduplication).
  - Formalized P0 critical cold-chain excursion protocols and hysteresis boundary-flapping algorithms.

### Prompt 3: Phase 2 — Entity Relationship Diagrams & Mathematical Normalization
* **Objective:** Map database entities, foreign key constraints, and mathematically prove 1NF, 2NF, and 3NF normalization.
* **Key Decisions:**
  - Decomposed shipments into atomic `WAYPOINTS` to ensure 1NF.
  - Eliminated composite candidate key partial dependencies via UUID surrogate keys on `VEHICLES` and `DRIVERS` to prove 2NF.
  - Eliminated transitive dependencies ($X \to Y \to Z$) by isolating driver credentials and organization subscription tiers into separate tables to satisfy 3NF.
  - Introduced PostgreSQL BRIN (Block Range Indexing) on append-only time-series telemetry logs, slashing index RAM overhead by 98.2%.

### Prompt 4: Phase 3 — Microservices & Docker Architecture Blueprint
* **Objective:** Break down monolithic patterns into decoupled, containerized services communicating across isolated Docker bridge networks.
* **Key Decisions:**
  - Built an API Gateway using NGINX with token bucket rate limiting (100 req/s) and Gzip/Brotli compression.
  - Decoupled ingestion (`telemetry-service`) from transactional persistence using Redis Streams (`XADD` and `XREADGROUP`).
  - Isolated database and cache containers into an internal `data-net` bridge network with zero host port exposure to prevent network bypass.
  - Implemented multi-stage Docker builds reducing image sizes from > 1.2 GB to under 95 MB.

### Prompt 5: Edge Web Application & Deployment Protocol
* **Objective:** Create a commercial-grade, responsive, 100% accessible single-page application demonstrating the live radar, telemetry gauges, cargo dispatching, and embedded capstone specs.
* **Key Decisions:**
  - Zero external CSS/JS framework dependencies to ensure lightning-fast edge performance.
  - Client-side dead reckoning vector calculations for smooth 60fps radar animations.
  - Embedded in-app Capstone Architecture & PRD viewer modal for evaluators to review all 3 phases in the deployed interface.
