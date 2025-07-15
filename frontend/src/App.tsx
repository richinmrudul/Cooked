import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage'; // Import DashboardPage
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import { useAuth } from './context/AuthContext'; // Import useAuth to check auth status

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    // You can render a global loading spinner here if needed
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
        element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      {/* Add other protected routes here later, e.g., /meals/new, /meals/:id/edit */}
    </Routes>
  );
}

export default App;