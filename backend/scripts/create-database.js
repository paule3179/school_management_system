require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });

const { Pool } = require('pg');

const databaseName = process.env.DB_NAME || 'school_management_system';

if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(databaseName)) {
  throw new Error('DB_NAME must contain only letters, numbers, and underscores, and cannot start with a number.');
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
  database: 'postgres',
});

async function createDatabaseIfMissing() {
  const result = await pool.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [databaseName]
  );

  if (result.rowCount > 0) {
    console.log(`Database "${databaseName}" already exists; leaving it unchanged.`);
    return;
  }

  // PostgreSQL does not allow parameters for database identifiers. DB_NAME is
  // validated above and quoted here before being used in the CREATE statement.
  await pool.query(`CREATE DATABASE "${databaseName}"`);
  console.log(`Created database "${databaseName}".`);
}

createDatabaseIfMissing()
  .catch((error) => {
    console.error(`Could not create database "${databaseName}":`, error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
