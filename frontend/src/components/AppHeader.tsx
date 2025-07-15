import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth to get logout

const AppHeader: React.FC = () => {
  const { user, logout } = useAuth(); // Get user and logout from context

  return (
    <header className="app-header d-flex justify-content-between align-items-center">
      <div className="app-header-left">
        <h1 className="app-title">
          <Link to="/meals" className="app-title-link">Cooked</Link> {/* Link to meals page */}
        </h1>
        {user && (
          <span className="app-welcome-text">Welcome, {user.firstName}!</span>
        )}
      </div>
      <nav className="app-nav">
        <Link to="/meals" className="btn btn-secondary-muted mr-10">All Meals</Link>
        <Link to="/rankings" className="btn btn-secondary-muted mr-10">Rankings</Link>
        <button onClick={logout} className="btn btn-danger">Logout</button>
      </nav>
    </header>
  );
};

export default AppHeader;