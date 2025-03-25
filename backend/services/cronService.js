const cron = require('node-cron');
const dbMonitor = require('./dbMonitorService');
const { sendAdminNotification } = require('./notificationService');

class CronService {
    constructor() {
        // Schedule database backup every day at 2 AM
        cron.schedule('0 2 * * *', async () => {
            try {
                const backup = await dbMonitor.backup();
                console.log('Daily backup completed:', backup);
            } catch (error) {
                console.error('Daily backup failed:', error);
                await sendAdminNotification('Database Backup Failed', error.message);
            }
        });

        // Monitor database connections every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            try {
                const connections = await dbMonitor.monitorConnections();
                if (connections > 100) { // Alert if too many connections
                    await sendAdminNotification('High Database Connections', 
                        `Current connections: ${connections}`);
                }
            } catch (error) {
                console.error('Connection monitoring failed:', error);
            }
        });

        // Monitor slow queries every 15 minutes
        cron.schedule('*/15 * * * *', async () => {
            try {
                const slowQueries = await dbMonitor.monitorSlowQueries();
                if (slowQueries.length > 0) {
                    await sendAdminNotification('Slow Queries Detected',
                        `Found ${slowQueries.length} slow queries`);
                }
            } catch (error) {
                console.error('Slow query monitoring failed:', error);
            }
        });

        // Optimize database weekly on Sunday at 3 AM
        cron.schedule('0 3 * * 0', async () => {
            try {
                const result = await dbMonitor.optimize();
                console.log('Weekly optimization completed:', result);
                if (result.optimizedTables > 0) {
                    await sendAdminNotification('Database Optimization Complete',
                        `Optimized ${result.optimizedTables} tables`);
                }
            } catch (error) {
                console.error('Weekly optimization failed:', error);
                await sendAdminNotification('Database Optimization Failed', error.message);
            }
        });

        // Check table sizes daily at 1 AM
        cron.schedule('0 1 * * *', async () => {
            try {
                const sizes = await dbMonitor.getTableSizes();
                const largeTables = sizes.filter(table => table['Size (MB)'] > 1000);
                
                if (largeTables.length > 0) {
                    await sendAdminNotification('Large Tables Detected',
                        `${largeTables.length} tables exceed 1GB in size`);
                }
            } catch (error) {
                console.error('Table size check failed:', error);
            }
        });
    }

    async startMonitoring() {
        try {
            // Initial monitoring
            await dbMonitor.monitorConnections();
            await dbMonitor.monitorSlowQueries();
            const sizes = await dbMonitor.getTableSizes();
            
            console.log('Database monitoring started successfully');
            return {
                status: 'running',
                initialMetrics: dbMonitor.getMetrics(),
                tableSizes: sizes
            };
        } catch (error) {
            console.error('Failed to start monitoring:', error);
            throw error;
        }
    }
}

module.exports = new CronService();
