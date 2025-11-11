import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { TaskListView } from '../components/TaskListView';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { TaskCreationModal } from '../components/TaskCreationModal';
import {
  getTasksByDate,
  completeTask,
  snoozeTask,
  createTask,
  getTaskById,
} from '../database/operations';
import { TaskType, TaskInput } from '../types';
import { SmartPlanningService } from '../services/SmartPlanningService';
import { AchievementService } from '../services/AchievementService';
import { NotificationService } from '../services/NotificationService';

export const TodayScreen: React.FC = () => {
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);

  const loadTasks = () => {
    try {
      const today = new Date();
      const todayTasks = getTasksByDate(today);
      setTasks(todayTasks.filter(task => !task.completed));
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

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
          // TODO: Show confetti animation
          console.log('New achievements unlocked:', newAchievements);
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
      // TODO: Open task detail modal
    }
  };

  const handleAddTask = () => {
    setShowTaskModal(true);
  };

  const handleSaveTask = async (taskInput: TaskInput) => {
    try {
      const newTask = createTask(taskInput);
      // Schedule notification if task has due time
      if (newTask.dueTime) {
        await NotificationService.scheduleNotification(newTask);
      }
      loadTasks();
      setShowTaskModal(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.date}>{formatDate()}</Text>
        <Text style={styles.taskCount}>
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} due today
        </Text>
      </View>

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

      <FloatingActionButton onPress={handleAddTask} />

      <TaskCreationModal
        visible={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={handleSaveTask}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  taskCount: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
});
