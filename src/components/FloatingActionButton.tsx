import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Canvas, Circle, Group, Blur } from '@shopify/react-native-skia';
import { FABProps } from '../types';
import { ResponsiveSizes } from '../utils/responsiveDimensions';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const FloatingActionButton: React.FC<FABProps> = ({ onPress }) => {
  const fabSize = ResponsiveSizes.fabSize;
  const fabBottom = ResponsiveSizes.fabBottom;
  const fabRight = ResponsiveSizes.fabRight;
  const fabIconSize = ResponsiveSizes.fabIconSize;
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

  const dynamicFabStyle = {
    bottom: fabBottom,
    right: fabRight,
    width: fabSize,
    height: fabSize,
    borderRadius: fabSize / 2,
  };

  const dynamicRippleStyle = {
    bottom: fabBottom,
    right: fabRight,
    width: fabSize,
    height: fabSize,
    borderRadius: fabSize / 2,
  };

  const dynamicCanvasStyle = {
    width: fabSize,
    height: fabSize,
  };

  return (
    <>
      {/* Ripple effect background */}
      <Animated.View style={[styles.ripple, dynamicRippleStyle, rippleStyle]}>
        <Canvas style={dynamicCanvasStyle}>
          <Group>
            <Circle cx={fabSize / 2} cy={fabSize / 2} r={fabSize / 2} color="rgba(100, 100, 255, 0.3)" />
            <Blur blur={10} />
          </Group>
        </Canvas>
      </Animated.View>

      {/* Main FAB */}
      <AnimatedPressable
        style={[styles.fab, dynamicFabStyle, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.Text style={[styles.icon, { fontSize: fabIconSize }]}>+</Animated.Text>
      </AnimatedPressable>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
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
    color: '#FFFFFF',
    fontWeight: '300',
  },
  ripple: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
