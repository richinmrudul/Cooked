import { Request, Response } from 'express';
import pool from '../db';
import { QueryResult } from 'pg';

const setMealRank = async (req: Request, res: Response) => {
  const { mealId, rankPosition } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }
  if (!mealId || rankPosition === undefined || rankPosition < 1 || rankPosition > 10) {
    return res.status(400).json({ message: 'Meal ID and a valid rank position (1-10) are required.' });
  }

  try {
    // First, check if the meal belongs to the user
    const mealCheck: QueryResult = await pool.query(
      'SELECT id FROM meals WHERE id = $1 AND user_id = $2',
      [mealId, userId]
    );

    if (mealCheck.rowCount === 0) {
      return res.status(404).json({ message: 'Meal not found or not authorized for this user.' });
    }

    // Use a transaction for atomic operations
    await pool.query('BEGIN');

    // Check if another meal already occupies this rank for the user
    const existingRank: QueryResult = await pool.query(
      'SELECT meal_id FROM rankings WHERE user_id = $1 AND rank_position = $2',
      [userId, rankPosition]
    );

    // FIX: Add null check for existingRank before accessing rowCount
    if (existingRank && (existingRank.rowCount as number) > 0) {
      // Option 1: Remove the old meal from this rank
      await pool.query(
        'DELETE FROM rankings WHERE user_id = $1 AND rank_position = $2',
        [userId, rankPosition]
      );
    }

    // Insert or update the new rank
    const result: QueryResult = await pool.query(
      `INSERT INTO rankings (user_id, meal_id, rank_position)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, meal_id) DO UPDATE SET rank_position = $3
       RETURNING meal_id, rank_position`,
      [userId, mealId, rankPosition]
    );

    await pool.query('COMMIT');
    res.status(200).json({ message: 'Meal rank updated successfully', ranking: result.rows[0] });

  } catch (error: unknown) { // Add error: unknown type here as well
    await pool.query('ROLLBACK'); // Rollback on error
    console.error('Error setting meal rank:', error);

    // Optional: More detailed error handling for specific PostgreSQL errors if needed
    if (typeof error === 'object' && error !== null && 'code' in error && typeof (error as any).code === 'string') {
        if ((error as any).code === '23503') { // Foreign key violation (e.g., mealId doesn't exist)
            return res.status(400).json({ message: 'Invalid meal ID or rank position.' });
        }
    }

    res.status(500).json({ message: 'Server error setting meal rank.' });
  }
};

const getRankedMeals = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }

  try {
    const result: QueryResult = await pool.query(
      `SELECT
          r.rank_position, m.id, m.title, m.description, m.photo_url, m.overall_rating, m.date_made,
          ARRAY_AGG(mt.tag_name) FILTER (WHERE mt.tag_name IS NOT NULL) AS tags
       FROM rankings r
       JOIN meals m ON r.meal_id = m.id
       LEFT JOIN meal_tags mt ON m.id = mt.meal_id
       WHERE r.user_id = $1
       GROUP BY r.rank_position, m.id, m.title, m.description, m.photo_url, m.overall_rating, m.date_made
       ORDER BY r.rank_position ASC`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error: unknown) { // Add error: unknown type
    console.error('Error fetching ranked meals:', error);
    res.status(500).json({ message: 'Server error fetching ranked meals.' });
  }
};

const deleteMealRank = async (req: Request, res: Response) => {
  const { mealId } = req.params; // Using mealId as path parameter
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }

  if (!mealId) {
      return res.status(400).json({ message: 'Meal ID is required to delete a rank.' });
  }

  try {
      const result: QueryResult = await pool.query(
          'DELETE FROM rankings WHERE user_id = $1 AND meal_id = $2 RETURNING *',
          [userId, mealId]
      );

      if (result.rowCount === 0) {
          return res.status(404).json({ message: 'Meal rank not found for this user or meal.' });
      }

      res.status(200).json({ message: 'Meal rank removed successfully.', deletedRank: result.rows[0] });

  } catch (error: unknown) { // Add error: unknown type
      console.error('Error deleting meal rank:', error);
      res.status(500).json({ message: 'Server error deleting meal rank.' });
  }
};

export {
  setMealRank,
  getRankedMeals,
  deleteMealRank
};