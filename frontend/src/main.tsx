import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { BrowserRouter as Router } from 'react-router-dom'; 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router> {/* Router now wraps everything */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>,
);