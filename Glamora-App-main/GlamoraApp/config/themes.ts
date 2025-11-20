/**
 * Theme Configuration
 * Defines all available color themes for the app
 */

export type ThemeName = 'default' | 'dark' | 'blue' | 'green' | 'purple' | 'orange' | 'red';

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: {
    // Backgrounds
    bodyBackground: string;
    containerBackground: string;
    headerBackground: string;
    
    // Buttons
    buttonBackground: string;
    buttonText: string;
    buttonSecondary: string;
    
    // Text
    primaryText: string;
    secondaryText: string;
    headerText: string;
    
    // Borders & Dividers
    border: string;
    divider: string;
    
    // Accents
    accent: string;
    icon: string;
  };
}

export const themes: Record<ThemeName, Theme> = {
  default: {
    name: 'default',
    displayName: 'Default',
    colors: {
      bodyBackground: '#F4C2C2',
      containerBackground: '#FDE6D6',
      headerBackground: '#F5E6D3',
      buttonBackground: '#FFE8C8',
      buttonText: '#333333',
      buttonSecondary: '#FDD6A5',
      primaryText: '#333333',
      secondaryText: '#666666',
      headerText: '#4B2E2B',
      border: '#E0E0E0',
      divider: '#E0E0E0',
      accent: '#4B2E2B',
      icon: '#333333',
    },
  },
  dark: {
    name: 'dark',
    displayName: 'Dark',
    colors: {
      bodyBackground: '#1a1a1a',
      containerBackground: '#2d2d2d',
      headerBackground: '#1a1a1a',
      buttonBackground: '#FFFFFF',
      buttonText: '#000000',
      buttonSecondary: '#444444',
      primaryText: '#FFFFFF',
      secondaryText: '#CCCCCC',
      headerText: '#FFFFFF',
      border: '#444444',
      divider: '#444444',
      accent: '#FFE8C8',
      icon: '#FFFFFF',
    },
  },
  blue: {
    name: 'blue',
    displayName: 'Blue',
    colors: {
      bodyBackground: '#E3F2FD',
      containerBackground: '#BBDEFB',
      headerBackground: '#90CAF9',
      buttonBackground: '#2196F3',
      buttonText: '#FFFFFF',
      buttonSecondary: '#64B5F6',
      primaryText: '#0D47A1',
      secondaryText: '#1976D2',
      headerText: '#0D47A1',
      border: '#64B5F6',
      divider: '#90CAF9',
      accent: '#1565C0',
      icon: '#0D47A1',
    },
  },
  green: {
    name: 'green',
    displayName: 'Green',
    colors: {
      bodyBackground: '#E8F5E9',
      containerBackground: '#C8E6C9',
      headerBackground: '#A5D6A7',
      buttonBackground: '#4CAF50',
      buttonText: '#FFFFFF',
      buttonSecondary: '#81C784',
      primaryText: '#1B5E20',
      secondaryText: '#2E7D32',
      headerText: '#1B5E20',
      border: '#81C784',
      divider: '#A5D6A7',
      accent: '#388E3C',
      icon: '#1B5E20',
    },
  },
  purple: {
    name: 'purple',
    displayName: 'Purple',
    colors: {
      bodyBackground: '#F3E5F5',
      containerBackground: '#E1BEE7',
      headerBackground: '#CE93D8',
      buttonBackground: '#9C27B0',
      buttonText: '#FFFFFF',
      buttonSecondary: '#BA68C8',
      primaryText: '#4A148C',
      secondaryText: '#7B1FA2',
      headerText: '#4A148C',
      border: '#BA68C8',
      divider: '#CE93D8',
      accent: '#6A1B9A',
      icon: '#4A148C',
    },
  },
  orange: {
    name: 'orange',
    displayName: 'Orange',
    colors: {
      bodyBackground: '#FFF3E0',
      containerBackground: '#FFE0B2',
      headerBackground: '#FFCC80',
      buttonBackground: '#FF9800',
      buttonText: '#FFFFFF',
      buttonSecondary: '#FFB74D',
      primaryText: '#E65100',
      secondaryText: '#F57C00',
      headerText: '#E65100',
      border: '#FFB74D',
      divider: '#FFCC80',
      accent: '#F57C00',
      icon: '#E65100',
    },
  },
  red: {
    name: 'red',
    displayName: 'Red',
    colors: {
      bodyBackground: '#FFEBEE',
      containerBackground: '#FFCDD2',
      headerBackground: '#EF9A9A',
      buttonBackground: '#F44336',
      buttonText: '#FFFFFF',
      buttonSecondary: '#E57373',
      primaryText: '#B71C1C',
      secondaryText: '#C62828',
      headerText: '#B71C1C',
      border: '#E57373',
      divider: '#EF9A9A',
      accent: '#D32F2F',
      icon: '#B71C1C',
    },
  },
};

export const getTheme = (themeName: ThemeName): Theme => {
  return themes[themeName] || themes.default;
};

