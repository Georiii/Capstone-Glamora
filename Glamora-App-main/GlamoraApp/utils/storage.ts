/**
 * Universal Storage Helper
 * Works on both web (localStorage) and native (AsyncStorage)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Detect if we're on web platform
const isWeb = Platform.OS === 'web';

/**
 * Get value from storage
 */
export const getStorageItem = async (key: string): Promise<string | null> => {
  try {
    if (isWeb) {
      // Use localStorage on web
      return localStorage.getItem(key);
    } else {
      // Use AsyncStorage on native
      return await AsyncStorage.getItem(key);
    }
  } catch (error) {
    console.error(`Error getting ${key} from storage:`, error);
    return null;
  }
};

/**
 * Set value in storage
 */
export const setStorageItem = async (key: string, value: string): Promise<void> => {
  try {
    if (isWeb) {
      // Use localStorage on web
      localStorage.setItem(key, value);
    } else {
      // Use AsyncStorage on native
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.error(`Error setting ${key} in storage:`, error);
  }
};

/**
 * Remove value from storage
 */
export const removeStorageItem = async (key: string): Promise<void> => {
  try {
    if (isWeb) {
      // Use localStorage on web
      localStorage.removeItem(key);
    } else {
      // Use AsyncStorage on native
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`Error removing ${key} from storage:`, error);
  }
};

/**
 * Clear all storage
 */
export const clearStorage = async (): Promise<void> => {
  try {
    if (isWeb) {
      // Clear localStorage on web
      localStorage.clear();
    } else {
      // Clear AsyncStorage on native
      await AsyncStorage.clear();
    }
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};

/**
 * Get authentication token
 */
export const getAuthToken = async (): Promise<string | null> => {
  return await getStorageItem('token');
};

/**
 * Get user data
 */
export const getUserData = async (): Promise<any | null> => {
  const userStr = await getStorageItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};
