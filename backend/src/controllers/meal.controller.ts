import { Request, Response } from 'express';
import pool from '../db';
import { QueryResult } from 'pg';

interface IngredientInput {
  id?: string;
  name: string;
  quantity: number;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
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
  console.log('Received request for createMeal.');
  console.log('req.body:', req.body);
  console.log('req.file:', req.file);

  // Safely parse tags and ingredients from JSON strings or handle empty/null
  const title = req.body.title;
  const description = req.body.description;
  const date_made = req.body.date_made;
  const overall_rating = parseInt(req.body.overall_rating);

  // FIX: Robustly parse tags and ingredients
  let tags: string[] = [];
  if (typeof req.body.tags === 'string' && req.body.tags.trim() !== '') {
      try {
          tags = JSON.parse(req.body.tags);
      } catch (e) {
          console.error("Failed to parse tags JSON string:", req.body.tags, e);
          return res.status(400).json({ message: "Invalid tags format." });
      }
  }

  let ingredients: IngredientInput[] = [];
  if (typeof req.body.ingredients === 'string' && req.body.ingredients.trim() !== '') {
      try {
          ingredients = JSON.parse(req.body.ingredients);
      } catch (e) {
          console.error("Failed to parse ingredients JSON string:", req.body.ingredients, e);
          return res.status(400).json({ message: "Invalid ingredients format." });
      }
  }


  const userId = req.user?.id;
  const photoFile = req.file;

