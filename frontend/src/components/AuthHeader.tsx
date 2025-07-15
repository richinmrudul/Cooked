import React from 'react';
import { Link } from 'react-router-dom'; 

const AuthHeader: React.FC = () => {
  return (
    <header className="auth-header">
      <h1 className="auth-header-title">
        <Link to="/" className="auth-header-link">Cooked</Link> {/* Link to root for the title */}
      </h1>
      <p className="auth-header-subtitle">Your culinary journey starts here</p>
    </header>
  );
};

export default AuthHeader;