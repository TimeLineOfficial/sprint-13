const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'apextrack_super_secure_enterprise_key_2026';

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'auth-service',
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime()
  });
});

// Authenticate / Login Endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  // Enterprise Simulation Credentials
  const user = {
    id: 'usr_8820f1_enterprise',
    email,
    fullName: 'Elena Rostova',
    role: 'FLEET_DISPATCHER',
    organizationId: 'org_north_america_east_01',
    organizationTier: 'ENTERPRISE_TIER_1'
  };

  const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

  return res.status(200).json({
    status: 'AUTHENTICATED',
    accessToken,
    refreshToken,
    user
  });
});

// Token Verification Middleware
app.post('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ valid: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ valid: false, error: 'Token expired or invalid signature' });
  }
});

app.listen(PORT, () => {
  console.log(`[AUTH-SERVICE] Microservice online on port ${PORT}`);
});
