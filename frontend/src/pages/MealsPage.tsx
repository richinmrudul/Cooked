import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
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

  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);

  // State to control filter section visibility
  const [showFilters, setShowFilters] = useState(false);

  // Memoize fetchMeals to avoid unnecessary re-creations and issues with useEffect dependencies
  const fetchMeals = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedTag) params.append('tag', selectedTag);
      if (minRating) params.append('minRating', minRating);
      if (maxRating) params.append('maxRating', maxRating);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const queryString = params.toString();
      const url = queryString ? `/meals?${queryString}` : '/meals';

      const data = await authFetch(url);
      setMeals(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch meals.');
      console.error('Error fetching meals:', err);
    } finally {
      setLoading(false);
    }
  }, [user, authFetch, searchQuery, selectedTag, minRating, maxRating, startDate, endDate]); // Dependencies are still needed for fetchMeals itself


  // Fetch all unique tags for filter dropdown (runs once on user login)
  useEffect(() => {
    const fetchAllTags = async () => {
      try {
        // This fetch should get ALL meals to correctly populate filter options, not filtered ones
        const data = await authFetch('/meals');
        const tagsSet = new Set<string>();
        data.forEach((meal: Meal) => {
          meal.tags?.forEach(tag => tagsSet.add(tag));
        });
        setAllTags(Array.from(tagsSet).sort());
      } catch (err) {
        console.error('Error fetching all tags:', err);
      }
    };
    if (user) {
      fetchAllTags();
      fetchMeals(); // Initial fetch of meals when page loads or user logs in
    }
  }, [user, authFetch]); // ONLY run this effect when user or authFetch changes


  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTag('');
    setMinRating('');
    setMaxRating('');
    setStartDate('');
    setEndDate('');
    setShowFilters(false);
    // Do not call fetchMeals here. The effect above handles initial load.
    // It will be re-triggered by the 'Search' button click which calls fetchMeals.
  };

  const handleDelete = async (mealId: string) => {
    if (!window.confirm('Are you sure you want to delete this meal?')) {
      return;
    }
    try {
      await authFetch(`/meals/${mealId}`, { method: 'DELETE' });
      fetchMeals();
      alert('Meal deleted successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to delete meal.');
      console.error('Error deleting meal:', err);
    }
  };


  if (loading) {
    return <div className="app-main-content text-center">Loading meals...</div>;
  }

  // No error will be applied to meal-card
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

      <div className="filter-controls card mb-30 p-20">
        <div className="form-group mb-0">
          <label htmlFor="search-query" className="sr-only">Search by Title or Description:</label>
          <input
            type="text"
            id="search-query"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meals..."
            className="mb-10"
          />
        </div>
        <div className="d-flex justify-content-end gap-10">
            <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary-muted btn-sm">
                {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button onClick={fetchMeals} className="btn btn-primary btn-sm">Search</button> {/* This button now explicitly triggers fetchMeals */}
        </div>

        {showFilters && (
            <div className="d-flex flex-wrap gap-15 mt-20">
                <div className="form-group flex-grow-1">
                    <label htmlFor="tag-filter">Filter by Tag:</label>
                    <select id="tag-filter" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
                    <option value="">All Tags</option>
                    {allTags.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                    ))}
                    </select>
                </div>

                <div className="form-group flex-grow-1">
                    <label htmlFor="min-rating">Min Rating (1-5):</label>
                    <input type="number" id="min-rating" value={minRating} onChange={(e) => setMinRating(e.target.value)} min="1" max="5" placeholder="1"/>
                </div>
                <div className="form-group flex-grow-1">
                    <label htmlFor="max-rating">Max Rating (1-5):</label>
                    <input type="number" id="max-rating" value={maxRating} onChange={(e) => setMaxRating(e.target.value)} min="1" max="5" placeholder="5"/>
                </div>

                <div className="form-group flex-grow-1">
                    <label htmlFor="start-date">Start Date:</label>
                    <input type="date" id="start-date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="form-group flex-grow-1">
                    <label htmlFor="end-date">End Date:</label>
                    <input type="date" id="end-date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="d-flex justify-content-end mt-10 w-100">
                    <button onClick={handleClearFilters} className="btn btn-secondary-muted btn-sm">Clear Filters</button>
                </div>
            </div>
        )}
      </div>

      {meals.length === 0 ? (
        <p className="text-center text-muted p-20">No meals found matching your criteria. Try adjusting filters.</p>
      ) : (
        <div className="grid-layout grid-cols-2 grid-gap-20">
          {meals.map((meal) => (
            <div key={meal.id} className="meal-card"> {/* This div should not be red unless explicitly given a class */}
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