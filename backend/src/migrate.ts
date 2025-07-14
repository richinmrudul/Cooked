import pool from './db';
import fs from 'fs';
import path from 'path';

async function migrate() {
  try {
    const client = await pool.connect();
    const schemaSql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('Database schema migrated successfully!');
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Error migrating database schema:', err);
    process.exit(1);
  }
}

migrate();