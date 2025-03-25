const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

class DBMonitorService {
    constructor() {
        this.metrics = {
            connections: 0,
            slowQueries: [],
            errors: [],
            lastBackup: null
        };
        this.backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    async monitorConnections() {
        try {
            const [result] = await db.query('SHOW STATUS WHERE Variable_name = "Threads_connected"');
            this.metrics.connections = result[0].Value;
            return this.metrics.connections;
        } catch (error) {
            console.error('Error monitoring connections:', error);
            this.metrics.errors.push({
                type: 'connection_monitor',
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    async monitorSlowQueries() {
        try {
            const [results] = await db.query('SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10');
            this.metrics.slowQueries = results.map(query => ({
                sql: query.sql_text,
                duration: query.query_time,
                timestamp: query.start_time
            }));
            return this.metrics.slowQueries;
        } catch (error) {
            console.error('Error monitoring slow queries:', error);
            this.metrics.errors.push({
                type: 'slow_query_monitor',
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    async getTableSizes() {
        try {
            const [results] = await db.query(`
                SELECT 
                    table_name AS 'Table',
                    round(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
                FROM information_schema.TABLES
                WHERE table_schema = DATABASE()
                ORDER BY (data_length + index_length) DESC
            `);
            return results;
        } catch (error) {
            console.error('Error getting table sizes:', error);
            throw error;
        }
    }

    async backup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.backupDir, `backup-${timestamp}.sql`);
        
        try {
            const { stdout, stderr } = await exec(
                `mysqldump -h ${process.env.DB_HOST || '139.59.40.236'} ` +
                `-u ${process.env.DB_USER || 'sarin'} ` +
                `-p${process.env.DB_PASSWORD || 'Sarin123!'} ` +
                `${process.env.DB_NAME || 'safety_emergency_db'} > ${backupPath}`
            );

            if (stderr) {
                console.error('Backup warning:', stderr);
            }

            this.metrics.lastBackup = {
                timestamp: new Date(),
                path: backupPath,
                size: fs.statSync(backupPath).size
            };

            // Keep only last 5 backups
            const files = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('backup-'))
                .sort()
                .reverse();

            if (files.length > 5) {
                files.slice(5).forEach(file => {
                    fs.unlinkSync(path.join(this.backupDir, file));
                });
            }

            return this.metrics.lastBackup;
        } catch (error) {
            console.error('Backup error:', error);
            this.metrics.errors.push({
                type: 'backup',
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    async restore(backupFile) {
        if (!backupFile) {
            // Get the latest backup
            const files = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('backup-'))
                .sort()
                .reverse();

            if (files.length === 0) {
                throw new Error('No backup files found');
            }

            backupFile = path.join(this.backupDir, files[0]);
        }

        try {
            const { stdout, stderr } = await exec(
                `mysql -h ${process.env.DB_HOST || '139.59.40.236'} ` +
                `-u ${process.env.DB_USER || 'sarin'} ` +
                `-p${process.env.DB_PASSWORD || 'Sarin123!'} ` +
                `${process.env.DB_NAME || 'safety_emergency_db'} < ${backupFile}`
            );

            if (stderr) {
                console.error('Restore warning:', stderr);
            }

            return {
                timestamp: new Date(),
                restoredFrom: backupFile
            };
        } catch (error) {
            console.error('Restore error:', error);
            this.metrics.errors.push({
                type: 'restore',
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    getMetrics() {
        return {
            ...this.metrics,
            timestamp: new Date()
        };
    }

    async optimize() {
        try {
            // Get fragmented tables
            const [fragmentedTables] = await db.query(`
                SELECT table_name, data_free
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                AND data_free > 0
            `);

            for (const table of fragmentedTables) {
                await db.query(`OPTIMIZE TABLE ${table.table_name}`);
            }

            return {
                optimizedTables: fragmentedTables.length,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Optimization error:', error);
            this.metrics.errors.push({
                type: 'optimization',
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }
}

module.exports = new DBMonitorService();
