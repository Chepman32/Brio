import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AnimatedSplash } from '../components/AnimatedSplash';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  return (
    <View style={styles.container}>
      <AnimatedSplash onAnimationComplete={onComplete} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
