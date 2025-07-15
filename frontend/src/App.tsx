import { Routes, Route, Navigate, useLocation } from 'react-router-dom'; // Import useLocation
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MealsPage from './pages/MealsPage';
import AddMealPage from './pages/AddMealPage';
import EditMealPage from './pages/EditMealPage';
import RankingsPage from './pages/RankingsPage';
import LandingPage from './pages/LandingPage'; // Import LandingPage
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Import AppHeader (for authenticated users)
import AppHeader from './components/AppHeader';
// AuthHeader is no longer implicitly rendered here, only its content moved to LandingPage

function App() {
  const { user, loading } = useAuth();
  const location = useLocation(); // Get current location

  if (loading) {
    return <div className="app-main-content text-center">Loading application...</div>;
  }

  const isAuthenticated = !!user;

  // Determine if we should show the AppHeader (only for authenticated, non-root routes)
  const showAppHeader = isAuthenticated && location.pathname !== '/'; // Show AppHeader if authenticated AND not on LandingPage

  return (
    <>
      {showAppHeader && <AppHeader />} {/* Render AppHeader for authenticated pages */}

      <div className="app-main-content">
        <Routes>
          {/* Landing Page (Public) */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/meals" replace /> : <LandingPage />} /> {/* Redirect if logged in */}

          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
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
            path="/rankings"
            element={
              <ProtectedRoute>
                <RankingsPage />
              </ProtectedRoute>
            }
          />
          {/* Fallback route for unmatched paths - redirects to login if not authenticated, else meals */}
          <Route path="*" element={isAuthenticated ? <Navigate to="/meals" replace /> : <Navigate to="/login" replace />} />
        </Routes>
      </div>
    </>
  );
}

export default App;