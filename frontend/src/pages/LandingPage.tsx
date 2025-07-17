import React from 'react';
import { Link } from 'react-router-dom';

const ChefHatSVG = () => (
  <svg width="110" height="90" viewBox="0 0 110 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 24 }}>
    <ellipse cx="55" cy="60" rx="40" ry="22" fill="#fff" stroke="#6c63ff" strokeWidth="3"/>
    <ellipse cx="35" cy="38" rx="18" ry="16" fill="#fff" stroke="#6c63ff" strokeWidth="3"/>
    <ellipse cx="75" cy="38" rx="18" ry="16" fill="#fff" stroke="#6c63ff" strokeWidth="3"/>
    <ellipse cx="55" cy="28" rx="22" ry="20" fill="#fff" stroke="#6c63ff" strokeWidth="3"/>
    <rect x="35" y="65" width="40" height="15" rx="7" fill="#6c63ff"/>
    <rect x="45" y="75" width="20" height="8" rx="4" fill="#8e88ff"/>
  </svg>
);

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <ChefHatSVG />
      <h1 className="landing-page-title" style={{ fontWeight: 900, fontSize: '3.2em', marginBottom: 10 }}>Cooked</h1>
      <p className="landing-page-subtitle" style={{ fontSize: '1.35em', color: '#6c63ff', marginBottom: 8 }}>
        Your kitchen's story, one meal at a time.
      </p>
      <p className="text-muted mb-30" style={{ fontSize: '1.1em', marginBottom: 32 }}>
        Discover, track, and rank your home-cooked creations.<br />
        <span style={{ color: '#333', fontWeight: 500 }}>Start your delicious journey today!</span>
      </p>
      <div className="d-flex justify-content-center gap-20 mt-40">
        <Link to="/login" className="btn btn-primary btn-lg" style={{ minWidth: 120 }}>Log In</Link>
        <Link to="/register" className="btn btn-outline-primary btn-lg" style={{ minWidth: 120 }}>Sign Up</Link>
      </div>
    </div>
  );
};

export default LandingPage;