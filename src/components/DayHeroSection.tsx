import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useResponsive } from '../hooks/useResponsive';
import { ResponsiveSizes } from '../utils/responsiveDimensions';

interface DayHeroSectionProps {
  dayName: string;
  dayVibe: string;
  gradientColors: string[];
}

export const DayHeroSection: React.FC<DayHeroSectionProps> = ({
  dayName,
  dayVibe,
  gradientColors,
}) => {
  const { height: screenHeight } = useWindowDimensions();
  const { isTablet, isLandscape } = useResponsive();

  // Responsive hero height: smaller percentage on tablets/landscape
  const heroHeightPercent = isTablet ? (isLandscape ? 0.25 : 0.18) : 0.2;
  const heroHeight = screenHeight * heroHeightPercent;

  const titleSize = ResponsiveSizes.heroTitleSize;
  const subtitleSize = ResponsiveSizes.heroSubtitleSize;
  const horizontalPadding = isTablet ? 32 : 24;
  const marginHorizontal = isTablet ? 16 : 8;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          styles.gradient,
          {
            height: heroHeight,
            paddingHorizontal: horizontalPadding,
            marginHorizontal: marginHorizontal,
          },
        ]}
      >
        <Text style={[styles.dayName, { fontSize: titleSize }]}>{dayName}</Text>
        <Text style={[styles.dayVibe, { fontSize: subtitleSize }]}>{dayVibe}</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginHorizontal: 0,
    marginVertical: 8,
    borderRadius: 0,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  gradient: {
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 16,
  },
  dayName: {
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dayVibe: {
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
