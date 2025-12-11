import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { auth } from './firebase';
import Navbar from './components/Navbar';
import StockDetails from './pages/StockDetails';
import Watchlist from './pages/Watchlist';
import Portfolio from './pages/Portfolio';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  
  // Wait for auth state to stabilize
  useEffect(() => {
    if (!loading) {
      // Check if we have auth state or Firebase currentUser as fallback
      const hasAuth = (isAuthenticated && user) || auth.currentUser;
      if (hasAuth) {
        // Small delay to ensure state is stable
        const timer = setTimeout(() => {
          setIsReady(true);
        }, 200);
        return () => clearTimeout(timer);
      } else {
        setIsReady(true); // Ready but not authenticated
      }
    } else {
      setIsReady(false);
    }
  }, [loading, isAuthenticated, user]);
  
  // Show loading while checking auth state
  if (loading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // Check both context state and Firebase currentUser as fallback
  const hasAuth = (isAuthenticated && user) || auth.currentUser;
  
  // Only redirect if we're sure user is not authenticated
  if (!hasAuth) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route Component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  
  useEffect(() => {
    // Check both context state and Firebase currentUser as fallback
    const hasAuth = (isAuthenticated && user) || auth.currentUser;
    
    if (hasAuth && !loading) {
      // Longer delay to ensure state is fully stable before redirecting
      const timer = setTimeout(() => {
        setShouldRedirect(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShouldRedirect(false);
    }
  }, [isAuthenticated, user, loading]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // Only redirect if user is definitely authenticated and state is stable
  if (shouldRedirect) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 dark:text-gray-100">
        {isAuthenticated && <Navbar />}
        <main className={isAuthenticated ? "container mx-auto px-4 py-8" : ""}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Portfolio />
              </ProtectedRoute>
            } />
            <Route path="/stock/:symbol" element={
              <ProtectedRoute>
                <StockDetails />
              </ProtectedRoute>
            } />
            <Route path="/watchlist" element={
              <ProtectedRoute>
                <Watchlist />
              </ProtectedRoute>
            } />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App; 