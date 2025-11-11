// Theme colors
export const COLORS = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  accent: '#A855F7',
  success: '#4CAF50',
  warning: '#FFA500',
  error: '#FF4444',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E0E0E0',
  disabled: '#CCCCCC',
};

// Animation durations (ms)
export const ANIMATION_DURATION = {
  fast: 200,
  normal: 300,
  slow: 400,
  splash: 2000,
};

// Gesture thresholds
export const GESTURE_THRESHOLD = {
  swipe: 100,
  longPress: 500,
};

// Task priorities
export const PRIORITY_COLORS = {
  low: COLORS.success,
  medium: COLORS.warning,
  high: COLORS.error,
};

// Achievement types
export const ACHIEVEMENT_TYPES = {
  STREAK: 'streak',
  MILESTONE: 'milestone',
  SPECIAL: 'special',
} as const;

// Date formats
export const DATE_FORMATS = {
  full: 'EEEE, MMMM d, yyyy',
  short: 'MMM d',
  time: 'h:mm a',
};
