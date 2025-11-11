import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CalendarView } from '../components/CalendarView';
import { getTasks } from '../database/operations';
import { TaskType } from '../types';

export const PlannerScreen: React.FC = () => {
  const [mode, setMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<TaskType[]>([]);

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
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: '#6366F1',
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
