import express from 'express';
import dotenv from 'dotenv'; 

dotenv.config(); 

const app = express();
const port = process.env.PORT || 5000; 

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Cooked Backend API is running!');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});