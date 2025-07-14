import { Router } from 'express';
import auth from '../middleware/auth.middleware';
import {
  createMeal,
  getMeals,
  getMealById,
  updateMeal,
  deleteMeal
} from '../controllers/meal.controller';

const router = Router();

router.post('/', auth, createMeal);
router.get('/', auth, getMeals);
router.get('/:id', auth, getMealById);
router.put('/:id', auth, updateMeal);
router.delete('/:id', auth, deleteMeal);

export default router;