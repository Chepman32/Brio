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
import { getCategoryColor } from '../utils/categoryColors';
import {
  formatDayHeader as formatDayHeaderLocalized,
  formatMonthYear,
  getWeekdays,
} from '../utils/localization';
import { analyzeDayVibe } from '../utils/dayVibeAnalysis';
import { DayHeroSection } from './DayHeroSection';
import { useTimeFormat } from '../hooks/useTimeFormat';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;

// Memoized TaskBlock component for better performance
interface TaskBlockProps {
  task: any;
  timeRange: string;
  taskColor: string;
  onPress: () => void;
}

const TaskBlock = React.memo<TaskBlockProps>(
  ({ task, timeRange, taskColor, onPress }) => {
    return (
      <Pressable
        style={[styles.taskBlock, { backgroundColor: taskColor }]}
        onPress={onPress}
        accessible={true}
        accessibilityLabel={`Task: ${task.title}, ${timeRange}`}
        accessibilityRole="button"
        accessibilityHint="Tap to view task details"
      >
        <Text style={styles.taskBlockTitle} numberOfLines={1}>
          {task.title}
        </Text>
        {timeRange && <Text style={styles.taskBlockTime}>{timeRange}</Text>}
      </Pressable>
    );
  },
);

export const CalendarView: React.FC<CalendarViewProps> = ({
  mode,
  selectedDate,
  tasks,
  onDateSelect,
  onModeChange,
  onCreateTask,
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const { formatTime, formatTimeRange, formatHourLabel } = useTimeFormat();

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

  const formatTimeRangeLocal = (
    startTime?: Date,
    duration: number = 60,
  ): string => {
    if (!startTime) return '';
    const endTime = new Date(startTime.getTime() + duration * 60000);
    return formatTimeRange(startTime, endTime);
  };

  const renderDayView = () => {
    // Start from 6:00 AM to 23:00 (11 PM)
    const hours = Array.from({ length: 18 }, (_, i) => i + 6);
    const dayTasks = getTasksForDate(currentDate);

    // Get day name and vibe
    const dayName = currentDate.toLocaleDateString('ru-RU', {
      weekday: 'long',
    });
    const capitalizedDayName =
      dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const { vibe, gradientColors } = analyzeDayVibe(dayTasks, currentDate);

    // Calculate current time indicator position
    const now = new Date();
    const isToday = isSameDay(currentDate, now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const showTimeIndicator = isToday && currentHour >= 6 && currentHour < 24;

    return (
      <View style={styles.dayView}>
        <Text style={styles.compactHeader}>
          {formatDayHeaderLocalized(currentDate)}
        </Text>
        <DayHeroSection
          dayName={capitalizedDayName}
          dayVibe={vibe}
          gradientColors={gradientColors}
        />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.timelineContainer}>
            {hours.map(hour => {
              const hourTasks = dayTasks.filter(task => {
                if (!task.dueTime) return false;
                return task.dueTime.getHours() === hour;
              });

              return (
                <View key={hour} style={styles.hourSlot}>
                  <Text style={styles.hourLabel}>{formatHourLabel(hour)}</Text>
                  <View style={styles.hourContent}>
                    {hourTasks.map(task => {
                      const taskColor = getCategoryColor(task.category);
                      const timeRange = formatTimeRangeLocal(task.dueTime, 60);

                      return (
                        <TaskBlock
                          key={task._id}
                          task={task}
                          timeRange={timeRange}
                          taskColor={taskColor}
                          onPress={() => onDateSelect(task.dueDate)}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })}
            {showTimeIndicator && (
              <View
                style={[
                  styles.currentTimeIndicator,
                  {
                    top: (currentHour - 6) * 70 + (currentMinute / 60) * 70,
                  },
                ]}
              >
                <View style={styles.currentTimeDot} />
                <View style={styles.currentTimeLine} />
                <Text
                  style={[
                    styles.currentTimeText,
                    {
                      top: currentMinute < 30 ? 6 : -20,
                    },
                  ]}
                >
                  {formatTime(now)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
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

    const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6:00 to 23:00
    const selectedDayTasks = getTasksForDate(selectedDate);

    const getTaskPosition = (task: any) => {
      if (!task.dueTime) return null;
      const hour = task.dueTime.getHours();
      const minute = task.dueTime.getMinutes();
      return (hour - 6) * 60 + minute; // Minutes from 6:00
    };

    const getTaskDuration = (task: any) => {
      // Default 1 hour duration, can be customized
      return 60;
    };

    return (
      <View style={styles.weekView}>
        <View style={styles.weekHeader}>
          <Pressable onPress={navigatePrevious} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.weekDateRange}>
            {startOfWeek.toLocaleDateString('en-US', {
              day: 'numeric',
            })}
            –
            {days[6].toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'long',
            })}
          </Text>
          <Pressable onPress={navigateNext} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekDaysStrip}>
          {days.map(date => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());

            return (
              <Pressable
                key={date.toISOString()}
                style={styles.weekDayColumn}
                onPress={() => onDateSelect(date)}
              >
                <Text style={styles.weekDayLabel}>
                  {date
                    .toLocaleDateString('en-US', { weekday: 'short' })
                    .toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.weekDayCircle,
                    isSelected && styles.weekDayCircleSelected,
                    isToday && !isSelected && styles.weekDayCircleToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.weekDayDate,
                      isSelected && styles.weekDayDateSelected,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={styles.weekTimeline}
          showsVerticalScrollIndicator={false}
        >
          {hours.map(hour => {
            const hourTasks = selectedDayTasks.filter(task => {
              if (!task.dueTime) return false;
              return task.dueTime.getHours() === hour;
            });

            return (
              <View key={hour} style={styles.timeSlot}>
                <Text style={styles.timeLabel}>
                  {hour === 0
                    ? '12:00'
                    : hour < 10
                    ? `${hour}:00`
                    : `${hour}:00`}
                </Text>
                <View style={styles.timeSlotContent}>
                  <View style={styles.timeSlotLine} />
                  {hourTasks.map((task, index) => {
                    const position = getTaskPosition(task);
                    const duration = getTaskDuration(task);
                    const minute = task.dueTime?.getMinutes() || 0;

                    return (
                      <Pressable
                        key={task._id}
                        style={[
                          styles.weekTaskBlock,
                          {
                            top: minute,
                            height: Math.max(duration, 40),
                            backgroundColor:
                              task.category === 'work' ? '#6B9EFF' : '#7BC67E',
                          },
                        ]}
                        onPress={() => onDateSelect(task.dueDate)}
                      >
                        <Text
                          style={styles.weekTaskBlockText}
                          numberOfLines={2}
                        >
                          {task.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
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
        <View style={styles.monthNavigationHeader}>
          <Pressable
            onPress={navigatePrevious}
            style={styles.monthNavButton}
            accessible={true}
            accessibilityLabel="Previous month"
            accessibilityRole="button"
          >
            <Text style={styles.monthNavButtonText}>←</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{formatMonthYear(currentDate)}</Text>
          {onCreateTask && (
            <Pressable
              onPress={() => onCreateTask(currentDate)}
              style={styles.monthNavButton}
              accessible={true}
              accessibilityLabel="Create new task"
              accessibilityRole="button"
            >
              <Text style={styles.monthNavButtonText}>+</Text>
            </Pressable>
          )}
          {!onCreateTask && <View style={styles.monthNavButton} />}
        </View>
        <View style={styles.weekDayHeaders}>
          {getWeekdays(true).map(day => (
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

              const dateLabel = `${date.toLocaleDateString('ru-RU', {
                month: 'long',
                day: 'numeric',
              })}${dayTasks.length > 0 ? `, ${dayTasks.length} tasks` : ''}`;

              return (
                <Pressable
                  key={date.toISOString()}
                  style={[
                    styles.monthDay,
                    isToday && styles.monthDayToday,
                    isSelected && !isToday && styles.monthDaySelected,
                  ]}
                  onPress={() => onDateSelect(date)}
                  accessible={true}
                  accessibilityLabel={dateLabel}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.monthDayNumber,
                      !isCurrentMonth && styles.monthDayNumberOther,
                      isToday && { color: '#FFFFFF', fontWeight: '600' },
                      isSelected && !isToday && styles.monthDayNumberSelected,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  {dayTasks.length > 0 && isCurrentMonth && (
                    <View
                      style={[
                        styles.monthTaskDot,
                        {
                          backgroundColor: getCategoryColor(
                            dayTasks[0].category,
                          ),
                        },
                      ]}
                    />
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
  dayViewHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    paddingVertical: 16,
    paddingHorizontal: 16,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
  },
  compactHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
  },
  // Day view styles
  dayView: {
    flex: 1,
  },
  timelineContainer: {
    position: 'relative',
  },
  hourSlot: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    height: 70,
  },
  hourLabel: {
    width: 60,
    paddingTop: 8,
    paddingLeft: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  hourContent: {
    flex: 1,
    padding: 4,
    position: 'relative',
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  currentTimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: 4,
  },
  currentTimeLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#EF4444',
  },
  currentTimeText: {
    position: 'absolute',
    left: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskBlock: {
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  taskBlockTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  taskBlockTime: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  // Legacy styles for backward compatibility
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
    backgroundColor: '#FFFFFF',
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  weekDateRange: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  navButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 28,
    color: '#000',
    fontWeight: '300',
  },
  weekDaysStrip: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  weekDayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 6,
    fontWeight: '500',
  },
  weekDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayCircleSelected: {
    backgroundColor: '#007AFF',
  },
  weekDayCircleToday: {
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  weekDayDate: {
    fontSize: 16,
    color: '#000',
    fontWeight: '400',
  },
  weekDayDateSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  weekTimeline: {
    flex: 1,
  },
  timeSlot: {
    flexDirection: 'row',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timeLabel: {
    width: 60,
    paddingTop: 4,
    paddingLeft: 12,
    fontSize: 13,
    color: '#8E8E93',
  },
  timeSlotContent: {
    flex: 1,
    position: 'relative',
  },
  timeSlotLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  weekTaskBlock: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
  },
  weekTaskBlockText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Month view styles
  monthView: {
    flex: 1,
  },
  monthNavigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  monthNavButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavButtonText: {
    fontSize: 28,
    color: '#000',
    fontWeight: '300',
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  weekDayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  weekDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  monthWeek: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  monthDay: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 20,
  },
  monthDaySelected: {
    backgroundColor: '#E5E7EB',
  },
  monthDayToday: {
    backgroundColor: '#007AFF',
  },
  monthDayNumber: {
    fontSize: 16,
    color: '#000',
    fontWeight: '400',
  },
  monthDayNumberOther: {
    color: '#D1D5DB',
  },
  monthDayNumberSelected: {
    color: '#000',
    fontWeight: '600',
  },
  monthTaskDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
    position: 'absolute',
    bottom: 4,
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});
