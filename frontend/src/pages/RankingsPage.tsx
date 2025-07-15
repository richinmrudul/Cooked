import React, { useState, useEffect } from 'react';
import { useApiClient } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface RankedMeal {
  id: string;
  title: string;
  description?: string;
  date_made: string;
  photo_url?: string;
  overall_rating: number; // Keep this in the interface, just not displaying it
  tags?: string[];
  rank_position: number;
}

const RankingsPage: React.FC = () => {
  const { authFetch } = useApiClient();
  const { user, logout } = useAuth();
  const [rankedMeals, setRankedMeals] = useState<RankedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRankedMeals = async () => {
    try {
      setLoading(true);
      const data = await authFetch('/rankings');
      setRankedMeals(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ranked meals.');
      console.error('Error fetching ranked meals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRankedMeals();
    }
  }, [user, authFetch]);

  const handleDeleteRank = async (mealId: string) => {
    if (!window.confirm('Are you sure you want to remove this meal from your rankings?')) {
      return;
    }
    try {
      await authFetch(`/rankings/${mealId}`, { method: 'DELETE' });
      alert('Meal rank removed successfully!');
      fetchRankedMeals(); // Re-fetch all ranks
    } catch (err: any) {
      setError(err.message || 'Failed to remove meal rank.');
      console.error('Error removing meal rank:', err);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading rankings...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Your Top Meals</h2>
        <div>
          <Link to="/meals" style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px', marginRight: '10px' }}>
            View All Meals
          </Link>
          <button
            onClick={logout}
            style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>

      {rankedMeals.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#555' }}>No meals ranked yet! Add a meal and rate it "Good" or "Okay" to start your rankings.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {rankedMeals.map((meal) => (
            <div key={meal.id} style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <div style={{ flexShrink: 0, width: '40px', height: '40px', backgroundColor: '#007bff', color: 'white', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2em', fontWeight: 'bold', marginRight: '15px' }}>
                {meal.rank_position}
              </div>
              {meal.photo_url && (
                <img src={meal.photo_url} alt={meal.title} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', marginRight: '15px' }} />
              )}
              <div style={{ flexGrow: 1 }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>{meal.title}</h3>
                <p style={{ fontSize: '0.9em', color: '#666', margin: '0' }}>
                  Made: {new Date(meal.date_made).toLocaleDateString()} {/* REMOVED: | Rated: {meal.overall_rating}/5 */}
                </p>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', gap: '10px', marginLeft: '15px' }}>
                <Link to={`/meals/edit/${meal.id}`} style={{ padding: '6px 12px', backgroundColor: '#ffc107', color: '#333', textDecoration: 'none', borderRadius: '4px', fontSize: '0.9em' }}>
                  Edit Meal
                </Link>
                <button
                  onClick={() => handleDeleteRank(meal.id)}
                  style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}
                >
                  Remove Rank
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RankingsPage;