import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus , Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Storage from '../../utils/storage';

import { useUser } from './UserContext';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { setUser } = useUser();
  
  // Background timer refs
  const backgroundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);
  
  // Auto-logout timeout (3 minutes)
  const AUTO_LOGOUT_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds

  // Check authentication status on app start
  const checkAuthStatus = async () => {
    try {
      const token = await Storage.getAuthToken();
      const user = await Storage.getUserData();
      const appWasTerminated = await Storage.getStorageItem('appWasTerminated');
      
      // If app was terminated (closed, not just minimized), logout for security
      if (appWasTerminated === 'true') {
        console.log('🚪 App was terminated, logging out for security');
        await Storage.removeStorageItem('token');
        await Storage.removeStorageItem('user');
        await Storage.removeStorageItem('appWasTerminated');
        setIsAuthenticated(false);
      } else if (token && user) {
        setIsAuthenticated(true);
        setUser(user); // Set user in UserContext
        console.log('✅ User is authenticated');
      } else {
        setIsAuthenticated(false);
        setUser(null); // Clear user in UserContext
        console.log('❌ User is not authenticated');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (token: string, user: any) => {
    try {
      await Storage.setStorageItem('token', token);
      await Storage.setStorageItem('user', JSON.stringify(user));
      setIsAuthenticated(true);
      setUser(user); // Set user in UserContext
      console.log('✅ User logged in successfully');
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear all user-related data from storage
      const keysToRemove = [
        'token',
        'user',
        'userProfile',
        'cachedWardrobe',
        'cachedMarketplace',
        'lastSyncTime',
        'appWasTerminated'
      ];
      
      // Remove each key using universal storage helper
      for (const key of keysToRemove) {
        await Storage.removeStorageItem(key);
      }
      
      setIsAuthenticated(false);
      setUser(null); // Clear user in UserContext
      
      // Clear any background timers
      if (backgroundTimerRef.current) {
        clearTimeout(backgroundTimerRef.current);
        backgroundTimerRef.current = null;
      }
      
      console.log('✅ User logged out successfully - all data cleared');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log('📱 App state changed:', appStateRef.current, '->', nextAppState);
    
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App is coming to foreground
      console.log('📱 App coming to foreground');
      
      // Clear termination flag since app returned to foreground (wasn't terminated)
      Storage.removeStorageItem('appWasTerminated').catch(console.error);
      
      if (backgroundTimerRef.current) {
        clearTimeout(backgroundTimerRef.current);
        backgroundTimerRef.current = null;
        console.log('⏰ Background timer cleared');
      }
      
      if (backgroundTimeRef.current) {
        const timeInBackground = Date.now() - backgroundTimeRef.current;
        console.log('⏱️ Time in background:', Math.round(timeInBackground / 1000), 'seconds');
        
        if (timeInBackground >= AUTO_LOGOUT_TIMEOUT) {
          console.log('🚪 Auto-logout triggered due to background time');
          handleAutoLogout();
        }
      }
      
      backgroundTimeRef.current = null;
    } else if (nextAppState.match(/inactive|background/)) {
      // App is going to background
      console.log('📱 App going to background');
      backgroundTimeRef.current = Date.now();
      
      // Mark that app went to background (for termination detection)
      Storage.setStorageItem('appWasTerminated', 'true').catch(console.error);
      
      // Set timer for auto-logout
      backgroundTimerRef.current = setTimeout(() => {
        console.log('🚪 Auto-logout timer triggered');
        handleAutoLogout();
      }, AUTO_LOGOUT_TIMEOUT);
    }
    
    appStateRef.current = nextAppState;
  };

  // Handle auto-logout
  const handleAutoLogout = async () => {
    try {
      console.log('🚪 Performing auto-logout...');
      
      // Clear background timer
      if (backgroundTimerRef.current) {
        clearTimeout(backgroundTimerRef.current);
        backgroundTimerRef.current = null;
      }
      
      // Clear authentication data
      await logout();
      
      // Show alert
      Alert.alert(
        'Session Expired',
        'You\'ve been logged out for security reasons after being away for too long.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to login screen
              router.replace('/login');
            }
          }
        ]
      );
      
      console.log('✅ Auto-logout completed');
    } catch (error) {
      console.error('Error during auto-logout:', error);
    }
  };

  // Initialize authentication on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Set up app state listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
      // Clear timer on cleanup
      if (backgroundTimerRef.current) {
        clearTimeout(backgroundTimerRef.current);
      }
    };
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
