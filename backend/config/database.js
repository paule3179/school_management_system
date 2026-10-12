const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = require('pg');

const getEnvString = (key, fallback = '') => {
  const value = process.env[key] ?? fallback;
  return typeof value === 'string' ? value : String(value ?? '');
};

const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: getEnvString('DATABASE_URL') }
  : {
      host: getEnvString('DB_HOST', 'localhost'),
      port: Number(getEnvString('DB_PORT', '5432')),
      database: getEnvString('DB_NAME', 'school_management_system'),
      user: getEnvString('DB_USER', 'postgres'),
      password: getEnvString('DB_PASSWORD', getEnvString('PGPASSWORD', '')),
    };

const pool = new Pool(connectionConfig);

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('PostgreSQL connected successfully to school management system');
    release();
  }
});

module.exports = pool;
