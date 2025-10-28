import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Storage from '../../utils/storage';

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

  // Load user from storage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await Storage.getUserData();
        if (userData) {
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

  // Save user to storage whenever it changes
  useEffect(() => {
    if (user) {
      Storage.setStorageItem('user', JSON.stringify(user)).catch(error => {
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
