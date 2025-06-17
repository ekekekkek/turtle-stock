// Format currency
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

// Format percentage
export const formatPercentage = (value, decimals = 2) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

// Format large numbers (e.g., 1.2M, 3.4B)
export const formatLargeNumber = (num, decimals = 1) => {
  if (num >= 1e12) {
    return `${(num / 1e12).toFixed(decimals)}T`;
  }
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(decimals)}B`;
  }
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(decimals)}M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(decimals)}K`;
  }
  return num.toString();
};

// Format date
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  
  return new Date(date).toLocaleDateString('en-US', defaultOptions);
};

// Format time
export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Calculate percentage change
export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// Calculate total value
export const calculateTotalValue = (shares, price) => {
  return shares * price;
};

// Calculate gain/loss
export const calculateGainLoss = (currentValue, investedValue) => {
  return currentValue - investedValue;
};

// Calculate gain/loss percentage
export const calculateGainLossPercentage = (currentValue, investedValue) => {
  if (investedValue === 0) return 0;
  return ((currentValue - investedValue) / investedValue) * 100;
};

// Validate stock symbol
export const validateStockSymbol = (symbol) => {
  const symbolRegex = /^[A-Z]{1,5}$/;
  return symbolRegex.test(symbol);
};

// Validate email
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Generate random ID
export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

// Deep clone object
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

// Local storage helpers
export const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
}; 