import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('API Base URL:', process.env.REACT_APP_API_URL || 'http://localhost:8000');

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', config.method?.toUpperCase(), config.url, config.headers);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data, error.config?.url);
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
  addStock: ({ symbol, shares, price, date }) => api.post('/api/portfolio/stocks', { symbol, shares, price, date }),
  
  // Update stock in portfolio
  updateStock: (symbol, data) => api.put(`/api/portfolio/stocks/${symbol}`, data),
  
  // Remove stock from portfolio
  removeStock: (symbol) => api.delete(`/api/portfolio/stocks/${symbol}`),
  
  // Get portfolio performance
  getPerformance: (period = '1y') => api.get('/api/portfolio/performance', {
    params: { period }
  }),

  // New endpoints
  getSettings: () => api.get('/api/portfolio/settings'),
  updateSettings: (settings) => api.put('/api/portfolio/settings', settings),
  getPositionSize: (data) => api.post('/api/portfolio/position-size', data),
  sellStock: (symbol, data) => api.post(`/api/portfolio/stocks/${symbol}/sell`, data),
  getTradeHistory: () => api.get('/api/portfolio/trade-history'),
  addUpStock: ({ symbol, shares, price, date }) =>
    api.post(`/api/portfolio/stocks/${symbol}/addup`, { symbol, shares, price, date }),
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
  getQuotes:   () => api.get('/api/watchlist/quotes'),
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

// Signals-related API functions
export const signalsAPI = {
  getSignals: () => api.get('/api/signals/'),
  getTodaySignals: () => api.get('/api/signals/today'),
  generateSignals: () => api.post('/api/signals/generate'),
  getSignalsStatus: () => api.get('/api/signals/status'),
};

export default api; 