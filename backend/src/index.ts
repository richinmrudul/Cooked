import express from 'express';
import dotenv from 'dotenv';
import pool from './db';
import authRoutes from './routes/auth.routes';
import mealRoutes from './routes/meal.routes';
import rankingRoutes from './routes/ranking.routes';
import cors from 'cors'; // Import cors

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;


app.use(cors()); 
app.use(express.json()); 
// -----------------------------------------------------------

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

app.get('/', (req, res) => {
  res.send('Cooked Backend API is running!');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});