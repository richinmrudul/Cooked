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
    overall_rating: 3, // Initial default, will be overridden by modal
    tags: '',
  });
  const [ingredients, setIngredients] = useState<IngredientFormData[]>([
    { name: '', quantity: '', unit: '' }
  ]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoFile(null);
      setPhotoPreview(null);
    }
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

    const formToSend = new FormData();
    formToSend.append('title', formData.title);
    formToSend.append('description', formData.description);
    formToSend.append('date_made', formData.date_made);
    formToSend.append('overall_rating', String(formData.overall_rating));
    formToSend.append('tags', JSON.stringify(formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)));
    formToSend.append('ingredients', JSON.stringify(ingredients.map(ing => ({
      name: ing.name.trim(),
      quantity: Number(ing.quantity) || 0,
      unit: ing.unit.trim(),
    })).filter(ing => ing.name && ing.quantity > 0)));

    if (photoFile) {
      formToSend.append('photo', photoFile);
    }

    try {
      const response = await authFetch('/meals', {
        method: 'POST',
        body: formToSend,
      });
      setNewlyAddedMeal({ id: response.meal.id, title: response.meal.title, photo_url: response.meal.photo_url });
      setIsRatingModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to add meal.');
      console.error('Error adding meal:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModalRating = async (rating: number) => {
    setIsRatingModalOpen(false);
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
          title: currentMealData.title,
          description: currentMealData.description,
          date_made: currentMealData.date_made,
          photo_url: currentMealData.photo_url, // Keep current photo URL
          tags: currentMealData.tags,
          ingredients: currentMealData.ingredients.map((ing: any) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              calories: ing.calories,
              protein: ing.protein,
              carbs: ing.carbs,
              fat: ing.fat,
          })),
          overall_rating: rating,
        }),
      });

      // 2. Prepare for comparison if rating is Good/Okay and other meals exist
      // No direct rank assignment here anymore, only via comparison
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
    setIsComparisonModalOpen(false);
    if (!newlyAddedMeal || !mealToCompareWith) {
      navigate('/meals');
      return;
    }

    try {
      // Send comparison result to new backend endpoint
      const comparisonType = betterMealId === newlyAddedMeal.id ? 'win' :
                            betterMealId === mealToCompareWith.id ? 'lose' : 'tie';

      await authFetch('/rankings/compare', { // NEW: Call recordComparison endpoint
        method: 'POST',
        body: JSON.stringify({
          winnerId: comparisonType === 'win' ? newlyAddedMeal.id : mealToCompareWith.id,
          loserId: comparisonType === 'win' ? mealToCompareWith.id : newlyAddedMeal.id,
          type: comparisonType,
        }),
      });

      alert('Comparison recorded, scores updated!');

    } catch (err: any) {
      console.error('Error during comparison ranking:', err);
      alert('Comparison failed. Check console.');
    } finally {
      navigate('/meals'); // Finally navigate to meals list
    }
  };

  return (
    <div className="card card-md">
      <h2>Add New Meal</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title:</label>
          <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={4}></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="date_made">Date Made:</label>
          <input type="date" id="date_made" name="date_made" value={formData.date_made} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="photo">Upload Photo:</label>
          <input type="file" id="photo" name="photo" accept="image/*" onChange={handlePhotoChange} />
          {photoPreview && (
            <img src={photoPreview} alt="Photo Preview" className="mt-10" style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'cover' }} />
          )}
        </div>
        <div className="form-group">
          <label htmlFor="tags">Tags (comma-separated):</label>
          <input type="text" id="tags" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g., pasta, comfort food" />
        </div>

        <h3 className="mt-30 mb-15">Ingredients</h3>
        {ingredients.map((ingredient, index) => (
          <div key={index} className="ingredient-item">
            <div className="form-group grid-layout grid-cols-3 grid-gap-10">
              <div>
                <label htmlFor={`ingredient-name-${index}`}>Name:</label>
                <input
                  type="text"
                  id={`ingredient-name-${index}`}
                  name="name"
                  value={ingredient.name}
                  onChange={(e) => handleIngredientChange(index, e)}
                  placeholder="e.g., Chicken Breast"
                />
              </div>
              <div>
                <label htmlFor={`ingredient-quantity-${index}`}>Quantity:</label>
                <input
                  type="number"
                  id={`ingredient-quantity-${index}`}
                  name="quantity"
                  value={ingredient.quantity}
                  onChange={(e) => handleIngredientChange(index, e)}
                  placeholder="e.g., 200"
                  step="0.01"
                />
              </div>
              <div>
                <label htmlFor={`ingredient-unit-${index}`}>Unit:</label>
                <input
                  type="text"
                  id={`ingredient-unit-${index}`}
                  name="unit"
                  value={ingredient.unit}
                  onChange={(e) => handleIngredientChange(index, e)}
                  placeholder="g / ml / pcs"
                />
              </div>
            </div>
            {ingredients.length > 1 && (
              <div className="d-flex justify-content-end mt-10">
                <button type="button" onClick={() => handleRemoveIngredient(index)} className="btn btn-danger btn-sm">
                  Remove Ingredient
                </button>
              </div>
            )}
          </div>
        ))}
        <div className="d-flex justify-content-center mt-10">
          <button type="button" onClick={handleAddIngredient} className="btn btn-secondary-muted">
            Add Another Ingredient
          </button>
        </div>

        {error && <p className="text-error mt-15 mb-15">{error}</p>}
        <div className="d-flex justify-content-between mt-20">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Adding...' : 'Add Meal'}
          </button>
          <Link to="/meals" className="btn btn-secondary-muted">
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