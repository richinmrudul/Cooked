import React, { useState, useEffect } from 'react';
import { useApiClient } from '../api/apiClient';
import { useNavigate, useParams, Link } from 'react-router-dom';

// FIX: Quantity should be string in form data
interface IngredientFormData {
  id?: string;
  name: string;
  quantity: string; // Changed to string
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
    overall_rating: 3,
    tags: '',
  });
  // Corrected initial state for ingredients
  const [ingredients, setIngredients] = useState<IngredientFormData[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [clearPhoto, setClearPhoto] = useState(false);

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
          overall_rating: data.overall_rating || 3,
          tags: data.tags ? data.tags.join(', ') : '',
        });
        setCurrentPhotoUrl(data.photo_url || null);
        if (data.ingredients && data.ingredients.length > 0) {
            setIngredients(data.ingredients.map((ing: any) => ({
                id: ing.id,
                name: ing.name,
                quantity: String(ing.quantity), // Convert to string for form
                unit: ing.unit || '',
            })));
        } else {
            setIngredients([{ name: '', quantity: '', unit: '' }]); // Initialize with empty ingredient
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setCurrentPhotoUrl(URL.createObjectURL(file));
      setClearPhoto(false);
    } else {
      setPhotoFile(null);
      if (!clearPhoto) {
        setCurrentPhotoUrl(null);
      }
    }
  };

  const handleClearPhoto = () => {
    setPhotoFile(null);
    setCurrentPhotoUrl(null);
    setClearPhoto(true);
    const photoInput = document.getElementById('photo-edit') as HTMLInputElement;
    if (photoInput) photoInput.value = '';
  };

  const handleIngredientChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newIngredients = [...ingredients];
    (newIngredients[index] as any)[name] = value; // value is string
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
    // FIX: Convert quantity to number for backend submission
    formToSend.append('ingredients', JSON.stringify(ingredients.map(ing => ({
      name: ing.name.trim(),
      quantity: Number(ing.quantity) || 0, // Convert to number here
      unit: ing.unit.trim(),
    })).filter(ing => ing.name && Number(ing.quantity) > 0))); // Filter based on numerical quantity

    if (photoFile) {
      formToSend.append('photo', photoFile);
    } else if (clearPhoto) {
      formToSend.append('photo_url_is_null', 'true');
    }

    try {
      await authFetch(`/meals/${id}`, {
        method: 'PUT',
        body: formToSend,
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
    return <div className="app-main-content text-center">Loading meal data...</div>;
  }

  if (error) {
    return <div className="app-main-content text-center text-error">Error: {error}</div>;
  }

  return (
    <div className="card card-md">
      <h2>Edit Meal</h2>
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
        {/* Photo Upload Field for Edit (instead of URL) */}
        <div className="form-group">
          <label htmlFor="photo-edit">Change Photo:</label>
          <input type="file" id="photo-edit" name="photo" accept="image/*" onChange={handlePhotoChange} />
          {(currentPhotoUrl && !clearPhoto) && (
            <div className="d-flex align-items-center gap-10 mt-10">
              <img src={currentPhotoUrl} alt="Current Photo Preview" className="profile-avatar-preview" style={{ width: '80px', height: '80px', borderRadius: '4px', objectFit: 'cover' }} />
              <button type="button" onClick={handleClearPhoto} className="btn btn-danger btn-sm">Clear Photo</button>
            </div>
          )}
          {(!currentPhotoUrl && clearPhoto) && (
            <p className="text-muted mt-10" style={{ fontSize: '0.85em' }}>Photo will be removed on save.</p>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="tags">Tags (comma-separated):</label>
          <input type="text" id="tags" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g., pasta, comfort food" />
        </div>

        <h3 className="mt-30 mb-15">Ingredients</h3>
        {ingredients.length === 0 && !loading && (
          <p className="text-center text-muted mb-15">Click "Add Ingredient" to add your first ingredient.</p>
        )}
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
            {ingredients.length > 0 && (
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
            {loading ? 'Updating...' : 'Update Meal'}
          </button>
          <Link to="/meals" className="btn btn-secondary-muted">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default EditMealPage;