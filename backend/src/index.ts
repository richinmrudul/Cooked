import express from 'express';
import dotenv from 'dotenv';
import pool from './db';
import authRoutes from './routes/auth.routes';
import mealRoutes from './routes/meal.routes';
import rankingRoutes from './routes/ranking.routes';
import cors from 'cors';
import multer from 'multer'; // Import multer here for test route

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use('/uploads', express.static('uploads'));

// NEW: Test Multer route
const testUploadSingle = multer({ dest: 'uploads/' }); // Use a simple dest Multer instance

app.post('/api/test-upload', testUploadSingle.single('testFile'), (req, res) => {
    console.log('--- TEST UPLOAD ROUTE HIT ---');
    console.log('Test req.body:', req.body);
    console.log('Test req.file:', req.file);
    if (req.body && req.body.testField) {
        res.status(200).json({ message: 'Test upload successful!', body: req.body, file: req.file });
    } else {
        res.status(400).json({ message: 'Test upload failed: body/file undefined.', body: req.body, file: req.file });
    }
});
// END NEW TEST ROUTE

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