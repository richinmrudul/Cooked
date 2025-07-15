import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage'; // Still available but less emphasized
import MealsPage from './pages/MealsPage';
import AddMealPage from './pages/AddMealPage';
import EditMealPage from './pages/EditMealPage';
import RankingsPage from './pages/RankingsPage'; // Import RankingsPage
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading application...</div>;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Root Path: Redirect based on auth status */}
      <Route
        path="/"
        element={user ? <Navigate to="/meals" replace /> : <Navigate to="/login" replace />}
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard" // You can keep this for now or remove if /meals is the new "dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meals"
        element={
          <ProtectedRoute>
            <MealsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meals/new"
        element={
          <ProtectedRoute>
            <AddMealPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meals/edit/:id"
        element={
          <ProtectedRoute>
            <EditMealPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rankings" // Add rankings page route
        element={
          <ProtectedRoute>
            <RankingsPage />
          </ProtectedRoute>
        }
      />
      {/* Fallback route for unmatched paths - useful for 404 */}
      <Route path="*" element={user ? <Navigate to="/meals" replace /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;