import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { CalendarViewProps } from '../types';
import { addDays, getStartOfDay, isSameDay } from '../utils/dateHelpers';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;

export const CalendarView: React.FC<CalendarViewProps> = ({
  mode,
  selectedDate,
  tasks,
  onDateSelect,
  onModeChange,
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      translateX.value = event.translationX;
    })
    .onEnd(event => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - previous period
        translateX.value = withSpring(0);
        runOnJS(navigatePrevious)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - next period
        translateX.value = withSpring(0);
        runOnJS(navigateNext)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate(event => {
      scale.value = event.scale;
    })
    .onEnd(() => {
      if (scale.value > 1.2) {
        // Zoom in - more detailed view
        if (mode === 'month') {
          runOnJS(onModeChange)('week');
        } else if (mode === 'week') {
          runOnJS(onModeChange)('day');
        }
      } else if (scale.value < 0.8) {
        // Zoom out - less detailed view
        if (mode === 'day') {
          runOnJS(onModeChange)('week');
        } else if (mode === 'week') {
          runOnJS(onModeChange)('month');
        }
      }
      scale.value = withSpring(1);
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (mode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (mode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (mode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (mode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => isSameDay(task.dueDate, date));
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayTasks = getTasksForDate(currentDate);

    return (
      <ScrollView style={styles.dayView} showsVerticalScrollIndicator={false}>
        <Text style={styles.dateHeader}>
          {currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        {hours.map(hour => {
          const hourTasks = dayTasks.filter(task => {
            if (!task.dueTime) return false;
            return task.dueTime.getHours() === hour;
          });

          return (
            <View key={hour} style={styles.hourSlot}>
              <Text style={styles.hourLabel}>
                {hour === 0
                  ? '12 AM'
                  : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                  ? '12 PM'
                  : `${hour - 12} PM`}
              </Text>
              <View style={styles.hourContent}>
                {hourTasks.map(task => (
                  <Pressable
                    key={task._id}
                    style={styles.taskInHour}
                    onPress={() => onDateSelect(task.dueDate)}
                  >
                    <Text style={styles.taskInHourText} numberOfLines={1}>
                      {task.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });

    return (
      <View style={styles.weekView}>
        <Text style={styles.dateHeader}>
          {startOfWeek.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </Text>
        <View style={styles.weekGrid}>
          {days.map(date => {
            const dayTasks = getTasksForDate(date);
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());

            return (
              <Pressable
                key={date.toISOString()}
                style={[
                  styles.weekDay,
                  isSelected && styles.weekDaySelected,
                  isToday && styles.weekDayToday,
                ]}
                onPress={() => onDateSelect(date)}
              >
                <Text
                  style={[
                    styles.weekDayName,
                    isSelected && styles.weekDayNameSelected,
                  ]}
                >
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text
                  style={[
                    styles.weekDayNumber,
                    isSelected && styles.weekDayNumberSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
                {dayTasks.length > 0 && (
                  <View style={styles.taskDot}>
                    <Text style={styles.taskCount}>{dayTasks.length}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const weeks = [];
    let currentWeek = [];
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      currentWeek.push(new Date(d));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    return (
      <View style={styles.monthView}>
        <Text style={styles.dateHeader}>
          {currentDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </Text>
        <View style={styles.weekDayHeaders}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.weekDayHeader}>
              {day}
            </Text>
          ))}
        </View>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.monthWeek}>
            {week.map(date => {
              const dayTasks = getTasksForDate(date);
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());
              const isCurrentMonth = date.getMonth() === month;

              return (
                <Pressable
                  key={date.toISOString()}
                  style={[
                    styles.monthDay,
                    isSelected && styles.monthDaySelected,
                    isToday && styles.monthDayToday,
                  ]}
                  onPress={() => onDateSelect(date)}
                >
                  <Text
                    style={[
                      styles.monthDayNumber,
                      !isCurrentMonth && styles.monthDayNumberOther,
                      isSelected && styles.monthDayNumberSelected,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  {dayTasks.length > 0 && isCurrentMonth && (
                    <View style={styles.monthTaskDot} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {mode === 'day' && renderDayView()}
        {mode === 'week' && renderWeekView()}
        {mode === 'month' && renderMonthView()}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    textAlign: 'center',
  },
  // Day view styles
  dayView: {
    flex: 1,
  },
  hourSlot: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 60,
  },
  hourLabel: {
    width: 70,
    padding: 8,
    fontSize: 12,
    color: '#999',
  },
  hourContent: {
    flex: 1,
    padding: 4,
  },
  taskInHour: {
    backgroundColor: '#6366F1',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  taskInHourText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Week view styles
  weekView: {
    flex: 1,
  },
  weekGrid: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    margin: 4,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  weekDaySelected: {
    backgroundColor: '#6366F1',
  },
  weekDayToday: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  weekDayName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  weekDayNameSelected: {
    color: '#FFFFFF',
  },
  weekDayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  weekDayNumberSelected: {
    color: '#FFFFFF',
  },
  taskDot: {
    marginTop: 4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  taskCount: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // Month view styles
  monthView: {
    flex: 1,
  },
  weekDayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  weekDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  monthWeek: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  monthDay: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 8,
  },
  monthDaySelected: {
    backgroundColor: '#6366F1',
  },
  monthDayToday: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  monthDayNumber: {
    fontSize: 16,
    color: '#333',
  },
  monthDayNumberOther: {
    color: '#CCC',
  },
  monthDayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  monthTaskDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF4444',
    marginTop: 2,
  },
});
