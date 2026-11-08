const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4004;

app.use(cors());
app.use(express.json());

// Simulated Alerts Cache
let activeIncidents = [
  {
    id: 'inc_8912',
    vehicleId: 'veh_8805_hybrid',
    shipmentTrackingNumber: 'ATX-2026-9025',
    type: 'COLD_CHAIN_EXCURSION',
    severity: 'CRITICAL_P0',
    description: 'Cargo compartment temperature reached -12.4°C (Safe corridor: <= -18.0°C). Excursion sustained for 240 seconds.',
    isAcknowledged: false,
    timestamp: '2026-11-08T14:48:10Z'
  },
  {
    id: 'inc_8913',
    vehicleId: 'veh_8812_diesel',
    shipmentTrackingNumber: 'ATX-2026-9026',
    type: 'GEOFENCE_PROXIMITY_WARNING',
    severity: 'WARNING',
    description: 'Vehicle within 500m of Restricted Mountain Pass corridor MP-88. Hysteresis active.',
    isAcknowledged: false,
    timestamp: '2026-11-08T14:51:22Z'
  }
];

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'analytics-worker',
    status: 'HEALTHY',
    active_incidents_count: activeIncidents.filter(i => !i.isAcknowledged).length,
    geofence_algorithm: 'PostGIS Polygonal Containment + Hysteresis',
    timestamp: new Date().toISOString()
  });
});

app.get('/incidents', (req, res) => {
  res.status(200).json({ incidents: activeIncidents });
});

app.post('/incidents/:id/acknowledge', (req, res) => {
  const { id } = req.params;
  const incident = activeIncidents.find(i => i.id === id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  incident.isAcknowledged = true;
  incident.acknowledgedAt = new Date().toISOString();
  return res.status(200).json({ incident });
});

app.listen(PORT, () => {
  console.log(`[ANALYTICS-WORKER] Background Processing & Incident Alert Daemon running on port ${PORT}`);
});
