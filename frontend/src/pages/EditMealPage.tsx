import React, { useState, useEffect } from 'react';
import { useApiClient } from '../api/apiClient';
import { useNavigate, useParams, Link } from 'react-router-dom';

// Updated Ingredient type definition - Removed macro fields
interface IngredientFormData {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
}

const EditMealPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { authFetch } = useApiClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date_made: '',
    photo_url: '',
    overall_rating: 3, // Still in state for consistency, but not editable directly
    tags: '',
  });
  const [ingredients, setIngredients] = useState<IngredientFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeal = async () => {
      if (!id) {
        setError('Meal ID is missing.');
        setLoading(false);
        return;
      }
      try {
        const data = await authFetch(`/meals/${id}`);
        setFormData({
          title: data.title || '',
          description: data.description || '',
          date_made: data.date_made ? new Date(data.date_made).toISOString().split('T')[0] : '',
          photo_url: data.photo_url || '',
          overall_rating: data.overall_rating || 3,
          tags: data.tags ? data.tags.join(', ') : '',
        });
        if (data.ingredients && data.ingredients.length > 0) {
            setIngredients(data.ingredients.map((ing: any) => ({
                id: ing.id,
                name: ing.name,
                quantity: String(ing.quantity),
                unit: ing.unit || '',
                // Macro fields are no longer collected by frontend, but will be preserved by backend if existed
            })));
        } else {
            setIngredients([{ name: '', quantity: '', unit: '' }]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch meal for editing.');
        console.error('Error fetching meal for edit:', err);
        navigate('/meals');
      } finally {
        setLoading(false);
      }
    };

    fetchMeal();
  }, [id, authFetch, navigate]);

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
      overall_rating: Number(formData.overall_rating), // This value will be sent back, but not from an input
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      // Only send name, quantity, unit for ingredients
      ingredients: ingredients.map(ing => ({
        name: ing.name.trim(),
        quantity: Number(ing.quantity) || 0,
        unit: ing.unit.trim(),
        // Macro fields are no longer collected by frontend, so they are omitted here.
        // Backend will default them to null if not provided, or keep existing if they were there via the UPDATE query's ON CONFLICT.
      })).filter(ing => ing.name && ing.quantity > 0)
    };

    try {
      await authFetch(`/meals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(mealData),
      });
      alert('Meal updated successfully!');
      navigate('/meals');
    } catch (err: any) {
      setError(err.message || 'Failed to update meal.');
      console.error('Error updating meal:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading meal data...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Edit Meal</h2>
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
        {/* REMOVED: Overall Rating input field */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Tags (comma-separated):</label>
          <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g., pasta, comfort food" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>

        <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Ingredients</h3>
        {ingredients.length === 0 && !loading && (
          <p style={{ textAlign: 'center', color: '#777', marginBottom: '15px' }}>Click "Add Ingredient" to add your first ingredient.</p>
        )}
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
            {/* REMOVED: Calories, Protein, Carbs, Fat fields */}
            {ingredients.length > 0 && (
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
            {loading ? 'Updating...' : 'Update Meal'}
          </button>
          <Link to="/meals" style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default EditMealPage;