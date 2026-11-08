const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4003;

app.use(cors());
app.use(express.json());

// Ingestion Telemetry Buffer (Simulated Redis Stream)
const telemetryStreamBuffer = [];

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'telemetry-service',
    status: 'HEALTHY',
    throughput_capacity_eps: 50000,
    buffered_frames: telemetryStreamBuffer.length,
    timestamp: new Date().toISOString()
  });
});

// High-Throughput Ingestion Endpoint
app.post('/ingest', (req, res) => {
  const { vehicleId, latitude, longitude, speedKmh, cargoTempC, batteryPct, fuelPct } = req.body;

  if (!vehicleId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing mandatory telemetry fields (vehicleId, coordinates)' });
  }

  const frame = {
    id: `tel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    vehicleId,
    timestamp: new Date().toISOString(),
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    speedKmh: parseFloat(speedKmh || 0),
    cargoTempC: parseFloat(cargoTempC || 0),
    batteryPct: parseFloat(batteryPct || 100),
    fuelPct: parseFloat(fuelPct || 100),
    engineStatus: speedKmh > 0 ? 'RUNNING' : 'IDLING'
  };

  telemetryStreamBuffer.push(frame);
  if (telemetryStreamBuffer.length > 500) {
    telemetryStreamBuffer.shift();
  }

  return res.status(202).json({
    status: 'INGESTED',
    stream: 'telemetry:stream',
    frameId: frame.id
  });
});

app.get('/latest', (req, res) => {
  res.status(200).json({
    frames: telemetryStreamBuffer.slice(-20)
  });
});

app.listen(PORT, () => {
  console.log(`[TELEMETRY-SERVICE] High-Throughput Ingestion Engine running on port ${PORT}`);
});
