import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
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

export const TodayScreen: React.FC = () => {
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);
  const [editingTask, setEditingTask] = useState<TaskType | null>(null);

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
