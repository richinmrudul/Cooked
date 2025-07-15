import { useAuth } from '../context/AuthContext';
import { useCallback } from 'react'; // Import useCallback

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const useApiClient = () => {
  const { token, logout } = useAuth();

  const authFetch = useCallback(async ( // Wrap authFetch with useCallback
    url: string,
    options: RequestInit = {}
  ) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      logout();
      throw new Error('Session expired or invalid. Please log in again.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'An API error occurred.');
    }

    return data;
  }, [token, logout]); // Dependencies for useCallback

  return { authFetch };
};