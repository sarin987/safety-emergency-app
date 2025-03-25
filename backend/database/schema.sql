-- Users and Authentication
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('parent', 'child', 'guardian', 'admin') NOT NULL,
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE devices (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    model VARCHAR(100),
    os_version VARCHAR(50),
    last_active TIMESTAMP,
    status ENUM('active', 'inactive', 'lost', 'stolen') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Biometric Authentication
CREATE TABLE biometric_templates (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(36) NOT NULL,
    template_type ENUM('fingerprint', 'facial', 'voice', 'gait', 'behavioral') NOT NULL,
    template_data JSON NOT NULL,
    confidence_score FLOAT NOT NULL,
    status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE auth_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(36) NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    auth_method JSON NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    last_verified TIMESTAMP,
    status ENUM('active', 'expired', 'revoked') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Health Monitoring
CREATE TABLE vital_signs (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    heart_rate INT,
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    temperature FLOAT,
    respiratory_rate INT,
    blood_oxygen FLOAT,
    recorded_at TIMESTAMP NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE activity_logs (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    steps INT,
    distance FLOAT,
    calories FLOAT,
    heart_rate_avg INT,
    intensity_level ENUM('low', 'moderate', 'high') NOT NULL,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE sleep_data (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    sleep_start TIMESTAMP NOT NULL,
    sleep_end TIMESTAMP,
    deep_sleep_duration INT,
    light_sleep_duration INT,
    rem_sleep_duration INT,
    awake_duration INT,
    sleep_quality_score FLOAT,
    interruptions INT,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE stress_measurements (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    stress_level FLOAT NOT NULL,
    heart_rate_variability FLOAT,
    cortisol_level FLOAT,
    emotional_state JSON,
    environmental_factors JSON,
    measured_at TIMESTAMP NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Location and Movement
CREATE TABLE location_history (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    altitude FLOAT,
    accuracy FLOAT,
    speed FLOAT,
    heading FLOAT,
    activity_type VARCHAR(50),
    battery_level FLOAT,
    recorded_at TIMESTAMP NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE safe_zones (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('home', 'school', 'custom') NOT NULL,
    coordinates JSON NOT NULL,
    radius FLOAT,
    schedule JSON,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Threat Detection
CREATE TABLE threat_assessments (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    threat_level FLOAT NOT NULL,
    threat_types JSON NOT NULL,
    confidence_score FLOAT NOT NULL,
    analysis_data JSON NOT NULL,
    response_actions JSON,
    status ENUM('active', 'resolved', 'false_alarm') NOT NULL,
    detected_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE security_incidents (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    incident_type VARCHAR(100) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    description TEXT,
    location_data JSON,
    involved_parties JSON,
    response_taken JSON,
    status ENUM('active', 'investigating', 'resolved') NOT NULL,
    reported_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Behavioral Analysis
CREATE TABLE behavioral_patterns (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    pattern_type VARCHAR(100) NOT NULL,
    pattern_data JSON NOT NULL,
    confidence_score FLOAT NOT NULL,
    analysis_results JSON,
    detected_anomalies JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE emotional_states (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    primary_emotion VARCHAR(50) NOT NULL,
    emotion_data JSON NOT NULL,
    confidence_score FLOAT NOT NULL,
    contributing_factors JSON,
    analysis_source JSON,
    recorded_at TIMESTAMP NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE social_interactions (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    interaction_type VARCHAR(100) NOT NULL,
    interaction_data JSON NOT NULL,
    participants JSON,
    location_context JSON,
    sentiment_analysis JSON,
    recorded_at TIMESTAMP NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Emergency Response
CREATE TABLE emergency_alerts (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    status ENUM('active', 'acknowledged', 'resolved') NOT NULL,
    location_data JSON,
    vital_signs JSON,
    threat_assessment JSON,
    response_details JSON,
    created_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE emergency_contacts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    phone_primary VARCHAR(20) NOT NULL,
    phone_secondary VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    priority INT NOT NULL,
    notification_preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications and Communication
CREATE TABLE notification_settings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    channel_preferences JSON NOT NULL,
    quiet_hours JSON,
    priority_thresholds JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notification_history (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    content JSON NOT NULL,
    channels JSON NOT NULL,
    delivery_status JSON,
    user_response JSON,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- AI and ML Models
CREATE TABLE ml_models (
    id VARCHAR(36) PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    model_data JSON NOT NULL,
    performance_metrics JSON,
    status ENUM('active', 'training', 'deprecated') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE model_predictions (
    id VARCHAR(36) PRIMARY KEY,
    model_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(36) NOT NULL,
    prediction_type VARCHAR(100) NOT NULL,
    input_data JSON NOT NULL,
    output_data JSON NOT NULL,
    confidence_score FLOAT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_devices_user ON devices(user_id);
CREATE INDEX idx_vital_signs_device ON vital_signs(device_id);
CREATE INDEX idx_activity_logs_device ON activity_logs(device_id);
CREATE INDEX idx_location_history_device ON location_history(device_id);
CREATE INDEX idx_threat_assessments_device ON threat_assessments(device_id);
CREATE INDEX idx_behavioral_patterns_device ON behavioral_patterns(device_id);
CREATE INDEX idx_emotional_states_device ON emotional_states(device_id);
CREATE INDEX idx_emergency_alerts_device ON emergency_alerts(device_id);
CREATE INDEX idx_notification_history_user ON notification_history(user_id);

-- Triggers
DELIMITER //

CREATE TRIGGER update_device_last_active
AFTER INSERT ON location_history
FOR EACH ROW
BEGIN
    UPDATE devices 
    SET last_active = NEW.recorded_at 
    WHERE id = NEW.device_id;
END //

CREATE TRIGGER log_security_incident
AFTER INSERT ON threat_assessments
FOR EACH ROW
BEGIN
    IF NEW.threat_level >= 0.8 THEN
        INSERT INTO security_incidents (
            device_id,
            incident_type,
            severity,
            description,
            location_data,
            status,
            reported_at
        )
        VALUES (
            NEW.device_id,
            'high_threat_detected',
            'high',
            JSON_EXTRACT(NEW.analysis_data, '$.description'),
            JSON_EXTRACT(NEW.analysis_data, '$.location'),
            'active',
            NEW.detected_at
        );
    END IF;
END //

DELIMITER ;
