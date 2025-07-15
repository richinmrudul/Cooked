import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const RegisterPage: React.FC = () => {
  const [firstName, setFirstName] = useState(''); // New state
  const [lastName, setLastName] = useState('');   // New state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { register, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Pass firstName and lastName to register (AuthContext will need update too)
      await register(firstName, lastName, email, password);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="card card-sm">
      <h2 className="text-center">Create your account</h2> {/* Updated heading */}
      <form onSubmit={handleSubmit}>
        <div className="form-group grid-layout grid-cols-2 grid-gap-10"> {/* Grid for first/last name */}
          <div>
            <label htmlFor="firstName">First Name:</label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="lastName">Last Name:</label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="text-muted mt-10" style={{ fontSize: '0.85em' }}>Password must be at least 6 characters.</p> {/* Hint text */}
        </div>
        {error && <p className="text-error mb-10">{error}</p>}
        <div className="d-flex justify-content-center mt-20">
          <button type="submit" disabled={loading} className="btn btn-primary"> {/* Primary button for register */}
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>
      </form>
      <p className="text-center mt-30">
        Already have an account? <Link to="/login" className="btn btn-outline-primary">Log In</Link> {/* Styled as outline button */}
      </p>
    </div>
  );
};

export default RegisterPage;