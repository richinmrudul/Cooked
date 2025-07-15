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
}

const RankingsPage: React.FC = () => {
  const { authFetch } = useApiClient();
  const { user, logout } = useAuth();
  const [rankedMeals, setRankedMeals] = useState<RankedMeal[]>([]);
  const [allMeals, setAllMeals] = useState<RankedMeal[]>([]); // To populate dropdown for adding new ranks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for new ranking
  const [selectedMealToRank, setSelectedMealToRank] = useState<string>('');
  const [newRankPosition, setNewRankPosition] = useState<number>(1);
  const [submittingRank, setSubmittingRank] = useState(false);

  const fetchRankedMeals = async () => {
    try {
      setLoading(true);
      const data = await authFetch('/rankings');
      setRankedMeals(data);
      // Also fetch all meals to populate the dropdown for setting new ranks
      const allMealsData = await authFetch('/meals');
      setAllMeals(allMealsData.filter((meal: RankedMeal) => !data.some((ranked: RankedMeal) => ranked.id === meal.id))); // Filter out already ranked meals
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

  const handleSetRank = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmittingRank(true);
    if (!selectedMealToRank || !newRankPosition) {
      setError('Please select a meal and a rank position.');
      setSubmittingRank(false);
      return;
    }

    try {
      await authFetch('/rankings', {
        method: 'POST',
        body: JSON.stringify({ mealId: selectedMealToRank, rankPosition: newRankPosition }),
      });
      alert('Meal ranked successfully!');
      setSelectedMealToRank('');
      setNewRankPosition(1);
      fetchRankedMeals(); // Re-fetch all ranks and meals
    } catch (err: any) {
      setError(err.message || 'Failed to set meal rank.');
      console.error('Error setting meal rank:', err);
    } finally {
      setSubmittingRank(false);
    }
  };

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
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '50px auto', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Your Top 10 Meals</h2>
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

      <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Set/Update a Meal's Rank</h3>
      <form onSubmit={handleSetRank} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '30px', border: '1px dashed #eee', padding: '15px', borderRadius: '8px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Select Meal:</label>
          <select
            value={selectedMealToRank}
            onChange={(e) => setSelectedMealToRank(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          >
            <option value="">-- Select a meal --</option>
            {allMeals.map(meal => (
              <option key={meal.id} value={meal.id}>{meal.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Rank Position (1-10):</label>
          <input
            type="number"
            value={newRankPosition}
            onChange={(e) => setNewRankPosition(Number(e.target.value))}
            min="1"
            max="10"
            required
            style={{ width: '80px', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <button type="submit" disabled={submittingRank} style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {submittingRank ? 'Setting...' : 'Set Rank'}
        </button>
      </form>

      {rankedMeals.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#555' }}>No meals ranked yet! Set your favorite meals to appear here.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {rankedMeals.map((meal) => (
            <div key={meal.id} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              {meal.photo_url && (
                <img src={meal.photo_url} alt={meal.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
              )}
              <div style={{ padding: '15px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Rank #{meal.rank_position}: {meal.title}</h3>
                <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                  Date: {new Date(meal.date_made).toLocaleDateString()} | Rating: {meal.overall_rating}/5
                </p>
                {meal.description && <p style={{ fontSize: '0.9em', color: '#777', marginBottom: '10px' }}>{meal.description}</p>}
                {meal.tags && meal.tags.length > 0 && (
                  <p style={{ fontSize: '0.8em', color: '#888', fontStyle: 'italic' }}>Tags: {meal.tags.join(', ')}</p>
                )}
                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RankingsPage;