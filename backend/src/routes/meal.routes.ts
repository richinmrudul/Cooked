import { Router } from 'express';
import auth from '../middleware/auth.middleware';
import upload from '../middleware/upload.middleware';
import {
  createMeal,
  getMeals,
  getMealById,
  updateMeal,
  deleteMeal
} from '../controllers/meal.controller';

const router = Router();

router.post('/', auth, upload.single('photo'), (req, res, next) => { 
  console.log('Route: After Multer middleware.');
  console.log('Route req.body (after Multer):', req.body);
  console.log('Route req.file (after Multer):', req.file);
  next(); // Pass control to createMeal
}, createMeal); // createMeal is now the last handler

router.get('/', auth, getMeals);
router.get('/:id', auth, getMealById);

router.put('/:id', auth, upload.single('photo'), (req, res, next) => { 
  console.log('Route: After Multer middleware (PUT).');
  console.log('Route req.body (after Multer, PUT):', req.body);
  console.log('Route req.file (after Multer, PUT):', req.file);
  next(); // Pass control to updateMeal
}, updateMeal); // updateMeal is now the last handler

router.delete('/:id', auth, deleteMeal);

export default router;