import { useState, useEffect, useCallback } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';

export interface ResponsiveInfo {
  // Device type
  isPhone: boolean;
  isTablet: boolean;
  isPad: boolean;

  // Orientation
  isPortrait: boolean;
  isLandscape: boolean;

  // Screen dimensions
  width: number;
  height: number;

  // Scale factors for responsive sizing
  fontScale: number;
  spacingScale: number;

  // Breakpoint helpers
  screenSize: 'small' | 'medium' | 'large' | 'xlarge';
}

const TABLET_MIN_WIDTH = 600;
const BREAKPOINTS = {
  small: 0,      // Small phones (SE, etc.)
  medium: 375,   // Regular phones
  large: 414,    // Large phones (Pro Max, Plus)
  xlarge: 600,   // Tablets
};

function getScreenSize(width: number): 'small' | 'medium' | 'large' | 'xlarge' {
  if (width >= BREAKPOINTS.xlarge) return 'xlarge';
  if (width >= BREAKPOINTS.large) return 'large';
  if (width >= BREAKPOINTS.medium) return 'medium';
  return 'small';
}

function calculateScales(width: number, isTablet: boolean): { fontScale: number; spacingScale: number } {
  if (isTablet) {
    // For tablets, scale up fonts and spacing
    const tabletFontScale = Math.min(1.3, width / 768);
    const tabletSpacingScale = Math.min(1.5, width / 600);
    return {
      fontScale: Math.max(1.1, tabletFontScale),
      spacingScale: Math.max(1.2, tabletSpacingScale),
    };
  }

  // For phones, use standard scaling based on width
  const baseFontScale = width / 375; // iPhone standard width
  return {
    fontScale: Math.max(0.85, Math.min(1.15, baseFontScale)),
    spacingScale: Math.max(0.9, Math.min(1.1, baseFontScale)),
  };
}

function getResponsiveInfo(window: ScaledSize): ResponsiveInfo {
  const { width, height } = window;
  const isPortrait = height >= width;
  const isPad = Platform.OS === 'ios' && Platform.isPad === true;
  const isTablet = isPad || Math.min(width, height) >= TABLET_MIN_WIDTH;

  const { fontScale, spacingScale } = calculateScales(width, isTablet);

  return {
    isPhone: !isTablet,
    isTablet,
    isPad,
    isPortrait,
    isLandscape: !isPortrait,
    width,
    height,
    fontScale,
    spacingScale,
    screenSize: getScreenSize(width),
  };
}

/**
 * Hook for responsive design that reacts to screen dimension and orientation changes
 */
export function useResponsive(): ResponsiveInfo {
  const [responsive, setResponsive] = useState<ResponsiveInfo>(() =>
    getResponsiveInfo(Dimensions.get('window'))
  );

  const handleDimensionChange = useCallback(({ window }: { window: ScaledSize }) => {
    setResponsive(getResponsiveInfo(window));
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', handleDimensionChange);
    return () => subscription.remove();
  }, [handleDimensionChange]);

  return responsive;
}

/**
 * Get current responsive info without hook (for one-time use)
 */
export function getResponsive(): ResponsiveInfo {
  return getResponsiveInfo(Dimensions.get('window'));
}

/**
 * Check if current device is a tablet (static check)
 */
export function isTabletDevice(): boolean {
  const { width, height } = Dimensions.get('window');
  const isPad = Platform.OS === 'ios' && Platform.isPad === true;
  return isPad || Math.min(width, height) >= TABLET_MIN_WIDTH;
}
