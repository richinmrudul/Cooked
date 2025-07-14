import express from 'express';
import dotenv from 'dotenv';
import pool from './db';
import authRoutes from './routes/auth.routes';
import cors from 'cors'; // Import cors

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors()); // Use CORS middleware
app.use(express.json());

// Test DB connection (keep this for now, can remove later)
pool.connect()
  .then(client => {
    console.log('Connected to PostgreSQL database!');
    client.release();
  })
  .catch(err => {
    console.error('Database connection error', err.message, err.stack);
    process.exit(1);
  });

// API Routes
app.use('/api/auth', authRoutes); // Mount auth routes

app.get('/', (req, res) => {
  res.send('Cooked Backend API is running!');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});