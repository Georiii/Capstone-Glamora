import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../../config/api';

interface ProfilePictureContextType {
  profilePicture: string | null;
  updateProfilePicture: (newPictureUrl: string) => void;
  loadProfilePicture: (userEmail: string) => Promise<void>;
  isLoading: boolean;
}

const ProfilePictureContext = createContext<ProfilePictureContextType | undefined>(undefined);

export const useProfilePicture = () => {
  const context = useContext(ProfilePictureContext);
  if (!context) {
    throw new Error('useProfilePicture must be used within a ProfilePictureProvider');
  }
  return context;
};

interface ProfilePictureProviderProps {
  children: React.ReactNode;
}

const ProfilePictureProvider: React.FC<ProfilePictureProviderProps> = ({ children }) => {
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateProfilePicture = (newPictureUrl: string) => {
    setProfilePicture(newPictureUrl);
  };

  const loadProfilePicture = async (userEmail: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.getProfile(userEmail));
      if (response.ok) {
        const data = await response.json();
        if (data.user.profilePicture && data.user.profilePicture.url) {
          setProfilePicture(data.user.profilePicture.url);
        }
      }
    } catch (error) {
      console.error('Error loading profile picture:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load profile picture from AsyncStorage on mount
  useEffect(() => {
    const loadFromStorage = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.profilePicture && user.profilePicture.url) {
            setProfilePicture(user.profilePicture.url);
          }
        }
      } catch (error) {
        console.error('Error loading profile picture from storage:', error);
      }
    };

    loadFromStorage();
  }, []);

  const value: ProfilePictureContextType = {
    profilePicture,
    updateProfilePicture,
    loadProfilePicture,
    isLoading,
  };

  return (
    <ProfilePictureContext.Provider value={value}>
      {children}
    </ProfilePictureContext.Provider>
  );
};

export default ProfilePictureProvider;
