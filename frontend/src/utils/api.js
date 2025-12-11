import axios from 'axios';

// Create axios instance with base configuration
const BASE = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '') || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE,
  timeout: 30000, // Increased timeout for production deployments
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('API Base URL:', BASE);
if (!BASE || BASE === 'http://localhost:8000') {
  console.warn('⚠️ API URL not configured! Using default localhost. Set REACT_APP_API_URL environment variable for production.');
}

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  async (config) => {
    // Get Firebase ID token instead of localStorage token
    try {
      const { auth } = await import('../firebase');
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('✅ Firebase token added to request:', config.url);
        } else {
          console.warn('⚠️ No Firebase token available for:', config.url);
        }
      } else {
        console.warn('⚠️ No current user in Firebase auth for:', config.url);
      }
    } catch (error) {
      console.error('❌ Error getting Firebase ID token:', error);
    }
    console.log('API Request:', config.method?.toUpperCase(), config.url, 'Headers:', Object.keys(config.headers));
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
  async (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data, error.config?.url);
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error - no response from server:', error.message);
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout - server may be unavailable');
      } else if (error.message === 'Network Error') {
        console.error('Network Error - CORS issue or server unreachable');
      }
    }
    
    if (error.response?.status === 401) {
      // Handle unauthorized access - only redirect if not already on login/register page
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        // Sign out from Firebase if token is invalid
        try {
          const { auth } = await import('../firebase');
          const { signOut } = await import('firebase/auth');
          if (auth.currentUser) {
            await signOut(auth);
          }
        } catch (signOutError) {
          console.error('Error signing out:', signOutError);
        }
        window.location.href = '/login';
      }
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
  // Note: Login and Register are now handled by Firebase Auth
  // These endpoints may still be used for backend user profile sync
  
  // Get user profile (from backend, synced with Firebase)
  getProfile: () => api.get('/api/auth/me'),
  
  // Logout is now handled by Firebase Auth in AuthContext
};

// Signals-related API functions
export const signalsAPI = {
  getSignals: () => api.get('/api/signals/'),
  getTodaySignals: () => api.get('/api/signals/today'),
  generateSignals: () => api.post('/api/signals/generate'),
  getSignalsStatus: () => api.get('/api/signals/status'),
  getUniqueStocksCount: () => api.get('/api/signals/unique-stocks-count'),
  
  // New scheduler-related endpoints
  getSchedulerStatus: () => api.get('/api/signals/scheduler/status'),
  triggerManualAnalysis: () => api.post('/api/signals/scheduler/trigger'),
};

export default api; 