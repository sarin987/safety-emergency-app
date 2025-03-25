-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS safety_emergency_db;

-- Create user if it doesn't exist
CREATE USER IF NOT EXISTS 'sarin'@'%' IDENTIFIED BY 'Sarin123!';

-- Grant all privileges to the user
GRANT ALL PRIVILEGES ON safety_emergency_db.* TO 'sarin'@'%';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;
