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
  overall_rating: number;
  tags?: string[];
  rank_position: number;
  score: number; // Keep score as number in interface
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
      // FIX: Map over the data and parse score to a number
      const parsedData = data.map((meal: any) => ({
          ...meal,
          score: parseFloat(meal.score) // Convert score string to number
      }));
      setRankedMeals(parsedData); // Set the parsed data
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
    return <div className="app-main-content text-center">Loading rankings...</div>;
  }

  if (error) {
    return <div className="app-main-content text-center text-error">Error: {error}</div>;
  }

  return (
    <div className="card card-lg">
      <div className="d-flex justify-content-between align-items-center mb-20">
        <h2 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: 0 }}>Your Top Meals</h2>
        <div className="d-flex gap-10">
          <Link to="/meals" className="btn btn-outline-primary btn-sm" style={{ minWidth: 120 }}>
            View All Meals
          </Link>
          <button onClick={logout} className="btn btn-danger btn-sm" style={{ minWidth: 90 }}>Logout</button>
        </div>
      </div>
      <hr style={{ border: 'none', borderTop: '1.5px solid #ececec', margin: '0 0 28px 0' }} />

      {rankedMeals.length === 0 ? (
        <p className="text-muted text-center p-20">No meals ranked yet! Add a meal and rate it "Good" or "Okay" to start your rankings.</p>
      ) : (
        <div className="d-flex flex-column gap-20">
          {rankedMeals.map((meal) => (
            <div key={meal.id} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(108,99,255,0.07)', padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 24, transition: 'box-shadow 0.18s, transform 0.18s', position: 'relative' }} className="ranked-meal-item">
              <div style={{ minWidth: 60, minHeight: 60, width: 60, height: 60, background: 'linear-gradient(135deg, #6c63ff 70%, #8e88ff 100%)', color: '#fff', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5em', boxShadow: '0 2px 8px rgba(108,99,255,0.13)', marginRight: 12, position: 'relative' }}>
                {meal.rank_position}
              </div>
              {meal.photo_url && (
                <img src={meal.photo_url} alt={meal.title} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12, boxShadow: '0 1px 6px rgba(108,99,255,0.07)', marginRight: 12 }} />
              )}
              <div className="ranked-meal-details" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '1.15em', marginBottom: 2, color: '#2c3e50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meal.title}</div>
                <div style={{ fontSize: '0.98em', color: '#888', marginTop: 2 }}>{meal.date_made ? `Made: ${new Date(meal.date_made).toLocaleDateString()}` : ''}</div>
              </div>
              <div className="ranked-meal-actions d-flex gap-10" style={{ flexDirection: 'column', alignItems: 'flex-end', minWidth: 120 }}>
                <Link to={`/meals/edit/${meal.id}`} className="btn btn-warning btn-sm" style={{ width: 100 }}>Edit Meal</Link>
                <button onClick={() => handleDeleteRank(meal.id)} className="btn btn-danger btn-sm" style={{ width: 100 }}>Remove Rank</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RankingsPage;