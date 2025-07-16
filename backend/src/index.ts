import express from 'express';
import dotenv from 'dotenv';
import pool from './db';
import authRoutes from './routes/auth.routes';
import mealRoutes from './routes/meal.routes';
import rankingRoutes from './routes/ranking.routes';
import userRoutes from './routes/user.routes'; // Import user routes
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static('uploads'));

pool.connect()
  .then(client => {
    console.log('Connected to PostgreSQL database!');
    client.release();
  })
  .catch(err => {
    console.error('Database connection error', err.message, err.stack);
    process.exit(1);
  });

app.use('/api/auth', authRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/user', userRoutes); // Mount user routes

app.get('/', (req, res) => {
  res.send('Cooked Backend API is running!');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});