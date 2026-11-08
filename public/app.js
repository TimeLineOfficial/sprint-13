/**
 * ApexTrack Enterprise - Application Controller
 * High-Throughput Fleet & Cargo Telemetry Dashboard
 * Sprint 13 Capstone Phase - Prodesk IT
 */

(function () {
  'use strict';

  // --- Initial State Store ---
  const state = {
    selectedVehicleId: 'veh_8802_electric',
    activeTab: 'live-radar',
    filterStatus: 'ALL',
    searchQuery: '',
    ingestionRate: 48250,
    vehicles: {
      'veh_8802_electric': {
        id: 'veh_8802_electric',
        name: 'VEH-8802 (Electric BEV)',
        manifest: 'ATX-2026-9024 (Cold-Chain Pharma)',
        speed: 88,
        temp: -18.4,
        battery: 82,
        geofence: 'CORRIDOR A-9',
        status: 'IN TRANSIT',
        statusClass: 'badge-cyan',
        coords: { x: 380, y: 220, dx: 0.4, dy: -0.2 }
      },
      'veh_8805_hybrid': {
        id: 'veh_8805_hybrid',
        name: 'VEH-8805 (Hybrid Heavy)',
        manifest: 'ATX-2026-9025 (High-Value Electronics)',
        speed: 94,
        temp: -12.4, // Alert excursion
        battery: 64,
        geofence: 'CROSS-DOCK IL-4',
        status: 'TEMP ALERT',
        statusClass: 'badge-rose',
        coords: { x: 540, y: 160, dx: -0.3, dy: 0.3 }
      },
      'veh_8812_diesel': {
        id: 'veh_8812_diesel',
        name: 'VEH-8812 (Diesel Heavy)',
        manifest: 'ATX-2026-9026 (BioTech Vaccines)',
        speed: 72,
        temp: 4.2,
        battery: 91,
        geofence: 'CORRIDOR PACIFIC',
        status: 'DISPATCHED',
        statusClass: 'badge-emerald',
        coords: { x: 240, y: 170, dx: 0.2, dy: 0.4 }
      }
    },
    shipments: [
      {
        id: 'shp_9024',
        trackingNumber: 'ATX-2026-9024',
        origin: 'Boston, MA',
        destination: 'New York, NY',
        cargoType: 'COLD_CHAIN_PHARMA',
        cargoLabel: 'Cold-Chain Pharma',
        assignedVehicle: 'VEH-8802',
        status: 'IN_TRANSIT',
        eta: '2 hrs 14 mins'
      },
      {
        id: 'shp_9025',
        trackingNumber: 'ATX-2026-9025',
        origin: 'Chicago, IL',
        destination: 'Detroit, MI',
        cargoType: 'HIGH_VALUE_ELECTRONICS',
        cargoLabel: 'High-Value Electronics',
        assignedVehicle: 'VEH-8805',
        status: 'IN_TRANSIT',
        eta: '4 hrs 45 mins'
      },
      {
        id: 'shp_9026',
        trackingNumber: 'ATX-2026-9026',
        origin: 'Seattle, WA',
        destination: 'Portland, OR',
        cargoType: 'COLD_CHAIN_PHARMA',
        cargoLabel: 'BioTech Vaccines',
        assignedVehicle: 'VEH-8812',
        status: 'DISPATCHED',
        eta: '3 hrs 10 mins'
      }
    ],
    incidents: [
      {
        id: 'inc_8912',
        title: 'CRITICAL COLD-CHAIN EXCURSION',
        desc: 'Cargo compartment temperature reached -12.4°C on VEH-8805 (Safe limit: -18.0°C). Chiller compressor bypass activated.',
        time: '6 mins ago',
        severity: 'critical'
      },
      {
        id: 'inc_8913',
        title: 'GEOFENCE HYSTERESIS WARNING',
        desc: 'VEH-8812 within 500m of Restricted Mountain Pass MP-88. Hysteresis safety dampening active.',
        time: '14 mins ago',
        severity: 'warning'
      }
    ]
  };

  // --- Utility: Sanitize text to protect against XSS ---
  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function (match) {
      const escape = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escape[match];
    });
  }

  // --- UI Elements ---
  const el = {
    // Navigation & Tabs
    navTabs: document.querySelectorAll('.nav-tab'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    btnToggleDocs: document.getElementById('btn-toggle-docs'),
    specTabs: document.querySelectorAll('.pill-btn'),
    specContents: document.querySelectorAll('.spec-tab-content'),

    // Top Header & Stats
    ingestionRate: document.getElementById('stat-ingestion-rate'),
    manifestCountTab: document.getElementById('manifest-count-tab'),
    alertCountTab: document.getElementById('alert-count-tab'),
    kpiInTransitCount: document.getElementById('kpi-in-transit-count'),
    criticalBanner: document.getElementById('critical-alert-banner'),
    btnAckBanner: document.getElementById('btn-ack-banner'),

    // Radar & Telemetry
    radarCanvas: document.getElementById('radar-canvas'),
    markerVeh8802: document.getElementById('marker-veh-8802'),
    markerVeh8805: document.getElementById('marker-veh-8805'),
    markerVeh8812: document.getElementById('marker-veh-8812'),
    btnRecenterRadar: document.getElementById('btn-recenter-radar'),

    // Inspector
    inspectorVehicleId: document.getElementById('inspector-vehicle-id'),
    inspectorManifestId: document.getElementById('inspector-manifest-id'),
    inspectorStatusBadge: document.getElementById('inspector-status-badge'),
    telSpeed: document.getElementById('tel-speed'),
    progressSpeed: document.getElementById('progress-speed'),
    telTemp: document.getElementById('tel-temp'),
    progressTemp: document.getElementById('progress-temp'),
    telBattery: document.getElementById('tel-battery'),
    progressBattery: document.getElementById('progress-battery'),
    telGeofence: document.getElementById('tel-geofence'),

    // Shipments Table
    shipmentsTbody: document.getElementById('shipments-tbody'),
    manifestSearchInput: document.getElementById('manifest-search-input'),
    manifestStatusFilter: document.getElementById('manifest-status-filter'),
    manifestEmptyState: document.getElementById('manifest-empty-state'),
    btnResetFilters: document.getElementById('btn-reset-filters'),

    // Incident Feed
    incidentContainer: document.getElementById('incident-container'),
    btnAckAll: document.getElementById('btn-ack-all'),

    // Dispatch Modal
    btnOpenDispatch: document.getElementById('btn-open-dispatch'),
    dispatchModal: document.getElementById('dispatch-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancelDispatch: document.getElementById('btn-cancel-dispatch'),
    dispatchForm: document.getElementById('dispatch-form'),
    formTracking: document.getElementById('form-tracking'),
    formCargoType: document.getElementById('form-cargo-type'),
    formOrigin: document.getElementById('form-origin'),
    formDestination: document.getElementById('form-destination'),
    formWeight: document.getElementById('form-weight'),
    formVehicle: document.getElementById('form-vehicle'),
    formMinTemp: document.getElementById('form-min-temp'),
    formMaxTemp: document.getElementById('form-max-temp'),
    btnSubmitDispatch: document.getElementById('btn-submit-dispatch'),

    // Toasts
    toastContainer: document.getElementById('toast-container')
  };

  // --- Show Toast Notification ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span aria-hidden="true">${icon}</span> <span>${sanitize(message)}</span>`;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --- Switch Navigation Tabs ---
  function switchTab(tabId) {
    state.activeTab = tabId;
    el.navTabs.forEach(tab => {
      if (tab.dataset.tab === tabId) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      } else {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      }
    });

    el.tabPanes.forEach(pane => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
  }

  // --- Select Active Vehicle for Telemetry Inspector ---
  function selectVehicle(vehicleId) {
    const v = state.vehicles[vehicleId];
    if (!v) return;
    state.selectedVehicleId = vehicleId;

    el.inspectorVehicleId.textContent = v.name;
    el.inspectorManifestId.textContent = `Hauling: ${v.manifest}`;
    el.inspectorStatusBadge.textContent = v.status;
    el.inspectorStatusBadge.className = `badge ${v.statusClass}`;

    el.telSpeed.innerHTML = `${v.speed} <span class="gauge-unit">km/h</span>`;
    el.progressSpeed.style.width = `${Math.min(100, (v.speed / 120) * 100)}%`;

    el.telTemp.innerHTML = `${v.temp > 0 ? '+' : ''}${v.temp.toFixed(1)} <span class="gauge-unit">°C</span>`;
    el.progressTemp.style.width = v.temp <= -16 ? '85%' : '45%';
    el.progressTemp.className = v.temp > -16 && v.manifest.includes('Cold') ? 'progress-fill fill-amber' : 'progress-fill fill-emerald';

    el.telBattery.innerHTML = `${v.battery} <span class="gauge-unit">%</span>`;
    el.progressBattery.style.width = `${v.battery}%`;

    el.telGeofence.textContent = v.geofence;
  }

  // --- Render Shipment Manifests Table ---
  function renderShipments() {
    const query = state.searchQuery.toLowerCase().trim();
    const filtered = state.shipments.filter(s => {
      const matchesStatus = state.filterStatus === 'ALL' || s.status === state.filterStatus;
      const matchesQuery = !query ||
        s.trackingNumber.toLowerCase().includes(query) ||
        s.origin.toLowerCase().includes(query) ||
        s.destination.toLowerCase().includes(query) ||
        s.assignedVehicle.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });

    el.shipmentsTbody.innerHTML = '';

    if (filtered.length === 0) {
      el.manifestEmptyState.style.display = 'block';
      el.shipmentsTbody.closest('.table-responsive').style.display = 'none';
    } else {
      el.manifestEmptyState.style.display = 'none';
      el.shipmentsTbody.closest('.table-responsive').style.display = 'block';

      filtered.forEach(s => {
        const tr = document.createElement('tr');
        const badgeClass = s.status === 'IN_TRANSIT' ? 'badge-cyan' : s.status === 'DISPATCHED' ? 'badge-emerald' : 'badge-prod';
        const statusText = s.status.replace('_', ' ');

        tr.innerHTML = `
          <td><strong class="font-mono text-cyan">${sanitize(s.trackingNumber)}</strong></td>
          <td>${sanitize(s.origin)} &rarr; ${sanitize(s.destination)}</td>
          <td><span class="badge ${s.cargoType.includes('PHARMA') ? 'badge-amber' : 'badge-cyan'}">${sanitize(s.cargoLabel)}</span></td>
          <td><code class="font-mono">${sanitize(s.assignedVehicle)}</code></td>
          <td><span class="badge ${badgeClass}">${sanitize(statusText)}</span></td>
          <td class="font-mono text-xs">${sanitize(s.eta)}</td>
          <td>
            <button class="btn btn-xs btn-outline btn-inspect-shipment" data-tracking="${sanitize(s.trackingNumber)}">
              Inspect
            </button>
          </td>
        `;
        el.shipmentsTbody.appendChild(tr);
      });
    }

    el.manifestCountTab.textContent = state.shipments.length;
    el.kpiInTransitCount.innerHTML = `${state.shipments.filter(s => s.status === 'IN_TRANSIT').length} <span class="kpi-delta text-cyan">Live</span>`;
  }

  // --- Render Incidents Feed ---
  function renderIncidents() {
    el.incidentContainer.innerHTML = '';

    if (state.incidents.length === 0) {
      el.incidentContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛡️</div>
          <h3>All Systems Optimal</h3>
          <p>Zero active geofence violations or cold-chain excursions.</p>
        </div>
      `;
      el.alertCountTab.textContent = '0';
      el.alertCountTab.className = 'text-muted';
      el.criticalBanner.style.display = 'none';
      return;
    }

    state.incidents.forEach(inc => {
      const card = document.createElement('div');
      card.className = `incident-card ${inc.severity}`;
      card.innerHTML = `
        <div>
          <div class="incident-title ${inc.severity === 'critical' ? 'text-rose' : 'text-amber'}">
            <span>${inc.severity === 'critical' ? '🚨' : '⚠️'}</span>
            ${sanitize(inc.title)}
          </div>
          <div class="incident-desc">${sanitize(inc.desc)}</div>
          <div class="incident-meta font-mono">Logged: ${sanitize(inc.time)} &bull; Automated System Dispatch</div>
        </div>
        <button class="btn btn-xs btn-outline btn-ack-single" data-id="${sanitize(inc.id)}">Acknowledge</button>
      `;
      el.incidentContainer.appendChild(card);
    });

    el.alertCountTab.textContent = state.incidents.length;
    el.alertCountTab.className = 'text-rose';
  }

  // --- Real-Time Dead Reckoning Telemetry Simulation ---
  function runTelemetryLoop() {
    setInterval(() => {
      // Fluctuate ingestion rate slightly
      state.ingestionRate = Math.floor(48000 + Math.random() * 800);
      el.ingestionRate.textContent = `${state.ingestionRate.toLocaleString()} pings/s`;

      // Update vehicle positions on SVG radar
      Object.keys(state.vehicles).forEach(vId => {
        const v = state.vehicles[vId];
        v.coords.x += v.coords.dx;
        v.coords.y += v.coords.dy;

        // Bounce within radar boundaries
        if (v.coords.x > 720 || v.coords.x < 80) v.coords.dx *= -1;
        if (v.coords.y > 400 || v.coords.y < 60) v.coords.dy *= -1;

        const markerEl = document.getElementById(`marker-${vId.replace('_electric', '').replace('_hybrid', '').replace('_diesel', '')}`);
        if (markerEl) {
          markerEl.setAttribute('transform', `translate(${v.coords.x.toFixed(1)}, ${v.coords.y.toFixed(1)})`);
        }

        // Slight speed oscillation
        if (v.status === 'IN TRANSIT') {
          v.speed = Math.max(65, Math.min(105, Math.floor(v.speed + (Math.random() * 4 - 2))));
        }
      });

      // Update inspector if selected
      const currentSelected = state.vehicles[state.selectedVehicleId];
      if (currentSelected) {
        el.telSpeed.innerHTML = `${currentSelected.speed} <span class="gauge-unit">km/h</span>`;
        el.progressSpeed.style.width = `${Math.min(100, (currentSelected.speed / 120) * 100)}%`;
      }
    }, 1200);
  }

  // --- Event Bindings ---
  function initEventListeners() {
    // Nav tabs
    el.navTabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Architecture & PRD docs button
    el.btnToggleDocs.addEventListener('click', () => switchTab('capstone-specs'));

    // Spec Sub-tabs
    el.specTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        el.specTabs.forEach(b => b.classList.remove('active'));
        el.specContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.specTab);
        if (target) target.classList.add('active');
      });
    });

    // Radar Vehicle Node Clicks
    const markers = [
      { el: el.markerVeh8802, id: 'veh_8802_electric' },
      { el: el.markerVeh8805, id: 'veh_8805_hybrid' },
      { el: el.markerVeh8812, id: 'veh_8812_diesel' }
    ];

    markers.forEach(m => {
      if (m.el) {
        m.el.addEventListener('click', () => {
          selectVehicle(m.id);
          showToast(`Inspecting telemetry for ${state.vehicles[m.id].name}`);
        });
        m.el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectVehicle(m.id);
          }
        });
      }
    });

    // Recenter Radar
    el.btnRecenterRadar.addEventListener('click', () => {
      showToast('Radar grid recentered on North American corridor.', 'info');
    });

    // Search and filters
    el.manifestSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderShipments();
    });

    el.manifestStatusFilter.addEventListener('change', (e) => {
      state.filterStatus = e.target.value;
      renderShipments();
    });

    el.btnResetFilters.addEventListener('click', () => {
      state.searchQuery = '';
      state.filterStatus = 'ALL';
      el.manifestSearchInput.value = '';
      el.manifestStatusFilter.value = 'ALL';
      renderShipments();
    });

    // Incident Table delegation
    el.incidentContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-ack-single');
      if (btn) {
        const id = btn.dataset.id;
        state.incidents = state.incidents.filter(i => i.id !== id);
        renderIncidents();
        showToast('Incident acknowledged and logged to audit trail.', 'success');
      }
    });

    el.btnAckBanner.addEventListener('click', () => {
      el.criticalBanner.style.display = 'none';
      showToast('Critical P0 alert acknowledged.', 'info');
    });

    el.btnAckAll.addEventListener('click', () => {
      state.incidents = [];
      renderIncidents();
      showToast('All active alerts marked resolved.', 'success');
    });

    // Dispatch Cargo Modal
    el.btnOpenDispatch.addEventListener('click', () => {
      el.dispatchModal.style.display = 'flex';
      el.formTracking.value = `ATX-2026-${Math.floor(9000 + Math.random() * 999)}`;
      el.formOrigin.focus();
    });

    const closeModal = () => {
      el.dispatchModal.style.display = 'none';
      el.dispatchForm.reset();
      document.querySelectorAll('.field-error').forEach(f => f.textContent = '');
    };

    el.btnCloseModal.addEventListener('click', closeModal);
    el.btnCancelDispatch.addEventListener('click', closeModal);

    el.dispatchModal.addEventListener('click', (e) => {
      if (e.target === el.dispatchModal) closeModal();
    });

    // Dispatch Form Submission
    el.dispatchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let hasError = false;

      const tracking = el.formTracking.value.trim();
      const origin = el.formOrigin.value.trim();
      const dest = el.formDestination.value.trim();
      const weight = el.formWeight.value.trim();
      const cargoType = el.formCargoType.value;
      const vehicleVal = el.formVehicle.value;

      if (!tracking) {
        document.getElementById('error-tracking').textContent = 'Tracking number is required.';
        hasError = true;
      }
      if (!origin) {
        document.getElementById('error-origin').textContent = 'Origin depot is required.';
        hasError = true;
      }
      if (!dest) {
        document.getElementById('error-destination').textContent = 'Destination hub is required.';
        hasError = true;
      }
      if (!weight || isNaN(weight) || parseFloat(weight) <= 0) {
        document.getElementById('error-weight').textContent = 'Valid cargo weight is required.';
        hasError = true;
      }

      if (hasError) return;

      // Simulated Async Authorization & Dispatch
      const btnText = el.btnSubmitDispatch.querySelector('.btn-text');
      const btnLoader = el.btnSubmitDispatch.querySelector('.btn-loader');
      btnText.style.display = 'none';
      btnLoader.style.display = 'inline-block';
      el.btnSubmitDispatch.disabled = true;

      setTimeout(() => {
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
        el.btnSubmitDispatch.disabled = false;

        const vehicleObj = state.vehicles[vehicleVal];
        const newShipment = {
          id: `shp_${Date.now()}`,
          trackingNumber: tracking,
          origin,
          destination: dest,
          cargoType,
          cargoLabel: el.formCargoType.options[el.formCargoType.selectedIndex].text.split('(')[0].trim(),
          assignedVehicle: vehicleObj ? vehicleObj.name.split(' ')[0] : 'VEH-8802',
          status: 'DISPATCHED',
          eta: '5 hrs 20 mins'
        };

        state.shipments.unshift(newShipment);
        renderShipments();
        closeModal();
        showToast(`Freight order ${tracking} successfully authorized and dispatched!`, 'success');
        switchTab('shipment-manifests');
      }, 750);
    });
  }

  // --- Bootstrap Initialization ---
  function init() {
    renderShipments();
    renderIncidents();
    selectVehicle(state.selectedVehicleId);
    initEventListeners();
    runTelemetryLoop();
    console.log('[APEXTRACK] Enterprise Telemetry Engine initialized. All 7 microservices healthy.');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
