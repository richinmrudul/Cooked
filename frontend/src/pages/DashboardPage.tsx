import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom'; // Import Link for navigation to other pages

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="card card-md"> {/* Applied card and card-md classes */}
      <h2 className="mb-20">Welcome to your Dashboard, {user?.firstName || 'User'}!</h2> {/* Use firstName */}
      <p className="text-center text-muted mb-30">This is where you'll see your meals and rankings.</p> {/* Applied styling */}

      <div className="d-flex flex-column align-items-center gap-15"> {/* Flex container for buttons */}
        <Link to="/meals" className="btn btn-primary"> {/* Styled Link as button */}
          View All Meals
        </Link>
        <Link to="/rankings" className="btn btn-info"> {/* Styled Link as button */}
          View Rankings
        </Link>
        <button
          onClick={logout}
          className="btn btn-danger mt-20" /* Styled button */
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default DashboardPage;