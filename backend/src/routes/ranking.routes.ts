import { Router } from 'express';
import auth from '../middleware/auth.middleware';
import {
  setMealRank,
  getRankedMeals,
  deleteMealRank
} from '../controllers/ranking.controller';

const router = Router();

router.post('/', auth, setMealRank); // Set or update a meal's rank
router.get('/', auth, getRankedMeals); // Get all ranked meals for a user
router.delete('/:mealId', auth, deleteMealRank); // Remove a meal from rankings

export default router;