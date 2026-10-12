require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });

const bcrypt = require('bcrypt');
const pool = require('../config/database');

async function linkProfilesToUsers(client, table, role, passwordHash) {
  const profiles = await client.query(`
    SELECT id, user_id, email, first_name, last_name, phone
    FROM ${table}
    WHERE email IS NOT NULL AND TRIM(email) <> ''
  `);
  let linked = 0;

  for (const profile of profiles.rows) {
    const email = profile.email.trim().toLowerCase();
    let userId = profile.user_id;
    if (userId) {
      const update = await client.query(`
        UPDATE users SET email = $1, password = $2, role = $3,
          status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 RETURNING id
      `, [email, passwordHash, role, userId]);
      if (!update.rows[0]) userId = null;
    }

    if (!userId) {
      const user = await client.query(`
        INSERT INTO users (email, password, role, first_name, last_name, phone, status)
        VALUES ($1,$2,$3,$4,$5,$6,'active')
        ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password,
          role = EXCLUDED.role, status = 'active', updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [email, passwordHash, role, profile.first_name || '', profile.last_name || '', profile.phone || null]);
      userId = user.rows[0].id;
      await client.query(`UPDATE ${table} SET user_id = $1 WHERE id = $2`, [userId, profile.id]);
    }
    linked += 1;
  }
  return linked;
}

async function setupLoginData() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('This development login setup must not run in production.');
  }
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('Set DEMO_PASSWORD to a value of at least 8 characters in backend/.env.');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const teachers = await linkProfilesToUsers(client, 'teachers', 'teacher', passwordHash);
    const parents = await linkProfilesToUsers(client, 'parents', 'parent', passwordHash);
    await client.query('COMMIT');
    console.log(`Linked ${teachers} teacher profiles and ${parents} parent profiles to development login accounts.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupLoginData().catch(async (error) => {
  console.error('Could not prepare development logins:', error.message);
  await pool.end();
  process.exitCode = 1;
});
