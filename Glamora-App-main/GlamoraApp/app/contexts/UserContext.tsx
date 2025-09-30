import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  profilePicture?: {
    url: string;
    publicId?: string;
    uploadedAt?: string;
  };
  bodyMeasurements?: any;
  stylePreferences?: any;
  profileSettings?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface UserContextType {
  user: User | null;
  updateUser: (updates: Partial<User>) => void;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: React.ReactNode;
}

const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from AsyncStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Save user to AsyncStorage whenever it changes
  useEffect(() => {
    if (user) {
      AsyncStorage.setItem('user', JSON.stringify(user)).catch(error => {
        console.error('Error saving user to storage:', error);
      });
    }
  }, [user]);

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const value: UserContextType = {
    user,
    updateUser,
    setUser,
    isLoading,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
