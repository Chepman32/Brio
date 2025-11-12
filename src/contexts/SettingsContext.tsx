import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSettings } from '../database/operations';

type TimeFormat = 'auto' | '12h' | '24h';

interface SettingsContextType {
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  refreshSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>('auto');

  const loadSettings = () => {
    try {
      const settings = getSettings();
      setTimeFormatState(settings.timeFormat || 'auto');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const setTimeFormat = (format: TimeFormat) => {
    setTimeFormatState(format);
  };

  const refreshSettings = () => {
    loadSettings();
  };

  return (
    <SettingsContext.Provider
      value={{ timeFormat, setTimeFormat, refreshSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
