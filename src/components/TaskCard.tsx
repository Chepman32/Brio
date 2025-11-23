import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { TaskCardProps } from '../types';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { useTheme } from '../contexts/ThemeContext';

const SWIPE_THRESHOLD = 100;

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onComplete,
  onSnooze,
  onPress,
  onLongPress,
}) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const { formatTime } = useTimeFormat();
  const { colors } = useTheme();

  // Extract task ID to avoid accessing Realm object in worklet
  const taskId = task._id;

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      translateX.value = event.translationX;
    })
    .onEnd(event => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - complete task
        translateX.value = withSpring(300, {}, () => {
          opacity.value = withTiming(0, { duration: 200 }, () => {
            runOnJS(onComplete)(taskId);
          });
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - snooze task
        translateX.value = withSpring(-300, {}, () => {
          opacity.value = withTiming(0, { duration: 200 }, () => {
            runOnJS(onSnooze)(taskId);
          });
        });
      } else {
        // Return to original position
        translateX.value = withSpring(0);
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      scale.value = withSpring(0.95);
      runOnJS(onLongPress)(taskId);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onPress)(taskId);
  });

  const composedGesture = Gesture.Race(
    panGesture,
    longPressGesture,
    tapGesture,
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }, { scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high':
        return '#FF4444';
      case 'medium':
        return '#FFA500';
      case 'low':
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, { backgroundColor: colors.surface, shadowColor: colors.shadow }, animatedStyle]}>
        <View
          style={[
            styles.priorityIndicator,
            { backgroundColor: getPriorityColor() },
          ]}
        />
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {task.title}
          </Text>
          {task.notes && (
            <Text style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={1}>
              {task.notes}
            </Text>
          )}
          <View style={styles.footer}>
            {task.dueTime && (
              <Text style={[styles.time, { color: colors.textTertiary }]}>
                {task.dueTime ? formatTime(task.dueTime) : ''}
              </Text>
            )}
            {task.category && (
              <Text style={[styles.category, { color: colors.textSecondary, backgroundColor: colors.surfaceSecondary }]}>{task.category}</Text>
            )}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  priorityIndicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  time: {
    fontSize: 12,
  },
  category: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
