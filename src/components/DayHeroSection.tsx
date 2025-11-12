import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.2; // 20% of screen height

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
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradient}
      >
        <Text style={styles.dayName}>{dayName}</Text>
        <Text style={styles.dayVibe}>{dayVibe}</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  gradient: {
    height: HERO_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  dayName: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dayVibe: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000000',
    marginTop: 8,
    opacity: 0.8,
  },
});
