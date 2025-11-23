import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { CalendarViewProps } from '../types';
import { isSameDay } from '../utils/dateHelpers';
import { getCategoryColor } from '../utils/categoryColors';
import {
  formatDayHeader as formatDayHeaderLocalized,
  formatMonthYear,
  getWeekdays,
} from '../utils/localization';
import { analyzeDayVibe } from '../utils/dayVibeAnalysis';
import { DayHeroSection } from './DayHeroSection';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { ResponsiveSizes } from '../utils/responsiveDimensions';
import { useTheme } from '../contexts/ThemeContext';

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
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const contentWidth = Math.min(screenWidth, ResponsiveSizes.contentMaxWidth);
  const monthCellSpacing = 8;
  const monthCellSize = Math.max(
    32,
    (contentWidth - monthCellSpacing * 2 - monthCellSpacing * 6) / 7,
  );
  const monthCellStyle = React.useMemo(
    () => ({
      width: monthCellSize,
      height: monthCellSize,
      borderRadius: Math.min(20, monthCellSize / 2),
    }),
    [monthCellSize],
  );
  const monthDays = React.useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const days: Date[] = [];
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      days.push(new Date(d));
    }
    return days;
  }, [currentDate]);

  // Define navigation functions before gesture handlers
  const navigatePrevious = React.useCallback(() => {
    const newDate = new Date(currentDate);
    if (mode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (mode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, mode]);

  const navigateNext = React.useCallback(() => {
    const newDate = new Date(currentDate);
    if (mode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (mode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, mode]);

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

  // Calculate ISO week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  // Format week range: "November 2 - 8 (week 46)"
  const formatWeekRange = (startDate: Date, endDate: Date): string => {
    const weekNum = getWeekNumber(startDate);
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const month = startDate.toLocaleDateString('en-US', { month: 'long' });

    // If week spans two months
    if (startDate.getMonth() !== endDate.getMonth()) {
      const endMonth = endDate.toLocaleDateString('en-US', { month: 'long' });
      return `${month} ${startDay} - ${endMonth} ${endDay} (week ${weekNum})`;
    }

    return `${month} ${startDay} - ${endDay} (week ${weekNum})`;
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
    const currentWeekDay = startOfWeek.getDay();
    const diff = currentWeekDay === 0 ? -6 : 1 - currentWeekDay; // start on Monday
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });

    const startHour = 6;
    const endHour = 22;
    const hourHeight = 64;
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) =>
      startHour + i,
    );
    const totalHeight = (endHour - startHour + 1) * hourHeight;
    const timeColumnWidth = 56;
    const dayGap = 10;
    const weekPadding = 12;
    const dayColumnWidth = Math.max(
      90,
      (contentWidth - timeColumnWidth - weekPadding * 2 - dayGap * 6) / 7,
    );

    const dayTasks = days.map(date => ({
      date,
      tasks: tasks.filter(task => isSameDay(task.dueDate, date)),
    }));

    const now = new Date();
    const isCurrentWeek = now >= startOfWeek && now <= endOfWeek;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentLineTop =
      ((currentMinutes - startHour * 60) / 60) * hourHeight;

    return (
      <View style={styles.weekView}>
        <View style={styles.weekHeader}>
          <Pressable onPress={navigatePrevious} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.weekDateRange}>
            {formatWeekRange(startOfWeek, days[6])}
          </Text>
          <Pressable onPress={navigateNext} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.weekDayHeaderRow,
            { paddingHorizontal: weekPadding, paddingRight: weekPadding + dayGap },
          ]}
        >
          <View style={{ width: timeColumnWidth }} />
          {days.map(date => {
            const isToday = isSameDay(date, now);
            const isSelected = isSameDay(date, selectedDate);
            const weekday = date
              .toLocaleDateString('en-US', { weekday: 'short' })
              .toUpperCase();
            const dayNumber = date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
            });

            return (
              <Pressable
                key={date.toISOString()}
                style={[
                  styles.weekDayHeaderCell,
                  { width: dayColumnWidth },
                  (isToday || isSelected) && styles.weekDayHeaderCellActive,
                ]}
                onPress={() => onDateSelect(date)}
              >
                <Text style={styles.weekDayHeaderWeekday}>{weekday}</Text>
                <Text style={styles.weekDayHeaderDate}>{dayNumber}</Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={styles.weekTimeline}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: weekPadding,
            paddingRight: weekPadding + dayGap,
            paddingBottom: 24,
            minHeight: totalHeight + 32,
          }}
        >
          <View style={[styles.weekGridRow, { minHeight: totalHeight }]}>
            <View
              style={[
                styles.weekTimeColumn,
                { width: timeColumnWidth, minHeight: totalHeight },
              ]}
            >
              {hours.map(hour => {
                const formatted =
                  hour === 0
                    ? '12 AM'
                    : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                    ? '12 PM'
                    : `${hour - 12} PM`;
                return (
                  <Text
                    key={hour}
                    style={[styles.weekTimeLabel, { height: hourHeight }]}
                  >
                    {formatted}
                  </Text>
                );
              })}
            </View>
            <View
              style={[
                styles.weekDaysWrapper,
                { height: totalHeight, marginLeft: dayGap },
              ]}
            >
              <View style={styles.weekGridLines}>
                {hours.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.weekGridLine,
                      { top: idx * hourHeight, width: '100%', height: 1 },
                    ]}
                  />
                ))}
              </View>
              <View style={[styles.weekColumnsOverlay, { height: totalHeight }]}>
                {dayTasks.map(({ date, tasks: dayTasksForDate }, dayIndex) => {
                  const isWeekend =
                    date.getDay() === 0 || date.getDay() === 6;
                  const isToday = isSameDay(date, now);
                  return (
                    <View
                      key={date.toISOString()}
                      style={[
                        styles.weekDayColumn,
                        {
                          width: dayColumnWidth,
                          marginRight: dayIndex === 6 ? 0 : dayGap,
                        },
                        isWeekend && styles.weekendColumn,
                        isToday && styles.todayColumn,
                      ]}
                    >
                      {dayTasksForDate.map(task => {
                        if (!task.dueTime) return null;
                        const taskStartMinutes =
                          task.dueTime.getHours() * 60 +
                          task.dueTime.getMinutes();
                        const offsetMinutes = taskStartMinutes - startHour * 60;
                        const top =
                          Math.max(offsetMinutes, 0) * (hourHeight / 60);
                        const durationMinutes = 60;
                        const height =
                          (durationMinutes / 60) * hourHeight;
                        const timeRange = formatTimeRangeLocal(
                          task.dueTime,
                          durationMinutes,
                        );
                        const cardColor = getCategoryColor(task.category);

                        return (
                          <Pressable
                            key={task._id}
                            style={[
                              styles.weekEventCard,
                              {
                                top,
                                height: Math.max(height, 50),
                                backgroundColor: `${cardColor}1A`,
                                borderColor: `${cardColor}33`,
                              },
                            ]}
                            onPress={() => onDateSelect(task.dueDate)}
                            accessible={true}
                            accessibilityLabel={`${task.title}, ${timeRange}`}
                          >
                            <View
                              style={[
                                styles.weekEventAccent,
                                { backgroundColor: cardColor },
                              ]}
                            />
                            <Text
                              style={styles.weekEventTitle}
                              numberOfLines={2}
                            >
                              {task.title}
                            </Text>
                            {timeRange && (
                              <Text style={styles.weekEventTime}>
                                {timeRange}
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })}
                {isCurrentWeek &&
                  currentLineTop >= 0 &&
                  currentLineTop <= totalHeight && (
                    <View
                      style={[
                        styles.weekNowLine,
                        { top: currentLineTop, left: 0, right: 0 },
                      ]}
                    />
                  )}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderMonthView = () => {
    const month = currentDate.getMonth();
    const today = new Date();

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
          <Pressable
            onPress={navigateNext}
            style={styles.monthNavButton}
            accessible={true}
            accessibilityLabel="Next month"
            accessibilityRole="button"
          >
            <Text style={styles.monthNavButtonText}>→</Text>
          </Pressable>
        </View>
        <View style={styles.weekDayHeaders}>
          {getWeekdays(true).map(day => (
            <Text key={day} style={styles.weekDayHeader}>
              {day}
            </Text>
          ))}
        </View>
        <View
          style={[
            styles.monthGrid,
            { paddingHorizontal: monthCellSpacing, width: contentWidth },
          ]}
        >
          {monthDays.map((date, index) => {
            const dayTasks = getTasksForDate(date);
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            const isCurrentMonth = date.getMonth() === month;
            const isEndOfWeek = (index + 1) % 7 === 0;

            const dateLabel = `${date.toLocaleDateString('ru-RU', {
              month: 'long',
              day: 'numeric',
            })}${dayTasks.length > 0 ? `, ${dayTasks.length} tasks` : ''}`;

            return (
              <Pressable
                key={date.toISOString()}
                style={[
                  styles.monthDay,
                  monthCellStyle,
                  {
                    marginRight: isEndOfWeek ? 0 : monthCellSpacing,
                    marginBottom: monthCellSpacing,
                  },
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
  weekDayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  weekDayHeaderCell: {
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayHeaderCellActive: {
    backgroundColor: '#EEF2FF',
  },
  weekDayHeaderWeekday: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  weekDayHeaderDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  weekTimeline: {
    flex: 1,
  },
  weekGridRow: {
    flexDirection: 'row',
  },
  weekTimeColumn: {
    paddingTop: 6,
  },
  weekTimeLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    paddingRight: 8,
  },
  weekDaysWrapper: {
    flex: 1,
    position: 'relative',
  },
  weekGridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  weekGridLine: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  weekColumnsOverlay: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  weekDayColumn: {
    height: '100%',
    position: 'relative',
    borderLeftWidth: 1,
    borderLeftColor: '#F3F4F6',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
    paddingHorizontal: 4,
  },
  weekendColumn: {
    backgroundColor: 'rgba(249, 250, 251, 0.7)',
  },
  todayColumn: {
    backgroundColor: 'rgba(238, 242, 255, 0.7)',
  },
  weekEventCard: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  weekEventAccent: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 4,
    borderRadius: 4,
  },
  weekEventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  weekEventTime: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 8,
    marginTop: 2,
  },
  weekNowLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#EF4444',
    opacity: 0.8,
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
  monthGrid: {
    paddingBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthDay: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
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
