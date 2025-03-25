const db = require('../../config/db').promise();

async function up() {
    try {
        // Add real-time monitoring tables
        await db.query(`
            CREATE TABLE sensor_data (
                id VARCHAR(36) PRIMARY KEY,
                device_id VARCHAR(36) NOT NULL,
                sensor_type VARCHAR(50) NOT NULL,
                data JSON NOT NULL,
                accuracy FLOAT,
                battery_level FLOAT,
                recorded_at TIMESTAMP NOT NULL,
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE environmental_data (
                id VARCHAR(36) PRIMARY KEY,
                device_id VARCHAR(36) NOT NULL,
                temperature FLOAT,
                humidity FLOAT,
                air_quality JSON,
                noise_level FLOAT,
                light_level FLOAT,
                recorded_at TIMESTAMP NOT NULL,
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
            )
        `);

        // Add predictive analysis tables
        await db.query(`
            CREATE TABLE risk_predictions (
                id VARCHAR(36) PRIMARY KEY,
                device_id VARCHAR(36) NOT NULL,
                risk_type VARCHAR(100) NOT NULL,
                risk_level FLOAT NOT NULL,
                contributing_factors JSON,
                mitigation_suggestions JSON,
                confidence_score FLOAT NOT NULL,
                predicted_at TIMESTAMP NOT NULL,
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE behavior_predictions (
                id VARCHAR(36) PRIMARY KEY,
                device_id VARCHAR(36) NOT NULL,
                prediction_type VARCHAR(100) NOT NULL,
                predicted_behavior JSON NOT NULL,
                context_data JSON,
                accuracy_score FLOAT NOT NULL,
                predicted_at TIMESTAMP NOT NULL,
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
            )
        `);

        // Add emergency response enhancement tables
        await db.query(`
            CREATE TABLE emergency_resources (
                id VARCHAR(36) PRIMARY KEY,
                resource_type VARCHAR(100) NOT NULL,
                name VARCHAR(255) NOT NULL,
                location JSON NOT NULL,
                capabilities JSON,
                status ENUM('available', 'busy', 'offline') NOT NULL,
                last_updated TIMESTAMP NOT NULL
            )
        `);

        await db.query(`
            CREATE TABLE emergency_protocols (
                id VARCHAR(36) PRIMARY KEY,
                protocol_name VARCHAR(255) NOT NULL,
                severity_level ENUM('low', 'medium', 'high', 'critical') NOT NULL,
                steps JSON NOT NULL,
                required_resources JSON,
                automation_rules JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Add health analytics tables
        await db.query(`
            CREATE TABLE health_insights (
                id VARCHAR(36) PRIMARY KEY,
                device_id VARCHAR(36) NOT NULL,
                insight_type VARCHAR(100) NOT NULL,
                analysis_data JSON NOT NULL,
                recommendations JSON,
                severity ENUM('normal', 'warning', 'critical') NOT NULL,
                generated_at TIMESTAMP NOT NULL,
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE medical_history (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                condition_type VARCHAR(100) NOT NULL,
                diagnosis_date DATE,
                medications JSON,
                allergies JSON,
                treatment_history JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Add communication enhancement tables
        await db.query(`
            CREATE TABLE communication_channels (
                id VARCHAR(36) PRIMARY KEY,
                channel_type VARCHAR(50) NOT NULL,
                config JSON NOT NULL,
                status ENUM('active', 'inactive', 'maintenance') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE message_templates (
                id VARCHAR(36) PRIMARY KEY,
                template_name VARCHAR(255) NOT NULL,
                template_type VARCHAR(100) NOT NULL,
                content JSON NOT NULL,
                variables JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Add system monitoring tables
        await db.query(`
            CREATE TABLE system_metrics (
                id VARCHAR(36) PRIMARY KEY,
                metric_type VARCHAR(100) NOT NULL,
                value JSON NOT NULL,
                tags JSON,
                recorded_at TIMESTAMP NOT NULL
            )
        `);

        await db.query(`
            CREATE TABLE system_alerts (
                id VARCHAR(36) PRIMARY KEY,
                alert_type VARCHAR(100) NOT NULL,
                severity ENUM('info', 'warning', 'error', 'critical') NOT NULL,
                message TEXT NOT NULL,
                metadata JSON,
                status ENUM('active', 'acknowledged', 'resolved') NOT NULL,
                created_at TIMESTAMP NOT NULL,
                resolved_at TIMESTAMP
            )
        `);

        // Add indexes
        await db.query('CREATE INDEX idx_sensor_data_device ON sensor_data(device_id)');
        await db.query('CREATE INDEX idx_environmental_data_device ON environmental_data(device_id)');
        await db.query('CREATE INDEX idx_risk_predictions_device ON risk_predictions(device_id)');
        await db.query('CREATE INDEX idx_behavior_predictions_device ON behavior_predictions(device_id)');
        await db.query('CREATE INDEX idx_health_insights_device ON health_insights(device_id)');
        await db.query('CREATE INDEX idx_medical_history_user ON medical_history(user_id)');

        // Add triggers
        await db.query(`
            CREATE TRIGGER after_environmental_data_insert
            AFTER INSERT ON environmental_data
            FOR EACH ROW
            BEGIN
                IF NEW.air_quality->>'$.aqi' > 150 OR NEW.noise_level > 85 THEN
                    INSERT INTO system_alerts (
                        alert_type,
                        severity,
                        message,
                        metadata,
                        status,
                        created_at
                    )
                    VALUES (
                        'environmental_warning',
                        'warning',
                        'Environmental conditions exceeded safe thresholds',
                        JSON_OBJECT(
                            'device_id', NEW.device_id,
                            'air_quality', NEW.air_quality,
                            'noise_level', NEW.noise_level
                        ),
                        'active',
                        NOW()
                    );
                END IF;
            END
        `);

        // Log migration
        await db.query(`
            INSERT INTO migrations (name, batch) 
            VALUES ('002_add_advanced_features', 2)
        `);

        console.log('Advanced features migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

async function down() {
    try {
        // Drop triggers
        await db.query('DROP TRIGGER IF EXISTS after_environmental_data_insert');

        // Drop tables in reverse order
        const tables = [
            'system_alerts',
            'system_metrics',
            'message_templates',
            'communication_channels',
            'medical_history',
            'health_insights',
            'emergency_protocols',
            'emergency_resources',
            'behavior_predictions',
            'risk_predictions',
            'environmental_data',
            'sensor_data'
        ];

        for (const table of tables) {
            await db.query(`DROP TABLE IF EXISTS ${table}`);
        }

        // Remove migration record
        await db.query(`
            DELETE FROM migrations 
            WHERE name = '002_add_advanced_features'
        `);

        console.log('Advanced features rollback completed successfully');
    } catch (error) {
        console.error('Rollback failed:', error);
        throw error;
    }
}

module.exports = { up, down };
