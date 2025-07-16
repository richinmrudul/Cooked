import { Router } from 'express';
import auth from '../middleware/auth.middleware';
import {
  createMeal,
  getMeals,
  getMealById,
  updateMeal,
  deleteMeal
} from '../controllers/meal.controller';
import upload from '../middleware/upload.middleware'; //Import upload middleware

const router = Router();

// Apply upload.single('photo') middleware for meal photos
router.post('/', auth, upload.single('photo'), createMeal);
router.get('/', auth, getMeals);
router.get('/:id', auth, getMealById);
router.put('/:id', auth, upload.single('photo'), updateMeal);
router.delete('/:id', auth, deleteMeal);

export default router;