import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
  SharedValue,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import { useResponsive } from '../hooks/useResponsive';
import { ResponsiveSizes } from '../utils/responsiveDimensions';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

interface OnboardingSlide {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Offline & Private',
    subtitle: 'Use the app offline,\nyour data stays private.',
    icon: 'lock-closed',
    iconColor: '#3B82F6',
    backgroundColor: '#F0F9FF',
  },
  {
    id: 2,
    title: 'Gesture-first',
    subtitle: 'Swipe to complete or snooze',
    icon: 'hand-left',
    iconColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  {
    id: 3,
    title: 'Organize your day',
    subtitle: 'Plan your schedule\nand get more done',
    icon: 'calendar',
    iconColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  {
    id: 4,
    title: 'Smart reminders',
    subtitle: 'AI learning\nthat adapts to you',
    icon: 'notifications',
    iconColor: '#8B5CF6',
    backgroundColor: '#F5F3FF',
  },
];

interface OnboardingCarouselProps {
  onComplete: () => void;
}

export const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { isTablet } = useResponsive();
  const { colors } = useTheme();
  const { t } = useLocalization();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = offsetX;
    const index = Math.round(offsetX / screenWidth);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * screenWidth,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip button */}
      {currentIndex < slides.length - 1 && (
        <Pressable
          style={[styles.skipButton, { top: insets.top + 20 }]}
          onPress={handleSkip}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>{t('common.skip')}</Text>
        </Pressable>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {slides.map((slide, index) => (
          <SlideItem
            key={slide.id}
            slide={slide}
            index={index}
            scrollX={scrollX}
          />
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const dotStyle = useAnimatedStyle(() => {
            const inputRange = [
              (index - 1) * screenWidth,
              index * screenWidth,
              (index + 1) * screenWidth,
            ];

            const width = interpolate(
              scrollX.value,
              inputRange,
              [8, isTablet ? 32 : 24, 8],
              Extrapolate.CLAMP,
            );

            const opacity = interpolate(
              scrollX.value,
              inputRange,
              [0.3, 1, 0.3],
              Extrapolate.CLAMP,
            );

            return {
              width,
              opacity,
            };
          });

          return <Animated.View key={index} style={[styles.dot, { height: isTablet ? 10 : 8, backgroundColor: colors.primary }, dotStyle]} />;
        })}
      </View>

      {/* Next/Get Started button */}
      <Pressable
        style={[
          styles.nextButton,
          {
            marginBottom: Math.max(insets.bottom, 20) + 20,
            marginHorizontal: isTablet ? 80 : 40,
            paddingVertical: isTablet ? 20 : 16,
            backgroundColor: colors.primary,
          },
        ]}
        onPress={handleNext}
      >
        <Text style={[styles.nextButtonText, { fontSize: isTablet ? 20 : 18 }]}>
          {currentIndex === slides.length - 1 ? t('onboarding.getStarted') : t('common.next')}
        </Text>
      </Pressable>
    </View>
  );
};

interface SlideItemProps {
  slide: OnboardingSlide;
  index: number;
  scrollX: SharedValue<number>;
}

const SlideItem: React.FC<SlideItemProps> = ({ slide, index, scrollX }) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { isTablet } = useResponsive();
  const { colors } = useTheme();

  const iconContainerSize = ResponsiveSizes.onboardingIconContainer;
  const titleSize = ResponsiveSizes.onboardingTitleSize;
  const subtitleSize = ResponsiveSizes.onboardingSubtitleSize;
  const horizontalPadding = ResponsiveSizes.onboardingPadding;
  const iconSize = isTablet ? 160 : 120;

  // Horizontal slide animation for top section (title, subtitle, icon)
  const topSectionStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * screenWidth,
      index * screenWidth,
      (index + 1) * screenWidth,
    ];

    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [screenWidth * 0.5, 0, -screenWidth * 0.5],
      Extrapolate.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolate.CLAMP,
    );

    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  // Vertical slide animation for bottom section (demo content)
  const bottomSectionStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * screenWidth,
      index * screenWidth,
      (index + 1) * screenWidth,
    ];

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [100, 0, -100],
      Extrapolate.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolate.CLAMP,
    );

    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  return (
    <View style={[styles.slide, { width: screenWidth, paddingHorizontal: horizontalPadding }]}>
      <View style={[styles.slideContent, { paddingTop: insets.top + (isTablet ? 100 : 80) }]}>
        {/* Top Section - Horizontal Animation */}
        <Animated.View style={[styles.topSection, topSectionStyle]}>
          {/* Title */}
          <Text style={[styles.title, { fontSize: titleSize, color: colors.text }]}>{slide.title}</Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { fontSize: subtitleSize, lineHeight: subtitleSize * 1.4, color: colors.textSecondary }]}>{slide.subtitle}</Text>

          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: slide.backgroundColor,
                width: iconContainerSize,
                height: iconContainerSize,
                borderRadius: iconContainerSize / 2,
              },
            ]}
          >
            <Icon name={slide.icon} size={iconSize} color={slide.iconColor} />
          </View>
        </Animated.View>

        {/* Bottom Section - Vertical Animation */}
        <Animated.View style={[styles.bottomSection, bottomSectionStyle]}>
          {/* Additional content based on slide */}
          {slide.id === 2 && <GestureDemo />}
          {slide.id === 3 && <CalendarDemo />}
          {slide.id === 4 && <SmartRemindersDemo />}
        </Animated.View>
      </View>
    </View>
  );
};

