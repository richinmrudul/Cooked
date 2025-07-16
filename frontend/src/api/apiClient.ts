import { useAuth } from '../context/AuthContext';
import { useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const useApiClient = () => {
  const { token, logout } = useAuth();

  const authFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ) => {
    let headers: Record<string, string> = {};

    //ONLY set Content-Type to application/json IF the body is NOT FormData
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (options.headers) {
        Object.assign(headers, options.headers);
    }

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
  }, [token, logout]);

  return { authFetch };
};