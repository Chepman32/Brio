/**
 * Example: TodayScreen with AI Integration
 *
 * This is an example of how to integrate AI features into the existing TodayScreen.
 * Copy relevant parts to your actual TodayScreen.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { TaskListView } from '../components/TaskListView';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { TaskCreationModal } from '../components/TaskCreationModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { AIDashboard } from '../components/AIDashboard';
import { NLPTaskInput } from '../components/NLPTaskInput';
import {
  getTasksByDate,
  completeTask,
  snoozeTask,
  createTask,
  getTaskById,
  deleteTask,
  getAllTasks,
} from '../database/operations';
import { TaskType, TaskInput } from '../types';
import { SmartPlanningService } from '../services/SmartPlanningService';
import { AchievementService } from '../services/AchievementService';
import { NotificationService } from '../services/NotificationService';
import { useAI } from '../hooks/useAI';
import { AICoordinatorService } from '../services/AICoordinatorService';

export const TodayScreenWithAI: React.FC = () => {
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [allTasks, setAllTasks] = useState<TaskType[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNLPModal, setShowNLPModal] = useState(false);
  const [showAIDashboard, setShowAIDashboard] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);
  const [editingTask, setEditingTask] = useState<TaskType | null>(null);

  // AI Hook
  const {
    dashboard,
    onTaskCompleted,
    onTaskSnoozed,
    getSnoozeOptions,
    runAnalysis,
  } = useAI(allTasks);

  const loadTasks = React.useCallback(() => {
    try {
      const today = new Date();
      const todayTasks = getTasksByDate(today);
      const incompleteTasks = todayTasks.filter(task => !task.completed);
      setTasks(incompleteTasks);

      // Load all tasks for AI
      const all = getAllTasks();
      setAllTasks(all);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }, []);

  useEffect(() => {
    loadTasks();

    // Run AI analysis on mount
    runAnalysis();
  }, [loadTasks, runAnalysis]);

  const handleTaskComplete = async (taskId: string) => {
    try {
      const task = getTaskById(taskId);
      if (task) {
        completeTask(taskId);
        await NotificationService.cancelNotification(taskId);
        SmartPlanningService.updateUserStats(task);

        // AI: Handle completion
        const aiResult = await onTaskCompleted(task);

        // Show chain suggestions
        if (aiResult.chainSuggestions && aiResult.chainSuggestions.length > 0) {
          Alert.alert(
            '🔗 Обычно после этого вы делаете:',
            aiResult.chainSuggestions.join('\n'),
            [
              {
                text: 'Создать все',
                onPress: () => {
                  aiResult.chainSuggestions?.forEach(title => {
                    createTask({
                      title,
                      dueDate: new Date(),
                      priority: 'medium',
                    });
                  });
                  loadTasks();
                },
              },
              { text: 'Пропустить' },
            ],
          );
        }

        // Check achievements
        const newAchievements = AchievementService.checkAchievements();
        if (newAchievements.length > 0) {
          console.log('New achievements unlocked:', newAchievements);
          // TODO: Show confetti animation
        }
      }
      loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleTaskSnooze = async (taskId: string) => {
    try {
      const task = getTaskById(taskId);
      if (!task) return;

      // AI: Get personalized snooze options
      const options = getSnoozeOptions(task);

      Alert.alert('⏰ Отложить задачу', 'Выберите время:', [
        ...options.map(opt => ({
          text: opt.label,
          onPress: async () => {
            const newDate = new Date();
            newDate.setMinutes(newDate.getMinutes() + opt.minutes);

            snoozeTask(taskId, newDate);

            // AI: Record snooze
            await onTaskSnoozed(task, opt.minutes, false);

            loadTasks();
          },
        })),
        { text: 'Отмена', style: 'cancel' },
      ]);
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
    // Show choice: NLP or traditional
    Alert.alert('Создать задачу', 'Выберите способ:', [
      {
        text: '✨ Естественный язык',
        onPress: () => setShowNLPModal(true),
      },
      {
        text: '📝 Обычная форма',
        onPress: () => setShowTaskModal(true),
      },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const handleSaveTask = async (taskInput: TaskInput) => {
    try {
      if (editingTask) {
        const { updateTask } = require('../database/operations');
        updateTask(editingTask._id, taskInput);
        await NotificationService.cancelNotification(editingTask._id);
        if (taskInput.dueTime) {
          const updatedTask = getTaskById(editingTask._id);
          if (updatedTask) {
            await NotificationService.scheduleNotification(updatedTask);
          }
        }
      } else {
        const newTask = createTask(taskInput);
        if (newTask.dueTime) {
          await NotificationService.scheduleNotification(newTask);
        }
      }

      setShowTaskModal(false);
      setShowNLPModal(false);
      setEditingTask(null);

      setTimeout(() => {
        loadTasks();
      }, 100);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleMergeTasks = (task1: TaskType, task2: TaskType) => {
    Alert.alert('Объединить задачи?', `"${task1.title}" и "${task2.title}"`, [
      {
        text: 'Объединить',
        onPress: () => {
          // Merge logic
          const merged = {
            ...task1,
            notes: task1.notes || task2.notes,
            dueTime: task1.dueTime || task2.dueTime,
            category: task1.category || task2.category,
          };

          const { updateTask } = require('../database/operations');
          updateTask(task1._id, merged);
          deleteTask(task2._id);
          loadTasks();
        },
      },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('ru-RU', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.date}>{formatDate()}</Text>

          {/* Day Vibe (from AI) */}
          {dashboard?.dayVibe && (
            <View style={styles.vibeContainer}>
              <Text style={styles.vibeEmoji}>{dashboard.dayVibe.emoji}</Text>
              <Text style={styles.vibeLabel}>{dashboard.dayVibe.label}</Text>
            </View>
          )}

          <Text style={styles.taskCount}>
            {tasks.length} {tasks.length === 1 ? 'задача' : 'задач'} на сегодня
          </Text>
        </View>

        {/* AI Dashboard Toggle */}
        <TouchableOpacity
          style={styles.aiToggle}
          onPress={() => setShowAIDashboard(!showAIDashboard)}
        >
          <Text style={styles.aiToggleText}>
            {showAIDashboard
              ? '📊 Скрыть AI инсайты'
              : '✨ Показать AI инсайты'}
          </Text>
        </TouchableOpacity>

        {/* AI Dashboard */}
        {showAIDashboard && (
          <AIDashboard
            tasks={allTasks}
            onTaskPress={handleTaskPress}
            onCreateTask={title => {
              createTask({
                title,
                dueDate: new Date(),
                priority: 'medium',
              });
              loadTasks();
            }}
            onMergeTasks={handleMergeTasks}
          />
        )}

        {/* Task List */}
        <TaskListView
          tasks={tasks}
          onTaskComplete={handleTaskComplete}
          onTaskSnooze={handleTaskSnooze}
          onTaskPress={handleTaskPress}
          onReorder={taskIds => {
            console.log('Reorder tasks:', taskIds);
          }}
        />
      </ScrollView>

      <FloatingActionButton onPress={handleAddTask} />

      {/* Traditional Task Modal */}
      <TaskCreationModal
        visible={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        editTask={editingTask}
      />

      {/* NLP Task Modal */}
      {showNLPModal && (
        <NLPTaskInput
          tasks={allTasks}
          onCreateTask={handleSaveTask}
          onClose={() => setShowNLPModal(false)}
        />
      )}

      {/* Task Detail Modal */}
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
    backgroundColor: '#F9FAFB',
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
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  vibeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  vibeEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  vibeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  taskCount: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  aiToggle: {
    margin: 16,
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
  },
  aiToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
});
