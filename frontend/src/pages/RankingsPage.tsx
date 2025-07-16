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
        <h2>Your Top Meals</h2>
        <div className="d-flex gap-10">
          <Link to="/meals" className="btn btn-secondary-muted">
            View All Meals
          </Link>
          <button onClick={logout} className="btn btn-danger">Logout</button>
        </div>
      </div>

      {rankedMeals.length === 0 ? (
        <p className="text-muted text-center p-20">No meals ranked yet! Add a meal and rate it "Good" or "Okay" to start your rankings.</p>
      ) : (
        <div className="d-flex flex-column gap-15">
          {rankedMeals.map((meal) => (
            <div key={meal.id} className="ranked-meal-item">
              <div className="rank-indicator">
                {meal.rank_position}
                <span className="ranked-meal-score-display">{meal.score.toFixed(0)}</span>
              </div>
              {meal.photo_url && (
                <img src={meal.photo_url} alt={meal.title} className="ranked-meal-image" />
              )}
              <div className="ranked-meal-details">
                <h3 className="ranked-meal-title">{meal.title}</h3>
                <p className="ranked-meal-date">Made: {new Date(meal.date_made).toLocaleDateString()}</p>
              </div>
              <div className="ranked-meal-actions">
                <Link to={`/meals/edit/${meal.id}`} className="btn btn-warning btn-sm">Edit Meal</Link>
                <button onClick={() => handleDeleteRank(meal.id)} className="btn btn-danger btn-sm">Remove Rank</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RankingsPage;