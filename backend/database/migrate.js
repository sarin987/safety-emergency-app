const fs = require('fs');
const path = require('path');
const db = require('../config/db');

class MigrationManager {
    constructor() {
        this.migrationsPath = path.join(__dirname, 'migrations');
    }

    async initialize() {
        try {
            // Create migrations table if it doesn't exist
            await db.query(`
                CREATE TABLE IF NOT EXISTS migrations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    batch INT NOT NULL,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        } catch (error) {
            console.error('Failed to initialize migrations table:', error);
            throw error;
        }
    }

    async getExecutedMigrations() {
        const [migrations] = await db.query('SELECT * FROM migrations ORDER BY batch, id');
        return migrations;
    }

    async getPendingMigrations() {
        // Get all migration files
        const files = fs.readdirSync(this.migrationsPath)
            .filter(file => file.endsWith('.js'))
            .sort();

        // Get executed migrations
        const executed = await this.getExecutedMigrations();
        const executedNames = executed.map(m => m.name);

        // Return pending migrations
        return files
            .filter(file => !executedNames.includes(path.parse(file).name))
            .map(file => path.parse(file).name);
    }

    async getLatestBatch() {
        const [result] = await db.query('SELECT MAX(batch) as batch FROM migrations');
        return (result[0].batch || 0);
    }

    async migrate() {
        await this.initialize();

        const pending = await this.getPendingMigrations();
        if (pending.length === 0) {
            console.log('No pending migrations');
            return;
        }

        const batch = await this.getLatestBatch() + 1;
        console.log(`Found ${pending.length} pending migrations`);

        for (const migration of pending) {
            try {
                console.log(`Migrating: ${migration}`);
                const migrationModule = require(path.join(this.migrationsPath, migration));
                await migrationModule.up();
                console.log(`Completed: ${migration}`);
            } catch (error) {
                console.error(`Failed to execute migration ${migration}:`, error);
                throw error;
            }
        }
    }

    async rollback() {
        await this.initialize();

        // Get the last batch number
        const batch = await this.getLatestBatch();
        if (batch === 0) {
            console.log('No migrations to rollback');
            return;
        }

        // Get migrations from the last batch
        const [migrations] = await db.query(
            'SELECT * FROM migrations WHERE batch = ? ORDER BY id DESC',
            [batch]
        );

        console.log(`Rolling back ${migrations.length} migrations from batch ${batch}`);

        for (const migration of migrations) {
            try {
                console.log(`Rolling back: ${migration.name}`);
                const migrationModule = require(path.join(this.migrationsPath, migration.name));
                await migrationModule.down();
                await db.query('DELETE FROM migrations WHERE id = ?', [migration.id]);
                console.log(`Rolled back: ${migration.name}`);
            } catch (error) {
                console.error(`Failed to rollback migration ${migration.name}:`, error);
                throw error;
            }
        }
    }

    async reset() {
        await this.initialize();

        // Get all migrations in reverse order
        const [migrations] = await db.query('SELECT * FROM migrations ORDER BY batch DESC, id DESC');

        console.log(`Resetting ${migrations.length} migrations`);

        for (const migration of migrations) {
            try {
                console.log(`Rolling back: ${migration.name}`);
                const migrationModule = require(path.join(this.migrationsPath, migration.name));
                await migrationModule.down();
                await db.query('DELETE FROM migrations WHERE id = ?', [migration.id]);
                console.log(`Rolled back: ${migration.name}`);
            } catch (error) {
                console.error(`Failed to rollback migration ${migration.name}:`, error);
                throw error;
            }
        }
    }

    async status() {
        await this.initialize();

        // Get all migrations
        const [migrations] = await db.query('SELECT * FROM migrations ORDER BY batch, id');
        const executed = new Set(migrations.map(m => m.name));

        // Get all migration files
        const files = fs.readdirSync(this.migrationsPath)
            .filter(file => file.endsWith('.js'))
            .sort();

        console.log('\nMigration Status:');
        console.log('=================');

        for (const file of files) {
            const name = path.parse(file).name;
            const status = executed.has(name) ? 'Executed' : 'Pending';
            const migration = migrations.find(m => m.name === name);
            const batch = migration ? `(Batch: ${migration.batch})` : '';
            const executedAt = migration ? `at ${migration.executed_at}` : '';

            console.log(`${name}: ${status} ${batch} ${executedAt}`);
        }
    }
}

// CLI interface
async function main() {
    const manager = new MigrationManager();
    const command = process.argv[2];

    try {
        switch (command) {
            case 'migrate':
                await manager.migrate();
                break;
            case 'rollback':
                await manager.rollback();
                break;
            case 'reset':
                await manager.reset();
                break;
            case 'status':
                await manager.status();
                break;
            default:
                console.log(`
Usage: node migrate.js <command>

Commands:
  migrate   Run pending migrations
  rollback  Rollback the last batch of migrations
  reset     Rollback all migrations
  status    Show migration status
                `);
        }
    } catch (error) {
        console.error('Migration command failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

if (require.main === module) {
    main();
} else {
    module.exports = MigrationManager;
}
