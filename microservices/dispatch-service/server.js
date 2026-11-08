const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

// In-Memory Enterprise Shipments Database (Simulating PostgreSQL Table)
let shipments = [
  {
    id: 'shp_9024_pharma',
    trackingNumber: 'ATX-2026-9024',
    origin: 'Boston Life Sciences Hub, MA',
    destination: 'Manhattan Medical Depot, NY',
    cargoType: 'COLD_CHAIN_PHARMA',
    targetMinTempC: -22.0,
    targetMaxTempC: -16.0,
    weightKg: 4200,
    status: 'IN_TRANSIT',
    assignedVehicleId: 'veh_8802_electric',
    driverName: 'David K.',
    eta: '2 hrs 14 mins',
    createdAt: '2026-11-08T12:00:00Z'
  },
  {
    id: 'shp_9025_electronics',
    trackingNumber: 'ATX-2026-9025',
    origin: 'Chicago O\'Hare Cargo Hub, IL',
    destination: 'Detroit Autonomous Plant, MI',
    cargoType: 'HIGH_VALUE_ELECTRONICS',
    targetMinTempC: 10.0,
    targetMaxTempC: 25.0,
    weightKg: 8750,
    status: 'IN_TRANSIT',
    assignedVehicleId: 'veh_8805_hybrid',
    driverName: 'Sarah L.',
    eta: '4 hrs 45 mins',
    createdAt: '2026-11-08T10:30:00Z'
  },
  {
    id: 'shp_9026_biotech',
    trackingNumber: 'ATX-2026-9026',
    origin: 'Seattle Port Logistics, WA',
    destination: 'Portland Distribution Center, OR',
    cargoType: 'COLD_CHAIN_PHARMA',
    targetMinTempC: 2.0,
    targetMaxTempC: 8.0,
    weightKg: 3100,
    status: 'DISPATCHED',
    assignedVehicleId: 'veh_8812_diesel',
    driverName: 'Robert M.',
    eta: '3 hrs 10 mins',
    createdAt: '2026-11-08T13:15:00Z'
  }
];

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'dispatch-service',
    status: 'HEALTHY',
    total_active_shipments: shipments.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/shipments', (req, res) => {
  const { status, cargoType } = req.query;
  let filtered = shipments;
  if (status && status !== 'ALL') {
    filtered = filtered.filter(s => s.status === status);
  }
  if (cargoType && cargoType !== 'ALL') {
    filtered = filtered.filter(s => s.cargoType === cargoType);
  }
  return res.status(200).json({ shipments: filtered });
});

app.post('/shipments', (req, res) => {
  const { trackingNumber, origin, destination, cargoType, weightKg, targetMinTempC, targetMaxTempC, assignedVehicleId } = req.body;

  if (!trackingNumber || !origin || !destination || !cargoType) {
    return res.status(400).json({ error: 'Missing required shipment parameters' });
  }

  const newShipment = {
    id: `shp_${Date.now()}`,
    trackingNumber,
    origin,
    destination,
    cargoType,
    weightKg: parseFloat(weightKg || 1000),
    targetMinTempC: targetMinTempC !== undefined ? parseFloat(targetMinTempC) : null,
    targetMaxTempC: targetMaxTempC !== undefined ? parseFloat(targetMaxTempC) : null,
    status: 'DISPATCHED',
    assignedVehicleId: assignedVehicleId || 'veh_8802_electric',
    driverName: 'Assigned Driver',
    eta: 'Calculating...',
    createdAt: new Date().toISOString()
  };

  shipments.unshift(newShipment);
  return res.status(201).json({ shipment: newShipment });
});

app.patch('/shipments/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const shipment = shipments.find(s => s.id === id);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment record not found' });
  }

  shipment.status = status;
  return res.status(200).json({ shipment });
});

app.listen(PORT, () => {
  console.log(`[DISPATCH-SERVICE] Fleet & Dispatch Service online on port ${PORT}`);
});
