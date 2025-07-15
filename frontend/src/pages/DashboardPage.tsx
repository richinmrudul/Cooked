import React from 'react';
import { useAuth } from '../context/AuthContext';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h2>Welcome to your Dashboard, {user?.name || 'User'}!</h2>
      <p>This is where you'll see your meals and rankings.</p>
      <button
        onClick={logout}
        style={{ padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '20px' }}
      >
        Logout
      </button>
    </div>
  );
};

export default DashboardPage;