// Demo components for specific slides
const GestureDemo: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={styles.demoContainer}>
      <View style={[styles.taskItem, { backgroundColor: colors.surfaceSecondary }]}>
        <View style={[styles.taskCircle, { borderColor: colors.border }]} />
        <Text style={[styles.taskText, { color: colors.text }]}>Meeting</Text>
      </View>
      <View style={[styles.taskItem, { backgroundColor: colors.surfaceSecondary }]}>
        <View style={[styles.taskCircle, { borderColor: colors.border }]} />
        <Text style={[styles.taskText, { color: colors.text }]}>Call Anna</Text>
        <View style={[styles.snoozeButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.snoozeText}>Snooze</Text>
        </View>
      </View>
      <View style={[styles.taskItem, { backgroundColor: colors.surfaceSecondary }]}>
        <View style={[styles.taskCircle, { borderColor: colors.border }]} />
        <Text style={[styles.taskText, { color: colors.text }]}>Groceries</Text>
      </View>
      <View style={styles.swipeHint}>
        <Icon name="arrow-back" size={32} color={colors.border} />
        <Icon name="hand-left" size={48} color="#F59E0B" />
      </View>
    </View>
  );
};

const CalendarDemo: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarIllustration}>
        <Icon name="time-outline" size={48} color={colors.primary} />
        <View style={styles.personIllustration}>
          <View style={styles.personHead} />
          <View style={styles.personBody} />
        </View>
        <Icon name="checkmark-circle" size={48} color={colors.primary} />
      </View>
      <View style={[styles.bottomNav, { borderTopColor: colors.border }]}>
        <Icon name="home-outline" size={28} color={colors.textSecondary} />
        <Icon name="calendar-outline" size={28} color={colors.textSecondary} />
        <Icon name="search-outline" size={28} color={colors.textSecondary} />
      </View>
    </View>
  );
};

const SmartRemindersDemo: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={styles.smartContainer}>
      <View style={[styles.dayCard, { backgroundColor: colors.surfaceSecondary }]}>
        <Text style={styles.dayCardTitle}>Busy Wednesday</Text>
        <View style={styles.weekDays}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
            <Text
              key={day}
              style={[styles.weekDay, { color: colors.textSecondary }, i === 2 && [styles.weekDayActive, { backgroundColor: colors.primary }]]}
            >
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.timeSlot}>
          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>12:00</Text>
          <View style={[styles.eventBlock, { backgroundColor: '#BBF7D0' }]}>
            <Text style={[styles.eventText, { color: colors.text }]}>12:00 Meeting</Text>
          </View>
        </View>
        <View style={styles.timeSlot}>
          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>15:00</Text>
          <View style={[styles.eventBlock, { backgroundColor: '#FED7AA' }]}>
            <Text style={[styles.eventText, { color: colors.text }]}>15:00 Call</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    width: '100%',
    flex: 1,
    maxWidth: 600,
  },
  topSection: {
    alignItems: 'center',
    width: '100%',
  },
  bottomSection: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  dot: {
    borderRadius: 5,
  },
  nextButton: {
    borderRadius: 28,
    alignItems: 'center',
  },
  nextButtonText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Demo components styles
  demoContainer: {
    width: '100%',
    marginTop: 20,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  taskCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
  },
  taskText: {
    fontSize: 16,
    flex: 1,
  },
  snoozeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  snoozeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  calendarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  calendarIllustration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  personIllustration: {
    alignItems: 'center',
  },
  personHead: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FDE68A',
    marginBottom: 8,
  },
  personBody: {
    width: 80,
    height: 100,
    borderRadius: 40,
    backgroundColor: '#FDE68A',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  smartContainer: {
    width: '100%',
    marginTop: 20,
  },
  dayCard: {
    borderRadius: 16,
    padding: 20,
  },
  dayCardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: '#93C5FD',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    textAlign: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  weekDay: {
    fontSize: 12,
    fontWeight: '500',
  },
  weekDayActive: {
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    width: 50,
  },
  eventBlock: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  eventText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
