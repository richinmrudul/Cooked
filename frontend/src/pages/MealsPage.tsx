import React, { useState, useEffect } from 'react';
import { useApiClient } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface Meal {
  id: string;
  title: string;
  description?: string;
  date_made: string;
  photo_url?: string;
  overall_rating: number;
  tags?: string[];
  created_at: string;
  ingredients?: Array<{
    name: string;
    quantity: number;
    unit?: string;
  }>;
}

const MealsPage: React.FC = () => {
  const { authFetch } = useApiClient();
  const { user, logout } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        setLoading(true);
        const data = await authFetch('/meals');
        setMeals(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch meals.');
        console.error('Error fetching meals:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchMeals();
    }
  }, [user, authFetch]);

  const handleDelete = async (mealId: string) => {
    if (!window.confirm('Are you sure you want to delete this meal?')) {
      return;
    }
    try {
      await authFetch(`/meals/${mealId}`, { method: 'DELETE' });
      setMeals(meals.filter(meal => meal.id !== mealId));
      alert('Meal deleted successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to delete meal.');
      console.error('Error deleting meal:', err);
    }
  };

  if (loading) {
    return <div className="app-main-content text-center">Loading meals...</div>;
  }

  if (error) {
    return <div className="app-main-content text-center text-error">Error: {error}</div>;
  }

  return (
    <div className="card card-lg">
      <div className="d-flex justify-content-between align-items-center mb-20">
        <h2>Your Cooked Meals</h2>
        <div className="d-flex gap-10">
          <Link to="/meals/new" className="btn btn-success">
            Add New Meal
          </Link>
          <Link to="/rankings" className="btn btn-info">
            View Rankings
          </Link>
          <button onClick={logout} className="btn btn-danger">
            Logout
          </button>
        </div>
      </div>

      {meals.length === 0 ? (
        <p className="text-center text-muted p-20">{/* Corrected comment syntax */}No meals cooked yet! Add your first meal.</p>
      ) : (
        <div className="grid-layout grid-cols-2 grid-gap-20"> {/* Changed to grid-cols-2 for consistent 2-column layout */}
          {meals.map((meal) => (
            <div key={meal.id} className="meal-card">
              {meal.photo_url && (
                <img src={meal.photo_url} alt={meal.title} className="meal-card-image" />
              )}
              <div className="meal-card-content">
                <h3 className="meal-card-title">{meal.title}</h3>
                <p className="meal-card-date">
                  Made: {new Date(meal.date_made).toLocaleDateString()}
                </p>
                {meal.description && <p className="meal-card-description">{meal.description}</p>}
                {meal.tags && meal.tags.length > 0 && (
                  <p className="meal-card-tags text-italic">Tags: {meal.tags.join(', ')}</p>
                )}
                {meal.ingredients && meal.ingredients.length > 0 && (
                    <div className="meal-card-ingredients mt-10">
                        <h4 style={{fontSize: '1em', marginBottom: '5px', color: 'var(--color-text)'}}>Ingredients:</h4>
                        <ul style={{listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9em', color: 'var(--color-secondary-text)'}}>
                            {meal.ingredients.map((ing, i) => (
                                <li key={i}>{ing.quantity} {ing.unit} {ing.name}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="meal-card-actions">
                  <Link to={`/meals/edit/${meal.id}`} className="btn btn-warning btn-sm">
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(meal.id)}
                    className="btn btn-danger btn-sm">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MealsPage;