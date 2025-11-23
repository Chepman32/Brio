import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'react-native';
import { ThemeType } from '../database/schemas/Settings';
import { getSettings, setTheme as setThemeDb } from '../database/operations';
import { Theme, ThemeColors, getTheme } from '../theme';

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  themeName: ThemeType;
  setTheme: (theme: ThemeType) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme('light'));

  const loadTheme = useCallback(() => {
    try {
      const settings = getSettings();
      const theme = getTheme(settings.theme || 'light');
      setCurrentTheme(theme);
      StatusBar.setBarStyle(theme.colors.statusBar);
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const setTheme = useCallback((themeName: ThemeType) => {
    try {
      setThemeDb(themeName);
      const theme = getTheme(themeName);
      setCurrentTheme(theme);
      StatusBar.setBarStyle(theme.colors.statusBar);
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  }, []);

  const value: ThemeContextType = {
    theme: currentTheme,
    colors: currentTheme.colors,
    themeName: currentTheme.name,
    setTheme,
    isDark: currentTheme.name === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
