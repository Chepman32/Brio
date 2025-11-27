import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NativeModules, Platform } from 'react-native';
import { LocaleType } from '../database/schemas/Settings';
import { getSettings, setLocale as setLocaleDb } from '../database/operations';
import { setI18nLocale, t as translate, languageNames, languageFlags } from '../localization/i18n';

interface LocalizationContextType {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
  t: (key: string, options?: object) => string;
  languageNames: Record<LocaleType, string>;
  languageFlags: Record<LocaleType, any>;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const getDeviceLocale = (): LocaleType => {
  let deviceLocale = 'en';

  try {
    if (Platform.OS === 'ios') {
      deviceLocale =
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        'en';
    } else {
      deviceLocale = NativeModules.I18nManager?.localeIdentifier || 'en';
    }
  } catch {
    deviceLocale = 'en';
  }

  // Extract language code (e.g., 'en_US' -> 'en', 'pt_BR' -> 'pt-BR')
  const langCode = deviceLocale.split('_')[0].toLowerCase();
  const regionCode = deviceLocale.split('_')[1]?.toUpperCase();

  // Handle special cases like pt-BR
  if (langCode === 'pt' && regionCode === 'BR') {
    return 'pt-BR';
  }

  // Check if the language is supported
  const supportedLocales: LocaleType[] = [
    'en', 'zh', 'ja', 'ko', 'de', 'fr', 'es', 'pt-BR', 'ar', 'ru',
    'it', 'nl', 'tr', 'th', 'vi', 'id', 'pl', 'uk', 'hi', 'he',
    'sv', 'no', 'da', 'fi', 'cs', 'hu', 'ro', 'el', 'ms', 'fil',
  ];

  if (supportedLocales.includes(langCode as LocaleType)) {
    return langCode as LocaleType;
  }

  return 'en';
};

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [locale, setLocaleState] = useState<LocaleType>('en');

  const loadLocale = useCallback(() => {
    try {
      const settings = getSettings();
      const savedLocale = settings.locale || getDeviceLocale();
      setLocaleState(savedLocale);
      setI18nLocale(savedLocale);
    } catch (error) {
      console.error('Error loading locale:', error);
      const deviceLocale = getDeviceLocale();
      setLocaleState(deviceLocale);
      setI18nLocale(deviceLocale);
    }
  }, []);

  useEffect(() => {
    loadLocale();
  }, [loadLocale]);

  const setLocale = useCallback((newLocale: LocaleType) => {
    try {
      setLocaleDb(newLocale);
      setLocaleState(newLocale);
      setI18nLocale(newLocale);
    } catch (error) {
      console.error('Error setting locale:', error);
    }
  }, []);

  const t = useCallback((key: string, options?: object): string => {
    return translate(key, options);
  }, []);

  const value: LocalizationContextType = {
    locale,
    setLocale,
    t,
    languageNames,
    languageFlags,
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
