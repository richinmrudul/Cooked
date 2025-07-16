import { Router } from 'express';
import auth from '../middleware/auth.middleware';
import express from 'express';
import {
  setMealRank,
  getRankedMeals,
  deleteMealRank,
  recordComparison 
} from '../controllers/ranking.controller';

const router = Router();

router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ extended: true, limit: '50mb' }));

router.post('/', auth, setMealRank); // Still used for initial manual rank, or default from add meal
router.get('/', auth, getRankedMeals);
router.delete('/:mealId', auth, deleteMealRank);
router.post('/compare', auth, recordComparison); 

export default router;