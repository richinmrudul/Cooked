import React, { useState } from 'react';
import { useApiClient } from '../api/apiClient';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import RatingModal from '../components/RatingModal';
import ComparisonModal from '../components/ComparisonModal';

interface IngredientFormData {
  name: string;
  quantity: string;
  unit: string;
}

interface MealForComparison {
  id: string;
  title: string;
  photo_url?: string;
  overall_rating: number;
}

const AddMealPage: React.FC = () => {
  const { authFetch } = useApiClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date_made: new Date().toISOString().split('T')[0],
    photo_url: '',
    overall_rating: 3, // Keep a default value, as backend expects it (NOT NULL)
    tags: '',
  });
  const [ingredients, setIngredients] = useState<IngredientFormData[]>([
    { name: '', quantity: '', unit: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [newlyAddedMeal, setNewlyAddedMeal] = useState<{ id: string; title: string; photo_url?: string } | null>(null);
  const [mealToCompareWith, setMealToCompareWith] = useState<MealForComparison | null>(null);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleIngredientChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newIngredients = [...ingredients];
    (newIngredients[index] as any)[name] = value;
    setIngredients(newIngredients);
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const mealData = {
      ...formData,
      // overall_rating will be 3 initially (from state), then updated by modal
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      ingredients: ingredients.map(ing => ({
        name: ing.name.trim(),
        quantity: Number(ing.quantity) || 0,
        unit: ing.unit.trim(),
      })).filter(ing => ing.name && ing.quantity > 0)
    };

    try {
      const response = await authFetch('/meals', {
        method: 'POST',
        body: JSON.stringify(mealData),
      });
      setNewlyAddedMeal({ id: response.meal.id, title: response.meal.title, photo_url: response.meal.photo_url });
      setIsRatingModalOpen(true); // Open the initial rating modal
    } catch (err: any) {
      setError(err.message || 'Failed to add meal.');
      console.error('Error adding meal:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModalRating = async (rating: number) => {
    setIsRatingModalOpen(false); // Close rating modal
    if (!newlyAddedMeal) {
      navigate('/meals');
      return;
    }

    try {
      // 1. Update the meal's overall rating
      const currentMealData = await authFetch(`/meals/${newlyAddedMeal.id}`);
      await authFetch(`/meals/${newlyAddedMeal.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          // Send all other existing data to PUT, including original tags and ingredients
          title: currentMealData.title,
          description: currentMealData.description,
          date_made: currentMealData.date_made,
          photo_url: currentMealData.photo_url,
          tags: currentMealData.tags,
          ingredients: currentMealData.ingredients.map((ing: any) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              calories: ing.calories, // Keep existing macros if they were there
              protein: ing.protein,
              carbs: ing.carbs,
              fat: ing.fat,
          })),
          overall_rating: rating, // Update rating
        }),
      });

      // 2. Potentially set an initial rank based on initial rating
      let suggestedRank: number | undefined;
      if (rating === 5) suggestedRank = 1; // Good
      else if (rating === 3) suggestedRank = 5; // Okay
      // If rating is 1 (Bad), no initial rank suggested by this logic

      if (suggestedRank !== undefined) {
          await authFetch('/rankings', {
              method: 'POST',
              body: JSON.stringify({ mealId: newlyAddedMeal.id, rankPosition: suggestedRank }),
          });
      }

      // 3. Prepare for comparison if rating is Good/Okay and other meals exist
      if (rating === 5 || rating === 3) {
        const allMeals = await authFetch('/meals');
        const comparableMeals = allMeals.filter(
          (m: MealForComparison) =>
            m.id !== newlyAddedMeal.id && (m.overall_rating === 5 || m.overall_rating === 3)
        );

        if (comparableMeals.length > 0) {
          const randomIndex = Math.floor(Math.random() * comparableMeals.length);
          setMealToCompareWith(comparableMeals[randomIndex]);
          setIsComparisonModalOpen(true); // Open the comparison modal
          return; // Stop here, comparison modal will handle final navigation
        }
      }

      // If no comparison is needed/possible, navigate
      alert('Meal added and rated successfully!');
      navigate('/meals');
    } catch (err: any) {
      console.error('Error in post-rating logic:', err);
      alert('Meal added, but failed to update rating/rank or start comparison. Check console.');
      navigate('/meals');
    }
  };

  const handleComparisonResult = async (betterMealId: string | null) => {
    setIsComparisonModalOpen(false); // Close comparison modal
    if (!newlyAddedMeal || !mealToCompareWith) {
      navigate('/meals');
      return;
    }

    try {
      let targetRank: number; // Now explicitly a number

      // Fetch current rank of compared meal (if it's ranked)
      const rankedComparedResult = await authFetch(`/rankings?mealId=${mealToCompareWith.id}`);
      const currentComparedRank: number | undefined = rankedComparedResult[0]?.rank_position; // This can be number | undefined

      if (betterMealId === newlyAddedMeal.id) {
        // New meal is better: try to give it 1 higher rank (lower number) than compared meal, or rank 1
        if (currentComparedRank !== undefined) {
          targetRank = Math.max(1, currentComparedRank - 1);
        } else {
          targetRank = 1; // If compared meal not ranked, new meal gets rank 1
        }
      } else if (betterMealId === mealToCompareWith.id) {
        // New meal is worse: try to give it 1 lower rank (higher number) than compared meal
        if (currentComparedRank !== undefined) {
          targetRank = currentComparedRank + 1;
        } else {
          targetRank = 10; // If compared meal not ranked, new meal gets rank 10
        }
      } else {
        // They're equal: try to give it same rank as compared meal, or default 5
        if (currentComparedRank !== undefined) {
          targetRank = currentComparedRank;
        } else {
          targetRank = 5; // If compared meal not ranked, new meal defaults to rank 5
        }
      }

      // Ensure targetRank is strictly within 1-10 range before sending to API
      targetRank = Math.min(10, Math.max(1, targetRank));

      await authFetch('/rankings', {
        method: 'POST',
        body: JSON.stringify({ mealId: newlyAddedMeal.id, rankPosition: targetRank }),
      });
      alert('Meal ranked based on comparison!');

    } catch (err: any) {
      console.error('Error during comparison ranking:', err);
      alert('Meal added, but comparison ranking failed. Check console.');
    } finally {
      navigate('/meals'); // Finally navigate to meals list
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Add New Meal</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Title:</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Description:</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows={4} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}></textarea>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Date Made:</label>
          <input type="date" name="date_made" value={formData.date_made} onChange={handleChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Photo URL:</label>
          <input type="url" name="photo_url" value={formData.photo_url} onChange={handleChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Tags (comma-separated):</label>
          <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g., pasta, comfort food" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>

        <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Ingredients</h3>
        {ingredients.map((ingredient, index) => (
          <div key={index} style={{ border: '1px dashed #ddd', padding: '15px', marginBottom: '15px', borderRadius: '5px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.5fr 0.5fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
                <input
                  type="text"
                  name="name"
                  value={ingredient.name}
                  onChange={(e) => handleIngredientChange(index, e)}
                  placeholder="e.g., Chicken Breast"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Quantity:</label>
                <input
                  type="number"
                  name="quantity"
                  value={ingredient.quantity}
                  onChange={(e) => handleIngredientChange(index, e)}
                  placeholder="e.g., 200"
                  step="0.01"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Unit:</label>
                <input
                  type="text"
                  name="unit"
                  value={ingredient.unit}
                  onChange={(e) => handleIngredientChange(index, e)}
                  placeholder="g / ml / pcs"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            {ingredients.length > 1 && (
              <button type="button" onClick={() => handleRemoveIngredient(index)} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em', marginTop: '10px' }}>
                Remove Ingredient
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={handleAddIngredient} style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>
          Add Another Ingredient
        </button>

        {error && <p style={{ color: 'red', marginBottom: '15px', marginTop: '15px' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <button type="submit" disabled={loading} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {loading ? 'Adding...' : 'Add Meal'}
          </button>
          <Link to="/meals" style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
            Cancel
          </Link>
        </div>
      </form>

      {/* Rating Modal */}
      {newlyAddedMeal && (
        <RatingModal
          isOpen={isRatingModalOpen}
          onClose={() => { setIsRatingModalOpen(false); navigate('/meals'); }}
          onRate={handleModalRating}
          mealTitle={newlyAddedMeal.title}
        />
      )}

      {/* Comparison Modal */}
      {newlyAddedMeal && mealToCompareWith && (
        <ComparisonModal
          isOpen={isComparisonModalOpen}
          onClose={() => { setIsComparisonModalOpen(false); navigate('/meals'); }}
          onCompare={handleComparisonResult}
          newMeal={{ id: newlyAddedMeal.id, title: newlyAddedMeal.title, photo_url: newlyAddedMeal.photo_url }}
          comparedMeal={mealToCompareWith}
        />
      )}
    </div>
  );
};

export default AddMealPage;