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
    overall_rating: 3,
    tags: '',
  });
  const [ingredients, setIngredients] = useState<IngredientFormData[]>([
    { name: '', quantity: '', unit: '' }
  ]);
  const [photoFile, setPhotoFile] = useState<File | null>(null); // NEW: State for the selected file
  const [photoPreview, setPhotoPreview] = useState<string | null>(null); // NEW: State for image preview

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
      const currentMealData = await authFetch(`/meals/${newlyAddedMeal.id}`);

      const formToUpdate = new FormData();
      formToUpdate.append('title', currentMealData.title);
      formToUpdate.append('description', currentMealData.description);
      formToUpdate.append('date_made', currentMealData.date_made);
      formToUpdate.append('overall_rating', String(rating));
      formToUpdate.append('tags', JSON.stringify(currentMealData.tags || []));
      formToUpdate.append('ingredients', JSON.stringify(currentMealData.ingredients || []));

      if (currentMealData.photo_url) {
        // Re-fetch the file if it exists and no new one is uploaded for PUT operation.
        // This is complex for FormData. Simplest is to assume backend keeps current if no new file sent.
      }


      await authFetch(`/meals/${newlyAddedMeal.id}`, {
        method: 'PUT',
        body: formToUpdate,
      });

      // ELO/comparison logic
      if (rating === 5 || rating === 3) {
        const allMeals = await authFetch('/meals');
        const comparableMeals = allMeals.filter(
          (m: MealForComparison) =>
            m.id !== newlyAddedMeal.id && (m.overall_rating === 5 || m.overall_rating === 3)
        );

        if (comparableMeals.length > 0) {
          const randomIndex = Math.floor(Math.random() * comparableMeals.length);
          setMealToCompareWith(comparableMeals[randomIndex]);
          setIsComparisonModalOpen(true);
          return;
        }
      }

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
      const comparisonType = betterMealId === newlyAddedMeal.id ? 'win' :
                            betterMealId === mealToCompareWith.id ? 'lose' : 'tie';

      await authFetch('/rankings/compare', {
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
      navigate('/meals');
    }
  };

  return (
    <div className="app-main-content d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="card card-md" style={{ boxShadow: '0 8px 32px rgba(108,99,255,0.10)', borderRadius: 20, padding: 40, maxWidth: 540 }}>
        <h2 className="text-center mb-20" style={{ fontWeight: 800, fontSize: '2.1rem' }}>Add New Meal</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title:</label>
            <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required className="mb-10" style={{ fontSize: '1.1em', borderRadius: 10, padding: '14px 18px' }} />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={4} className="mb-10" style={{ fontSize: '1.1em', borderRadius: 10, padding: '14px 18px' }}></textarea>
          </div>
          <div className="form-group">
            <label htmlFor="date_made">Date Made:</label>
            <input type="date" id="date_made" name="date_made" value={formData.date_made} onChange={handleChange} required className="mb-10" style={{ fontSize: '1.1em', borderRadius: 10, padding: '14px 18px' }} />
          </div>
          <div className="form-group">
            <label htmlFor="photo">Upload Photo:</label>
            <input type="file" id="photo" name="photo" accept="image/*" onChange={handlePhotoChange} />
            {photoPreview && (
              <div className="d-flex justify-content-center mt-10">
                <img src={photoPreview} alt="Photo Preview" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 16, boxShadow: '0 2px 12px rgba(108,99,255,0.10)', border: '2px solid #e0e0e0', objectFit: 'cover' }} />
              </div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="tags">Tags (comma-separated):</label>
            <input type="text" id="tags" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g., pasta, comfort food" className="mb-10" style={{ fontSize: '1.1em', borderRadius: 10, padding: '14px 18px' }} />
          </div>

          <hr className="mb-20 mt-30" style={{ border: 'none', borderTop: '1.5px solid #ececec' }} />

          <h3 className="text-center mb-15" style={{ fontWeight: 700, fontSize: '1.3rem', letterSpacing: 0.5 }}>Ingredients</h3>
          <div style={{ background: '#f8f9fa', borderRadius: 14, padding: 18, marginBottom: 24, boxShadow: '0 1px 6px rgba(108,99,255,0.04)' }}>
            {ingredients.map((ingredient, index) => (
              <div key={index} className="ingredient-item mb-10" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 120, maxWidth: 220 }}>
                  <label htmlFor={`ingredient-name-${index}`}>Name:</label>
                  <input
                    type="text"
                    id={`ingredient-name-${index}`}
                    name="name"
                    value={ingredient.name}
                    onChange={(e) => handleIngredientChange(index, e)}
                    placeholder="e.g., Chicken Breast"
                    style={{ borderRadius: 8, padding: '10px 14px', width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 100, maxWidth: 140 }}>
                  <label htmlFor={`ingredient-quantity-${index}`}>Quantity:</label>
                  <input
                    type="number"
                    id={`ingredient-quantity-${index}`}
                    name="quantity"
                    value={ingredient.quantity}
                    onChange={(e) => handleIngredientChange(index, e)}
                    placeholder="e.g., 200"
                    style={{ borderRadius: 8, padding: '10px 14px', width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 80, maxWidth: 120 }}>
                  <label htmlFor={`ingredient-unit-${index}`}>Unit:</label>
                  <input
                    type="text"
                    id={`ingredient-unit-${index}`}
                    name="unit"
                    value={ingredient.unit}
                    onChange={(e) => handleIngredientChange(index, e)}
                    placeholder="g / ml / pcs"
                    style={{ borderRadius: 8, padding: '10px 14px', width: '100%' }}
                  />
                </div>
                {ingredients.length > 1 && (
                  <button type="button" className="btn btn-danger btn-sm" style={{ height: 38, marginBottom: 2 }} onClick={() => handleRemoveIngredient(index)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            <div className="d-flex justify-content-center mt-10">
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleAddIngredient}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="8.5" stroke="#6c63ff"/><path d="M9 5V13" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round"/><path d="M5 9H13" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round"/></svg>
                  Add Ingredient
                </span>
              </button>
            </div>
          </div>

          {error && <p className="text-error mb-10 text-center">{error}</p>}
          <div className="d-flex justify-content-center gap-20 mt-20">
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ minWidth: 150, fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="10" stroke="#fff" strokeWidth="2"/><path d="M11 6V16" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/><path d="M6 11H16" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
              {loading ? 'Adding...' : 'Add Meal'}
            </button>
            <Link to="/meals" className="btn btn-secondary-muted btn-lg" style={{ minWidth: 120 }}>Cancel</Link>
          </div>
        </form>
        {newlyAddedMeal && (
          <RatingModal
            isOpen={isRatingModalOpen}
            onClose={() => setIsRatingModalOpen(false)}
            onRate={handleModalRating}
            mealTitle={newlyAddedMeal.title}
          />
        )}
        {newlyAddedMeal && mealToCompareWith && (
          <ComparisonModal
            isOpen={isComparisonModalOpen}
            onClose={() => setIsComparisonModalOpen(false)}
            onCompare={handleComparisonResult}
            newMeal={newlyAddedMeal}
            comparedMeal={mealToCompareWith}
          />
        )}
      </div>
    </div>
  );
};

export default AddMealPage;