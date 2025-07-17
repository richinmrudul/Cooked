import React, { useState, useEffect, useCallback } from 'react';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);

  const [showFilters, setShowFilters] = useState(false);


  const fetchAllTags = useCallback(async () => {
      try {
        const data = await authFetch('/meals');
        const tagsSet = new Set<string>();
        data.forEach((meal: Meal) => {
          meal.tags?.forEach(tag => tagsSet.add(tag));
        });
        setAllTags(Array.from(tagsSet).sort());
      } catch (err) {
        console.error('Error fetching all tags:', err);
      }
  }, [authFetch]);

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
  }, [authFetch, searchQuery, selectedTag, minRating, maxRating, startDate, endDate]);


  useEffect(() => {
    if (user) {
      fetchAllTags();
      fetchMeals();
    }
  }, [user, fetchAllTags, fetchMeals]);


  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTag('');
    setMinRating('');
    setMaxRating('');
    setStartDate('');
    setEndDate('');
    setShowFilters(false);
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

  if (error) {
    return <div className="app-main-content text-center text-error">Error: {error}</div>;
  }

  return (
    <div className="card card-lg">
      <div className="d-flex justify-content-between align-items-center mb-20">
        <h2 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: 0 }}>Your Cooked Meals</h2>
        <Link to="/meals/new" className="btn btn-primary btn-lg" style={{ minWidth: 160, fontWeight: 600 }}>
          + Add New Meal
        </Link>
      </div>
      <hr style={{ border: 'none', borderTop: '1.5px solid #ececec', margin: '0 0 28px 0' }} />

      <div className="filter-controls card mb-30 p-20" style={{ boxShadow: '0 1px 6px rgba(108,99,255,0.04)', borderRadius: 14, background: '#fafbfc', maxWidth: 700, margin: '0 auto 32px auto' }}>
        <div className="d-flex gap-10 align-items-center mb-10" style={{ flexWrap: 'wrap' }}>
          <input
            type="text"
            id="search-query"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meals..."
            className="mb-0"
            style={{ flex: 1, minWidth: 180, borderRadius: 8, padding: '12px 16px', fontSize: '1em' }}
          />
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary-muted btn-sm" style={{ minWidth: 110 }}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <button onClick={fetchMeals} className="btn btn-primary btn-sm" style={{ minWidth: 90 }}>Search</button>
        </div>
        {showFilters && (
          <div className="d-flex flex-wrap gap-15 mt-10">
            <div className="form-group flex-grow-1">
              <label htmlFor="tag-filter">Filter by Tag:</label>
              <select id="tag-filter" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} style={{ borderRadius: 8, padding: '10px 14px' }}>
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            <div className="form-group flex-grow-1">
              <label htmlFor="min-rating">Min Rating (1-5):</label>
              <input type="number" id="min-rating" value={minRating} onChange={(e) => setMinRating(e.target.value)} min="1" max="5" placeholder="1" style={{ borderRadius: 8, padding: '10px 14px' }} />
            </div>
            <div className="form-group flex-grow-1">
              <label htmlFor="max-rating">Max Rating (1-5):</label>
              <input type="number" id="max-rating" value={maxRating} onChange={(e) => setMaxRating(e.target.value)} min="1" max="5" placeholder="5" style={{ borderRadius: 8, padding: '10px 14px' }} />
            </div>
            <div className="form-group flex-grow-1">
              <label htmlFor="start-date">Start Date:</label>
              <input type="date" id="start-date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ borderRadius: 8, padding: '10px 14px' }} />
            </div>
            <div className="form-group flex-grow-1">
              <label htmlFor="end-date">End Date:</label>
              <input type="date" id="end-date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ borderRadius: 8, padding: '10px 14px' }} />
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
        <div className="grid-layout grid-cols-2 grid-gap-30" style={{ marginTop: 10 }}>
          {meals.map((meal) => (
            <div key={meal.id} className="meal-card" style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(108,99,255,0.07)', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 220, position: 'relative' }}>
              {meal.photo_url && (
                <img src={meal.photo_url} alt={meal.title} className="meal-card-image" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12, boxShadow: '0 1px 6px rgba(108,99,255,0.07)', alignSelf: 'center', marginBottom: 8 }} />
              )}
              <div className="meal-card-content" style={{ flex: 1 }}>
                <div className="meal-card-title" style={{ fontWeight: 700, fontSize: '1.15em', color: '#2c3e50', marginBottom: 2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meal.title}</div>
                <div className="meal-card-date" style={{ fontSize: '0.98em', color: '#888', marginBottom: 6, textAlign: 'center' }}>Made: {new Date(meal.date_made).toLocaleDateString()}</div>
                {meal.description && <div className="meal-card-description" style={{ color: '#7f8c8d', fontSize: '1em', marginBottom: 6, textAlign: 'center' }}>{meal.description}</div>}
                {meal.tags && meal.tags.length > 0 && (
                  <div className="meal-card-tags text-italic" style={{ color: '#b0b0b0', fontSize: '0.95em', marginBottom: 6, textAlign: 'center' }}>Tags: {meal.tags.join(', ')}</div>
                )}
                {meal.ingredients && meal.ingredients.length > 0 && (
                  <div className="meal-card-ingredients mt-10" style={{ textAlign: 'center' }}>
                    <div style={{fontSize: '1em', marginBottom: '5px', color: '#2c3e50', fontWeight: 600}}>Ingredients:</div>
                    <ul style={{listStyle: 'none', padding: 0, margin: 0, fontSize: '0.95em', color: '#888', display: 'inline-block', textAlign: 'left'}}>
                      {meal.ingredients.map((ing, i) => (
                        <li key={i}>{ing.quantity} {ing.unit} {ing.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="meal-card-actions d-flex gap-10 justify-content-center mt-10" style={{ marginTop: 'auto' }}>
                <Link to={`/meals/edit/${meal.id}`} className="btn btn-warning btn-sm" style={{ minWidth: 80 }}>Edit</Link>
                <button
                  onClick={() => handleDelete(meal.id)}
                  className="btn btn-danger btn-sm"
                  style={{ minWidth: 80 }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MealsPage;