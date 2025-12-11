import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
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
  const isRegisteringRef = useRef(false);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If we're in the middle of registration, wait a bit for Firestore to be ready
        if (isRegisteringRef.current) {
          await new Promise(resolve => setTimeout(resolve, 300));
          isRegisteringRef.current = false;
        }
        
        // Get additional user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : null;
          
          const finalUserData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: firebaseUser.displayName,
            ...userData
          };
          
          // Set both state updates together to avoid race conditions
          setUser(finalUserData);
          setIsAuthenticated(true);
          // Set loading to false after a brief delay to ensure state is set
          setTimeout(() => {
            setLoading(false);
          }, 50);
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Even if Firestore fetch fails, set basic user info
          const basicUserData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: firebaseUser.displayName
          };
          setUser(basicUserData);
          setIsAuthenticated(true);
          setTimeout(() => {
            setLoading(false);
          }, 50);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sign up with email/password
  const register = async (userData) => {
    try {
      const { email, password, username, full_name } = userData;

      // Validate password
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return false;
      }

      // Set flag to indicate we're registering
      isRegisteringRef.current = true;

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update display name
      if (full_name || username) {
        await updateProfile(firebaseUser, {
          displayName: full_name || username
        });
      }

      // Send email verification
      await sendEmailVerification(firebaseUser);

      // Create user document in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email: email,
        username: username || '',
        full_name: full_name || '',
        createdAt: new Date().toISOString(),
        risk_tolerance: 1,
        capital: 10000
      });

      // Don't manually set state here - let onAuthStateChanged handle it
      // This prevents race conditions and ensures consistent state
      // The listener will fire immediately after user creation
      
      toast.success('Registration successful! Please verify your email.');
      return true;
    } catch (error) {
      let errorMessage = 'Registration failed';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
        default:
          errorMessage = error.message || 'Registration failed';
      }
      
      toast.error(errorMessage);
      console.error('Registration error:', error);
      return false;
    }
  };

  // Sign in with email/password
  const login = async (credentials) => {
    try {
      const { email, password } = credentials;
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Login successful!');
      return true;
    } catch (error) {
      let errorMessage = 'Login failed';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
        default:
          errorMessage = error.message || 'Login failed';
      }
      
      toast.error(errorMessage);
      console.error('Login error:', error);
      return false;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Error signing out');
      console.error('Logout error:', error);
    }
  };

  // Get Firebase ID token for backend API calls
  const getIdToken = async () => {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    return null;
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    getIdToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
