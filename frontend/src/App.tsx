import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MealsPage from './pages/MealsPage';
import AddMealPage from './pages/AddMealPage';
import EditMealPage from './pages/EditMealPage';
import RankingsPage from './pages/RankingsPage';
import LandingPage from './pages/LandingPage';
import ProfilePage from './pages/ProfilePage'; // Import ProfilePage
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

import AppHeader from './components/AppHeader';

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="app-main-content text-center">Loading application...</div>;
  }

  const isAuthenticated = !!user;

  // Show AppHeader if authenticated AND not on LandingPage, Login, or Register
  const showAppHeader = isAuthenticated && !['/', '/login', '/register'].includes(location.pathname);


  return (
    <>
      {showAppHeader && <AppHeader />}

      <div className="app-main-content">
        <Routes>
          {/* Landing Page (Public) */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/meals" replace /> : <LandingPage />} />

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
          <Route
            path="/profile" // New Profile Page route
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={isAuthenticated ? <Navigate to="/meals" replace /> : <Navigate to="/login" replace />} />
        </Routes>
      </div>
    </>
  );
}

export default App;