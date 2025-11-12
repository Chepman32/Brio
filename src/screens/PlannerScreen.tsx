import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CalendarView } from '../components/CalendarView';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { TaskCreationModal } from '../components/TaskCreationModal';
import { getTasks, createTask } from '../database/operations';
import { TaskType, TaskInput } from '../types';

export const PlannerScreen: React.FC = () => {
  const [mode, setMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = () => {
    try {
      const allTasks = getTasks();
      setTasks(Array.from(allTasks));
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleModeChange = (newMode: 'day' | 'week' | 'month') => {
    setMode(newMode);
  };

  const handleAddTask = () => {
    setShowTaskModal(true);
  };

  const handleSaveTask = (taskInput: TaskInput) => {
    try {
      createTask(taskInput);
      loadTasks();
      setShowTaskModal(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Planner</Text>
        <View style={styles.modeSelector}>
          {(['day', 'week', 'month'] as const).map(m => (
            <Pressable
              key={m}
              style={[styles.modeButton, mode === m && styles.modeButtonActive]}
              onPress={() => setMode(m)}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === m && styles.modeButtonTextActive,
                ]}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <CalendarView
        mode={mode}
        selectedDate={selectedDate}
        tasks={tasks}
        onDateSelect={handleDateSelect}
        onModeChange={handleModeChange}
        onCreateTask={handleAddTask}
      />

      <FloatingActionButton onPress={handleAddTask} />

      <TaskCreationModal
        visible={showTaskModal}
        onClose={handleCloseModal}
        onSave={handleSaveTask}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
});