  let photo_url: string | null | undefined = undefined;
  if (photoFile) {
    photo_url = `http://localhost:${process.env.PORT || 5000}/uploads/${photoFile.filename}`;
  }

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }
  if (!title || !date_made || overall_rating === undefined) {
    return res.status(400).json({ message: 'Title, date_made, and overall_rating are required.' });
  }
  if (overall_rating < 1 || overall_rating > 5) {
    return res.status(400).json({ message: 'Overall rating must be between 1 and 5.' });
  }

  try {
    await pool.query('BEGIN');

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

    const addedIngredients: IngredientInput[] = [];
    if (ingredients && ingredients.length > 0) {
      for (const ingredient of ingredients as IngredientInput[]) {
        const ingResult: QueryResult = await pool.query(
          `INSERT INTO ingredients (name, calories, protein, carbs, fat)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (name) DO UPDATE SET
               calories = EXCLUDED.calories,
               protein = EXCLUDED.protein,
               carbs = EXCLUDED.carbs,
               fat = EXCLUDED.fat
           RETURNING id, name`,
          [ingredient.name, ingredient.calories, ingredient.protein, ingredient.carbs, ingredient.fat]
        );
        const ingId = ingResult.rows[0].id;

        await pool.query(
          'INSERT INTO meal_ingredients (meal_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)',
          [newMeal.id, ingId, ingredient.quantity, ingredient.unit]
        );
        addedIngredients.push({ ...ingredient, id: ingId });
      }
    }

    await pool.query('COMMIT');
    res.status(201).json({ message: 'Meal created successfully', meal: { ...newMeal, tags: tags || [], ingredients: addedIngredients } });
  } catch (error: unknown) {
    await pool.query('ROLLBACK');
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
       GROUP BY m.id, m.user_id, m.title, m.description, m.date_made, m.photo_url, m.overall_rating, m.created_at
       ORDER BY m.date_made DESC, m.created_at DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (error: unknown) {
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
           GROUP BY m.id, m.user_id, m.title, m.description, m.date_made, m.photo_url, m.overall_rating, m.created_at`,
          [id, userId]
        );

        const meal = result.rows[0];

        if (!meal) {
          return res.status(404).json({ message: 'Meal not found or not authorized.' });
        }

        res.status(200).json(meal);
      } catch (error: unknown) {
        console.error('Error fetching meal by ID:', error);
        res.status(500).json({ message: 'Server error fetching meal.' });
      }
    };

    const updateMeal = async (req: Request, res: Response) => {
      console.log('Received request for updateMeal.');
      console.log('req.body:', req.body);
      console.log('req.file:', req.file);

      // Safely parse tags and ingredients from JSON strings
      const { id } = req.params;
      const title = req.body.title;
      const description = req.body.description;
      const date_made = req.body.date_made;
      const overall_rating = parseInt(req.body.overall_rating);
      const photo_url_is_null = req.body.photo_url_is_null; // Multer sends this as a string 'true' or 'false'

      // FIX: Robustly parse tags and ingredients
      let tags: string[] = [];
      if (typeof req.body.tags === 'string' && req.body.tags.trim() !== '') {
          try {
              tags = JSON.parse(req.body.tags);
          } catch (e) {
              console.error("Failed to parse tags JSON string:", req.body.tags, e);
              return res.status(400).json({ message: "Invalid tags format." });
          }
      }

      let ingredients: IngredientInput[] = [];
      if (typeof req.body.ingredients === 'string' && req.body.ingredients.trim() !== '') {
          try {
              ingredients = JSON.parse(req.body.ingredients);
          } catch (e) {
              console.error("Failed to parse ingredients JSON string:", req.body.ingredients, e);
              return res.status(400).json({ message: "Invalid ingredients format." });
          }
      }

      const userId = req.user?.id;
      const photoFile = req.file;

      const currentMealResult = await pool.query('SELECT photo_url FROM meals WHERE id = $1 AND user_id = $2', [id, userId]);
      const currentPhotoUrl = currentMealResult.rows[0]?.photo_url;

      let photo_url_to_save: string | null = currentPhotoUrl;
      if (photoFile) {
        photo_url_to_save = `http://localhost:${process.env.PORT || 5000}/uploads/${photoFile.filename}`;
      } else if (photo_url_is_null === 'true') {
        photo_url_to_save = null;
      }

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
      }
      if (!title || !date_made || overall_rating === undefined) {
        return res.status(400).json({ message: 'Title, date_made, and overall_rating are required.' });
      }
      if (overall_rating < 1 || overall_rating > 5) {
        return res.status(400).json({ message: 'Overall rating must be between 1 and 5.' });
      }

      try {
        await pool.query('BEGIN');

        const mealResult: QueryResult = await pool.query(
          `UPDATE meals
           SET title = $1, description = $2, date_made = $3, photo_url = $4, overall_rating = $5
           WHERE id = $6 AND user_id = $7
           RETURNING id, user_id, title, description, date_made, photo_url, overall_rating, created_at`,
          [title, description, date_made, photo_url_to_save, overall_rating, id, userId]
        );

        if (mealResult.rowCount === 0) {
          await pool.query('ROLLBACK');
          return res.status(404).json({ message: 'Meal not found or not authorized.' });
        }
        const updatedMeal = mealResult.rows[0];

        await pool.query('DELETE FROM meal_tags WHERE meal_id = $1', [id]);
        if (tags && tags.length > 0) {
          for (const tagName of tags) {
            await pool.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [tagName]);
            await pool.query('INSERT INTO meal_tags (meal_id, tag_name) VALUES ($1, $2)', [id, tagName]);
          }
        }

        await pool.query('DELETE FROM meal_ingredients WHERE meal_id = $1', [id]);
        const updatedIngredients: IngredientInput[] = [];
        if (ingredients && ingredients.length > 0) {
          for (const ingredient of ingredients as IngredientInput[]) {
            const ingResult: QueryResult = await pool.query(
              `INSERT INTO ingredients (name, calories, protein, carbs, fat)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (name) DO UPDATE SET
                   calories = EXCLUDED.calories,
                   protein = EXCLUDED.protein,
                   carbs = EXCLUDED.carbs,
                   fat = EXCLUDED.fat
               RETURNING id, name`,
              [ingredient.name, ingredient.calories, ingredient.protein, ingredient.carbs, ingredient.fat]
            );
            const ingId = ingResult.rows[0].id;

            await pool.query(
              'INSERT INTO meal_ingredients (meal_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)',
              [id, ingId, ingredient.quantity, ingredient.unit]
            );
            updatedIngredients.push({ ...ingredient, id: ingId });
          }
        }

        await pool.query('COMMIT');
        res.status(200).json({ message: 'Meal updated successfully', meal: { ...updatedMeal, tags: tags || [], ingredients: updatedIngredients } });
      } catch (error: unknown) {
        await pool.query('ROLLBACK');
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
    