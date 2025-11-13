import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OnboardingCarousel } from '../components/OnboardingCarousel';
import { setOnboardingCompleted } from '../database/operations';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
}) => {
  const handleComplete = () => {
    setOnboardingCompleted(true);
    onComplete();
  };

  return (
    <View style={styles.container}>
      <OnboardingCarousel onComplete={handleComplete} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
