import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Canvas, Circle, Group, Blur } from '@shopify/react-native-skia';
import { FABProps } from '../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const FloatingActionButton: React.FC<FABProps> = ({ onPress }) => {
  const scale = useSharedValue(1);
  const rippleScale = useSharedValue(0);

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
    rippleScale.value = withSpring(1);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    rippleScale.value = withSpring(0);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const rippleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: rippleScale.value }],
      opacity: 1 - rippleScale.value,
    };
  });

  return (
    <>
      {/* Ripple effect background */}
      <Animated.View style={[styles.ripple, rippleStyle]}>
        <Canvas style={styles.canvas}>
          <Group>
            <Circle cx={28} cy={28} r={28} color="rgba(100, 100, 255, 0.3)" />
            <Blur blur={10} />
          </Group>
        </Canvas>
      </Animated.View>

      {/* Main FAB */}
      <AnimatedPressable
        style={[styles.fab, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.Text style={styles.icon}>+</Animated.Text>
      </AnimatedPressable>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  ripple: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    width: 56,
    height: 56,
  },
});
