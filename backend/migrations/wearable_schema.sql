-- Wearable Devices Table
CREATE TABLE wearable_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    capabilities JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Child Monitoring Table
CREATE TABLE child_monitoring (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    parent_id INTEGER NOT NULL,
    school_id INTEGER,
    settings JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES wearable_devices(device_id),
    FOREIGN KEY (parent_id) REFERENCES users(id),
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Safe Zones Table
CREATE TABLE safe_zones (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    schedule JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES wearable_devices(device_id)
);

-- Device Locations Table
CREATE TABLE device_locations (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    altitude DECIMAL(10, 2),
    speed DECIMAL(10, 2),
    battery_level INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES wearable_devices(device_id)
);

-- Vital Signs Table
CREATE TABLE vital_signs (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    heart_rate INTEGER,
    temperature DECIMAL(4, 2),
    blood_oxygen INTEGER,
    steps INTEGER,
    activity_level VARCHAR(20),
    stress_level INTEGER,
    sleep_state VARCHAR(20),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES wearable_devices(device_id)
);

-- Health Alerts Table
CREATE TABLE health_alerts (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (device_id) REFERENCES wearable_devices(device_id)
);

-- Safety Alerts Table
CREATE TABLE safety_alerts (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (device_id) REFERENCES wearable_devices(device_id)
);

-- School Attendance Table
CREATE TABLE school_attendance (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    school_id INTEGER NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES wearable_devices(device_id),
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Activity Logs Table
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES wearable_devices(device_id)
);

-- Emergency Contacts Table
CREATE TABLE emergency_contacts (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    contact_id INTEGER NOT NULL,
    priority INTEGER NOT NULL,
    notification_preferences JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES wearable_devices(device_id),
    FOREIGN KEY (contact_id) REFERENCES users(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_device_locations_device_id ON device_locations(device_id);
CREATE INDEX idx_vital_signs_device_id ON vital_signs(device_id);
CREATE INDEX idx_health_alerts_device_id ON health_alerts(device_id);
CREATE INDEX idx_safety_alerts_device_id ON safety_alerts(device_id);
CREATE INDEX idx_activity_logs_device_id ON activity_logs(device_id);
CREATE INDEX idx_safe_zones_device_id ON safe_zones(device_id);
CREATE INDEX idx_school_attendance_device_id ON school_attendance(device_id);

-- Create spatial index for safe zones
CREATE INDEX idx_safe_zones_geometry ON safe_zones USING GIST(geometry);

-- Add triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_device_locations_updated_at
    BEFORE UPDATE ON device_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
