import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getTheme, Theme, ThemeName } from '../../config/themes';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (themeName: ThemeName) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeName, setThemeName] = useState<ThemeName>('default');
  const [theme, setThemeState] = useState<Theme>(getTheme('default'));

  // Load saved theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  // Update theme when themeName changes
  useEffect(() => {
    setThemeState(getTheme(themeName));
  }, [themeName]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('appTheme');
      if (savedTheme && (savedTheme === 'default' || savedTheme === 'dark' || savedTheme === 'blue' || savedTheme === 'green' || savedTheme === 'purple' || savedTheme === 'orange' || savedTheme === 'red')) {
        setThemeName(savedTheme as ThemeName);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setTheme = async (newThemeName: ThemeName) => {
    try {
      await AsyncStorage.setItem('appTheme', newThemeName);
      setThemeName(newThemeName);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

