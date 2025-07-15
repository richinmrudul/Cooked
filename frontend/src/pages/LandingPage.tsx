import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page-container">
      <h1 className="landing-page-title">Cooked</h1>
      <p className="landing-page-subtitle">Your kitchen's story, one meal at a time.</p>
      <div className="d-flex justify-content-center gap-20 mt-40"> {/* Flex for buttons */}
        <Link to="/login" className="btn btn-primary btn-lg">Log In</Link> {/* Larger buttons */}
        <Link to="/register" className="btn btn-outline-primary btn-lg">Sign Up</Link>
      </div>
    </div>
  );
};

export default LandingPage;