require('dotenv').config();
const { pool } = require('../config/db');

async function testConnection() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    const connection = await pool.getConnection();
    console.log('✅ Successfully connected to database');

    // Test query execution
    console.log('\nTesting query execution...');
    const [result] = await connection.query('SELECT 1');
    console.log('✅ Successfully executed test query');

    // Get list of tables
    console.log('\nChecking database tables...');
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ?`, 
      [process.env.DB_NAME || 'safety_emergency_db']
    );

    if (tables.length === 0) {
      console.log('❌ No tables found in database');
    } else {
      console.log('✅ Found the following tables:');
      for (const table of tables) {
        // Get count of records in each table
        const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${table.TABLE_NAME}`);
        console.log(`   - ${table.TABLE_NAME} (${count[0].count} records)`);
      }
    }

    // Test table structure
    console.log('\nTesting table structure...');
    const expectedTables = [
      'users',
      'emergency_contacts',
      'emergency_events',
      'emergency_responses',
      'location_history',
      'chat_messages',
      'notifications'
    ];

    for (const tableName of expectedTables) {
      try {
        const [columns] = await connection.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = ? AND table_name = ?`,
          [process.env.DB_NAME || 'safety_emergency_db', tableName]
        );

        if (columns.length > 0) {
          console.log(`✅ Table '${tableName}' exists with ${columns.length} columns`);
        } else {
          console.log(`❌ Table '${tableName}' not found`);
        }
      } catch (error) {
        console.error(`❌ Error checking table '${tableName}':`, error.message);
      }
    }

    // Release the connection
    connection.release();
    console.log('\n✅ Database connection test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
