import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = offsetX;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * SCREEN_WIDTH,
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
    <View style={styles.container}>
      {/* Skip button */}
      {currentIndex < slides.length - 1 && (
        <Pressable
          style={[styles.skipButton, { top: insets.top + 20 }]}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
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
              (index - 1) * SCREEN_WIDTH,
              index * SCREEN_WIDTH,
              (index + 1) * SCREEN_WIDTH,
            ];

            const width = interpolate(
              scrollX.value,
              inputRange,
              [8, 24, 8],
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

          return <Animated.View key={index} style={[styles.dot, dotStyle]} />;
        })}
      </View>

      {/* Next/Get Started button */}
      <Pressable
        style={[
          styles.nextButton,
          { marginBottom: Math.max(insets.bottom, 20) + 20 },
        ]}
        onPress={handleNext}
      >
        <Text style={styles.nextButtonText}>
          {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
        </Text>
      </Pressable>
    </View>
  );
};

interface SlideItemProps {
  slide: OnboardingSlide;
  index: number;
  scrollX: Animated.SharedValue<number>;
}

const SlideItem: React.FC<SlideItemProps> = ({ slide, index, scrollX }) => {
  const insets = useSafeAreaInsets();

  // Horizontal slide animation for top section (title, subtitle, icon)
  const topSectionStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [SCREEN_WIDTH * 0.5, 0, -SCREEN_WIDTH * 0.5],
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
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
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
    <View style={styles.slide}>
      <View style={[styles.slideContent, { paddingTop: insets.top + 80 }]}>
        {/* Top Section - Horizontal Animation */}
        <Animated.View style={[styles.topSection, topSectionStyle]}>
          {/* Title */}
          <Text style={styles.title}>{slide.title}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>{slide.subtitle}</Text>

          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: slide.backgroundColor },
            ]}
          >
            <Icon name={slide.icon} size={120} color={slide.iconColor} />
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
  return (
    <View style={styles.demoContainer}>
      <View style={styles.taskItem}>
        <View style={styles.taskCircle} />
        <Text style={styles.taskText}>Meeting</Text>
      </View>
      <View style={styles.taskItem}>
        <View style={styles.taskCircle} />
        <Text style={styles.taskText}>Call Anna</Text>
        <View style={styles.snoozeButton}>
          <Text style={styles.snoozeText}>Snooze</Text>
        </View>
      </View>
      <View style={styles.taskItem}>
        <View style={styles.taskCircle} />
        <Text style={styles.taskText}>Groceries</Text>
      </View>
      <View style={styles.swipeHint}>
        <Icon name="arrow-back" size={32} color="#D1D5DB" />
        <Icon name="hand-left" size={48} color="#F59E0B" />
      </View>
    </View>
  );
};

const CalendarDemo: React.FC = () => {
  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarIllustration}>
        <Icon name="time-outline" size={48} color="#6366F1" />
        <View style={styles.personIllustration}>
          <View style={styles.personHead} />
          <View style={styles.personBody} />
        </View>
        <Icon name="checkmark-circle" size={48} color="#6366F1" />
      </View>
      <View style={styles.bottomNav}>
        <Icon name="home-outline" size={28} color="#9CA3AF" />
        <Icon name="calendar-outline" size={28} color="#9CA3AF" />
        <Icon name="search-outline" size={28} color="#9CA3AF" />
      </View>
    </View>
  );
};

const SmartRemindersDemo: React.FC = () => {
  return (
    <View style={styles.smartContainer}>
      <View style={styles.dayCard}>
        <Text style={styles.dayCardTitle}>Busy Wednesday</Text>
        <View style={styles.weekDays}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
            <Text
              key={day}
              style={[styles.weekDay, i === 2 && styles.weekDayActive]}
            >
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.timeSlot}>
          <Text style={styles.timeLabel}>12:00</Text>
          <View style={[styles.eventBlock, { backgroundColor: '#BBF7D0' }]}>
            <Text style={styles.eventText}>12:00 Meeting</Text>
          </View>
        </View>
        <View style={styles.timeSlot}>
          <Text style={styles.timeLabel}>15:00</Text>
          <View style={[styles.eventBlock, { backgroundColor: '#FED7AA' }]}>
            <Text style={styles.eventText}>15:00 Call</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#6B7280',
    fontWeight: '600',
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  slideContent: {
    alignItems: 'center',
    width: '100%',
    flex: 1,
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 26,
  },
  iconContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
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
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  nextButton: {
    marginHorizontal: 40,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 18,
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
  },
  taskCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
  },
  taskText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  snoozeButton: {
    backgroundColor: '#3B82F6',
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
    borderTopColor: '#E5E7EB',
  },
  smartContainer: {
    width: '100%',
    marginTop: 20,
  },
  dayCard: {
    backgroundColor: '#F9FAFB',
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
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  weekDay: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  weekDayActive: {
    color: '#FFFFFF',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    color: '#6B7280',
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
    color: '#111827',
    fontWeight: '500',
  },
});
