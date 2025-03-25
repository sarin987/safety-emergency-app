const fs = require('fs');
const path = require('path');
const db = require('../../config/db').promise();

async function up() {
    try {
        const schema = fs.readFileSync(
            path.join(__dirname, '../schema.sql'),
            'utf8'
        );

        // Split the schema into individual statements
        const statements = schema
            .split(';')
            .filter(statement => statement.trim());

        // Execute each statement
        for (const statement of statements) {
            if (statement.trim()) {
                await db.query(statement);
            }
        }

        // Log migration
        await db.query(`
            INSERT INTO migrations (name, batch) 
            VALUES ('001_initial_schema', 1)
        `);

        console.log('Initial schema migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

async function down() {
    try {
        // Drop all tables in reverse order
        const tables = [
            'model_predictions',
            'ml_models',
            'notification_history',
            'notification_settings',
            'emergency_contacts',
            'emergency_alerts',
            'social_interactions',
            'emotional_states',
            'behavioral_patterns',
            'security_incidents',
            'threat_assessments',
            'safe_zones',
            'location_history',
            'stress_measurements',
            'sleep_data',
            'activity_logs',
            'vital_signs',
            'auth_sessions',
            'biometric_templates',
            'devices',
            'users',
            'migrations'
        ];

        for (const table of tables) {
            await db.query(`DROP TABLE IF EXISTS ${table}`);
        }

        console.log('Schema rollback completed successfully');
    } catch (error) {
        console.error('Rollback failed:', error);
        throw error;
    }
}

module.exports = { up, down };
