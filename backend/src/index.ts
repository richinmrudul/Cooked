import express from 'express';
import dotenv from 'dotenv';
import pool from './db'; // Import the pool

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

// Test DB connection
pool.connect()
  .then(client => {
    console.log('Connected to PostgreSQL database!');
    client.release();
  })
  .catch(err => {
    console.error('Database connection error', err.message, err.stack);
    process.exit(1); // Exit if DB connection fails
  });

app.get('/', (req, res) => {
  res.send('Cooked Backend API is running!');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});