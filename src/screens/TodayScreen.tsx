import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
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

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingBottom: 20,
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    greeting: {
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    date: {
      color: colors.textSecondary,
      marginBottom: 12,
    },
    taskCount: {
      color: colors.primary,
      fontWeight: '600',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View
        style={[
          dynamicStyles.header,
          {
            paddingTop: insets.top + 20,
            paddingHorizontal: isTablet ? 32 : 20,
          },
        ]}
      >
        <View style={contentContainerStyle}>
          <Text style={[dynamicStyles.greeting, { fontSize: isTablet ? 34 : 28 }]}>
            {getGreeting()}
          </Text>
          <Text style={[dynamicStyles.date, { fontSize: isTablet ? 18 : 16 }]}>
            {formatDate()}
          </Text>
          <Text style={[dynamicStyles.taskCount, { fontSize: isTablet ? 16 : 14 }]}>
            {t('today.tasksRemaining', { count: tasks.length })}
          </Text>
        </View>
      </View>

      <View style={contentContainerStyle}>
        <TaskListView
          tasks={tasks}
          onTaskComplete={handleTaskComplete}
          onTaskSnooze={handleTaskSnooze}
          onTaskPress={handleTaskPress}
          onReorder={taskIds => {
            // TODO: Implement reordering
            console.log('Reorder tasks:', taskIds);
          }}
        />
      </View>

      <FloatingActionButton onPress={handleAddTask} />

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
    </View>
  );
};

const styles = StyleSheet.create({});
