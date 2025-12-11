import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import toast from 'react-hot-toast';
import api from '../utils/api';

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
  const syncedUsersRef = useRef(new Set()); // Track which users have been synced

  // Sync user with backend database
  const syncUserWithBackend = async (firebaseUser, userData = null) => {
    // Skip if already synced in this session
    if (syncedUsersRef.current.has(firebaseUser.uid)) {
      return;
    }

    try {
      const token = await firebaseUser.getIdToken();
      const username = userData?.username || firebaseUser.displayName || '';
      const full_name = userData?.full_name || firebaseUser.displayName || '';
      
      // Call backend sync endpoint
      await api.post('/api/auth/sync', {
        ...(username && { username }),
        ...(full_name && { full_name })
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      syncedUsersRef.current.add(firebaseUser.uid);
      console.log('✅ User synced with backend database');
    } catch (error) {
      console.error('❌ Error syncing user with backend:', error);
      // Don't throw - allow user to continue even if sync fails
      // The backend will auto-create on first protected endpoint access
    }
  };

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
          
          // Sync with backend database
          await syncUserWithBackend(firebaseUser, userData);
          
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
          
          // Still try to sync with backend even if Firestore fails
          try {
            await syncUserWithBackend(firebaseUser);
          } catch (syncError) {
            console.error('Error syncing with backend:', syncError);
          }
          
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
        syncedUsersRef.current.clear(); // Clear synced users on logout
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

      // Sync with backend database immediately after registration
      try {
        const token = await firebaseUser.getIdToken();
        await api.post('/api/auth/sync', {
          ...(username && { username }),
          ...(full_name && { full_name })
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        syncedUsersRef.current.add(firebaseUser.uid);
        console.log('✅ User synced with backend database after registration');
      } catch (error) {
        console.error('❌ Error syncing user with backend after registration:', error);
        // Don't fail registration if backend sync fails - onAuthStateChanged will retry
      }

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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Sync with backend database after login
      try {
        // Get user data from Firestore if available
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        const token = await firebaseUser.getIdToken();
        const username = userData?.username || '';
        const full_name = userData?.full_name || '';
        
        await api.post('/api/auth/sync', {
          ...(username && { username }),
          ...(full_name && { full_name })
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        syncedUsersRef.current.add(firebaseUser.uid);
        console.log('✅ User synced with backend database after login');
      } catch (error) {
        console.error('❌ Error syncing user with backend after login:', error);
        // Don't fail login if backend sync fails - onAuthStateChanged will retry
      }
      
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

  // Sign in with Google
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;
      
      // Get user data from Google account
      const username = firebaseUser.displayName?.split(' ')[0] || firebaseUser.email?.split('@')[0] || '';
      const full_name = firebaseUser.displayName || '';
      
      // Create user document in Firestore if it doesn't exist
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!userDoc.exists()) {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            email: firebaseUser.email,
            username: username,
            full_name: full_name,
            createdAt: new Date().toISOString(),
            risk_tolerance: 1,
            capital: 10000
          });
        }
      } catch (error) {
        console.error('Error creating Firestore user:', error);
      }
      
      // Sync with backend database
      try {
        const token = await firebaseUser.getIdToken();
        await api.post('/api/auth/sync', {
          ...(username && { username }),
          ...(full_name && { full_name })
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        syncedUsersRef.current.add(firebaseUser.uid);
        console.log('✅ User synced with backend database after Google login');
      } catch (error) {
        console.error('❌ Error syncing user with backend after Google login:', error);
        // Don't fail login if backend sync fails - onAuthStateChanged will retry
      }
      
      toast.success('Login successful!');
      return true;
    } catch (error) {
      let errorMessage = 'Google sign-in failed';
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign-in popup was closed';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Sign-in popup was blocked. Please allow popups for this site.';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with this email using a different sign-in method';
          break;
        default:
          errorMessage = error.message || 'Google sign-in failed';
      }
      
      toast.error(errorMessage);
      console.error('Google sign-in error:', error);
      return false;
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
    loginWithGoogle,
    getIdToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
