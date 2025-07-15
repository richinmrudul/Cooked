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
    await pool.query('BEGIN'); // Start transaction

    // First, check if the meal belongs to the user
    const mealCheck: QueryResult = await pool.query(
      'SELECT id FROM meals WHERE id = $1 AND user_id = $2',
      [mealId, userId]
    );

    if (mealCheck.rowCount === 0) {
      await pool.query('ROLLBACK'); // Rollback if meal not found
      return res.status(404).json({ message: 'Meal not found or not authorized for this user.' });
    }

    // --- REMOVED THE OLD DELETE BLOCK HERE ---
    // The previous code block that checked existingRank and deleted based on rank_position
    // is now removed, as the database constraint no longer exists and
    // ON CONFLICT (user_id, meal_id) handles updates for existing meals.

    // Insert or update the meal's rank. ON CONFLICT handles if this meal is already ranked by the user.
    const result: QueryResult = await pool.query(
      `INSERT INTO rankings (user_id, meal_id, rank_position)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, meal_id) DO UPDATE SET rank_position = $3
       RETURNING meal_id, rank_position`,
      [userId, mealId, rankPosition]
    );

    await pool.query('COMMIT'); // Commit transaction
    res.status(200).json({ message: 'Meal rank updated successfully', ranking: result.rows[0] });

  } catch (error: unknown) {
    await pool.query('ROLLBACK'); // Rollback on error
    console.error('Error setting meal rank:', error);

    if (typeof error === 'object' && error !== null && 'code' in error && typeof (error as any).code === 'string') {
        if ((error as any).code === '23503') {
            return res.status(400).json({ message: 'Invalid meal ID or rank position.' });
        }
    }

    res.status(500).json({ message: 'Server error setting meal rank.' });
  }
};

const getRankedMeals = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { mealId } = req.query;

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }

  try {
    let queryText = `
        SELECT
            r.rank_position, m.id, m.title, m.description, m.photo_url, m.overall_rating, m.date_made,
            ARRAY_AGG(mt.tag_name) FILTER (WHERE mt.tag_name IS NOT NULL) AS tags
        FROM rankings r
        JOIN meals m ON r.meal_id = m.id
        LEFT JOIN meal_tags mt ON m.id = mt.meal_id
        WHERE r.user_id = $1
    `;
    const queryParams: (string | number)[] = [userId];

    if (mealId) {
        queryText += ` AND r.meal_id = $2`;
        queryParams.push(mealId as string);
    }

    queryText += `
        GROUP BY r.rank_position, m.id, m.title, m.description, m.photo_url, m.overall_rating, m.date_made
        ORDER BY r.rank_position ASC
    `;

    const result: QueryResult = await pool.query(queryText, queryParams);
    res.status(200).json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching ranked meals:', error);
    res.status(500).json({ message: 'Server error fetching meals.' });
  }
};

const deleteMealRank = async (req: Request, res: Response) => {
  const { mealId } = req.params;
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

  } catch (error: unknown) {
      console.error('Error deleting meal rank:', error);
      res.status(500).json({ message: 'Server error deleting meal rank.' });
  }
};

export {
  setMealRank,
  getRankedMeals,
  deleteMealRank
};