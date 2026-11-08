-- ============================================================================
-- ApexTrack Enterprise Database Schema DDL
-- Standard: PostgreSQL 16+ (Normalized 3NF Relational Data Layer)
-- Module: Core Infrastructure Overhaul - Sprint 13 Capstone
-- Author: Himesh Singh (PDIT-FTE-11462)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Organizations (Multi-Tenant Segregation)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    org_code VARCHAR(32) NOT NULL UNIQUE,
    tier VARCHAR(50) DEFAULT 'ENTERPRISE_TIER_1' CHECK (tier IN ('STARTER', 'GROWTH', 'ENTERPRISE_TIER_1', 'GOVERNMENT_FEDRAMP')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users & IAM Role-Based Access Control
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'FLEET_DISPATCHER', 'COMPLIANCE_AUDITOR', 'FIELD_OPERATOR')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_org_role ON users(organization_id, role);

-- 3. Vehicles & Autonomous Fleet Units
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    vin VARCHAR(17) NOT NULL UNIQUE,
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    model VARCHAR(100) NOT NULL,
    fuel_type VARCHAR(30) CHECK (fuel_type IN ('DIESEL', 'ELECTRIC_BEV', 'HYDROGEN_FCEV', 'HYBRID')),
    battery_capacity_kwh NUMERIC(8, 2) DEFAULT 0.00,
    max_payload_kg NUMERIC(10, 2) NOT NULL,
    current_status VARCHAR(50) DEFAULT 'IDLE' CHECK (current_status IN ('IDLE', 'DISPATCHED', 'IN_TRANSIT', 'MAINTENANCE', 'OUT_OF_SERVICE')),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicles_org_status ON vehicles(organization_id, current_status);

-- 4. Drivers & Certified Operators
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    phone_number VARCHAR(25) NOT NULL,
    duty_status VARCHAR(30) DEFAULT 'ON_DUTY' CHECK (duty_status IN ('ON_DUTY', 'OFF_DUTY', 'DRIVING', 'RESTING')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Shipments (Core Cargo Manifests)
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tracking_number VARCHAR(50) NOT NULL UNIQUE,
    cargo_type VARCHAR(50) NOT NULL CHECK (cargo_type IN ('COLD_CHAIN_PHARMA', 'DRY_GOODS', 'HAZARDOUS_MATERIALS', 'HIGH_VALUE_ELECTRONICS')),
    weight_kg NUMERIC(10, 2) NOT NULL,
    target_min_temp_c NUMERIC(5, 2),
    target_max_temp_c NUMERIC(5, 2),
    status VARCHAR(50) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'DISPATCHED', 'IN_TRANSIT', 'CUSTOMS_HOLD', 'DELIVERED', 'CANCELLED')),
    origin_name VARCHAR(150) NOT NULL,
    destination_name VARCHAR(150) NOT NULL,
    scheduled_departure TIMESTAMP WITH TIME ZONE NOT NULL,
    estimated_arrival TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipments_org_status ON shipments(organization_id, status);

-- 6. Route Waypoints (Normalized Sequential Stops)
CREATE TABLE IF NOT EXISTS waypoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    sequence_number INT NOT NULL,
    location_name VARCHAR(150) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    waypoint_type VARCHAR(30) DEFAULT 'TRANSIT_CHECKPOINT' CHECK (waypoint_type IN ('ORIGIN', 'TRANSIT_CHECKPOINT', 'REST_STOP', 'DESTINATION')),
    estimated_arrival TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_arrival TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT FALSE,
    CONSTRAINT uq_shipment_sequence UNIQUE (shipment_id, sequence_number)
);

CREATE INDEX idx_waypoints_shipment ON waypoints(shipment_id, sequence_number);

-- 7. High-Volume Telemetry Logs (Partitioned by Ingestion Timestamp)
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id UUID DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    speed_kmh NUMERIC(6, 2) NOT NULL,
    fuel_level_pct NUMERIC(5, 2),
    battery_charge_pct NUMERIC(5, 2),
    cargo_temp_c NUMERIC(5, 2),
    engine_status VARCHAR(30) DEFAULT 'RUNNING' CHECK (engine_status IN ('RUNNING', 'IDLING', 'OFF', 'WARNING_CHECK_ENGINE')),
    PRIMARY KEY (timestamp, id)
) PARTITION BY RANGE (timestamp);

-- High-performance BRIN index for massive append-only telemetry
CREATE INDEX idx_telemetry_timestamp_brin ON telemetry_logs USING BRIN(timestamp);
CREATE INDEX idx_telemetry_vehicle_time ON telemetry_logs (vehicle_id, timestamp DESC);

-- 8. Geofencing Zones
CREATE TABLE IF NOT EXISTS geofence_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    zone_name VARCHAR(150) NOT NULL,
    zone_type VARCHAR(50) DEFAULT 'DEPOT_BOUNDARY' CHECK (zone_type IN ('DEPOT_BOUNDARY', 'RESTRICTED_CORRIDOR', 'HAZARDOUS_ZONE', 'CROSS_DOCK')),
    center_lat NUMERIC(10, 7) NOT NULL,
    center_lng NUMERIC(10, 7) NOT NULL,
    radius_meters NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Incident Alerts & Sensor Excursions
CREATE TABLE IF NOT EXISTS incident_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
    geofence_zone_id UUID REFERENCES geofence_zones(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('COLD_CHAIN_EXCURSION', 'GEOFENCE_BREACH', 'EXCESSIVE_SPEED', 'SENSOR_TIMEOUT', 'EMERGENCY_SOS')),
    severity VARCHAR(20) DEFAULT 'WARNING' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL_P0', 'FATAL')),
    description TEXT NOT NULL,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_unack ON incident_alerts(is_acknowledged, severity) WHERE is_acknowledged = FALSE;

-- 10. Immutable Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    client_ip VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_name, entity_id);
