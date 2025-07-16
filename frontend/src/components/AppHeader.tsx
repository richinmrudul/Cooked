import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AppHeader: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="app-header d-flex justify-content-between align-items-center">
      <div className="app-header-left">
        <h1 className="app-title">
          <Link to="/meals" className="app-title-link">Cooked</Link>
        </h1>
        {user && (
          <span className="app-welcome-text">Welcome, {user.firstName}!</span>
        )}
      </div>
      <nav className="app-nav">
        <Link to="/meals" className="btn btn-secondary-muted mr-10">All Meals</Link>
        <Link to="/rankings" className="btn btn-secondary-muted mr-10">Rankings</Link>
        <Link to="/profile" className="btn btn-secondary-muted mr-10">Profile</Link> {/* NEW: Profile Link */}
        <button onClick={logout} className="btn btn-danger">Logout</button>
      </nav>
    </header>
  );
};

export default AppHeader;