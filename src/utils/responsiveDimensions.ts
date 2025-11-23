import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 14 Pro)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Tablet detection
const IS_PAD = Platform.OS === 'ios' && Platform.isPad === true;
const IS_TABLET = IS_PAD || Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= 600;

/**
 * Scale a value based on screen width
 */
export function wp(widthPercent: number): number {
  const screenWidth = Dimensions.get('window').width;
  return PixelRatio.roundToNearestPixel((screenWidth * widthPercent) / 100);
}

/**
 * Scale a value based on screen height
 */
export function hp(heightPercent: number): number {
  const screenHeight = Dimensions.get('window').height;
  return PixelRatio.roundToNearestPixel((screenHeight * heightPercent) / 100);
}

/**
 * Scale a font size responsively
 */
export function fontSize(size: number): number {
  const screenWidth = Dimensions.get('window').width;
  const scale = screenWidth / BASE_WIDTH;
  const newSize = size * scale;

  if (IS_TABLET) {
    // Cap font scaling on tablets to prevent overly large text
    return Math.round(PixelRatio.roundToNearestPixel(Math.min(newSize * 1.15, size * 1.4)));
  }

  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/**
 * Scale spacing/dimensions responsively
 */
export function spacing(size: number): number {
  const screenWidth = Dimensions.get('window').width;
  const scale = screenWidth / BASE_WIDTH;

  if (IS_TABLET) {
    // Increase spacing on tablets for better touch targets and visual balance
    return Math.round(PixelRatio.roundToNearestPixel(size * Math.min(scale, 1.5)));
  }

  return Math.round(PixelRatio.roundToNearestPixel(size * Math.max(0.85, Math.min(scale, 1.15))));
}

/**
 * Get device-appropriate values
 */
export function deviceValue<T>(phone: T, tablet: T): T {
  return IS_TABLET ? tablet : phone;
}

/**
 * Get orientation-aware value
 */
export function orientationValue<T>(portrait: T, landscape: T): T {
  const { width, height } = Dimensions.get('window');
  return height >= width ? portrait : landscape;
}

/**
 * Common responsive dimensions for the app
 */
export const ResponsiveSizes = {
  // Tab bar
  get tabBarHeight(): number {
    return deviceValue(80, 90);
  },

  // FAB (Floating Action Button)
  get fabSize(): number {
    return deviceValue(56, 64);
  },
  get fabBottom(): number {
    return deviceValue(24, 32);
  },
  get fabRight(): number {
    return deviceValue(24, 32);
  },
  get fabIconSize(): number {
    return deviceValue(32, 36);
  },

  // Card dimensions
  get cardMarginHorizontal(): number {
    return deviceValue(16, 24);
  },
  get cardMarginVertical(): number {
    return deviceValue(8, 12);
  },
  get cardBorderRadius(): number {
    return deviceValue(12, 16);
  },
  get cardPadding(): number {
    return deviceValue(16, 20);
  },

  // Typography
  get headingLarge(): number {
    return fontSize(deviceValue(32, 40));
  },
  get headingMedium(): number {
    return fontSize(deviceValue(24, 30));
  },
  get headingSmall(): number {
    return fontSize(deviceValue(20, 24));
  },
  get bodyLarge(): number {
    return fontSize(deviceValue(18, 20));
  },
  get bodyMedium(): number {
    return fontSize(deviceValue(16, 18));
  },
  get bodySmall(): number {
    return fontSize(deviceValue(14, 16));
  },
  get caption(): number {
    return fontSize(deviceValue(12, 14));
  },

  // Hero section
  get heroTitleSize(): number {
    return fontSize(deviceValue(48, 64));
  },
  get heroSubtitleSize(): number {
    return fontSize(deviceValue(20, 26));
  },
  get heroIconSize(): number {
    return deviceValue(80, 100);
  },

  // Onboarding
  get onboardingIconContainer(): number {
    return deviceValue(200, 280);
  },
  get onboardingTitleSize(): number {
    return fontSize(deviceValue(32, 42));
  },
  get onboardingSubtitleSize(): number {
    return fontSize(deviceValue(18, 22));
  },
  get onboardingPadding(): number {
    return deviceValue(40, 60);
  },

  // Content layout
  get contentMaxWidth(): number {
    return deviceValue(SCREEN_WIDTH, 700);
  },
  get screenPadding(): number {
    return deviceValue(16, 32);
  },

  // Grid
  get gridColumns(): number {
    const width = Dimensions.get('window').width;
    if (width >= 1024) return 4;
    if (width >= 768) return 3;
    if (width >= 600) return 2;
    return 1;
  },
};

/**
 * Get content container style with max width for tablets
 */
export function getContentContainerStyle() {
  return {
    maxWidth: ResponsiveSizes.contentMaxWidth,
    alignSelf: 'center' as const,
    width: '100%' as const,
  };
}

/**
 * Check if device is tablet
 */
export function isTablet(): boolean {
  return IS_TABLET;
}

/**
 * Check if device is iPad
 */
export function isPad(): boolean {
  return IS_PAD;
}
