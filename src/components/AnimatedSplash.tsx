import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  vec,
  Blur,
} from '@shopify/react-native-skia';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({
  onAnimationComplete,
}) => {
  // Logo piece animations
  const piece1X = useSharedValue(-200);
  const piece1Y = useSharedValue(-200);
  const piece1Rotation = useSharedValue(-180);

  const piece2X = useSharedValue(200);
  const piece2Y = useSharedValue(-200);
  const piece2Rotation = useSharedValue(180);

  const piece3X = useSharedValue(-200);
  const piece3Y = useSharedValue(200);
  const piece3Rotation = useSharedValue(-180);

  const piece4X = useSharedValue(200);
  const piece4Y = useSharedValue(200);
  const piece4Rotation = useSharedValue(180);

  const logoOpacity = useSharedValue(0);
  const particleScale = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    // Animate logo pieces flying in
    piece1X.value = withSpring(0, { damping: 10, stiffness: 100 });
    piece1Y.value = withSpring(0, { damping: 10, stiffness: 100 });
    piece1Rotation.value = withSpring(0, { damping: 10, stiffness: 100 });

    piece2X.value = withSpring(0, { damping: 10, stiffness: 100 });
    piece2Y.value = withSpring(0, { damping: 10, stiffness: 100 });
    piece2Rotation.value = withSpring(0, { damping: 10, stiffness: 100 });

    piece3X.value = withSpring(0, { damping: 10, stiffness: 100 });
    piece3Y.value = withSpring(0, { damping: 10, stiffness: 100 });
    piece3Rotation.value = withSpring(0, { damping: 10, stiffness: 100 });

    piece4X.value = withSpring(0, { damping: 10, stiffness: 100 });
    piece4Y.value = withSpring(0, { damping: 10, stiffness: 100 });
    piece4Rotation.value = withSpring(0, { damping: 10, stiffness: 100 });

    // Show logo text after pieces assemble
    logoOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));

    // Particle burst effect
    particleScale.value = withDelay(1200, withSpring(1, { damping: 8 }));

    // Fade out entire screen
    screenOpacity.value = withDelay(
      2000,
      withTiming(0, { duration: 500 }, finished => {
        if (finished) {
          runOnJS(onAnimationComplete)();
        }
      }),
    );
  }, []);

  const piece1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: piece1X.value },
      { translateY: piece1Y.value },
      { rotate: `${piece1Rotation.value}deg` },
    ],
  }));

  const piece2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: piece2X.value },
      { translateY: piece2Y.value },
      { rotate: `${piece2Rotation.value}deg` },
    ],
  }));

  const piece3Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: piece3X.value },
      { translateY: piece3Y.value },
      { rotate: `${piece3Rotation.value}deg` },
    ],
  }));

  const piece4Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: piece4X.value },
      { translateY: piece4Y.value },
      { rotate: `${piece4Rotation.value}deg` },
    ],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  const particleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: particleScale.value }],
    opacity: 1 - particleScale.value * 0.5,
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      {/* Particle burst background */}
      <Animated.View style={[styles.particleContainer, particleStyle]}>
        <Canvas style={styles.canvas}>
          <Group>
            <Circle
              cx={width / 2}
              cy={height / 2}
              r={150}
              color="rgba(99, 102, 241, 0.2)"
            />
            <Circle
              cx={width / 2}
              cy={height / 2}
              r={100}
              color="rgba(139, 92, 246, 0.3)"
            />
            <Circle
              cx={width / 2}
              cy={height / 2}
              r={50}
              color="rgba(168, 85, 247, 0.4)"
            />
            <Blur blur={20} />
          </Group>
        </Canvas>
      </Animated.View>

      {/* Logo pieces */}
      <View style={styles.logoContainer}>
        <Animated.View
          style={[
            styles.logoPiece,
            piece1Style,
            { backgroundColor: '#6366F1' },
          ]}
        />
        <Animated.View
          style={[
            styles.logoPiece,
            piece2Style,
            { backgroundColor: '#8B5CF6' },
          ]}
        />
        <Animated.View
          style={[
            styles.logoPiece,
            piece3Style,
            { backgroundColor: '#A855F7' },
          ]}
        />
        <Animated.View
          style={[
            styles.logoPiece,
            piece4Style,
            { backgroundColor: '#C084FC' },
          ]}
        />
      </View>

      {/* Logo text */}
      <Animated.Text style={[styles.logoText, logoStyle]}>Brio</Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  particleContainer: {
    position: 'absolute',
    width: width,
    height: height,
  },
  canvas: {
    flex: 1,
  },
  logoContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPiece: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6366F1',
    marginTop: 140,
    letterSpacing: 2,
  },
});
