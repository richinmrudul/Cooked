import { Request, Response } from 'express';
import pool from '../db';
import { QueryResult } from 'pg';

const K_FACTOR = 32;

async function updateEloScores(userId: string, winnerId: string, loserId: string, type: 'win' | 'lose' | 'tie') {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const winnerRankResult = await client.query('SELECT score FROM rankings WHERE user_id = $1 AND meal_id = $2', [userId, winnerId]);
        const loserRankResult = await client.query('SELECT score FROM rankings WHERE user_id = $1 AND meal_id = $2', [userId, loserId]);

        let winnerScore = parseFloat(winnerRankResult.rows[0]?.score || 1500);
        let loserScore = parseFloat(loserRankResult.rows[0]?.score || 1500);

        await client.query(
            `INSERT INTO rankings (user_id, meal_id, score) VALUES ($1, $2, $3) ON CONFLICT (user_id, meal_id) DO NOTHING`,
            [userId, winnerId, winnerScore]
        );
        await client.query(
            `INSERT INTO rankings (user_id, meal_id, score) VALUES ($1, $2, $3) ON CONFLICT (user_id, meal_id) DO NOTHING`,
            [userId, loserId, loserScore]
        );

        let newWinnerScore, newLoserScore;

        if (type === 'win') {
            newWinnerScore = winnerScore + K_FACTOR;
            newLoserScore = loserScore - K_FACTOR;
        } else if (type === 'lose') {
            newWinnerScore = winnerScore - K_FACTOR;
            newLoserScore = loserScore + K_FACTOR;
        } else { // tie
            newWinnerScore = winnerScore;
            newLoserScore = loserScore;
        }

        await client.query('UPDATE rankings SET score = $1 WHERE user_id = $2 AND meal_id = $3', [newWinnerScore, userId, winnerId]);
        await client.query('UPDATE rankings SET score = $1 WHERE user_id = $2 AND meal_id = $3', [newLoserScore, userId, loserId]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}


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
    await pool.query('BEGIN');

    const mealCheck: QueryResult = await pool.query(
      'SELECT id FROM meals WHERE id = $1 AND user_id = $2',
      [mealId, userId]
    );

    
    if (!mealCheck || mealCheck.rowCount! < 2) { // Changed to !mealCheck || mealCheck.rowCount! < 2
        await pool.query('ROLLBACK');
        return res.status(404).json({ message: 'Meal not found or not authorized.' });
    }

    const result: QueryResult = await pool.query(
      `INSERT INTO rankings (user_id, meal_id, rank_position)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, meal_id) DO UPDATE SET rank_position = $3
       RETURNING meal_id, rank_position, score`,
      [userId, mealId, rankPosition]
    );

    await pool.query('COMMIT');
    res.status(200).json({ message: 'Meal rank updated successfully', ranking: result.rows[0] });

  } catch (error: unknown) {
    await pool.query('ROLLBACK');
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
    const result: QueryResult = await pool.query(
      `SELECT
          r.score, m.id, m.title, m.description, m.photo_url, m.overall_rating, m.date_made,
          ARRAY_AGG(mt.tag_name) FILTER (WHERE mt.tag_name IS NOT NULL) AS tags
       FROM rankings r
       JOIN meals m ON r.meal_id = m.id
       LEFT JOIN meal_tags mt ON m.id = mt.meal_id
       WHERE r.user_id = $1
       GROUP BY r.score, m.id, m.title, m.description, m.photo_url, m.overall_rating, m.date_made
       ORDER BY r.score DESC`,
      [userId]
    );

    const rankedMealsWithPositions = result.rows.map((row, index) => ({
        ...row,
        rank_position: index + 1
    }));

    res.status(200).json(rankedMealsWithPositions);
  } catch (error: unknown) {
    console.error('Error fetching ranked meals:', error);
    res.status(500).json({ message: 'Server error fetching ranked meals.' });
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
      res.status(500).json({ message: 'Server error deleting meal.' });
  }
};

const recordComparison = async (req: Request, res: Response) => {
    const { winnerId, loserId, type } = req.body;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    if (!winnerId || !loserId || !['win', 'lose', 'tie'].includes(type)) {
        return res.status(400).json({ message: 'Winner ID, Loser ID, and valid type (win/lose/tie) are required.' });
    }

    try {
        const mealCheck: QueryResult = await pool.query(
            'SELECT id FROM meals WHERE id = $1 AND user_id = $2 UNION SELECT id FROM meals WHERE id = $3 AND user_id = $2',
            [winnerId, userId, loserId]
        );

        if (!mealCheck || mealCheck.rowCount! < 2) { 
            return res.status(404).json({ message: 'One or both meals not found or not authorized for this user.' });
        }

        await pool.query(
            `INSERT INTO rankings (user_id, meal_id, score) VALUES ($1, $2, $3) ON CONFLICT (user_id, meal_id) DO NOTHING`,
            [userId, winnerId, K_FACTOR]
        );
        await pool.query(
            `INSERT INTO rankings (user_id, meal_id, score) VALUES ($1, $2, $3) ON CONFLICT (user_id, meal_id) DO NOTHING`,
            [userId, loserId, K_FACTOR]
        );

        await updateEloScores(userId, winnerId, loserId, type);

        res.status(200).json({ message: 'Comparison recorded successfully!' });
    } catch (error: unknown) {
        console.error('Error recording comparison:', error);
        res.status(500).json({ message: 'Server error recording comparison.' });
    }
};


export {
  setMealRank,
  getRankedMeals,
  deleteMealRank,
  recordComparison
};