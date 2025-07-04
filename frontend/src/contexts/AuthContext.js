import React, { createContext, useContext, useState, useEffect } from 'react';
import { userAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('authToken');
    console.log('Checking auth status, token:', token ? 'exists' : 'none');
    if (token) {
      try {
        const response = await userAPI.getProfile();
        console.log('Auth check successful:', response.data);
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  };

  const login = async (credentials) => {
    try {
      const response = await userAPI.login(credentials);
      const { access_token } = response.data;
      
      localStorage.setItem('authToken', access_token);
      
      // Get user profile
      const profileResponse = await userAPI.getProfile();
      setUser(profileResponse.data);
      setIsAuthenticated(true);
      
      toast.success('Login successful!');
      return true;
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const response = await userAPI.register(userData);
      setUser(response.data);
      setIsAuthenticated(true);
      
      toast.success('Registration successful!');
      return true;
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      toast.error(message);
      return false;
    }
  };

  const logout = () => {
    userAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 