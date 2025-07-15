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
  overall_rating: number; // Keep this in the interface, just not displaying it
  tags?: string[];
  created_at: string;
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
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading meals...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '50px auto', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Your Cooked Meals</h2>
        <div>
          <Link to="/meals/new" style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '4px', marginRight: '10px' }}>
            Add New Meal
          </Link>
          <Link to="/rankings" style={{ padding: '8px 15px', backgroundColor: '#6f42c1', color: 'white', textDecoration: 'none', borderRadius: '4px', marginRight: '10px' }}>
            View Rankings
          </Link>
          <button
            onClick={logout}
            style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>

      {meals.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#555' }}>No meals cooked yet! Add your first meal.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {meals.map((meal) => (
            <div key={meal.id} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              {meal.photo_url && (
                <img src={meal.photo_url} alt={meal.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
              )}
              <div style={{ padding: '15px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{meal.title}</h3>
                <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                  Date: {new Date(meal.date_made).toLocaleDateString()} {/* Removed Rating display here */}
                </p>
                {meal.description && <p style={{ fontSize: '0.9em', color: '#777', marginBottom: '10px' }}>{meal.description}</p>}
                {meal.tags && meal.tags.length > 0 && (
                  <p style={{ fontSize: '0.8em', color: '#888', fontStyle: 'italic' }}>Tags: {meal.tags.join(', ')}</p>
                )}
                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <Link to={`/meals/edit/${meal.id}`} style={{ padding: '6px 12px', backgroundColor: '#ffc107', color: '#333', textDecoration: 'none', borderRadius: '4px', fontSize: '0.9em' }}>
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(meal.id)}
                    style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}
                  >
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