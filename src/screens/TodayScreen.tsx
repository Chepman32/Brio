import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TaskListView } from '../components/TaskListView';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { TaskCreationModal } from '../components/TaskCreationModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import {
  getTasksByDate,
  completeTask,
  snoozeTask,
  createTask,
  getTaskById,
  deleteTask,
} from '../database/operations';
import { TaskType, TaskInput } from '../types';
import { SmartPlanningService } from '../services/SmartPlanningService';
import { AchievementService } from '../services/AchievementService';
import { NotificationService } from '../services/NotificationService';
import { useResponsive } from '../hooks/useResponsive';
import { ResponsiveSizes, getContentContainerStyle } from '../utils/responsiveDimensions';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

export const TodayScreen: React.FC = () => {
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);
  const [editingTask, setEditingTask] = useState<TaskType | null>(null);
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const { colors } = useTheme();
  const { t, locale } = useLocalization();

  const loadTasks = React.useCallback(() => {
    try {
      const today = new Date();
      console.log('Loading tasks for date:', today);
      const todayTasks = getTasksByDate(today);
      console.log('Found tasks:', todayTasks.length);
      const incompleteTasks = todayTasks
        .filter(task => !task.completed)
        .map(task => ({
          _id: task._id,
          title: task.title,
          notes: task.notes,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          category: task.category,
          priority: task.priority,
          icon: (task as any).icon,
          completed: task.completed,
          completedAt: task.completedAt,
          snoozedUntil: task.snoozedUntil,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        }));
      console.log('Incomplete tasks:', incompleteTasks.length);
      setTasks(incompleteTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTasks();
    setRefreshing(false);
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      const task = getTaskById(taskId);
      if (task) {
        completeTask(taskId);
        // Cancel notification
        await NotificationService.cancelNotification(taskId);
        // Update smart planning statistics
        SmartPlanningService.updateUserStats(task);
        // Check for newly unlocked achievements
        const newAchievements = AchievementService.checkAchievements();
        if (newAchievements.length > 0) {
          // Show achievement unlock notification
          const achievementNames = newAchievements
            .map(a => a.name)
            .join(', ');
          const message =
            newAchievements.length === 1
              ? `You unlocked: ${achievementNames}!`
              : `You unlocked ${newAchievements.length} achievements: ${achievementNames}!`;

          Alert.alert(
            '🎉 Achievement Unlocked!',
            message,
            [{ text: 'Awesome!', style: 'default' }],
            { cancelable: true },
          );
        }
      }
      loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleTaskSnooze = (taskId: string) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      snoozeTask(taskId, tomorrow);
      loadTasks();
    } catch (error) {
      console.error('Error snoozing task:', error);
    }
  };

  const handleTaskPress = (taskId: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      setSelectedTask(task);
      setShowDetailModal(true);
    }
  };

  const handleEditTask = (task: TaskType) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await NotificationService.cancelNotification(taskId);
      deleteTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleAddTask = () => {
    setShowTaskModal(true);
  };

  const handleSaveTask = async (taskInput: TaskInput) => {
    try {
      if (editingTask) {
        // Update existing task
        console.log('Updating task:', editingTask._id);
        const { updateTask } = require('../database/operations');
        updateTask(editingTask._id, taskInput);

        // Reschedule notification if task has due time
        await NotificationService.cancelNotification(editingTask._id);
        if (taskInput.dueTime) {
          const updatedTask = getTaskById(editingTask._id);
          if (updatedTask) {
            await NotificationService.scheduleNotification(updatedTask);
          }
        }
      } else {
        // Create new task
        console.log('Creating task with input:', taskInput);
        const newTask = createTask(taskInput);
        console.log('Task created:', newTask);

        // Schedule notification if task has due time
        if (newTask.dueTime) {
          await NotificationService.scheduleNotification(newTask);
        }
      }

      setShowTaskModal(false);
      setEditingTask(null);

      // Reload tasks after a short delay to ensure state updates
      setTimeout(() => {
        loadTasks();
      }, 100);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('today.goodMorning');
    if (hour < 18) return t('today.goodAfternoon');
    return t('today.goodEvening');
  };

  const formatDate = () => {
    const today = new Date();
    try {
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(today);
    } catch {
      return today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const contentContainerStyle = getContentContainerStyle();
  const remainingCount = tasks.length;
  const topTask = tasks[0];
  const remainingTasks = tasks.slice(1);
  const progressPct = remainingCount === 0 ? 1 : Math.max(0.08, Math.min(1, 1 / Math.max(1, remainingCount)));

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerCard: {
      paddingTop: insets.top + 20,
      paddingHorizontal: 20,
      paddingBottom: 28,
      borderRadius: 28,
      backgroundColor: 'rgba(255,255,255,0.12)',
      marginHorizontal: 16,
      marginTop: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    greetingIcon: {
      marginRight: 10,
    },
    greeting: {
      fontWeight: '800',
      color: '#1E1E2D',
    },
    pillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    pill: {
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pillText: {
      color: '#4A4A68',
      fontWeight: '600',
    },
    taskRemaining: {
      color: '#4B45F1',
      fontWeight: '700',
      marginBottom: 8,
    },
    progressTrack: {
      height: 6,
      borderRadius: 6,
      backgroundColor: 'rgba(255,255,255,0.35)',
      overflow: 'hidden',
      marginBottom: 16,
    },
    progressFill: {
      height: '100%',
      borderRadius: 6,
      backgroundColor: '#4B45F1',
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 22,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 4,
    },
    cardBadge: {
      width: 46,
      height: 46,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#FFB703',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    cardCategory: {
      backgroundColor: '#EEF1FF',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      color: '#4A4A68',
      fontWeight: '600',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1E1E2D',
    },
    cardIconWrapper: {
      width: 42,
      height: 42,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#FFB703',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    cardSpacer: {
      flex: 1,
    },
    listWrapper: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    addButtonWrapper: {
      position: 'absolute',
      bottom: 36 + insets.bottom,
      right: 24,
    },
  });

  return (
    <LinearGradient
      colors={['#E9E7FF', '#DCE7FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={dynamicStyles.container}
    >
      <View style={dynamicStyles.headerCard}>
        <View style={dynamicStyles.greetingRow}>
          <Icon
            name="sunny-outline"
            size={28}
            color="#F7C948"
            style={dynamicStyles.greetingIcon}
          />
          <Text style={[dynamicStyles.greeting, { fontSize: isTablet ? 34 : 28 }]}>
            {getGreeting()}
          </Text>
        </View>
        <View style={dynamicStyles.pillRow}>
          <View style={dynamicStyles.pill}>
            <Text style={dynamicStyles.pillText}>{t('today.today') || 'Today'}</Text>
            <Text style={dynamicStyles.pillText}>•</Text>
            <Text style={dynamicStyles.pillText}>{formatDate()}</Text>
          </View>
        </View>
        <Text style={[dynamicStyles.taskRemaining, { fontSize: 16 }]}>
          {t('today.tasksRemaining', { count: remainingCount })}
        </Text>
        <View style={dynamicStyles.progressTrack}>
          <View
            style={[
              dynamicStyles.progressFill,
              { width: `${Math.min(100, progressPct * 100)}%` },
            ]}
          />
        </View>
        {topTask && (
          <Pressable
            style={dynamicStyles.card}
            onPress={() => handleTaskPress(topTask._id)}
          >
            <View style={dynamicStyles.cardBadge}>
              <Icon
                name={topTask.icon || 'checkmark-circle-outline'}
                size={24}
                color="#1E1E2D"
              />
            </View>
            <Text style={dynamicStyles.cardTitle} numberOfLines={1}>
              {topTask.title}
            </Text>
            <View style={dynamicStyles.cardSpacer} />
            {topTask.category && (
              <Text style={dynamicStyles.cardCategory}>
                {topTask.category}
              </Text>
            )}
          </Pressable>
        )}
      </View>

      <View style={dynamicStyles.listWrapper}>
        <TaskListView
          tasks={remainingTasks}
          onTaskComplete={handleTaskComplete}
          onTaskSnooze={handleTaskSnooze}
          onTaskPress={handleTaskPress}
          onReorder={taskIds => {
            // TODO: Implement reordering
            console.log('Reorder tasks:', taskIds);
          }}
        />
      </View>

      <View style={dynamicStyles.addButtonWrapper}>
        <FloatingActionButton onPress={handleAddTask} />
      </View>

      <TaskCreationModal
        visible={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        editTask={editingTask}
      />

      <TaskDetailModal
        visible={showDetailModal}
        task={selectedTask}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTask(null);
        }}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({});
