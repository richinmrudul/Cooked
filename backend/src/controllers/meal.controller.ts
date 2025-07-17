import { Request, Response } from 'express';
import pool from '../db';
import { QueryResult } from 'pg';

interface IngredientInput {
  id?: string;
  name: string;
  quantity: number;
  unit?: string;
}

interface Meal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  date_made: string;
  photo_url?: string | null;
  overall_rating: number;
  tags?: string[];
  ingredients?: Array<IngredientInput>;
  created_at: string;
}

const createMeal = async (req: Request, res: Response) => {
  const { title, description, date_made, overall_rating, tags, ingredients } = req.body;
  const userId = req.user?.id;
  const photoFile = req.file;

  let parsedTags: string[] = [];
  if (typeof tags === 'string' && tags.trim() !== '') {
      try { parsedTags = JSON.parse(tags); } catch (e) { console.error("Failed to parse tags JSON string:", tags, e); return res.status(400).json({ message: "Invalid tags format." }); }
  }

  let parsedIngredients: IngredientInput[] = [];
  if (typeof ingredients === 'string' && ingredients.trim() !== '') {
      try { parsedIngredients = JSON.parse(ingredients); } catch (e) { console.error("Failed to parse ingredients JSON string:", ingredients, e); return res.status(400).json({ message: "Invalid ingredients format." }); }
  }

  // NEW: photo_url_to_save comes directly from Cloudinary path
  let photo_url_to_save: string | null = null;
  if (photoFile) {
    photo_url_to_save = photoFile.path; // Multer-Cloudinary puts the Cloudinary URL in .path
  }

  if (!userId) { return res.status(401).json({ message: 'User not authenticated.' }); }
  if (!title || !date_made || overall_rating === undefined) { return res.status(400).json({ message: 'Title, date_made, and overall_rating are required.' }); }
  if (overall_rating < 1 || overall_rating > 5) { return res.status(400).json({ message: 'Overall rating must be between 1 and 5.' }); }

  try {
    await pool.query('BEGIN'); // Start transaction

    
    // Get user's current streak data from the database
    const userStreakResult: QueryResult = await pool.query(
        'SELECT current_streak, longest_streak, last_meal_date FROM users WHERE id = $1 FOR UPDATE',
        [userId]
    );
    const userData = userStreakResult.rows[0];
    let { current_streak, longest_streak, last_meal_date } = userData || { current_streak: 0, longest_streak: 0, last_meal_date: null };

    // Use the meal's date_made (normalized to UTC midnight) for streak logic
    const mealDateUTC = new Date(date_made);
    mealDateUTC.setUTCHours(0, 0, 0, 0);

    let newCurrentStreak = current_streak;
    let newLongestStreak = longest_streak;
    let newLastMealDate = mealDateUTC; // Update last_meal_date to the meal's date

    if (last_meal_date) {
        const lastMealDateObj = new Date(last_meal_date);
        lastMealDateObj.setUTCHours(0, 0, 0, 0);

        // Calculate difference in days between meal date and last logged meal date
        const diffTime = mealDateUTC.getTime() - lastMealDateObj.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) { // Cooked the day after last meal, streak continues
            newCurrentStreak++;
        } else if (diffDays === 0) { // Multiple meals on same day, streak doesn't change
            // newCurrentStreak remains the same
        } else if (diffDays > 1) { // Gap of more than 1 day, reset streak
            newCurrentStreak = 1;
        } else if (diffDays < 0) { // Logging a meal for a date before last_meal_date, do not update streak
            newCurrentStreak = current_streak;
            newLastMealDate = lastMealDateObj;
        }
    } else {
        // First meal ever
        newCurrentStreak = 1;
    }

    if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
    }

    // Update user's streak data in the users table
    await pool.query(
        'UPDATE users SET current_streak = $1, longest_streak = $2, last_meal_date = $3 WHERE id = $4',
        [newCurrentStreak, newLongestStreak, newLastMealDate, userId]
    );
    // NEW STREAK LOGIC ENDS HERE


    const mealResult: QueryResult = await pool.query(
      `INSERT INTO meals (user_id, title, description, date_made, photo_url, overall_rating)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, title, description, date_made, photo_url, overall_rating, created_at`,
      [userId, title, description, date_made, photo_url_to_save, overall_rating]
    );
    const newMeal = mealResult.rows[0];

    if (parsedTags && parsedTags.length > 0) {
      for (const tagName of parsedTags) {
        await pool.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [tagName]);
        await pool.query('INSERT INTO meal_tags (meal_id, tag_name) VALUES ($1, $2)', [newMeal.id, tagName]);
      }
    }

    if (parsedIngredients && parsedIngredients.length > 0) {
      for (const ingredient of parsedIngredients as IngredientInput[]) {
        let ingId;
        const existingIngResult: QueryResult = await pool.query(
          'SELECT id FROM ingredients WHERE name = $1',
          [ingredient.name]
        );

        if (existingIngResult.rows.length > 0) {
          ingId = existingIngResult.rows[0].id;
        } else {
          const insertResult: QueryResult = await pool.query(
            `INSERT INTO ingredients (name) VALUES ($1) RETURNING id`,
            [ingredient.name]
          );
          ingId = insertResult.rows[0].id;
        }
        await pool.query(
          'INSERT INTO meal_ingredients (meal_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)',
          [newMeal.id, ingId, ingredient.quantity, ingredient.unit]
        );
      }
    }

    await pool.query('COMMIT'); // Commit transaction
    res.status(201).json({ message: 'Meal created successfully', meal: { ...newMeal, tags: parsedTags, ingredients: parsedIngredients } });
  } catch (error: unknown) {
    await pool.query('ROLLBACK'); // Rollback on error
    console.error('Error creating meal:', error);
    res.status(500).json({ message: 'Server error creating meal.' });
  }
};

