import { Request, Response } from 'express';
import pool from '../db';
import { QueryResult } from 'pg';

interface Meal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  date_made: string;
  photo_url: string;
  overall_rating: number;
  tags: string[];
}

const createMeal = async (req: Request, res: Response) => {
  const { title, description, date_made, photo_url, overall_rating, tags } = req.body;
  const userId = req.user?.id; // user ID from authenticated request

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }
  if (!title || !date_made || !overall_rating) {
    return res.status(400).json({ message: 'Title, date_made, and overall_rating are required.' });
  }
  if (overall_rating < 1 || overall_rating > 5) {
    return res.status(400).json({ message: 'Overall rating must be between 1 and 5.' });
  }

  try {
    const mealResult: QueryResult = await pool.query(
      `INSERT INTO meals (user_id, title, description, date_made, photo_url, overall_rating)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, title, description, date_made, photo_url, overall_rating, created_at`,
      [userId, title, description, date_made, photo_url, overall_rating]
    );
    const newMeal = mealResult.rows[0];

    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        await pool.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [tagName]);
        await pool.query('INSERT INTO meal_tags (meal_id, tag_name) VALUES ($1, $2)', [newMeal.id, tagName]);
      }
    }

    res.status(201).json({ message: 'Meal created successfully', meal: { ...newMeal, tags: tags || [] } });
  } catch (error) {
    console.error('Error creating meal:', error);
    res.status(500).json({ message: 'Server error creating meal.' });
  }
};

const getMeals = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }

  try {
    const result: QueryResult = await pool.query(
      `SELECT
          m.id, m.user_id, m.title, m.description, m.date_made, m.photo_url, m.overall_rating, m.created_at,
          ARRAY_AGG(mt.tag_name) FILTER (WHERE mt.tag_name IS NOT NULL) AS tags
       FROM meals m
       LEFT JOIN meal_tags mt ON m.id = mt.meal_id
       WHERE m.user_id = $1
       GROUP BY m.id
       ORDER BY m.date_made DESC, m.created_at DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ message: 'Server error fetching meals.' });
  }
};

const getMealById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }

  try {
    const result: QueryResult = await pool.query(
      `SELECT
          m.id, m.user_id, m.title, m.description, m.date_made, m.photo_url, m.overall_rating, m.created_at,
          ARRAY_AGG(mt.tag_name) FILTER (WHERE mt.tag_name IS NOT NULL) AS tags,
          COALESCE(
              json_agg(json_build_object('id', i.id, 'name', i.name, 'quantity', mi.quantity, 'unit', mi.unit, 'calories', i.calories, 'protein', i.protein, 'carbs', i.carbs, 'fat', i.fat))
              FILTER (WHERE i.id IS NOT NULL),
              '[]'
          ) AS ingredients
       FROM meals m
       LEFT JOIN meal_tags mt ON m.id = mt.meal_id
       LEFT JOIN meal_ingredients mi ON m.id = mi.meal_id
       LEFT JOIN ingredients i ON mi.ingredient_id = i.id
       WHERE m.id = $1 AND m.user_id = $2
       GROUP BY m.id`,
      [id, userId]
    );

    const meal = result.rows[0];

    if (!meal) {
      return res.status(404).json({ message: 'Meal not found or not authorized.' });
    }

    res.status(200).json(meal);
  } catch (error) {
    console.error('Error fetching meal by ID:', error);
    res.status(500).json({ message: 'Server error fetching meal.' });
  }
};


const updateMeal = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, date_made, photo_url, overall_rating, tags } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }
  if (!title || !date_made || !overall_rating) {
    return res.status(400).json({ message: 'Title, date_made, and overall_rating are required.' });
  }
  if (overall_rating < 1 || overall_rating > 5) {
    return res.status(400).json({ message: 'Overall rating must be between 1 and 5.' });
  }

  try {
    const mealResult: QueryResult = await pool.query(
      `UPDATE meals
       SET title = $1, description = $2, date_made = $3, photo_url = $4, overall_rating = $5
       WHERE id = $6 AND user_id = $7
       RETURNING id, user_id, title, description, date_made, photo_url, overall_rating, created_at`,
      [title, description, date_made, photo_url, overall_rating, id, userId]
    );

    if (mealResult.rowCount === 0) {
      return res.status(404).json({ message: 'Meal not found or not authorized.' });
    }
    const updatedMeal = mealResult.rows[0];

    // Update tags: remove old ones, add new ones
    await pool.query('DELETE FROM meal_tags WHERE meal_id = $1', [id]);
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        await pool.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [tagName]);
        await pool.query('INSERT INTO meal_tags (meal_id, tag_name) VALUES ($1, $2)', [id, tagName]);
      }
    }

    res.status(200).json({ message: 'Meal updated successfully', meal: { ...updatedMeal, tags: tags || [] } });
  } catch (error) {
    console.error('Error updating meal:', error);
    res.status(500).json({ message: 'Server error updating meal.' });
  }
};

const deleteMeal = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }

  try {
    const result: QueryResult = await pool.query(
      'DELETE FROM meals WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Meal not found or not authorized.' });
    }

    res.status(200).json({ message: 'Meal deleted successfully' });
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({ message: 'Server error deleting meal.' });
  }
};

export {
  createMeal,
  getMeals,
  getMealById,
  updateMeal,
  deleteMeal
};