import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Stock-related API functions
export const stockAPI = {
  // Get stock quote
  getQuote: (symbol) => api.get(`/api/stocks/${symbol}/quote`),
  
  // Get stock historical data
  getHistory: (symbol, period = '1d', interval = '1m') => 
    api.get(`/api/stocks/${symbol}/history`, {
      params: { period, interval }
    }),
  
  // Get stock info
  getInfo: (symbol) => api.get(`/api/stocks/${symbol}/info`),
  
  // Search stocks
  search: (query) => api.get('/api/stocks/search', { params: { q: query } }),
  
  // Get trending stocks
  getTrending: () => api.get('/api/stocks/trending'),
  
  // Get market overview
  getMarketOverview: () => api.get('/api/market/overview'),
};

// Portfolio-related API functions
export const portfolioAPI = {
  // Get user portfolio
  getPortfolio: () => api.get('/api/portfolio'),
  
  // Add stock to portfolio
  addStock: (data) => api.post('/api/portfolio/stocks', data),
  
  // Update stock in portfolio
  updateStock: (symbol, data) => api.put(`/api/portfolio/stocks/${symbol}`, data),
  
  // Remove stock from portfolio
  removeStock: (symbol) => api.delete(`/api/portfolio/stocks/${symbol}`),
  
  // Get portfolio performance
  getPerformance: (period = '1y') => api.get('/api/portfolio/performance', {
    params: { period }
  }),
};

// Watchlist-related API functions
export const watchlistAPI = {
  // Get user watchlist
  getWatchlist: () => api.get('/api/watchlist'),
  
  // Add stock to watchlist
  addStock: (symbol) => api.post('/api/watchlist/stocks', { symbol }),
  
  // Remove stock from watchlist
  removeStock: (symbol) => api.delete(`/api/watchlist/stocks/${symbol}`),
  
  // Get watchlist quotes
  getQuotes: () => api.get('/api/watchlist/quotes'),
};

// User-related API functions
export const userAPI = {
  // Login
  login: (credentials) => api.post('/api/auth/login', credentials),
  
  // Register
  register: (userData) => api.post('/api/auth/register', userData),
  
  // Get user profile
  getProfile: () => api.get('/api/auth/me'),
  
  // Logout
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },
};

export default api; 