const getMeals = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { q, tag, minRating, maxRating, startDate, endDate } = req.query;

  if (!userId) { return res.status(401).json({ message: 'User not authenticated.' }); }

  try {
    let queryText = `
      SELECT
          m.id, m.user_id, m.title, m.description, m.date_made, m.photo_url, m.overall_rating, m.created_at,
          ARRAY_AGG(mt.tag_name) FILTER (WHERE mt.tag_name IS NOT NULL) AS tags
      FROM meals m
      LEFT JOIN meal_tags mt ON m.id = mt.meal_id
      WHERE m.user_id = $1
    `;
    const queryParams: (string | number)[] = [userId];
    let paramIndex = 2;

    if (q) { queryText += ` AND (m.title ILIKE $${paramIndex} OR m.description ILIKE $${paramIndex})`; queryParams.push(`%${q}%`); paramIndex++; }
    if (tag) { queryText += ` AND m.id IN (SELECT meal_id FROM meal_tags WHERE tag_name ILIKE $${paramIndex})`; queryParams.push(`%${tag}%`); paramIndex++; }
    if (minRating !== undefined) { queryText += ` AND m.overall_rating >= $${paramIndex}`; queryParams.push(parseInt(minRating as string)); paramIndex++; }
    if (maxRating !== undefined) { queryText += ` AND m.overall_rating <= $${paramIndex}`; queryParams.push(parseInt(maxRating as string)); paramIndex++; }
    if (startDate) { queryText += ` AND m.date_made >= $${paramIndex}`; queryParams.push(startDate as string); paramIndex++; }
    if (endDate) { queryText += ` AND m.date_made <= $${paramIndex}`; queryParams.push(endDate as string); paramIndex++; }

    queryText += `
      GROUP BY m.id, m.user_id, m.title, m.description, m.date_made, m.photo_url, m.overall_rating, m.created_at
      ORDER BY m.date_made DESC, m.created_at DESC`;

    const result: QueryResult = await pool.query(queryText, queryParams);

    res.status(200).json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ message: 'Server error fetching meals.' });
  }
};

const getMealById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) { return res.status(401).json({ message: 'User not authenticated.' }); }

  try {
    const result: QueryResult = await pool.query(
      `SELECT
          m.id, m.user_id, m.title, m.description, m.date_made, m.photo_url, m.overall_rating, m.created_at,
          ARRAY_AGG(mt.tag_name) FILTER (WHERE mt.tag_name IS NOT NULL) AS tags,
          COALESCE(
              json_agg(json_build_object('id', i.id, 'name', i.name, 'quantity', mi.quantity, 'unit', mi.unit))
              FILTER (WHERE i.id IS NOT NULL),
              '[]'
          ) AS ingredients
       FROM meals m
       LEFT JOIN meal_tags mt ON m.id = mt.meal_id
       LEFT JOIN meal_ingredients mi ON m.id = mi.meal_id
       LEFT JOIN ingredients i ON mi.ingredient_id = i.id
       WHERE m.id = $1 AND m.user_id = $2
       GROUP BY m.id, m.user_id, m.title, m.description, m.date_made, m.photo_url, m.overall_rating, m.created_at`,
      [id, userId]
    );

    const meal = result.rows[0];
    if (!meal) { return res.status(404).json({ message: 'Meal not found or not authorized.' }); }
    res.status(200).json(meal);
  } catch (error: unknown) {
    console.error('Error fetching meal by ID:', error);
    res.status(500).json({ message: 'Server error fetching meal.' });
  }
};

