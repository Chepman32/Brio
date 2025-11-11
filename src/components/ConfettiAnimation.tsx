import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Canvas, Circle, Group } from '@shopify/react-native-skia';

const { width, height } = Dimensions.get('window');

interface ConfettiAnimationProps {
  onComplete?: () => void;
}

export const ConfettiAnimation: React.FC<ConfettiAnimationProps> = ({
  onComplete,
}) => {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    y: -20,
    color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'][
      Math.floor(Math.random() * 6)
    ],
    size: Math.random() * 8 + 4,
    velocityX: (Math.random() - 0.5) * 4,
    velocityY: Math.random() * 3 + 2,
  }));

  const opacity = useSharedValue(1);

  useEffect(() => {
    // Fade out after animation
    opacity.value = withDelay(
      2000,
      withTiming(0, { duration: 500 }, finished => {
        if (finished && onComplete) {
          onComplete();
        }
      }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      pointerEvents="none"
    >
      <Canvas style={styles.canvas}>
        <Group>
          {particles.map(particle => (
            <Circle
              key={particle.id}
              cx={particle.x}
              cy={particle.y + height * 0.5}
              r={particle.size}
              color={particle.color}
            />
          ))}
        </Group>
      </Canvas>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  canvas: {
    flex: 1,
  },
});
