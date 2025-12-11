export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // At least 6 characters (Firebase minimum)
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  // Optional: Add more validation rules
  if (password.length > 72) {
    return { valid: false, message: 'Password cannot exceed 72 characters' };
  }
  return { valid: true };
};

export const validateUsername = (username) => {
  if (!username || username.trim().length === 0) {
    return { valid: false, message: 'Username is required' };
  }
  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters' };
  }
  if (username.length > 20) {
    return { valid: false, message: 'Username cannot exceed 20 characters' };
  }
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }
  return { valid: true };
};