const updateMeal = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, date_made, overall_rating, tags, ingredients, photo_url_is_null } = req.body;
  const userId = req.user?.id;
  const photoFile = req.file;

  let parsedTags: string[] = [];
  if (typeof tags === 'string' && tags.trim() !== '') {
      try { parsedTags = JSON.parse(tags); } catch (e) { console.error("Failed to parse tags JSON string:", tags, e); return res.status(400).json({ message: "Invalid tags format." }); }
  }

  let parsedIngredients: IngredientInput[] = [];
  if (typeof ingredients === 'string' && ingredients.trim() !== '') {
      try { parsedIngredients = JSON.parse(ingredients); } catch (e) { console.error("Failed to parse ingredients JSON string:", ingredients, e); return res.status(400).json({ message: "Invalid ingredients format." }); }
  }

  const currentMealResult = await pool.query('SELECT photo_url FROM meals WHERE id = $1 AND user_id = $2', [id, userId]);
  const currentPhotoUrl = currentMealResult.rows[0]?.photo_url;

  let photo_url_to_save: string | null = currentPhotoUrl;
  if (photoFile) {
    photo_url_to_save = photoFile.path; // NEW: Use Cloudinary URL from .path
  } else if (photo_url_is_null === 'true') {
    photo_url_to_save = null;
  }

  if (!userId) { return res.status(401).json({ message: 'User not authenticated.' }); }
  if (!title || !date_made || overall_rating === undefined) { return res.status(400).json({ message: 'Title, date_made, and overall_rating are required.' }); }
  if (overall_rating < 1 || overall_rating > 5) { return res.status(400).json({ message: 'Overall rating must be between 1 and 5.' }); }

  try {
    await pool.query('BEGIN');

    const mealResult: QueryResult = await pool.query(
      `UPDATE meals
       SET title = $1, description = $2, date_made = $3, photo_url = $4, overall_rating = $5
       WHERE id = $6 AND user_id = $7
       RETURNING id, user_id, title, description, date_made, photo_url, overall_rating, created_at`,
      [title, description, date_made, photo_url_to_save, overall_rating, id, userId]
    );

    if (mealResult.rowCount === 0) { await pool.query('ROLLBACK'); return res.status(404).json({ message: 'Meal not found or not authorized.' }); }

    await pool.query('DELETE FROM meal_tags WHERE meal_id = $1', [id]);
    if (parsedTags && parsedTags.length > 0) {
      for (const tagName of parsedTags) {
        await pool.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [tagName]);
        await pool.query('INSERT INTO meal_tags (meal_id, tag_name) VALUES ($1, $2)', [id, tagName]);
      }
    }

    await pool.query('DELETE FROM meal_ingredients WHERE meal_id = $1', [id]);
    if (parsedIngredients && parsedIngredients.length > 0) {
      for (const ingredient of parsedIngredients as IngredientInput[]) {
        let ingId;
        const existingIngResult: QueryResult = await pool.query(
          'SELECT id FROM ingredients WHERE name = $1',
          [ingredient.name]
        );

        if (existingIngResult.rows.length > 0) {
          ingId = existingIngResult.rows[0].id;
        } else {
          const insertResult: QueryResult = await pool.query(
            `INSERT INTO ingredients (name) VALUES ($1) RETURNING id`,
            [ingredient.name]
          );
          ingId = insertResult.rows[0].id;
        }
        await pool.query(
          'INSERT INTO meal_ingredients (meal_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)',
          [id, ingId, ingredient.quantity, ingredient.unit]
        );
      }
    }

    await pool.query('COMMIT');
    res.status(200).json({ message: 'Meal updated successfully', meal: { ...mealResult.rows[0], tags: parsedTags || [], ingredients: parsedIngredients } });
  } catch (error: unknown) {
    await pool.query('ROLLBACK');
    console.error('Error updating meal:', error);
    res.status(500).json({ message: 'Server error updating meal.' });
  }
};

const deleteMeal = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) { return res.status(401).json({ message: 'User not authenticated.' }); }

  try {
    const result: QueryResult = await pool.query(
      'DELETE FROM meals WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rowCount === 0) { return res.status(404).json({ message: 'Meal not found or not authorized.' }); }
    res.status(200).json({ message: 'Meal deleted successfully' });
  } catch (error: unknown) {
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