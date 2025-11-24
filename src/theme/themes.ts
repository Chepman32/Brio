import { ThemeType } from '../database/schemas/Settings';

export interface ThemeColors {
  // Primary brand colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;

  // Backgrounds
  background: string;
  surface: string;
  surfaceSecondary: string;
  card: string;
  modal: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Borders & Dividers
  border: string;
  borderLight: string;
  divider: string;

  // Status colors
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;

  // Priorities
  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;

  // Misc
  disabled: string;
  shadow: string;
  overlay: string;
  tabBar: string;
  tabBarInactive: string;
  statusBar: 'light-content' | 'dark-content';
}

export interface Theme {
  name: ThemeType;
  colors: ThemeColors;
}

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    secondary: '#8B5CF6',
    accent: '#A855F7',

    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceSecondary: '#FAFAFA',
    card: '#FFFFFF',
    modal: '#FFFFFF',

    text: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textInverse: '#FFFFFF',

    border: '#E0E0E0',
    borderLight: '#F0F0F0',
    divider: '#EEEEEE',

    success: '#4CAF50',
    successLight: '#E8F5E9',
    warning: '#FFA500',
    warningLight: '#FFF3E0',
    error: '#FF4444',
    errorLight: '#FFEBEE',

    priorityLow: '#4CAF50',
    priorityMedium: '#FFA500',
    priorityHigh: '#FF4444',

    disabled: '#CCCCCC',
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    tabBar: '#FFFFFF',
    tabBarInactive: '#999999',
    statusBar: 'dark-content',
  },
};

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '#818CF8',
    primaryLight: '#A5B4FC',
    primaryDark: '#6366F1',
    secondary: '#A78BFA',
    accent: '#C084FC',

    background: '#121212',
    surface: '#1E1E1E',
    surfaceSecondary: '#252525',
    card: '#2A2A2A',
    modal: '#2A2A2A',

    text: '#F5F5F5',
    textSecondary: '#B0B0B0',
    textTertiary: '#808080',
    textInverse: '#121212',

    border: '#3A3A3A',
    borderLight: '#2A2A2A',
    divider: '#333333',

    success: '#66BB6A',
    successLight: '#1B3D1F',
    warning: '#FFB74D',
    warningLight: '#3D3018',
    error: '#EF5350',
    errorLight: '#3D1A1A',

    priorityLow: '#66BB6A',
    priorityMedium: '#FFB74D',
    priorityHigh: '#EF5350',

    disabled: '#555555',
    shadow: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.7)',
    tabBar: '#1E1E1E',
    tabBarInactive: '#666666',
    statusBar: 'light-content',
  },
};

export const solarTheme: Theme = {
  name: 'solar',
  colors: {
    primary: '#D97706',
    primaryLight: '#F59E0B',
    primaryDark: '#B45309',
    secondary: '#EA580C',
    accent: '#DC2626',

    background: '#FFFBEB',
    surface: '#FEF3C7',
    surfaceSecondary: '#FDE68A',
    card: '#FFFFFF',
    modal: '#FFFBEB',

    text: '#78350F',
    textSecondary: '#92400E',
    textTertiary: '#B45309',
    textInverse: '#FFFBEB',

    border: '#FCD34D',
    borderLight: '#FDE68A',
    divider: '#FEF3C7',

    success: '#65A30D',
    successLight: '#ECFCCB',
    warning: '#EA580C',
    warningLight: '#FFEDD5',
    error: '#DC2626',
    errorLight: '#FEE2E2',

    priorityLow: '#65A30D',
    priorityMedium: '#EA580C',
    priorityHigh: '#DC2626',

    disabled: '#D4B896',
    shadow: 'rgba(120, 53, 15, 0.1)',
    overlay: 'rgba(120, 53, 15, 0.5)',
    tabBar: '#FEF3C7',
    tabBarInactive: '#B45309',
    statusBar: 'dark-content',
  },
};

export const monoTheme: Theme = {
  name: 'mono',
  colors: {
    primary: '#525252',
    primaryLight: '#737373',
    primaryDark: '#404040',
    secondary: '#6B7280',
    accent: '#9CA3AF',

    background: '#D4D4D4',
    surface: '#E5E5E5',
    surfaceSecondary: '#D9D9D9',
    card: '#E0E0E0',
    modal: '#E5E5E5',

    text: '#171717',
    textSecondary: '#404040',
    textTertiary: '#666666',
    textInverse: '#FFFFFF',

    border: '#A3A3A3',
    borderLight: '#B8B8B8',
    divider: '#C4C4C4',

    success: '#525252',
    successLight: '#D4D4D4',
    warning: '#737373',
    warningLight: '#E0E0E0',
    error: '#374151',
    errorLight: '#D4D4D4',

    priorityLow: '#9CA3AF',
    priorityMedium: '#6B7280',
    priorityHigh: '#374151',

    disabled: '#B0B0B0',
    shadow: 'rgba(0, 0, 0, 0.15)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    tabBar: '#E5E5E5',
    tabBarInactive: '#737373',
    statusBar: 'dark-content',
  },
};

export const themes: Record<ThemeType, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  solar: solarTheme,
  mono: monoTheme,
};

export const getTheme = (themeName: ThemeType): Theme => {
  return themes[themeName] || lightTheme;
};
