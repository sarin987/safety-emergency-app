require('dotenv').config();
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seedData() {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Create test users
    const users = [
      {
        id: uuidv4(),
        email: 'user@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        phone_number: '+1234567890',
        is_phone_verified: true,
        first_name: 'John',
        last_name: 'Doe',
        role: 'user'
      },
      {
        id: uuidv4(),
        email: 'police@emergency.com',
        password_hash: await bcrypt.hash('police123', 10),
        phone_number: '+1987654321',
        is_phone_verified: true,
        first_name: 'Officer',
        last_name: 'Smith',
        role: 'emergency_service',
        service_type: 'police'
      },
      {
        id: uuidv4(),
        email: 'ambulance@emergency.com',
        password_hash: await bcrypt.hash('ambulance123', 10),
        phone_number: '+1122334455',
        is_phone_verified: true,
        first_name: 'Dr',
        last_name: 'Johnson',
        role: 'emergency_service',
        service_type: 'ambulance'
      }
    ];

    console.log('Creating users...');
    for (const user of users) {
      await connection.query(
        'INSERT INTO users SET ?',
        user
      );
    }

    // Create emergency contacts for the regular user
    const emergencyContacts = [
      {
        id: uuidv4(),
        user_id: users[0].id,
        name: 'Jane Doe',
        phone_number: '+1555666777',
        relationship: 'Spouse'
      },
      {
        id: uuidv4(),
        user_id: users[0].id,
        name: 'Mike Doe',
        phone_number: '+1555888999',
        relationship: 'Brother'
      }
    ];

    console.log('Creating emergency contacts...');
    for (const contact of emergencyContacts) {
      await connection.query(
        'INSERT INTO emergency_contacts SET ?',
        contact
      );
    }

    // Create emergency events
    const emergencyEvents = [
      {
        id: uuidv4(),
        user_id: users[0].id,
        type: 'medical',
        status: 'active',
        latitude: 40.7128,
        longitude: -74.0060,
        description: 'Medical emergency - chest pain'
      },
      {
        id: uuidv4(),
        user_id: users[0].id,
        type: 'police',
        status: 'resolved',
        latitude: 40.7580,
        longitude: -73.9855,
        description: 'Suspicious activity in the area'
      }
    ];

    console.log('Creating emergency events...');
    for (const event of emergencyEvents) {
      await connection.query(
        'INSERT INTO emergency_events SET ?',
        event
      );
    }

    // Create emergency responses
    const emergencyResponses = [
      {
        id: uuidv4(),
        emergency_id: emergencyEvents[0].id,
        responder_id: users[2].id,
        status: 'en_route',
        eta_minutes: 5,
        notes: 'Ambulance dispatched, ETA 5 minutes'
      },
      {
        id: uuidv4(),
        emergency_id: emergencyEvents[1].id,
        responder_id: users[1].id,
        status: 'completed',
        eta_minutes: 0,
        notes: 'Area secured, no suspicious activity found'
      }
    ];

    console.log('Creating emergency responses...');
    for (const response of emergencyResponses) {
      await connection.query(
        'INSERT INTO emergency_responses SET ?',
        response
      );
    }

    // Create location history
    const locationHistory = [
      {
        id: uuidv4(),
        user_id: users[0].id,
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10.5,
        speed: 0
      },
      {
        id: uuidv4(),
        user_id: users[2].id,
        latitude: 40.7140,
        longitude: -74.0055,
        accuracy: 5.0,
        speed: 35.5
      }
    ];

    console.log('Creating location history...');
    for (const location of locationHistory) {
      await connection.query(
        'INSERT INTO location_history SET ?',
        location
      );
    }

    // Create chat messages
    const chatMessages = [
      {
        id: uuidv4(),
        emergency_id: emergencyEvents[0].id,
        sender_id: users[0].id,
        message_type: 'text',
        content: 'Having severe chest pain, please help!'
      },
      {
        id: uuidv4(),
        emergency_id: emergencyEvents[0].id,
        sender_id: users[2].id,
        message_type: 'text',
        content: 'Ambulance is on the way. Stay calm and seated.'
      }
    ];

    console.log('Creating chat messages...');
    for (const message of chatMessages) {
      await connection.query(
        'INSERT INTO chat_messages SET ?',
        message
      );
    }

    // Create notifications
    const notifications = [
      {
        id: uuidv4(),
        user_id: users[0].id,
        type: 'emergency',
        title: 'Emergency Response',
        message: 'Ambulance is on the way',
        is_read: false,
        related_id: emergencyEvents[0].id
      },
      {
        id: uuidv4(),
        user_id: users[2].id,
        type: 'emergency',
        title: 'New Emergency',
        message: 'New medical emergency reported',
        is_read: true,
        related_id: emergencyEvents[0].id
      }
    ];

    console.log('Creating notifications...');
    for (const notification of notifications) {
      await connection.query(
        'INSERT INTO notifications SET ?',
        notification
      );
    }

    await connection.commit();
    console.log('✅ Test data seeded successfully!');

    // Print summary
    const tables = ['users', 'emergency_contacts', 'emergency_events', 'emergency_responses', 
                   'location_history', 'chat_messages', 'notifications'];
    
    console.log('\nDatabase Summary:');
    for (const table of tables) {
      const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table}: ${rows[0].count} records`);
    }

  } catch (error) {
    await connection.rollback();
    console.error('Error seeding data:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run the seeding
seedData()
  .then(() => {
    console.log('\nTest data seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed test data:', error);
    process.exit(1);
  });
